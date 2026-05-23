from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    status: str
    app_name: str
    version: str
    server_time: datetime


class TrainingLogUpsertRequest(BaseModel):
    patient_id: int = Field(gt=0)
    train_date: date
    duration_minutes: int = Field(gt=0)
    sets_count: int = Field(gt=0)
    note: str | None = Field(default=None, max_length=200)


class TrainingLogResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    patient_id: int
    train_date: date
    duration_minutes: int
    sets_count: int
    note: str | None
    created_at: datetime


class TrainingLogUpsertResponse(BaseModel):
    action: Literal["created", "updated"]
    data: TrainingLogResponse


class TrainingProgressDay(BaseModel):
    date: date
    duration_minutes: int
    sets_count: int


class TrainingProgress30dResponse(BaseModel):
    patient_id: int
    days: list[TrainingProgressDay]
