from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.responses import success_response
from database import get_db
from models import Assessment, User, UserRole
from schemas import ApiResponse, PatientProfileUpdateRequest, PatientProfileResponse, RehabLevelResponse
from services.grading_service import compute_rehab_level, LEVEL_INFO


router = APIRouter(prefix="/patients", tags=["patients"])


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


def _recalc_and_save_level(db: Session, patient: User, auto_commit: bool = True) -> int:
    """根据最新评估重新计算等级并保存到患者记录。"""
    latest_assessment = db.scalar(
        select(Assessment)
        .where(Assessment.patient_id == patient.id)
        .order_by(Assessment.created_at.desc())
        .limit(1)
    )
    level = compute_rehab_level(patient, latest_assessment)
    patient.rehab_level = level
    if auto_commit:
        db.commit()
        db.refresh(patient)
    return level


@router.get(
    "/{patient_id}/profile",
    response_model=ApiResponse[PatientProfileResponse],
    summary="查询患者健康档案",
    description="返回指定患者的健康档案信息，包括恢复阶段、病史等。",
)
def get_patient_profile(
    patient_id: int = Path(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[PatientProfileResponse]:
    patient = _get_patient_or_raise(db, patient_id)
    return success_response(PatientProfileResponse.model_validate(patient))


@router.put(
    "/{patient_id}/profile",
    response_model=ApiResponse[PatientProfileResponse],
    summary="更新患者健康档案",
    description="更新指定患者的健康档案字段，仅更新请求中提供的字段（部分更新）。更新后自动重新计算康复等级。",
)
def update_patient_profile(
    patient_id: int = Path(gt=0, description="患者 ID"),
    body: PatientProfileUpdateRequest = None,
    db: Session = Depends(get_db),
) -> ApiResponse[PatientProfileResponse]:
    patient = _get_patient_or_raise(db, patient_id)

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(patient, field, value)

    # 档案变更可能影响分级，重新计算
    _recalc_and_save_level(db, patient)

    return success_response(PatientProfileResponse.model_validate(patient))


@router.get(
    "/{patient_id}/rehab-level",
    response_model=ApiResponse[RehabLevelResponse],
    summary="查询患者五级康复等级",
    description="重新计算并返回患者当前康复等级、等级名称和推荐训练。同时更新患者记录中的等级缓存。",
)
def get_rehab_level(
    patient_id: int = Path(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[RehabLevelResponse]:
    patient = _get_patient_or_raise(db, patient_id)

    level = _recalc_and_save_level(db, patient)
    info = LEVEL_INFO[level]

    return success_response(RehabLevelResponse(
        patient_id=patient.id,
        rehab_level=level,
        level_label=info["label"],
        level_name=info["name"],
        recommended_training=info["training"],
    ))
