from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from core.config import settings
from database import Base, engine
from routers.ai_summaries import router as ai_summaries_router
from routers.assessments import router as assessments_router
from routers.auth import router as auth_router
from routers.doctors import router as doctors_router
from routers.health import router as health_router
from routers.patients import router as patients_router
from routers.prescriptions import router as prescriptions_router
from routers.rehab_plans import router as rehab_plans_router
from routers.training_logs import router as training_logs_router
from routers.warnings import router as warnings_router
from tasks.ai_summary_job import start_ai_summary_scheduler, stop_ai_summary_scheduler

# Import models before create_all so SQLAlchemy can register table metadata.
from models import Assessment, AiSummary, RehabPlan, TrainingLog, User, Warning  # noqa: F401


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    Base.metadata.create_all(bind=engine)
    scheduler = start_ai_summary_scheduler()
    yield
    stop_ai_summary_scheduler(scheduler)


app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    debug=settings.debug,
    docs_url=f"{settings.api_prefix}/docs",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    redoc_url=f"{settings.api_prefix}/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix=settings.api_prefix)
app.include_router(health_router, prefix=settings.api_prefix)
app.include_router(ai_summaries_router, prefix=settings.api_prefix)
app.include_router(assessments_router, prefix=settings.api_prefix)
app.include_router(doctors_router, prefix=settings.api_prefix)
app.include_router(patients_router, prefix=settings.api_prefix)
app.include_router(prescriptions_router, prefix=settings.api_prefix)
app.include_router(rehab_plans_router, prefix=settings.api_prefix)
app.include_router(training_logs_router, prefix=settings.api_prefix)
app.include_router(warnings_router, prefix=settings.api_prefix)
