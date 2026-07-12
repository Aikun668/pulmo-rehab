import json
import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import AiSummary, Assessment, TrainingLog, User, UserRole, Warning
from services.deepseek_client import DeepSeekClient


logger = logging.getLogger(__name__)


# 康复等级映射表
REHAB_LEVEL_MAP = {
    1: "恢复初期",
    2: "轻度恢复",
    3: "中度恢复",
    4: "良好恢复",
    5: "基本康复",
}


class AiGuidanceService:
    """面向患者的AI指导服务：获取最新指导内容 + 对话回复"""

    def __init__(self, db: Session, deepseek_client: DeepSeekClient | None = None) -> None:
        self.db = db
        self.deepseek_client = deepseek_client

    def get_latest_guidance(self, patient_id: int) -> dict | None:
        """获取最新AI指导内容（基于已下发的AiSummary + 动态训练数据构建）。"""
        patient = self.db.get(User, patient_id)
        if patient is None:
            return None

        # 取最新已下发的AI周报
        latest_summary = self.db.scalar(
            select(AiSummary)
            .where(
                AiSummary.patient_id == patient_id,
                AiSummary.dispatched_at.isnot(None),
            )
            .order_by(AiSummary.dispatched_at.desc(), AiSummary.id.desc())
            .limit(1)
        )

        # 取近7天训练统计
        today = date.today()
        week_start = today - timedelta(days=6)
        logs = self.db.scalars(
            select(TrainingLog)
            .where(
                TrainingLog.patient_id == patient_id,
                TrainingLog.train_date >= week_start,
                TrainingLog.train_date <= today,
            )
            .order_by(TrainingLog.train_date.desc())
        ).all()

        trained_days = len([log for log in logs if log.duration_minutes > 0])
        total_minutes = sum(log.duration_minutes for log in logs)
        completion_rate = round(trained_days / 7 * 100) if trained_days > 0 else 0

        # 康复等级
        rehab_level_num = patient.rehab_level or 3
        rehab_level_name = REHAB_LEVEL_MAP.get(rehab_level_num, "中度恢复")

        # 构建指导内容
        intro = f"基于您近7天完成{trained_days}天训练（累计{total_minutes}分钟）的数据和医生下发的康复方案，AI为您综合分析并提出以下建议："

        # 如果有已下发的AI周报，用其content作为summary
        summary_text = ""
        points = []
        updated_at = ""

        if latest_summary is not None:
            summary_text = latest_summary.content
            updated_at = latest_summary.dispatched_at.strftime("%m-%d %H:%M") if latest_summary.dispatched_at else ""
        else:
            summary_text = "综合来看，您当前康复进展良好，训练完成率持续提升。建议坚持当前训练方案，根据身体反应灵活调整。如有不适请及时联系医生。"
            updated_at = "暂无AI周报"

        # 动态生成建议要点（基于训练数据）
        if trained_days >= 5:
            points.append("训练完成度良好，建议维持当前训练强度，保持每日打卡的习惯。")
        elif trained_days >= 3:
            points.append("训练完成度尚可，建议尽量提高打卡频率，争取每周完成5天以上训练。")
        else:
            points.append("近期训练天数偏少，建议优先恢复打卡习惯，每天至少完成一组基础训练。")

        if total_minutes > 0 and total_minutes < 100:
            points.append(f"累计训练时间{total_minutes}分钟偏低，建议逐步增加至每日20-30分钟。")

        # 取最新评估看是否有异常指标
        latest_assessment = self.db.scalar(
            select(Assessment)
            .where(Assessment.patient_id == patient_id)
            .order_by(Assessment.created_at.desc())
            .limit(1)
        )
        if latest_assessment:
            if latest_assessment.spo2 and latest_assessment.spo2 < 95:
                points.append(f"最新血氧{latest_assessment.spo2}%偏低（正常应≥95%），建议减少户外步行强度，注意监测血氧变化。")
            if latest_assessment.fatigue_score and latest_assessment.fatigue_score > 7:
                points.append(f"疲劳评分{latest_assessment.fatigue_score}/10偏高，建议适当降低训练强度，保证充足休息。")

        return {
            "intro": intro,
            "points": points,
            "summary": summary_text,
            "updated_at": updated_at,
            "rehab_level": rehab_level_name,
            "trained_days": trained_days,
            "total_minutes": total_minutes,
            "completion_rate": f"{completion_rate}%",
        }

    def build_patient_context(self, patient_id: int) -> dict:
        """构建患者上下文payload（用于AI对话动态注入）。"""
        patient = self.db.get(User, patient_id)
        if patient is None:
            return {}

        # 近7天训练
        today = date.today()
        week_start = today - timedelta(days=6)
        logs = self.db.scalars(
            select(TrainingLog)
            .where(
                TrainingLog.patient_id == patient_id,
                TrainingLog.train_date >= week_start,
                TrainingLog.train_date <= today,
            )
            .order_by(TrainingLog.train_date.desc())
        ).all()

        trained_days = len([log for log in logs if log.duration_minutes > 0])
        total_minutes = sum(log.duration_minutes for log in logs)
        completion_rate = round(trained_days / 7 * 100) if trained_days > 0 else 0

        # 康复等级
        rehab_level_num = patient.rehab_level or 3
        rehab_level_name = REHAB_LEVEL_MAP.get(rehab_level_num, "中度恢复")

        # 恢复阶段
        stage_map = {"early": "恢复早期", "mid": "恢复中期", "stable": "稳定恢复期"}
        recovery_stage = stage_map.get(patient.recovery_stage, "未设定") if patient.recovery_stage else "未设定"

        # 最新评估
        latest_assessment = self.db.scalar(
            select(Assessment)
            .where(Assessment.patient_id == patient_id)
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

        # 未处理预警
        unresolved_warnings = self.db.scalars(
            select(Warning)
            .where(
                Warning.patient_id == patient_id,
                Warning.is_resolved == False,
            )
            .order_by(Warning.created_at.desc())
            .limit(5)
        ).all()
        warnings_data = [
            {
                "type": w.warning_type.value if hasattr(w.warning_type, "value") else str(w.warning_type),
                "message": w.message,
            }
            for w in unresolved_warnings
        ]

        # 当前训练方案
        active_plan = self.db.scalar(
            select(TrainingLog)
            .where(TrainingLog.patient_id == patient_id)
            .order_by(TrainingLog.train_date.desc())
            .limit(1)
        )

        return {
            "patient_id": patient.id,
            "patient_name": patient.name,
            "rehab_level": rehab_level_name,
            "recovery_stage": recovery_stage,
            "trained_days_7d": trained_days,
            "total_minutes_7d": total_minutes,
            "completion_rate_7d": f"{completion_rate}%",
            "latest_assessment": assessment_data,
            "unresolved_warnings": warnings_data,
            "health_profile": {
                "is_post_pneumonia": patient.is_post_pneumonia,
                "is_long_term_smoker": patient.is_long_term_smoker,
                "has_chronic_respiratory_disease": patient.has_chronic_respiratory_disease,
                "has_cardiovascular_disease": patient.has_cardiovascular_disease,
            },
        }

    def chat_reply(self, patient_id: int, question: str) -> str:
        """基于患者上下文的AI对话回复。"""
        if self.deepseek_client is None:
            raise ValueError("DeepSeek client is not configured.")

        patient_context = self.build_patient_context(patient_id)
        return self.deepseek_client.generate_guidance_reply(patient_context, question)
