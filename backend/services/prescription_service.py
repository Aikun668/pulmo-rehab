"""
AI 训练处方生成服务

根据患者等级 + 档案 + 最新评估数据，调用 DeepSeek 生成个性化训练方案。
"""

import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Assessment, RecoveryStage, TrainingLog, User
from services.deepseek_client import DeepSeekClient
from services.grading_service import LEVEL_INFO

logger = logging.getLogger(__name__)


class PrescriptionService:
    def __init__(self, db: Session, deepseek_client: DeepSeekClient) -> None:
        self.db = db
        self.deepseek_client = deepseek_client

    def generate(self, patient: User) -> dict:
        """
        为指定患者生成 AI 训练处方。

        返回格式：
        {
            "title": "方案标题",
            "exercises": [
                {
                    "name": "动作名称",
                    "purpose": "训练目的",
                    "duration": "时长描述",
                    "steps": ["步骤1", "步骤2"],
                    "precautions": ["注意1", "注意2"]
                }
            ]
        }
        """
        payload = self._build_payload(patient)
        result = self.deepseek_client.generate_prescription(payload)
        return result

    def _build_payload(self, patient: User) -> dict:
        """构建发送给 DeepSeek 的患者数据。"""
        # 最新评估
        latest_assessment = self.db.scalar(
            select(Assessment)
            .where(Assessment.patient_id == patient.id)
            .order_by(Assessment.created_at.desc())
            .limit(1)
        )

        # 近 7 天训练数据
        seven_days_ago = date.today() - timedelta(days=6)
        recent_logs = self.db.scalars(
            select(TrainingLog)
            .where(
                TrainingLog.patient_id == patient.id,
                TrainingLog.train_date >= seven_days_ago,
            )
            .order_by(TrainingLog.train_date.desc())
        ).all()

        # 康复等级信息
        rehab_level = patient.rehab_level or 3
        level_info = LEVEL_INFO.get(rehab_level, LEVEL_INFO[3])

        # 恢复阶段中文映射
        stage_map = {
            RecoveryStage.EARLY: "恢复早期（1-2周）",
            RecoveryStage.MID: "恢复中期（2-6周）",
            RecoveryStage.STABLE: "稳定恢复期",
        }

        payload = {
            "患者信息": {
                "姓名": patient.name,
                "康复等级": f"{level_info['label']} {level_info['name']}",
                "推荐训练方向": level_info["training"],
                "恢复阶段": stage_map.get(patient.recovery_stage, "未设定"),
                "是否重症肺炎恢复期": patient.is_post_pneumonia,
                "出院时间": patient.discharge_date.isoformat() if patient.discharge_date else None,
                "是否长期吸烟": patient.is_long_term_smoker,
                "是否有慢性呼吸疾病": patient.has_chronic_respiratory_disease,
                "是否有心血管疾病": patient.has_cardiovascular_disease,
            },
            "最新评估": (
                {
                    "心率": latest_assessment.heart_rate,
                    "血氧": latest_assessment.spo2,
                    "呼吸困难评分": f"{latest_assessment.dyspnea_score}/5" if latest_assessment.dyspnea_score else None,
                    "疲劳评分": f"{latest_assessment.fatigue_score}/10" if latest_assessment.fatigue_score else None,
                    "评估备注": latest_assessment.notes,
                }
                if latest_assessment
                else "暂无评估数据"
            ),
            "近7天训练": {
                "训练天数": len(recent_logs),
                "总训练时长(分钟)": sum(log.duration_minutes for log in recent_logs),
                "总组数": sum(log.sets_count for log in recent_logs),
                "每日记录": [
                    {
                        "日期": log.train_date.isoformat(),
                        "时长(分钟)": log.duration_minutes,
                        "组数": log.sets_count,
                    }
                    for log in recent_logs
                ],
            },
        }

        return payload
