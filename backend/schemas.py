from datetime import date, datetime
from typing import Generic, Literal, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from models import RecoveryStage, WarningType

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
                "exercises": [
                    {
                        "name": "缩唇呼吸训练",
                        "purpose": "改善呼吸效率",
                        "duration": "每次10分钟",
                        "steps": ["鼻吸气4秒", "缩唇呼气6秒"],
                        "precautions": ["不要用力呼气"],
                    }
                ],
                "adjustment_note": "根据趋势分析，维持当前训练强度",
            }
        }
    )

    patient_id: int = Field(gt=0)
    doctor_id: int = Field(gt=0)
    title: str = Field(min_length=1, max_length=100)
    content: str = Field(min_length=1, max_length=2000)
    exercises: list[ExerciseItem] | None = Field(default=None, description="结构化训练动作")
    adjustment_note: str | None = Field(default=None, max_length=500, description="AI 调整说明")


class RehabPlanUpdateRequest(BaseModel):
    """医生审核/编辑处方"""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "title": "修改后的训练方案",
                "content": "每天进行呼吸训练 25 分钟",
                "status": "approved",
            }
        }
    )

    title: str | None = Field(default=None, min_length=1, max_length=100)
    content: str | None = Field(default=None, min_length=1, max_length=2000)
    exercises: list[ExerciseItem] | None = Field(default=None, description="结构化训练动作")
    status: str | None = Field(default=None, pattern="^(draft|approved|active)$")


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
                "status": "draft",
                "exercises": [],
                "adjustment_note": None,
                "created_at": "2026-05-23T04:30:00Z",
            }
        },
    )

    id: int
    patient_id: int
    doctor_id: int
    title: str
    content: str
    status: str = "draft"
    exercises: list[ExerciseItem] = []
    adjustment_note: str | None = None
    created_at: datetime


class DoctorPatientStatsResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "check_in_count_7d": 5,
                "total_duration_minutes": 320,
                "last_check_in_at": "2026-05-23T00:00:00Z",
                "has_unresolved_warnings": False,
            }
        }
    )

    check_in_count_7d: int
    total_duration_minutes: int
    last_check_in_at: datetime | None
    has_unresolved_warnings: bool = False


class DoctorPatientItemResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": 1,
                "name": "张三",
                "is_post_pneumonia": True,
                "discharge_date": "2026-05-01",
                "recovery_stage": "mid",
                "is_long_term_smoker": False,
                "has_chronic_respiratory_disease": False,
                "has_cardiovascular_disease": False,
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
    is_post_pneumonia: bool | None = None
    discharge_date: date | None = None
    recovery_stage: RecoveryStage | None = None
    is_long_term_smoker: bool | None = None
    has_chronic_respiratory_disease: bool | None = None
    has_cardiovascular_disease: bool | None = None
    rehab_level: int | None = None
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


class DevLoginRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"patient_id": 1}
        }
    )

    patient_id: int = Field(gt=0)


class WxLoginRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {"code": "0a1b2c3d4e5f"}
        }
    )

    code: str = Field(min_length=1)


class LoginResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "user_id": 1,
                "role": "patient",
                "name": "张三",
                "doctor_id": 13,
            }
        }
    )

    token: str
    user_id: int
    role: str
    name: str
    doctor_id: int | None


class PatientProfileUpdateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "is_post_pneumonia": True,
                "discharge_date": "2026-05-01",
                "recovery_stage": "mid",
                "is_long_term_smoker": False,
                "has_chronic_respiratory_disease": False,
                "has_cardiovascular_disease": False,
            }
        }
    )

    is_post_pneumonia: bool | None = None
    discharge_date: date | None = None
    recovery_stage: RecoveryStage | None = None
    is_long_term_smoker: bool | None = None
    has_chronic_respiratory_disease: bool | None = None
    has_cardiovascular_disease: bool | None = None


class PatientProfileResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "name": "张三",
                "is_post_pneumonia": True,
                "discharge_date": "2026-05-01",
                "recovery_stage": "mid",
                "is_long_term_smoker": False,
                "has_chronic_respiratory_disease": False,
                "has_cardiovascular_disease": False,
            }
        },
    )

    id: int
    name: str
    is_post_pneumonia: bool | None = None
    discharge_date: date | None = None
    recovery_stage: RecoveryStage | None = None
    is_long_term_smoker: bool | None = None
    has_chronic_respiratory_disease: bool | None = None
    has_cardiovascular_disease: bool | None = None
    rehab_level: int | None = None


class RehabLevelResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "rehab_level": 3,
                "level_label": "Level 3",
                "level_name": "中度恢复",
                "recommended_training": "深吸气训练 + 呼吸节奏控制",
            }
        }
    )

    patient_id: int
    rehab_level: int
    level_label: str
    level_name: str
    recommended_training: str


