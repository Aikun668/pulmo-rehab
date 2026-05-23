from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from database import get_db
from models import TrainingLog, User, UserRole
from schemas import (
    TrainingLogResponse,
    TrainingLogUpsertRequest,
    TrainingLogUpsertResponse,
    TrainingProgress30dResponse,
    TrainingProgressDay,
)


router = APIRouter(prefix="/training-logs", tags=["training_logs"])


def _get_patient_or_raise(db: Session, patient_id: int) -> User:
    patient = db.get(User, patient_id)
    if patient is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found.")
    if patient.role != UserRole.PATIENT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The provided patient_id does not belong to a patient.",
        )
    return patient


@router.post("", response_model=TrainingLogUpsertResponse, status_code=status.HTTP_200_OK)
def upsert_training_log(
    payload: TrainingLogUpsertRequest,
    db: Session = Depends(get_db),
) -> TrainingLogUpsertResponse:
    _get_patient_or_raise(db, payload.patient_id)

    existing_log = db.scalar(
        select(TrainingLog).where(
            TrainingLog.patient_id == payload.patient_id,
            TrainingLog.train_date == payload.train_date,
        )
    )

    action = "created"
    if existing_log is None:
        training_log = TrainingLog(
            patient_id=payload.patient_id,
            train_date=payload.train_date,
            duration_minutes=payload.duration_minutes,
            sets_count=payload.sets_count,
            note=payload.note,
        )
        db.add(training_log)
    else:
        action = "updated"
        existing_log.duration_minutes = payload.duration_minutes
        existing_log.sets_count = payload.sets_count
        existing_log.note = payload.note
        training_log = existing_log

    db.commit()
    db.refresh(training_log)

    return TrainingLogUpsertResponse(
        action=action,
        data=TrainingLogResponse.model_validate(training_log),
    )


@router.get("", response_model=list[TrainingLogResponse])
def list_training_logs(
    patient_id: int = Query(gt=0),
    start_date: date | None = Query(default=None),
    end_date: date | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[TrainingLogResponse]:
    _get_patient_or_raise(db, patient_id)

    if start_date and end_date and start_date > end_date:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="start_date must be earlier than or equal to end_date.",
        )

    stmt = select(TrainingLog).where(TrainingLog.patient_id == patient_id)
    if start_date is not None:
        stmt = stmt.where(TrainingLog.train_date >= start_date)
    if end_date is not None:
        stmt = stmt.where(TrainingLog.train_date <= end_date)

    training_logs = db.scalars(stmt.order_by(TrainingLog.train_date.desc())).all()
    return [TrainingLogResponse.model_validate(item) for item in training_logs]


@router.get("/progress-30d", response_model=TrainingProgress30dResponse)
def get_training_progress_30d(
    patient_id: int = Query(gt=0),
    db: Session = Depends(get_db),
) -> TrainingProgress30dResponse:
    _get_patient_or_raise(db, patient_id)

    end_date = date.today()
    start_date = end_date - timedelta(days=29)

    stmt = (
        select(TrainingLog)
        .where(
            TrainingLog.patient_id == patient_id,
            TrainingLog.train_date >= start_date,
            TrainingLog.train_date <= end_date,
        )
        .order_by(TrainingLog.train_date.asc())
    )
    training_logs = db.scalars(stmt).all()

    logs_by_date = {
        item.train_date: TrainingProgressDay(
            date=item.train_date,
            duration_minutes=item.duration_minutes,
            sets_count=item.sets_count,
        )
        for item in training_logs
    }

    days: list[TrainingProgressDay] = []
    current_date = start_date
    while current_date <= end_date:
        days.append(
            logs_by_date.get(
                current_date,
                TrainingProgressDay(
                    date=current_date,
                    duration_minutes=0,
                    sets_count=0,
                ),
            )
        )
        current_date += timedelta(days=1)

    return TrainingProgress30dResponse(patient_id=patient_id, days=days)
