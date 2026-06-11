from datetime import date, datetime, timezone
from enum import Enum

from sqlalchemy import (
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
