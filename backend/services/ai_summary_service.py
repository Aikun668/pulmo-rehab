import logging
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import AiSummary, Assessment, RecoveryStage, TrainingLog, User, UserRole, Warning
from services.deepseek_client import DeepSeekClient


logger = logging.getLogger(__name__)


@dataclass
class AiSummaryRunStats:
    total_patients: int = 0
    created: int = 0
    skipped: int = 0
    failed: int = 0


class AiSummaryService:
    def __init__(self, db: Session, deepseek_client: DeepSeekClient) -> None:
        self.db = db
        self.deepseek_client = deepseek_client

    def run_weekly_job(self, reference_date: date | None = None) -> AiSummaryRunStats:
        """Legacy batch job - kept for backward compatibility but no longer the primary flow."""
        week_start, week_end = self._get_previous_week_range(reference_date)
        patients = self.db.scalars(
            select(User).where(User.role == UserRole.PATIENT).order_by(User.id.asc())
        ).all()

        stats = AiSummaryRunStats(total_patients=len(patients))
        for patient in patients:
            if self._summary_exists(patient.id, week_start, week_end):
                stats.skipped += 1
                continue

            try:
                payload = self._build_patient_payload(patient, week_start, week_end)
                content = self.deepseek_client.generate_weekly_summary(
                    payload, doctor_input="常规周度随访，无特别关注点"
                )
                self._create_summary(patient.id, week_start, week_end, "常规周度随访，无特别关注点", content)
                stats.created += 1
            except Exception as exc:
                logger.exception(
                    "Failed to generate AI summary for patient_id=%s, week_start=%s: %s",
                    patient.id,
                    week_start,
                    exc,
                )
                self.db.rollback()
                stats.failed += 1

        return stats

    def generate_for_patient(
        self, patient_id: int, doctor_input: str
    ) -> AiSummary:
        """Generate AI summary on-demand based on doctor's key recommendations."""
        patient = self.db.get(User, patient_id)
        if patient is None:
            raise ValueError(f"Patient {patient_id} not found")

        week_start, week_end = self._get_previous_week_range()
        payload = self._build_patient_payload(patient, week_start, week_end)
        content = self.deepseek_client.generate_weekly_summary(payload, doctor_input=doctor_input)
        return self._create_summary(patient_id, week_start, week_end, doctor_input, content)

    @staticmethod
    def _get_previous_week_range(reference_date: date | None = None) -> tuple[date, date]:
        target_date = reference_date or date.today()
        current_week_monday = target_date - timedelta(days=target_date.weekday())
        previous_week_start = current_week_monday - timedelta(days=7)
        previous_week_end = current_week_monday - timedelta(days=1)
        return previous_week_start, previous_week_end

    def _summary_exists(self, patient_id: int, week_start: date, week_end: date) -> bool:
        existing_summary = self.db.scalar(
            select(AiSummary.id).where(
                AiSummary.patient_id == patient_id,
                AiSummary.summary_week_start == week_start,
                AiSummary.summary_week_end == week_end,
            )
        )
        return existing_summary is not None

    def _build_patient_payload(self, patient: User, week_start: date, week_end: date) -> dict:
        # --- 训练日志 ---
        logs = self.db.scalars(
            select(TrainingLog)
            .where(
                TrainingLog.patient_id == patient.id,
                TrainingLog.train_date >= week_start,
                TrainingLog.train_date <= week_end,
            )
            .order_by(TrainingLog.train_date.asc(), TrainingLog.id.asc())
        ).all()

        total_duration_minutes = sum(log.duration_minutes for log in logs)
        total_sets_count = sum(log.sets_count for log in logs)
        daily_logs = [
            {
                "date": log.train_date.isoformat(),
                "duration_minutes": log.duration_minutes,
                "sets_count": log.sets_count,
                "note": log.note,
            }
            for log in logs
        ]

        # --- 最新评估 ---
        latest_assessment = self.db.scalar(
            select(Assessment)
            .where(Assessment.patient_id == patient.id)
            .order_by(Assessment.created_at.desc())
            .limit(1)
        )
        assessment_data = None
        if latest_assessment:
            assessment_data = {
                "heart_rate": latest_assessment.heart_rate,
                "spo2": latest_assessment.spo2,
                "dyspnea_score": latest_assessment.dyspnea_score,
                "fatigue_score": latest_assessment.fatigue_score,
                "notes": latest_assessment.notes,
            }

        # --- 风险状态 ---
        risk_level = self._compute_risk_level(logs, patient.id)

        # --- 恢复阶段 ---
        stage_map = {"early": "恢复早期", "mid": "恢复中期", "stable": "稳定恢复期"}
        recovery_stage = stage_map.get(patient.recovery_stage, "未设定") if patient.recovery_stage else "未设定"

        # --- 未处理预警 ---
        unresolved_warnings = self.db.scalars(
            select(Warning)
            .where(
                Warning.patient_id == patient.id,
                Warning.is_resolved == False,
            )
            .order_by(Warning.created_at.desc())
            .limit(5)
        ).all()
        warnings_data = [
            {
                "type": w.warning_type.value if hasattr(w.warning_type, 'value') else str(w.warning_type),
                "message": w.message,
                "created_at": w.created_at.isoformat() if w.created_at else None,
            }
            for w in unresolved_warnings
        ]

        return {
            "patient_id": patient.id,
            "patient_name": patient.name,
            "week_start": week_start.isoformat(),
            "week_end": week_end.isoformat(),
            "training_days": len(logs),
            "total_duration_minutes": total_duration_minutes,
            "total_sets_count": total_sets_count,
            "daily_logs": daily_logs,
            "risk_level": risk_level,
            "rehab_level": patient.rehab_level,
            "recovery_stage": recovery_stage,
            "latest_assessment": assessment_data,
            "unresolved_warnings": warnings_data,
        }

    @staticmethod
    def _compute_risk_level(logs, patient_id: int) -> str:
        """根据近7天训练数据计算风险等级."""
        if len(logs) == 0:
            return "需尽快跟进"
        if len(logs) >= 5:
            return "训练稳定"
        return "需要关注"

    def _create_summary(
        self, patient_id: int, week_start: date, week_end: date, doctor_input: str, content: str
    ) -> AiSummary:
        summary = AiSummary(
            patient_id=patient_id,
            summary_week_start=week_start,
            summary_week_end=week_end,
            doctor_input=doctor_input,
            content=content,
            created_at=datetime.combine(week_end + timedelta(days=1), time.min, tzinfo=timezone.utc),
        )
        self.db.add(summary)
        self.db.commit()
        self.db.refresh(summary)
        return summary
