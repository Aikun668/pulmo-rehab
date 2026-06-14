from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.responses import success_response
from core.security import get_current_user
from database import get_db
from models import AiSummary, User, UserRole
from schemas import AiSummaryResponse, ApiResponse


router = APIRouter(prefix="/ai-summaries", tags=["ai_summaries"])


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


@router.get(
    "",
    response_model=ApiResponse[list[AiSummaryResponse]],
    summary="查询 AI 周报历史列表",
    description="返回指定患者全部 AI 周报，按创建时间倒序返回，最新排最前。需要登录。",
)
def list_ai_summaries(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[list[AiSummaryResponse]]:
    _get_patient_or_raise(db, patient_id)

    summaries = db.scalars(
        select(AiSummary)
        .where(AiSummary.patient_id == patient_id)
        .order_by(AiSummary.created_at.desc(), AiSummary.id.desc())
    ).all()
    return success_response([AiSummaryResponse.model_validate(item) for item in summaries])


@router.get(
    "/latest",
    response_model=ApiResponse[AiSummaryResponse | None],
    summary="查询最新 AI 周报",
    description="返回指定患者最新一条 AI 周报。若当前患者还没有 AI 周报，则返回 data 为 null。需要登录。",
)
def get_latest_ai_summary(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[AiSummaryResponse | None]:
    _get_patient_or_raise(db, patient_id)

    latest_summary = db.scalar(
        select(AiSummary)
        .where(AiSummary.patient_id == patient_id)
        .order_by(AiSummary.created_at.desc(), AiSummary.id.desc())
        .limit(1)
    )

    return success_response(
        AiSummaryResponse.model_validate(latest_summary) if latest_summary is not None else None
    )
