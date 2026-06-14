from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.responses import success_response
from database import get_db
from models import Assessment, User, UserRole
from schemas import ApiResponse, AssessmentCreateRequest, AssessmentResponse
from services.grading_service import compute_rehab_level
from routers.warnings import check_and_create_warnings


router = APIRouter(prefix="/assessments", tags=["assessments"])


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


@router.post(
    "",
    response_model=ApiResponse[AssessmentResponse],
    summary="新增康复评估",
    description="为指定患者新增一条康复评估记录，包含心率、血氧、呼吸困难评分、疲劳评分等。",
)
def create_assessment(
    body: AssessmentCreateRequest,
    db: Session = Depends(get_db),
) -> ApiResponse[AssessmentResponse]:
    _get_patient_or_raise(db, body.patient_id)

    assessment = Assessment(
        patient_id=body.patient_id,
        heart_rate=body.heart_rate,
        spo2=body.spo2,
        dyspnea_score=body.dyspnea_score,
        fatigue_score=body.fatigue_score,
        notes=body.notes,
    )
    db.add(assessment)
    db.flush()  # flush 获取 assessment.id，但不 commit

    # 新增评估后自动重算康复等级
    patient = _get_patient_or_raise(db, body.patient_id)
    level = compute_rehab_level(patient, assessment)
    patient.rehab_level = level

    # 检查预警阈值
    check_and_create_warnings(
        db,
        patient_id=body.patient_id,
        assessment_id=assessment.id,
        assessment_data={
            "heart_rate": body.heart_rate,
            "spo2": body.spo2,
            "dyspnea_score": body.dyspnea_score,
            "fatigue_score": body.fatigue_score,
        },
    )

    db.commit()  # 统一一次 commit
    db.refresh(assessment)

    return success_response(AssessmentResponse.model_validate(assessment))


@router.get(
    "",
    response_model=ApiResponse[list[AssessmentResponse]],
    summary="查询评估记录列表",
    description="查询指定患者的评估记录，按时间倒序排列。",
)
def list_assessments(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[list[AssessmentResponse]]:
    _get_patient_or_raise(db, patient_id)

    rows = db.scalars(
        select(Assessment)
        .where(Assessment.patient_id == patient_id)
        .order_by(Assessment.created_at.desc())
    ).all()

    return success_response([AssessmentResponse.model_validate(row) for row in rows])


@router.get(
    "/latest",
    response_model=ApiResponse[AssessmentResponse | None],
    summary="查询最新评估记录",
    description="返回指定患者最新一条评估记录，无数据返回 null。",
)
def get_latest_assessment(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[AssessmentResponse | None]:
    _get_patient_or_raise(db, patient_id)

    row = db.scalar(
        select(Assessment)
        .where(Assessment.patient_id == patient_id)
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )

    if row is None:
        return success_response(None)

    return success_response(AssessmentResponse.model_validate(row))
