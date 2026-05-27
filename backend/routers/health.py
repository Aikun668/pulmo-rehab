from datetime import datetime, timezone

from fastapi import APIRouter

from core.config import settings
from core.responses import success_response
from schemas import ApiResponse, HealthResponse


router = APIRouter(tags=["health"])


@router.get(
    "/health",
    response_model=ApiResponse[HealthResponse],
    summary="健康检查",
    description="用于确认后端服务是否正常启动，前端联调与部署检查都可直接调用该接口。",
)
def health_check() -> ApiResponse[HealthResponse]:
    return success_response(
        HealthResponse(
            status="ok",
            app_name=settings.app_name,
            version=settings.app_version,
            server_time=datetime.now(timezone.utc),
        )
    )