class ExerciseItem(BaseModel):
    name: str = Field(description="训练动作名称")
    purpose: str = Field(default="", description="训练目的")
    duration: str = Field(default="", description="时长/次数描述")
    steps: list[str] = Field(default_factory=list, description="具体步骤")
    precautions: list[str] = Field(default_factory=list, description="注意事项")


class PrescriptionGenerateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "save_as_draft": True,
            }
        }
    )

    patient_id: int = Field(gt=0)
    save_as_draft: bool = Field(
        default=False,
        description="是否自动保存为 draft RehabPlan，医生可在 rehab-plans 接口审核下发",
    )


class PrescriptionGenerateResponse(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "rehab_level": 3,
                "title": "居家肺康复训练方案（中度恢复）",
                "exercises": [
                    {
                        "name": "缩唇呼吸训练",
                        "purpose": "改善呼吸效率，延长呼气时间",
                        "duration": "每次10分钟，每日3次",
                        "steps": ["鼻吸气4秒", "缩唇缓慢呼气6秒", "自然停顿2秒"],
                        "precautions": ["不要用力呼气", "如感头晕请停止"],
                    }
                ],
                "adjustment_note": "趋势稳定，维持当前训练方案",
                "saved_plan_id": 5,
            }
        }
    )

    patient_id: int
    rehab_level: int
    title: str
    exercises: list[ExerciseItem]
    adjustment_note: str | None = None
    saved_plan_id: int | None = None


class AssessmentCreateRequest(BaseModel):
    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "patient_id": 1,
                "heart_rate": 78,
                "spo2": 96,
                "dyspnea_score": 2,
                "fatigue_score": 3,
                "notes": "活动后轻微气短，整体状态尚可",
            }
        }
    )

    patient_id: int = Field(gt=0)
    heart_rate: int | None = Field(default=None, ge=40, le=200, description="心率（bpm）")
    spo2: int | None = Field(default=None, ge=70, le=100, description="血氧饱和度（%）")
    dyspnea_score: int | None = Field(default=None, ge=1, le=5, description="呼吸困难评分（1-5级）")
    fatigue_score: int | None = Field(default=None, ge=1, le=10, description="疲劳评分（1-10级）")
    notes: str | None = Field(default=None, max_length=500, description="评估备注")


class AssessmentResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "patient_id": 1,
                "heart_rate": 78,
                "spo2": 96,
                "dyspnea_score": 2,
                "fatigue_score": 3,
                "notes": "活动后轻微气短，整体状态尚可",
                "created_at": "2026-06-14T08:00:00Z",
            }
        },
    )

    id: int
    patient_id: int
    heart_rate: int | None = None
    spo2: int | None = None
    dyspnea_score: int | None = None
    fatigue_score: int | None = None
    notes: str | None = None
    created_at: datetime


class WarningResponse(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        json_schema_extra={
            "example": {
                "id": 1,
                "patient_id": 1,
                "assessment_id": 5,
                "warning_type": "heart_rate_high",
                "metric_value": 128,
                "threshold": 120,
                "message": "心率异常：128 bpm（阈值 120 bpm），建议暂停训练并观察",
                "is_resolved": False,
                "created_at": "2026-06-14T10:00:00Z",
            }
        },
    )

    id: int
    patient_id: int
    assessment_id: int | None = None
    warning_type: WarningType
    metric_value: int
    threshold: int
    message: str
    is_resolved: bool = False
    created_at: datetime


class WarningResolveRequest(BaseModel):
    is_resolved: bool = Field(default=True, description="标记为已处理")


# 预警阈值常量（GPT 报告模块八）
WARNING_THRESHOLDS = {
    WarningType.HEART_RATE_HIGH: {"field": "heart_rate", "operator": ">", "value": 120, "unit": "bpm",
        "message_template": "心率异常：{value} bpm（阈值 {threshold} bpm），建议暂停训练并观察"},
    WarningType.SPO2_LOW: {"field": "spo2", "operator": "<", "value": 92, "unit": "%",
        "message_template": "血氧异常：{value}%（阈值 {threshold}%），建议立即休息并联系医生"},
    WarningType.FATIGUE_HIGH: {"field": "fatigue_score", "operator": ">", "value": 8, "unit": "/10",
        "message_template": "疲劳评分异常：{value}/10（阈值 {threshold}/10），建议降低训练强度"},
    WarningType.DYSPNEA_SEVERE: {"field": "dyspnea_score", "operator": ">=", "value": 4, "unit": "/5",
        "message_template": "呼吸困难严重：{value}/5（阈值 {threshold}/5），建议立即暂停训练"},
}
