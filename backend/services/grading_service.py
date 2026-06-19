"""
五级康复能力分级判定服务

等级体系（自定义，不采用复杂医学量表）：
- Level 1：重度恢复阶段 → 腹式呼吸训练
- Level 2：轻度活动受限 → 缩唇呼吸训练
- Level 3：中度恢复阶段 → 深吸气 + 呼吸节奏控制
- Level 4：恢复良好 → 呼吸耐力训练
- Level 5：接近完全恢复 → 综合肺功能训练

判定优先级：安全指标 > 主观评估 > 恢复阶段
"""

from models import Assessment, RecoveryStage, User


# 等级对应的推荐训练
LEVEL_INFO: dict[int, dict] = {
    1: {
        "label": "Level 1",
        "name": "重度恢复",
        "training": "腹式呼吸训练",
    },
    2: {
        "label": "Level 2",
        "name": "轻度活动受限",
        "training": "缩唇呼吸训练",
    },
    3: {
        "label": "Level 3",
        "name": "中度恢复",
        "training": "深吸气训练 + 呼吸节奏控制",
    },
    4: {
        "label": "Level 4",
        "name": "恢复良好",
        "training": "呼吸耐力训练",
    },
    5: {
        "label": "Level 5",
        "name": "接近完全恢复",
        "training": "综合肺功能训练",
    },
}


def compute_rehab_level(patient: User, latest_assessment: Assessment | None) -> int:
    """
    根据患者档案 + 最新评估数据计算五级康复等级。

    判定逻辑（按优先级从高到低）：
    1. 安全红线：血氧 < 92% 或 心率 > 120 或 呼吸困难 >= 4 → Level 1
    2. 明显受限：呼吸困难 == 3 或 疲劳 >= 7 → Level 2
    3. 结合恢复阶段 + 主观评分综合判定 Level 3-5
    """
    # 无评估数据时，根据恢复阶段给初始等级
    if latest_assessment is None:
        if patient.recovery_stage == RecoveryStage.early:
            return 1
        elif patient.recovery_stage == RecoveryStage.mid:
            return 3
        elif patient.recovery_stage == RecoveryStage.stable:
            return 4
        else:
            return 3  # 默认中度

    dyspnea = latest_assessment.dyspnea_score
    fatigue = latest_assessment.fatigue_score
    hr = latest_assessment.heart_rate
    spo2 = latest_assessment.spo2

    # --- Level 1：安全红线 ---
    # 血氧 < 92% 或 心率 > 120 或 呼吸困难 >= 4（日常活动困难及以上）
    if spo2 is not None and spo2 < 92:
        return 1
    if hr is not None and hr > 120:
        return 1
    if dyspnea is not None and dyspnea >= 4:
        return 1

    # --- Level 2：轻度活动受限 ---
    # 呼吸困难 == 3（活动后明显气短）或 疲劳 >= 7
    if dyspnea is not None and dyspnea >= 3:
        return 2
    if fatigue is not None and fatigue >= 7:
        return 2

    # --- Level 3-5：结合恢复阶段 + 主观评分 ---
    has_risk_factors = (
        (patient.is_long_term_smoker is True)
        or (patient.has_chronic_respiratory_disease is True)
        or (patient.has_cardiovascular_disease is True)
    )

    fatigue_score = fatigue if fatigue is not None else 5
    dyspnea_score = dyspnea if dyspnea is not None else 3

    # 综合评分：呼吸困难权重0.6 + 疲劳权重0.4（归一化到0-1）
    composite = (dyspnea_score / 5) * 0.6 + (fatigue_score / 10) * 0.4

    if patient.recovery_stage == RecoveryStage.early:
        # 恢复早期：综合评分高→Level 2，低→Level 3
        if composite > 0.5 or has_risk_factors:
            return 2
        return 3

    if patient.recovery_stage == RecoveryStage.mid:
        # 恢复中期：综合评分高→Level 2，中→Level 3，低→Level 4
        if composite > 0.6 or has_risk_factors:
            return 2
        if composite > 0.35:
            return 3
        return 4

    if patient.recovery_stage == RecoveryStage.stable:
        # 稳定期：综合评分高→Level 3，中→Level 4，低→Level 5
        if composite > 0.5 or has_risk_factors:
            return 3
        if composite > 0.25:
            return 4
        return 5

    # 无恢复阶段信息时，纯靠评分
    if composite > 0.6:
        return 2
    if composite > 0.35:
        return 3
    if composite > 0.2:
        return 4
    return 5
