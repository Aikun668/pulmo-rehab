from datetime import date, datetime, time, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Path, status
from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from core.responses import success_response
from database import get_db
from models import TrainingLog, User, UserRole, Warning
from schemas import ApiResponse, DoctorPatientItemResponse, DoctorPatientStatsResponse


router = APIRouter(prefix="/doctors", tags=["doctors"])


def _get_doctor_or_raise(db: Session, doctor_id: int) -> User:
    doctor = db.get(User, doctor_id)
    if doctor is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Doctor not found.")
    if doctor.role != UserRole.DOCTOR:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided doctor_id does not belong to a doctor.",
        )
    return doctor


@router.get(
    "/{doctor_id}/patients",
    response_model=ApiResponse[list[DoctorPatientItemResponse]],
    summary="查询医生患者列表",
    description="返回指定医生名下患者列表，并附带近7天打卡次数、累计训练时长、最近一次训练日期，默认按最近一次训练日期倒序。",
)
def list_doctor_patients(
    doctor_id: int = Path(gt=0, description="医生 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[list[DoctorPatientItemResponse]]:
    _get_doctor_or_raise(db, doctor_id)

    patients = db.scalars(
        select(User)
        .where(User.role == UserRole.PATIENT, User.doctor_id == doctor_id)
        .order_by(User.id.asc())
    ).all()

    if not patients:
        return success_response([])

    patient_ids = [patient.id for patient in patients]
    today = date.today()
    seven_days_ago = today - timedelta(days=6)

    stats_rows = db.execute(
        select(
            TrainingLog.patient_id,
            func.sum(
                case((TrainingLog.train_date >= seven_days_ago, 1), else_=0)
            ).label("check_in_count_7d"),
            func.coalesce(func.sum(TrainingLog.duration_minutes), 0).label("total_duration_minutes"),
            func.max(TrainingLog.train_date).label("last_check_in_date"),
        )
        .where(TrainingLog.patient_id.in_(patient_ids))
        .group_by(TrainingLog.patient_id)
    ).all()

    stats_by_patient_id = {
        row.patient_id: DoctorPatientStatsResponse(
            check_in_count_7d=int(row.check_in_count_7d or 0),
            total_duration_minutes=int(row.total_duration_minutes or 0),
            last_check_in_at=_normalize_train_date(row.last_check_in_date),
        )
        for row in stats_rows
    }

    # 查询有未处理预警的患者
    warning_patient_ids = set(
        db.scalars(
            select(Warning.patient_id)
            .where(Warning.patient_id.in_(patient_ids), Warning.is_resolved == False)  # noqa: E712
            .distinct()
        ).all()
    )

    items = [
        DoctorPatientItemResponse(
            id=patient.id,
            name=patient.name,
            is_post_pneumonia=patient.is_post_pneumonia,
            discharge_date=patient.discharge_date,
            recovery_stage=patient.recovery_stage,
            is_long_term_smoker=patient.is_long_term_smoker,
            has_chronic_respiratory_disease=patient.has_chronic_respiratory_disease,
            has_cardiovascular_disease=patient.has_cardiovascular_disease,
            rehab_level=patient.rehab_level,
            stats=stats_by_patient_id.get(
                patient.id,
                DoctorPatientStatsResponse(
                    check_in_count_7d=0,
                    total_duration_minutes=0,
                    last_check_in_at=None,
                    has_unresolved_warnings=patient.id in warning_patient_ids,
                ),
            ),
        )
        for patient in patients
    ]

    items.sort(
        key=lambda item: (
            item.stats.last_check_in_at is None,
            -(item.stats.last_check_in_at.timestamp()) if item.stats.last_check_in_at else 0.0,
            item.id,
        )
    )

    return success_response(items)


def _normalize_train_date(value: date | None) -> datetime | None:
    if value is None:
        return None
    return datetime.combine(value, time.min, tzinfo=timezone.utc)
