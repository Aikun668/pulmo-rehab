import logging

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from core.config import settings
from core.responses import success_response
from database import get_db
from models import User, UserRole
from schemas import ApiResponse, PrescriptionGenerateRequest, PrescriptionGenerateResponse
from services.deepseek_client import DeepSeekClient
from services.grading_service import LEVEL_INFO
from services.prescription_service import PrescriptionService

logger = logging.getLogger(__name__)


router = APIRouter(prefix="/prescriptions", tags=["prescriptions"])


def _get_deepseek_client() -> DeepSeekClient:
    return DeepSeekClient(
        api_key=settings.deepseek_api_key,
        base_url=settings.deepseek_base_url,
        model=settings.deepseek_model,
    )


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
    "/generate",
    response_model=ApiResponse[PrescriptionGenerateResponse],
    summary="AI 生成训练处方",
    description="根据患者等级+档案+最新评估，AI 自动生成个性化训练方案。医生可审核修改后再通过 rehab-plans 接口下发。",
)
def generate_prescription(
    body: PrescriptionGenerateRequest,
    db: Session = Depends(get_db),
) -> ApiResponse[PrescriptionGenerateResponse]:
    patient = _get_patient_or_raise(db, body.patient_id)

    deepseek_client = _get_deepseek_client()
    service = PrescriptionService(db, deepseek_client)

    try:
        result = service.generate(patient)
    except Exception as exc:
        logger.exception("Failed to generate prescription for patient_id=%s: %s", patient.id, exc)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AI 处方生成失败：{exc}",
        )

    rehab_level = patient.rehab_level or 3
    level_info = LEVEL_INFO.get(rehab_level, LEVEL_INFO[3])

    # 构建结构化响应
    title = result.get("title", f"{level_info['name']}训练方案")
    exercises_raw = result.get("exercises", [])

    # 如果 AI 返回 raw_content（JSON 解析失败），把原始内容放入一个 exercise
    if "raw_content" in result and not exercises_raw:
        exercises_raw = [{
            "name": "AI 生成方案",
            "purpose": "",
            "duration": "",
            "steps": [result["raw_content"]],
            "precautions": [],
        }]

    exercises = []
    for ex in exercises_raw:
        if isinstance(ex, dict):
            exercises.append({
                "name": ex.get("name", "训练动作"),
                "purpose": ex.get("purpose", ""),
                "duration": ex.get("duration", ""),
                "steps": ex.get("steps", []),
                "precautions": ex.get("precautions", []),
            })

    # 如果 exercises 为空，使用默认推荐
    if not exercises:
        exercises = [{
            "name": level_info["training"],
            "purpose": f"适用于{level_info['name']}阶段患者",
            "duration": "每日2-3次，每次10-15分钟",
            "steps": ["按医生指导进行训练"],
            "precautions": ["如出现头晕、气短加重，请立即停止"],
        }]

    response_data = PrescriptionGenerateResponse(
        patient_id=patient.id,
        rehab_level=rehab_level,
        title=title,
        exercises=exercises,
    )

    return success_response(response_data)
