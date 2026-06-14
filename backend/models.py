from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum as SqlEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from database import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class UserRole(str, Enum):
    PATIENT = "patient"
    DOCTOR = "doctor"


class RecoveryStage(str, Enum):
    EARLY = "early"       # 恢复早期（1-2周）
    MID = "mid"           # 恢复中期（2-6周）
    STABLE = "stable"     # 稳定恢复期


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    role: Mapped[UserRole] = mapped_column(
        SqlEnum(UserRole, name="user_role"),
        nullable=False,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(20), unique=True, nullable=True)
    openid: Mapped[str | None] = mapped_column(String(100), unique=True, nullable=True, index=True)
    doctor_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True,
        index=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    # --- 患者健康档案字段（模块一） ---
    is_post_pneumonia: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=None,
        comment="是否为重症肺炎恢复期患者",
    )
    discharge_date: Mapped[date | None] = mapped_column(
        Date, nullable=True, default=None,
        comment="出院时间",
    )
    recovery_stage: Mapped[RecoveryStage | None] = mapped_column(
        SqlEnum(RecoveryStage, name="recovery_stage"),
        nullable=True, default=None,
        comment="当前恢复阶段：early/mid/stable",
    )
    is_long_term_smoker: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=None,
        comment="是否长期吸烟",
    )
    has_chronic_respiratory_disease: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=None,
        comment="是否存在慢性呼吸疾病",
    )
    has_cardiovascular_disease: Mapped[bool | None] = mapped_column(
        Boolean, nullable=True, default=None,
        comment="是否存在心血管疾病",
    )
    rehab_level: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None,
        comment="五级康复能力等级（1-5），由后端根据评估数据自动计算",
    )

    doctor: Mapped["User | None"] = relationship(
        "User",
        remote_side=[id],
        back_populates="patients",
    )
    patients: Mapped[list["User"]] = relationship(
        "User",
        back_populates="doctor",
    )
    training_logs: Mapped[list["TrainingLog"]] = relationship(
        "TrainingLog",
        back_populates="patient",
        cascade="all, delete-orphan",
        foreign_keys="TrainingLog.patient_id",
    )
    rehab_plans_for_patient: Mapped[list["RehabPlan"]] = relationship(
        "RehabPlan",
        back_populates="patient",
        foreign_keys="RehabPlan.patient_id",
    )
    rehab_plans_created: Mapped[list["RehabPlan"]] = relationship(
        "RehabPlan",
        back_populates="doctor",
        foreign_keys="RehabPlan.doctor_id",
    )
    ai_summaries: Mapped[list["AiSummary"]] = relationship(
        "AiSummary",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    assessments: Mapped[list["Assessment"]] = relationship(
        "Assessment",
        back_populates="patient",
        cascade="all, delete-orphan",
    )
    warnings: Mapped[list["Warning"]] = relationship(
        "Warning",
        back_populates="patient",
        cascade="all, delete-orphan",
    )


class TrainingLog(Base):
    __tablename__ = "training_logs"
    __table_args__ = (
        UniqueConstraint("patient_id", "train_date", name="uq_training_logs_patient_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    train_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    duration_minutes: Mapped[int] = mapped_column(Integer, nullable=False)
    sets_count: Mapped[int] = mapped_column(Integer, nullable=False)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped["User"] = relationship(
        "User",
        back_populates="training_logs",
        foreign_keys=[patient_id],
    )


class RehabPlan(Base):
    __tablename__ = "rehab_plans"
    __table_args__ = (
        CheckConstraint("status IN ('draft', 'approved', 'active')", name="ck_rehab_plan_status"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    doctor_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    title: Mapped[str] = mapped_column(String(100), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    # 第二阶段新增：处方状态 + 结构化动作
    status: Mapped[str] = mapped_column(
        String(20), nullable=False, server_default="draft"
    )  # draft / approved / active
    exercises_json: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # JSON: [{"name","purpose","duration","steps","precautions"}]
    adjustment_note: Mapped[str | None] = mapped_column(
        Text, nullable=True
    )  # AI 动态调整说明
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped["User"] = relationship(
        "User",
        back_populates="rehab_plans_for_patient",
        foreign_keys=[patient_id],
    )
    doctor: Mapped["User"] = relationship(
        "User",
        back_populates="rehab_plans_created",
        foreign_keys=[doctor_id],
    )


class AiSummary(Base):
    __tablename__ = "ai_summaries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    summary_week_start: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    summary_week_end: Mapped[date] = mapped_column(Date, nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped["User"] = relationship(
        "User",
        back_populates="ai_summaries",
    )


class Assessment(Base):
    __tablename__ = "assessments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    # 基础生理数据
    heart_rate: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None,
        comment="心率（bpm）",
    )
    spo2: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None,
        comment="血氧饱和度（%）",
    )
    # 主观状态评估
    dyspnea_score: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None,
        comment="呼吸困难评分（1-5级）",
    )
    fatigue_score: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None,
        comment="疲劳评分（1-10级）",
    )
    notes: Mapped[str | None] = mapped_column(
        Text, nullable=True, default=None,
        comment="评估备注",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped["User"] = relationship(
        "User",
        back_populates="assessments",
    )


class WarningType(str, Enum):
    HEART_RATE_HIGH = "heart_rate_high"       # 心率异常 > 120 bpm
    SPO2_LOW = "spo2_low"                     # 血氧异常 < 92%
    FATIGUE_HIGH = "fatigue_high"             # 疲劳评分异常 > 8
    DYSPNEA_SEVERE = "dyspnea_severe"         # 呼吸困难严重 >= 4


class Warning(Base):
    __tablename__ = "warnings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    patient_id: Mapped[int] = mapped_column(
        ForeignKey("users.id"),
        nullable=False,
        index=True,
    )
    assessment_id: Mapped[int | None] = mapped_column(
        Integer, nullable=True, default=None,
        comment="关联的评估记录 ID",
    )
    warning_type: Mapped[WarningType] = mapped_column(
        SqlEnum(WarningType, name="warning_type"),
        nullable=False,
        comment="预警类型",
    )
    metric_value: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="触发预警的指标值",
    )
    threshold: Mapped[int] = mapped_column(
        Integer, nullable=False,
        comment="触发阈值",
    )
    message: Mapped[str] = mapped_column(
        String(500), nullable=False,
        comment="预警描述",
    )
    is_resolved: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=False,
        comment="是否已处理",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    patient: Mapped["User"] = relationship(
        "User",
        back_populates="warnings",
    )
