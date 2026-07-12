from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from core.responses import success_response
from core.config import settings
from database import get_db
from models import User, UserRole
from schemas import AiGuidanceResponse, AiGuidanceChatRequest, AiGuidanceChatResponse, ApiResponse
from services.ai_guidance_service import AiGuidanceService
from services.deepseek_client import DeepSeekClient


router = APIRouter(prefix="/ai-guidance", tags=["ai_guidance"])


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
    "/latest",
    response_model=ApiResponse[AiGuidanceResponse | None],
    summary="获取最新AI指导内容",
    description="返回指定患者的最新AI综合指导（基于已下发周报 + 训练数据动态构建）。需要登录。",
)
def get_latest_ai_guidance(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[AiGuidanceResponse | None]:
    _get_patient_or_raise(db, patient_id)

    service = AiGuidanceService(db=db)
    guidance = service.get_latest_guidance(patient_id)

    if guidance is None:
        return success_response(None)

    return success_response(AiGuidanceResponse(**guidance))


@router.post(
    "/chat",
    response_model=ApiResponse[AiGuidanceChatResponse],
    summary="AI指导对话",
    description="患者提问，AI基于其当前康复数据给出个性化回复。需要登录且 DeepSeek API 已配置。",
)
def ai_guidance_chat(
    body: AiGuidanceChatRequest,
    db: Session = Depends(get_db),
) -> ApiResponse[AiGuidanceChatResponse]:
    _get_patient_or_raise(db, body.patient_id)

    if not settings.deepseek_api_key:
        # DeepSeek未配置时返回兜底回复
        fallback = (
            "感谢您的提问！由于AI服务暂未配置，暂时无法给出个性化回复。\n\n"
            "建议您继续坚持当前训练方案，如有不适请及时联系您的医生。"
        )
        return success_response(AiGuidanceChatResponse(reply=fallback))

    try:
        deepseek_client = DeepSeekClient(
            api_key=settings.deepseek_api_key,
            base_url=settings.deepseek_base_url,
            model=settings.deepseek_model,
        )
        service = AiGuidanceService(db=db, deepseek_client=deepseek_client)
        reply = service.chat_reply(body.patient_id, body.question)
        return success_response(AiGuidanceChatResponse(reply=reply))
    except RuntimeError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(exc))
