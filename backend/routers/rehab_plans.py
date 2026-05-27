from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from core.responses import success_response
from database import get_db
from models import RehabPlan, User, UserRole
from schemas import ApiResponse, RehabPlanCreateRequest, RehabPlanResponse


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


@router.post(
    "",
    response_model=ApiResponse[RehabPlanResponse],
    status_code=status.HTTP_200_OK,
    summary="新增训练方案",
    description="医生为指定患者新增一条训练方案记录。MVP 阶段保留全部历史，不覆盖旧方案。",
)
def create_rehab_plan(
    payload: RehabPlanCreateRequest,
    db: Session = Depends(get_db),
) -> ApiResponse[RehabPlanResponse]:
    _get_user_or_raise(db, payload.patient_id, UserRole.PATIENT, "Patient not found.")
    _get_user_or_raise(db, payload.doctor_id, UserRole.DOCTOR, "Doctor not found.")

    rehab_plan = RehabPlan(
        patient_id=payload.patient_id,
        doctor_id=payload.doctor_id,
        title=payload.title,
        content=payload.content,
    )
    db.add(rehab_plan)
    db.commit()
    db.refresh(rehab_plan)
    return success_response(RehabPlanResponse.model_validate(rehab_plan))


@router.get(
    "",
    response_model=ApiResponse[list[RehabPlanResponse]],
    summary="查询历史训练方案",
    description="按患者 ID 查询全部历史训练方案，按创建时间倒序返回，最新方案排在最前。",
)
def list_rehab_plans(
    patient_id: int = Query(gt=0, description="患者 ID"),
    db: Session = Depends(get_db),
) -> ApiResponse[list[RehabPlanResponse]]:
    _get_user_or_raise(db, patient_id, UserRole.PATIENT, "Patient not found.")

    rehab_plans = db.scalars(
        select(RehabPlan)
        .where(RehabPlan.patient_id == patient_id)
        .order_by(RehabPlan.created_at.desc(), RehabPlan.id.desc())
    ).all()
    return success_response([RehabPlanResponse.model_validate(item) for item in rehab_plans])
