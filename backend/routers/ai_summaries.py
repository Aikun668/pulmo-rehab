from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session
from datetime import datetime, timezone

from core.responses import success_response
from database import get_db
from models import AiSummary, User, UserRole
from schemas import AiSummaryResponse, AiSummaryGenerateRequest, ApiResponse
from services.ai_summary_service import AiSummaryService
from services.deepseek_client import DeepSeekClient
from core.config import settings


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


@router.post(
    "/generate",
    response_model=ApiResponse[AiSummaryResponse],
    summary="生成 AI 周报（需医生输入）",
    description="医生必须先提供关键建议（最少10字），AI 基于医生输入 + 患者训练数据生成补充内容。",
)
def generate_ai_summary(
    body: AiSummaryGenerateRequest,
    db: Session = Depends(get_db),
) -> ApiResponse[AiSummaryResponse]:
    _get_patient_or_raise(db, body.patient_id)

    try:
        deepseek_client = DeepSeekClient(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_model,
        )
        service = AiSummaryService(db=db, deepseek_client=deepseek_client)
        summary = service.generate_for_patient(
            patient_id=body.patient_id,
            doctor_input=body.doctor_input,
        )
        return success_response(AiSummaryResponse.model_validate(summary))
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))


@router.post(
    "/dispatch",
    response_model=ApiResponse[AiSummaryResponse],
    summary="一键下发 AI 小结",
    description="将生成的 AI 小结标记为已下发给患者。",
)
def dispatch_ai_summary(
    summary_id: int = Query(gt=0, description="AI 小结 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[AiSummaryResponse]:
    summary = db.get(AiSummary, summary_id)
    if summary is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="AI summary not found.")
    summary.dispatched_at = datetime.now(timezone.utc)
    db.commit()
    db.refresh(summary)
    return success_response(AiSummaryResponse.model_validate(summary))
