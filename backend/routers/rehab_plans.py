import json
import logging

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.responses import success_response
from core.security import get_current_user
from database import get_db
from models import RehabPlan, User, UserRole
from schemas import (
    ApiResponse,
    ExerciseItem,
    RehabPlanCreateRequest,
    RehabPlanResponse,
    RehabPlanUpdateRequest,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/rehab-plans", tags=["rehab_plans"])


def _get_user_or_raise(db: Session, user_id: int, expected_role: UserRole, detail: str) -> User:
    user = db.get(User, user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=detail)
    if user.role != expected_role:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"The provided user_id is not a {expected_role.value}.",
        )
    return user


def _ensure_patient_belongs_to_doctor(patient: User, doctor_id: int) -> None:
    if patient.doctor_id != doctor_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="当前医生无权访问该患者的训练方案。",
        )


def _exercises_to_json(exercises: list[ExerciseItem] | None) -> str | None:
    """将 exercises 列表序列化为 JSON 字符串存入数据库。"""
    if not exercises:
        return None
    return json.dumps(
        [ex.model_dump() for ex in exercises],
        ensure_ascii=False,
    )


def _json_to_exercises(exercises_json: str | None) -> list[dict]:
    """将数据库中的 JSON 字符串反序列化为 exercises 列表。"""
    if not exercises_json:
        return []
    try:
        data = json.loads(exercises_json)
        return data if isinstance(data, list) else []
    except (json.JSONDecodeError, TypeError):
        return []


def _enrich_response(plan: RehabPlan) -> dict:
    """构建包含 exercises 的响应。"""
    resp = RehabPlanResponse.model_validate(plan)
    resp_dict = resp.model_dump()
    resp_dict["exercises"] = _json_to_exercises(plan.exercises_json)
    return resp_dict


@router.post(
    "",
    response_model=ApiResponse[RehabPlanResponse],
    status_code=status.HTTP_200_OK,
    summary="新增训练方案",
    description="医生为指定患者新增一条训练方案记录。支持结构化 exercises。需要登录。",
)
def create_rehab_plan(
    payload: RehabPlanCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[RehabPlanResponse]:
    patient = _get_user_or_raise(db, payload.patient_id, UserRole.PATIENT, "Patient not found.")
    _get_user_or_raise(db, payload.doctor_id, UserRole.DOCTOR, "Doctor not found.")
    _ensure_patient_belongs_to_doctor(patient, payload.doctor_id)

    rehab_plan = RehabPlan(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        title=payload.title,
        content=payload.content,
        status="draft",
        exercises_json=_exercises_to_json(payload.exercises),
        adjustment_note=payload.adjustment_note,
    )
    db.add(rehab_plan)
    db.commit()
    db.refresh(rehab_plan)
    return success_response(_enrich_response(rehab_plan))


@router.get(
    "",
    response_model=ApiResponse[list[RehabPlanResponse]],
    summary="查询历史训练方案",
    description="按患者 ID 查询全部历史训练方案，按创建时间倒序返回。需要登录。",
)
def list_rehab_plans(
    patient_id: int = Query(gt=0, description="患者 ID"),
    doctor_id: int = Query(gt=0, description="医生 ID"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[list[RehabPlanResponse]]:
    patient = _get_user_or_raise(db, patient_id, UserRole.PATIENT, "Patient not found.")
    _get_user_or_raise(db, doctor_id, UserRole.DOCTOR, "Doctor not found.")
    _ensure_patient_belongs_to_doctor(patient, doctor_id)

    rehab_plans = db.scalars(
        select(RehabPlan)
        .where(RehabPlan.patient_id == patient_id, RehabPlan.doctor_id == doctor_id)
        .order_by(RehabPlan.created_at.desc(), RehabPlan.id.desc())
    ).all()

    return success_response([_enrich_response(plan) for plan in rehab_plans])


@router.put(
    "/{plan_id}",
    response_model=ApiResponse[RehabPlanResponse],
    summary="审核/编辑训练方案",
    description="医生审核或编辑已有的训练方案，可修改标题、内容、动作、状态等。需要登录。",
)
def update_rehab_plan(
    plan_id: int = Path(gt=0, description="方案 ID"),
    payload: RehabPlanUpdateRequest = ...,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ApiResponse[RehabPlanResponse]:
    plan = db.get(RehabPlan, plan_id)
    if plan is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="方案不存在。")

    # 验证权限：只有该方案的医生才能修改
    if plan.doctor_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="您无权修改此训练方案。",
        )

    # 部分更新
    if payload.title is not None:
        plan.title = payload.title
    if payload.content is not None:
        plan.content = payload.content
    if payload.exercises is not None:
        plan.exercises_json = _exercises_to_json(payload.exercises)
    if payload.status is not None:
        if payload.status not in ("draft", "approved", "active"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="status 必须为 draft/approved/active 之一",
            )
        plan.status = payload.status

    db.commit()
    db.refresh(plan)
    return success_response(_enrich_response(plan))


@router.get(
    "/active",
    response_model=ApiResponse[RehabPlanResponse | None],
    summary="查询患者当前生效的训练方案",
    description="患者端使用，返回最新一条 status=active 的方案。无需 doctor_id。",
)
def get_active_plan(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[RehabPlanResponse | None]:
    _get_user_or_raise(db, patient_id, UserRole.PATIENT, "Patient not found.")

    plan = db.scalar(
        select(RehabPlan)
        .where(RehabPlan.patient_id == patient_id, RehabPlan.status == "active")
        .order_by(RehabPlan.created_at.desc())
        .limit(1)
    )

    if plan is None:
        return success_response(None)

    return success_response(_enrich_response(plan))
