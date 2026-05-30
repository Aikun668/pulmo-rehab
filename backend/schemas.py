from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class ApiResponse(BaseModel, Generic[T]):
    code: int = 200
    message: str = "success"
    data: T


class HealthResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "status": "ok",
                "app_name": "Pulmo Rehab API",
                "version": "0.1.0",
                "server_time": "2026-05-23T04:30:00Z",
            }
        }
    )

    status: str
    app_name: str
    version: str
    server_time: datetime


class TrainingLogUpsertRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "train_date": "2026-05-23",
                "duration_minutes": 30,
                "sets_count": 3,
                "note": "今天训练状态稳定",
            }
        }
    )

    patient_id: int = Field(gt=0)
    train_date: date
    duration_minutes: int = Field(gt=0)
    sets_count: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=200)


class TrainingLogResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "patient_id": 1,
                "train_date": "2026-05-23",
                "duration_minutes": 30,
                "sets_count": 3,
                "note": "今天训练状态稳定",
                "created_at": "2026-05-23T04:30:00Z",
            }
        },
    )

    id: int
    patient_id: int
    train_date: date
    duration_minutes: int
    sets_count: int
    note: str | None
    created_at: datetime


class TrainingLogUpsertResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "action": "created",
                "data": {
                    "id": 1,
                    "patient_id": 1,
                    "train_date": "2026-05-23",
                    "duration_minutes": 30,
                    "sets_count": 3,
                    "note": "今天训练状态稳定",
                    "created_at": "2026-05-23T04:30:00Z",
                },
            }
        }
    )

    action: Literal["created", "updated"]
    data: TrainingLogResponse


class TrainingProgressDay(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "date": "2026-05-23",
                "duration_minutes": 30,
                "sets_count": 3,
            }
        }
    )

    date: date
    duration_minutes: int
    sets_count: int


class TrainingProgress30dResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "days": [
                    {"date": "2026-05-22", "duration_minutes": 0, "sets_count": 0},
                    {"date": "2026-05-23", "duration_minutes": 30, "sets_count": 3},
                ],
            }
        }
    )

    patient_id: int
    days: list[TrainingProgressDay]


class RehabPlanCreateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "doctor_id": 2,
                "title": "第一周训练方案",
                "content": "每天进行呼吸训练 20 分钟，分 3 组完成。",
            }
        }
    )

    patient_id: int = Field(gt=0)
    doctor_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=2000)


class RehabPlanResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "patient_id": 1,
                "doctor_id": 2,
                "title": "第一周训练方案",
                "content": "每天进行呼吸训练 20 分钟，分 3 组完成。",
                "created_at": "2026-05-23T04:30:00Z",
            }
        },
    )

    id: int
    patient_id: int
    doctor_id: int
    title: str
    content: str
    created_at: datetime


class DoctorPatientStatsResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "check_in_count_7d": 5,
                "total_duration_minutes": 320,
                "last_check_in_at": "2026-05-23T00:00:00Z",
            }
        }
    )

    check_in_count_7d: int
    total_duration_minutes: int
    last_check_in_at: datetime | None


class DoctorPatientItemResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 1,
                "name": "张三",
                "stats": {
                    "check_in_count_7d": 5,
                    "total_duration_minutes": 320,
                    "last_check_in_at": "2026-05-23T00:00:00Z",
                },
            }
        }
    )

    id: int
    name: str
    stats: DoctorPatientStatsResponse


class AiSummaryResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "patient_id": 1,
                "summary_week_start": "2026-05-19",
                "summary_week_end": "2026-05-25",
                "content": "本周训练较稳定，请继续保持规律训练。",
                "created_at": "2026-05-26T00:00:00Z",
            }
        },
    )

    id: int
    patient_id: int
    summary_week_start: date
    summary_week_end: date
    content: str
    created_at: datetime
