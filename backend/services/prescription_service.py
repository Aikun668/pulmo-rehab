"""
AI 训练处方生成服务

根据患者等级 + 档案 + 最新评估 + 趋势分析，调用 DeepSeek 生成个性化训练方案。
第二阶段升级：从"单次快照"→"趋势感知动态调整"。
"""

import logging
from datetime import date, timedelta

from sqlalchemy import select
from sqlalchemy.orm import Session

from models import Assessment, RehabPlan, RecoveryStage, TrainingLog, User
from services.deepseek_client import DeepSeekClient
from services.grading_service import LEVEL_INFO

logger = logging.getLogger(__name__)


class PrescriptionService:
    def __init__(self, db: Session, deepseek_client: DeepSeekClient) -> None:
        self.db = db
        self.deepseek_client = deepseek_client

    def generate(self, patient: User) -> dict:
        """
        为指定患者生成 AI 训练处方（趋势感知版）。

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
            ],
            "adjustment_note": "动态调整说明"
        }
        """
        payload = self._build_payload(patient)
        result = self.deepseek_client.generate_prescription(payload)
        return result

    def _build_payload(self, patient: User) -> dict:
        """构建发送给 DeepSeek 的患者数据（含趋势分析）。"""
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

        # 近 7 天评估数据（用于趋势分析）
        recent_assessments = self.db.scalars(
            select(Assessment)
            .where(
                Assessment.patient_id == patient.id,
                Assessment.created_at >= seven_days_ago,
            )
            .order_by(Assessment.created_at.desc())
        ).all()

        # 康复等级信息
        rehab_level = patient.rehab_level or 3
        level_info = LEVEL_INFO.get(rehab_level, LEVEL_INFO[3])

        # 恢复阶段中文映射
        stage_map = {
            RecoveryStage.early: "恢复早期（1-2周）",
            RecoveryStage.mid: "恢复中期（2-6周）",
            RecoveryStage.stable: "稳定恢复期",
        }

        # ===== 趋势分析 =====
        trend_analysis = self._analyze_trends(recent_assessments, recent_logs)

        # ===== 上一版处方 =====
        last_prescription = self._get_last_prescription_context(patient.id)

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
            "趋势分析": trend_analysis,
            "上一版处方": last_prescription,
            "调整要求": (
                "请根据以上趋势分析结果，生成下一阶段训练处方。"
                "如果趋势向好（评分下降/训练量提升），可适当增加训练强度和时长。"
                "如果趋势恶化（评分上升/训练量下降），应降低训练强度并增加休息建议。"
                "如果趋势稳定，维持当前训练方案并微调。"
                "请在回复中包含 adjustment_note 字段，简要说明本次调整的依据。"
            ),
        }

        return payload

    def _analyze_trends(self, recent_assessments: list, recent_logs: list) -> dict:
        """分析近 7 天评估和训练数据的趋势。"""
        result = {
            "呼吸困难趋势": "数据不足",
            "疲劳趋势": "数据不足",
            "心率趋势": "数据不足",
            "血氧趋势": "数据不足",
            "训练完成率": "数据不足",
            "整体趋势判断": "数据不足",
        }

        if len(recent_assessments) >= 2:
            # 按时间正序（旧→新）计算趋势
            sorted_asc = list(reversed(recent_assessments))

            # 呼吸困难趋势
            dyspnea_values = [a.dyspnea_score for a in sorted_asc if a.dyspnea_score is not None]
            if len(dyspnea_values) >= 2:
                first_half = dyspnea_values[: len(dyspnea_values) // 2]
                second_half = dyspnea_values[len(dyspnea_values) // 2 :]
                avg_first = sum(first_half) / len(first_half)
                avg_second = sum(second_half) / len(second_half)
                if avg_second > avg_first + 0.5:
                    result["呼吸困难趋势"] = f"恶化（前期均值{avg_first:.1f}→近期{avg_second:.1f}）"
                elif avg_second < avg_first - 0.5:
                    result["呼吸困难趋势"] = f"改善（前期均值{avg_first:.1f}→近期{avg_second:.1f}）"
                else:
                    result["呼吸困难趋势"] = f"稳定（均值{avg_second:.1f}）"

            # 疲劳趋势
            fatigue_values = [a.fatigue_score for a in sorted_asc if a.fatigue_score is not None]
            if len(fatigue_values) >= 2:
                first_half = fatigue_values[: len(fatigue_values) // 2]
                second_half = fatigue_values[len(fatigue_values) // 2 :]
                avg_first = sum(first_half) / len(first_half)
                avg_second = sum(second_half) / len(second_half)
                if avg_second > avg_first + 1:
                    result["疲劳趋势"] = f"恶化（前期均值{avg_first:.1f}→近期{avg_second:.1f}）"
                elif avg_second < avg_first - 1:
                    result["疲劳趋势"] = f"改善（前期均值{avg_first:.1f}→近期{avg_second:.1f}）"
                else:
                    result["疲劳趋势"] = f"稳定（均值{avg_second:.1f}）"

            # 心率趋势
            hr_values = [a.heart_rate for a in sorted_asc if a.heart_rate is not None]
            if len(hr_values) >= 2:
                first_half = hr_values[: len(hr_values) // 2]
                second_half = hr_values[len(hr_values) // 2 :]
                avg_first = sum(first_half) / len(first_half)
                avg_second = sum(second_half) / len(second_half)
                if avg_second > avg_first + 5:
                    result["心率趋势"] = f"上升（{avg_first:.0f}→{avg_second:.0f} bpm）"
                elif avg_second < avg_first - 5:
                    result["心率趋势"] = f"下降（{avg_first:.0f}→{avg_second:.0f} bpm）"
                else:
                    result["心率趋势"] = f"稳定（{avg_second:.0f} bpm）"

            # 血氧趋势
            spo2_values = [a.spo2 for a in sorted_asc if a.spo2 is not None]
            if len(spo2_values) >= 2:
                first_half = spo2_values[: len(spo2_values) // 2]
                second_half = spo2_values[len(spo2_values) // 2 :]
                avg_first = sum(first_half) / len(first_half)
                avg_second = sum(second_half) / len(second_half)
                if avg_second < avg_first - 1:
                    result["血氧趋势"] = f"下降（{avg_first:.0f}%→{avg_second:.0f}%）"
                elif avg_second > avg_first + 1:
                    result["血氧趋势"] = f"上升（{avg_first:.0f}%→{avg_second:.0f}%）"
                else:
                    result["血氧趋势"] = f"稳定（{avg_second:.0f}%）"

        # 训练完成率
        if len(recent_logs) > 0:
            trained_days = len(recent_logs)
            completion_rate = round(trained_days / 7 * 100)
            result["训练完成率"] = f"近7天训练{trained_days}/7天（{completion_rate}%）"

        # 整体趋势判断
        trend_signals = []
        for key in ["呼吸困难趋势", "疲劳趋势", "心率趋势", "血氧趋势"]:
            val = result[key]
            if key == "呼吸困难趋势":
                if "恶化" in val:
                    trend_signals.append("negative")
                elif "改善" in val:
                    trend_signals.append("positive")
            elif key == "疲劳趋势":
                if "恶化" in val:
                    trend_signals.append("negative")
                elif "改善" in val:
                    trend_signals.append("positive")
            elif key == "心率趋势":
                if "上升" in val:
                    trend_signals.append("negative")
                elif "下降" in val:
                    trend_signals.append("positive")
            elif key == "血氧趋势":
                if "下降" in val:
                    trend_signals.append("negative")
                elif "上升" in val:
                    trend_signals.append("positive")

        if trend_signals:
            positive = trend_signals.count("positive")
            negative = trend_signals.count("negative")
            if negative > positive:
                result["整体趋势判断"] = "恶化倾向，建议降低训练强度"
            elif positive > negative:
                result["整体趋势判断"] = "改善倾向，可适当增加训练强度"
            else:
                result["整体趋势判断"] = "趋势混合，维持当前方案并密切观察"
        elif len(recent_assessments) >= 2:
            result["整体趋势判断"] = "指标稳定，维持当前方案"

        return result

    def _get_last_prescription_context(self, patient_id: int) -> str:
        """获取上一版处方作为参考上下文。"""
        last_plan = self.db.scalar(
            select(RehabPlan)
            .where(RehabPlan.patient_id == patient_id)
            .order_by(RehabPlan.created_at.desc())
            .limit(1)
        )

        if last_plan:
            return f"上一版方案（{last_plan.created_at.strftime('%m-%d %H:%M')}）：{last_plan.title} - {last_plan.content[:200]}"

        return "无上一版处方记录"
