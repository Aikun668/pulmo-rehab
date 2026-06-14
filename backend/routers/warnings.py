from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.responses import success_response
from database import get_db
from models import User, UserRole, Warning, WarningType
from schemas import ApiResponse, WarningResolveRequest, WarningResponse, WARNING_THRESHOLDS


router = APIRouter(prefix="/warnings", tags=["warnings"])


def _get_patient_or_raise(db: Session, patient_id: int) -> User:
    patient = db.get(User, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    if patient.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided id does not belong to a patient.",
        )
    return patient


@router.get(
    "",
    response_model=ApiResponse[list[WarningResponse]],
    summary="查询预警记录",
    description="查询指定患者的预警记录，按时间倒序。可选 only_unresolved=true 仅返回未处理记录。",
)
def list_warnings(
    patient_id: int = Query(gt=0, description="患者 ID"),
    only_unresolved: bool = Query(default=False, description="仅返回未处理记录"),
    db: Session = Depends(get_db),
) -> ApiResponse[list[WarningResponse]]:
    _get_patient_or_raise(db, patient_id)

    query = select(Warning).where(Warning.patient_id == patient_id)
    if only_unresolved:
        query = query.where(Warning.is_resolved == False)  # noqa: E712
    query = query.order_by(Warning.created_at.desc())

    rows = db.scalars(query).all()
    return success_response([WarningResponse.model_validate(row) for row in rows])


@router.get(
    "/latest-unresolved",
    response_model=ApiResponse[list[WarningResponse]],
    summary="查询最新未处理预警",
    description="返回指定患者所有未处理的预警记录。",
)
def get_latest_unresolved(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[list[WarningResponse]]:
    _get_patient_or_raise(db, patient_id)

    rows = db.scalars(
        select(Warning)
        .where(Warning.patient_id == patient_id, Warning.is_resolved == False)  # noqa: E712
        .order_by(Warning.created_at.desc())
    ).all()

    return success_response([WarningResponse.model_validate(row) for row in rows])


@router.put(
    "/{warning_id}/resolve",
    response_model=ApiResponse[WarningResponse],
    summary="标记预警已处理",
    description="将指定预警标记为已处理。",
)
def resolve_warning(
    warning_id: int = Path(gt=0, description="预警 ID"),
    body: WarningResolveRequest = None,
    db: Session = Depends(get_db),
) -> ApiResponse[WarningResponse]:
    warning = db.get(Warning, warning_id)
    if warning is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warning not found.")

    warning.is_resolved = body.is_resolved
    db.commit()
    db.refresh(warning)

    return success_response(WarningResponse.model_validate(warning))


def check_and_create_warnings(db: Session, patient_id: int, assessment_id: int | None, assessment_data: dict) -> list[Warning]:
    """
    检查评估数据是否触发预警，创建预警记录。
    assessment_data 格式：{"heart_rate": 128, "spo2": 96, "dyspnea_score": 3, "fatigue_score": 5}
    返回创建的预警列表。
    同类型未处理预警已存在时跳过，避免重复。
    """
    # 查询已有未处理预警类型
    existing_unresolved_types = set(
        db.scalars(
            select(Warning.warning_type)
            .where(Warning.patient_id == patient_id, Warning.is_resolved == False)  # noqa: E712
        ).all()
    )

    created_warnings = []

    for warning_type, config in WARNING_THRESHOLDS.items():
        # 去重：同类型未处理预警已存在则跳过
        if warning_type in existing_unresolved_types:
            continue

        field = config["field"]
        value = assessment_data.get(field)
        if value is None:
            continue

        threshold = config["value"]
        operator = config["operator"]

        triggered = False
        if operator == ">" and value > threshold:
            triggered = True
        elif operator == "<" and value < threshold:
            triggered = True
        elif operator == ">=" and value >= threshold:
            triggered = True

        if triggered:
            message = config["message_template"].format(value=value, threshold=threshold)
            warning = Warning(
                patient_id=patient_id,
                assessment_id=assessment_id,
                warning_type=warning_type,
                metric_value=value,
                threshold=threshold,
                message=message,
                is_resolved=False,
            )
            db.add(warning)
            created_warnings.append(warning)

    if created_warnings:
        db.flush()  # flush 获取 id，但不 commit，让调用方统一 commit

    return created_warnings
