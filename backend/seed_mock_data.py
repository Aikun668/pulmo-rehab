"""
模拟数据生成脚本
为患者 ID 14（测试患者）和 ID 15（测试患者2号）生成一个月的完整数据：
- 健康档案
- 训练记录（近30天）
- 康复评估记录
- 训练方案
- AI 康复小结
- 安全预警记录
"""

import random
from datetime import date, datetime, timedelta, timezone

from database import SessionLocal
from models import (
    Assessment,
    AiSummary,
    RehabPlan,
    TrainingLog,
    User,
    Warning,
    WarningType,
    RecoveryStage,
    UserRole,
)


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def seed_patient_profile(db, patient_id: int, profile: dict):
    """更新患者健康档案（使用原生 SQL 避免 enum 不匹配）"""
    from sqlalchemy import text

    result = db.execute(text("SELECT id FROM users WHERE id = :pid"), {"pid": patient_id}).fetchone()
    if not result:
        print(f"  患者 {patient_id} 不存在，跳过")
        return

    db.execute(text("""
        UPDATE users SET
            is_post_pneumonia = :is_post_pneumonia,
            discharge_date = :discharge_date,
            recovery_stage = :recovery_stage,
            is_long_term_smoker = :is_long_term_smoker,
            has_chronic_respiratory_disease = :has_chronic_respiratory_disease,
            has_cardiovascular_disease = :has_cardiovascular_disease,
            rehab_level = :rehab_level
        WHERE id = :patient_id
    """), {
        "patient_id": patient_id,
        "is_post_pneumonia": profile["is_post_pneumonia"],
        "discharge_date": profile["discharge_date"],
        "recovery_stage": profile["recovery_stage"],
        "is_long_term_smoker": profile["is_long_term_smoker"],
        "has_chronic_respiratory_disease": profile["has_chronic_respiratory_disease"],
        "has_cardiovascular_disease": profile["has_cardiovascular_disease"],
        "rehab_level": profile["rehab_level"],
    })
    db.commit()
    print(f"  患者 {patient_id} 档案已更新")


def seed_training_logs(db, patient_id: int, config: dict):
    """生成近30天训练记录，模拟真实用户习惯（有波动、有休息日）"""
    # 先清除旧记录
    db.query(TrainingLog).filter(TrainingLog.patient_id == patient_id).delete()

    today = date.today()
    base_duration = config["base_duration"]
    base_sets = config["base_sets"]
    train_frequency = config["train_frequency"]  # 每周训练几天（0-7）
    trend = config["trend"]  # "improving" / "stable" / "fluctuating"

    notes_pool = [
        "今天状态不错，呼吸顺畅",
        "训练完成后略有疲劳，休息后恢复",
        "缩唇呼吸节奏控制较好",
        "腹式呼吸感觉越来越自然",
        "今天加了两组深呼吸",
        "稍微有些气短，降低了强度",
        "整体感觉良好",
        None,
        None,
    ]

    for i in range(30):
        train_date = today - timedelta(days=29 - i)
        weekday = train_date.weekday()

        # 根据训练频率决定是否训练（模拟每周规律）
        # train_frequency=5 表示周一到周五训练
        if weekday >= train_frequency:
            continue

        # 模拟趋势变化
        if trend == "improving":
            # 逐渐增加时长
            duration = base_duration + int(i * 0.5) + random.randint(-3, 5)
        elif trend == "fluctuating":
            # 波动较大
            duration = base_duration + random.randint(-8, 10)
        else:
            # 稳定
            duration = base_duration + random.randint(-3, 3)

        duration = max(10, min(40, duration))
        sets_count = base_sets + random.randint(-1, 1)
        sets_count = max(2, min(6, sets_count))
        note = random.choice(notes_pool)

        log = TrainingLog(
            patient_id=patient_id,
            train_date=train_date,
            duration_minutes=duration,
            sets_count=sets_count,
            note=note,
            created_at=datetime.combine(train_date, datetime.min.time(), tzinfo=timezone.utc),
        )
        db.add(log)

    db.commit()
    count = db.query(TrainingLog).filter(TrainingLog.patient_id == patient_id).count()
    print(f"  患者 {patient_id} 训练记录已生成：{count} 条")


def seed_assessments(db, patient_id: int, config: dict):
    """生成评估记录（近30天内3-4次评估）"""
    db.query(Assessment).filter(Assessment.patient_id == patient_id).delete()

    today = date.today()
    assessment_dates = [today - timedelta(days=d) for d in [25, 18, 10, 3]]

    for i, assess_date in enumerate(assessment_dates):
        # 模拟逐渐改善的趋势
        progress = i / max(1, len(assessment_dates) - 1)
        heart_rate = int(config["hr_base"] - progress * 8 + random.randint(-5, 5))
        spo2 = int(config["spo2_base"] + progress * 1 + random.randint(-1, 1))
        spo2 = min(99, max(92, spo2))
        dyspnea = max(1, int(config["dyspnea_base"] - progress * 1 + random.randint(-1, 1)))
        fatigue = max(1, int(config["fatigue_base"] - progress * 2 + random.randint(-1, 2)))

        notes_options = [
            "初次评估，患者状态偏弱，建议从低强度开始",
            "训练两周后复评，整体有改善趋势",
            "持续训练中，呼吸功能逐步恢复",
            "近期训练规律，各项指标趋于稳定",
        ]

        assessment = Assessment(
            patient_id=patient_id,
            heart_rate=heart_rate,
            spo2=spo2,
            dyspnea_score=dyspnea,
            fatigue_score=fatigue,
            notes=notes_options[i],
            created_at=datetime.combine(assess_date, datetime.min.time(), tzinfo=timezone.utc),
        )
        db.add(assessment)

    db.commit()
    count = db.query(Assessment).filter(Assessment.patient_id == patient_id).count()
    print(f"  患者 {patient_id} 评估记录已生成：{count} 条")


def seed_rehab_plans(db, patient_id: int, doctor_id: int, config: dict):
    """生成训练方案"""
    db.query(RehabPlan).filter(
        RehabPlan.patient_id == patient_id,
        RehabPlan.doctor_id == doctor_id,
    ).delete()

    today = date.today()

    # 历史方案（3周前）
    old_plan = RehabPlan(
        patient_id=patient_id,
        doctor_id=doctor_id,
        title=config["old_plan_title"],
        content=config["old_plan_content"],
        status="approved",
        created_at=datetime.combine(today - timedelta(days=21), datetime.min.time(), tzinfo=timezone.utc),
    )
    db.add(old_plan)

    # 当前方案（1周前，active）
    import json
    exercises_json = json.dumps(config["exercises"], ensure_ascii=False)

    new_plan = RehabPlan(
        patient_id=patient_id,
        doctor_id=doctor_id,
        title=config["new_plan_title"],
        content=config["new_plan_content"],
        status="active",
        exercises_json=exercises_json,
        adjustment_note=config.get("adjustment_note"),
        created_at=datetime.combine(today - timedelta(days=7), datetime.min.time(), tzinfo=timezone.utc),
    )
    db.add(new_plan)

    db.commit()
    count = db.query(RehabPlan).filter(
        RehabPlan.patient_id == patient_id,
        RehabPlan.doctor_id == doctor_id,
    ).count()
    print(f"  患者 {patient_id} 训练方案已生成：{count} 条")


def seed_ai_summary(db, patient_id: int, config: dict):
    """生成 AI 康复小结"""
    db.query(AiSummary).filter(AiSummary.patient_id == patient_id).delete()

    today = date.today()
    week_start = today - timedelta(days=today.weekday() + 7)  # 上周一
    week_end = week_start + timedelta(days=6)

    summary = AiSummary(
        patient_id=patient_id,
        summary_week_start=week_start,
        summary_week_end=week_end,
        content=config["summary_content"],
        created_at=datetime.combine(week_end, datetime.min.time(), tzinfo=timezone.utc),
    )
    db.add(summary)

    db.commit()
    print(f"  患者 {patient_id} AI 小结已生成")


def seed_warnings(db, patient_id: int, config: dict):
    """生成安全预警记录"""
    db.query(Warning).filter(Warning.patient_id == patient_id).delete()

    today = date.today()

    for w_config in config.get("warnings", []):
        warning = Warning(
            patient_id=patient_id,
            assessment_id=None,
            warning_type=w_config["type"],
            metric_value=w_config["value"],
            threshold=w_config["threshold"],
            message=w_config["message"],
            is_resolved=w_config.get("resolved", False),
            created_at=datetime.combine(
                today - timedelta(days=w_config.get("days_ago", 10)),
                datetime.min.time(),
                tzinfo=timezone.utc,
            ),
        )
        db.add(warning)

    db.commit()
    count = db.query(Warning).filter(Warning.patient_id == patient_id).count()
    print(f"  患者 {patient_id} 预警记录已生成：{count} 条")


# ==================== 患者 14：测试患者 ====================
patient_14_config = {
    "profile": {
        "is_post_pneumonia": True,
        "discharge_date": date(2026, 4, 15),
        "recovery_stage": "mid",
        "is_long_term_smoker": False,
        "has_chronic_respiratory_disease": True,
        "has_cardiovascular_disease": False,
        "rehab_level": 3,
    },
    "training": {
        "base_duration": 18,
        "base_sets": 4,
        "train_frequency": 5,  # 周一到周五
        "trend": "improving",
    },
    "assessments": {
        "hr_base": 88,
        "spo2_base": 95,
        "dyspnea_base": 3,
        "fatigue_base": 6,
    },
    "plans": {
        "old_plan_title": "呼吸康复第一周方案（基础适应期）",
        "old_plan_content": "1. 腹式呼吸训练：每日2次，每次10分钟\n2. 缩唇呼吸：每日2次，每次5分钟\n3. 注意训练前后监测血氧和心率\n4. 如出现明显气短应立即停止",
        "new_plan_title": "呼吸康复进阶方案（中期强化）",
        "new_plan_content": "1. 腹式呼吸训练：每日2次，每次15分钟\n2. 缩唇呼吸：每日2次，每次8分钟\n3. 深吸气训练：每日1次，每次10分钟\n4. 呼吸节奏控制练习：每日1次\n5. 训练前后监测生命体征，保持血氧>92%",
        "exercises": [
            {
                "name": "腹式呼吸训练",
                "purpose": "增强膈肌力量，改善呼吸效率",
                "duration": "每次15分钟，每日2次",
                "steps": ["仰卧或坐位放松", "一手放腹部一手放胸部", "经鼻吸气使腹部隆起", "缩唇缓慢呼气腹部回缩"],
                "precautions": ["吸气与呼气时间比1:2", "避免胸部起伏"],
            },
            {
                "name": "缩唇呼吸训练",
                "purpose": "延长呼气时间，防止气道塌陷",
                "duration": "每次8分钟，每日2次",
                "steps": ["经鼻吸气2秒", "缩唇如吹口哨状", "缓慢呼气4-6秒", "保持呼气时间为吸气2倍"],
                "precautions": ["呼气力度不宜过大", "感到头晕应休息"],
            },
            {
                "name": "深吸气训练",
                "purpose": "扩张肺泡，改善肺通气",
                "duration": "每次10分钟，每日1次",
                "steps": ["坐位放松肩部", "缓慢深吸气至肺总量", "屏气2-3秒", "缓慢呼出"],
                "precautions": ["不要过度用力", "屏气时间不宜过长"],
            },
        ],
        "adjustment_note": "患者近两周训练依从性良好，各项指标呈改善趋势，本次在原方案基础上增加深吸气训练，适度延长单次训练时长。",
    },
    "summary": {
        "summary_content": """【本周康复小结】

■ 训练执行情况
本周完成训练 5 天，累计训练时长 92 分钟，较上周增长 12%。训练依从性良好，患者已逐步适应进阶方案。

■ 生理指标变化
- 心率：从 88 bpm 下降至 82 bpm，恢复趋势良好
- 血氧：从 95% 提升至 97%，接近正常范围
- 呼吸困难评分：从 3 分降至 2 分（轻微气短）
- 疲劳评分：从 6 分降至 4 分（轻度疲劳）

■ 康复评估
患者处于恢复中期，整体呈改善趋势。腹式呼吸和缩唇呼吸动作规范，深吸气训练已开始适应。建议继续保持当前训练频率，下周可考虑适度增加训练强度。

■ 注意事项
1. 继续监测训练前后血氧和心率
2. 如训练中出现血氧<92%或心率>120，应立即停止
3. 保持每日训练记录，便于后续方案调整""",
    },
    "warnings": [
        {
            "type": WarningType.SPO2_LOW,
            "value": 91,
            "threshold": 92,
            "message": "血氧饱和度 91%，低于安全阈值 92%，建议暂停训练并观察",
            "resolved": True,
            "days_ago": 20,
        },
    ],
}

# ==================== 患者 15：测试患者2号 ====================
patient_15_config = {
    "profile": {
        "is_post_pneumonia": True,
        "discharge_date": date(2026, 5, 20),
        "recovery_stage": "early",
        "is_long_term_smoker": True,
        "has_chronic_respiratory_disease": True,
        "has_cardiovascular_disease": True,
        "rehab_level": 2,
    },
    "training": {
        "base_duration": 12,
        "base_sets": 3,
        "train_frequency": 4,  # 周一到周四
        "trend": "fluctuating",
    },
    "assessments": {
        "hr_base": 95,
        "spo2_base": 93,
        "dyspnea_base": 4,
        "fatigue_base": 7,
    },
    "plans": {
        "old_plan_title": "重症肺炎出院后呼吸康复初始方案",
        "old_plan_content": "1. 腹式呼吸：每日2次，每次8分钟\n2. 缩唇呼吸：每日2次，每次5分钟\n3. 训练强度宜低，逐步适应\n4. 必须监测血氧，低于92%停止",
        "new_plan_title": "呼吸康复基础方案（早期适应+吸烟史调整）",
        "new_plan_content": "1. 腹式呼吸训练：每日2次，每次10分钟\n2. 缩唇呼吸：每日2次，每次6分钟\n3. 呼吸节奏控制：每日1次，每次5分钟\n4. 严格监测血氧和心率\n5. 建议戒烟咨询，减少呼吸道刺激",
        "exercises": [
            {
                "name": "腹式呼吸训练",
                "purpose": "增强膈肌力量，改善基础呼吸模式",
                "duration": "每次10分钟，每日2次",
                "steps": ["仰卧位膝盖微屈", "一手放腹部感受起伏", "经鼻缓慢吸气", "缩唇缓慢呼气"],
                "precautions": ["动作要缓慢", "出现头晕立即停止", "血氧<92%暂停训练"],
            },
            {
                "name": "缩唇呼吸训练",
                "purpose": "减少气道塌陷，改善通气效率",
                "duration": "每次6分钟，每日2次",
                "steps": ["放松坐位", "经鼻吸气2秒", "缩唇呼气4秒", "保持节奏稳定"],
                "precautions": ["呼气不要用力过猛", "注意保持节奏"],
            },
        ],
        "adjustment_note": "患者有长期吸烟史合并慢性呼吸疾病和心血管疾病，恢复较慢且训练波动较大。方案以低强度基础训练为主，重点放在呼吸模式建立和耐受性提升上。",
    },
    "summary": {
        "summary_content": """【本周康复小结】

■ 训练执行情况
本周完成训练 3 天，累计训练时长 38 分钟，较上周略有下降。训练依从性有待提升，存在中断情况。

■ 生理指标变化
- 心率：95 bpm 左右，波动较大
- 血氧：93-94%，仍处于偏低水平
- 呼吸困难评分：4 分（活动后明显气短）
- 疲劳评分：7 分（明显疲劳）

■ 康复评估
患者处于恢复早期，合并长期吸烟史、慢性呼吸疾病和心血管疾病，整体恢复进度较慢。训练波动较大，部分日期因气短或疲劳中断。当前以低强度基础训练为主，重点是建立正确的呼吸模式。

■ 建议
1. 适当降低单次训练强度，增加休息频次
2. 密切关注血氧变化，低于92%必须停止训练
3. 建议安排戒烟咨询，减少呼吸道刺激因素
4. 考虑增加心血管方面随访，排除合并症影响
5. 下周若训练耐受性改善，可适度增加训练频次""",
    },
    "warnings": [
        {
            "type": WarningType.HEART_RATE_HIGH,
            "value": 128,
            "threshold": 120,
            "message": "训练中心率达 128 bpm，超过安全阈值 120 bpm，已暂停训练",
            "resolved": True,
            "days_ago": 15,
        },
        {
            "type": WarningType.DYSPNEA_SEVERE,
            "value": 4,
            "threshold": 4,
            "message": "呼吸困难评分达 4 分（日常活动困难），建议降低训练强度并密切观察",
            "resolved": False,
            "days_ago": 5,
        },
    ],
}


# ==================== 患者 16：王五（稳定期非吸烟者） ====================
patient_16_config = {
    "profile": {
        "is_post_pneumonia": True,
        "discharge_date": date(2026, 6, 1),
        "recovery_stage": "stable",
        "is_long_term_smoker": False,
        "has_chronic_respiratory_disease": False,
        "has_cardiovascular_disease": False,
        "rehab_level": 5,
    },
    "training": {
        "base_duration": 25,
        "base_sets": 5,
        "train_frequency": 7,  # 每天
        "trend": "stable",
    },
    "assessments": {
        "hr_base": 75,
        "spo2_base": 97,
        "dyspnea_base": 1,
        "fatigue_base": 3,
    },
    "plans": {
        "old_plan_title": "稳定期肺康复维持方案",
        "old_plan_content": "1. 综合肺功能训练：每日1次，每次20分钟\n2. 有氧耐力训练：每日1次，每次15分钟\n3. 呼吸肌力量训练：每日1次",
        "new_plan_title": "接近完全恢复综合训练方案",
        "new_plan_content": "1. 腹式呼吸训练：每日1次，每次15分钟\n2. 缩唇呼吸：每日1次，每次10分钟\n3. 深呼吸+呼吸节奏控制：每日2次\n4. 轻度有氧训练：每日1次，每次20分钟\n5. 继续保持良好训练节奏",
        "exercises": [
            {
                "name": "综合肺功能训练",
                "purpose": "全面提升肺活量和呼吸耐力",
                "duration": "每次20分钟，每日1次",
                "steps": ["坐位放松", "深吸气保持3秒", "缓慢完全呼气", "重复10-15次"],
                "precautions": ["保持节奏稳定", "避免憋气"],
            },
        ],
        "adjustment_note": "患者恢复良好，接近完全恢复。当前方案以维持和巩固为主，可适度增加有氧耐力训练。",
    },
    "summary": {
        "summary_content": """【本周康复小结】

■ 训练执行情况
本周完成训练 7 天，累计训练时长 175 分钟，训练依从性优秀，保持每日训练不间断。

■ 生理指标变化
- 心率：75 bpm，稳定正常
- 血氧：97%，正常水平
- 呼吸困难评分：1 分（呼吸完全正常）
- 疲劳评分：3 分（轻微疲劳）

■ 康复评估
患者恢复态势良好，各项指标趋于正常。训练规律且强度适中，当前处于巩固和维持阶段。

■ 建议
1. 可适度增加有氧耐力训练比例
2. 保持每日训练记录习惯
3. 定期复评肺功能
4. 建议保持每周至少5天训练频次""",
    },
    "warnings": [],
}

# ==================== 患者 17：赵六（中期有吸烟史） ====================
patient_17_config = {
    "profile": {
        "is_post_pneumonia": False,
        "discharge_date": None,
        "recovery_stage": "mid",
        "is_long_term_smoker": True,
        "has_chronic_respiratory_disease": True,
        "has_cardiovascular_disease": False,
        "rehab_level": 3,
    },
    "training": {
        "base_duration": 15,
        "base_sets": 3,
        "train_frequency": 4,  # 周一到周四
        "trend": "improving",
    },
    "assessments": {
        "hr_base": 85,
        "spo2_base": 94,
        "dyspnea_base": 2,
        "fatigue_base": 5,
    },
    "plans": {
        "old_plan_title": "慢性呼吸疾病基础肺康复方案",
        "old_plan_content": "1. 腹式呼吸：每日2次，每次10分钟\n2. 缩唇呼吸：每日2次，每次5分钟\n3. 适度活动，避免劳累",
        "new_plan_title": "中期强化肺康复方案（吸烟史调整）",
        "new_plan_content": "1. 腹式呼吸训练：每日2次，每次12分钟\n2. 缩唇呼吸：每日2次，每次8分钟\n3. 深吸气训练：每日1次，每次10分钟\n4. 呼吸节奏控制：每日1次\n5. 建议逐步减少吸烟，减少气道刺激",
        "exercises": [
            {
                "name": "腹式呼吸训练",
                "purpose": "增强膈肌活动，改善通气分布",
                "duration": "每次12分钟，每日2次",
                "steps": ["坐位或半卧放松", "经鼻深吸气", "感受腹部隆起", "缩唇缓慢呼出"],
                "precautions": ["避免过度用力", "血氧<94%暂停"],
            },
        ],
        "adjustment_note": "患者合并慢性呼吸疾病和长期吸烟史，训练进步较慢但呈改善趋势。建议加强呼吸训练的同时关注气道健康。",
    },
    "summary": {
        "summary_content": """【本周康复小结】

■ 训练执行情况
本周完成训练 4 天，累计训练时长 60 分钟，训练有规律但频次可进一步提升。

■ 生理指标变化
- 心率：85 bpm，略有波动
- 血氧：94%，尚可
- 呼吸困难评分：2 分（轻微气短）
- 疲劳评分：5 分（中等疲劳）

■ 康复评估
患者处于恢复中期，合并慢性呼吸疾病和长期吸烟史。整体训练呈改善趋势，但受吸烟影响气道仍较敏感。

■ 建议
1. 保持当前训练节奏，逐步增加频次
2. 训练前做充分热身
3. 强烈建议安排戒烟计划
4. 定期监测肺功能变化""",
    },
    "warnings": [
        {
            "type": WarningType.FATIGUE_HIGH,
            "value": 8,
            "threshold": 8,
            "message": "疲劳评分达 8 分，超过阈值，建议适当减少训练强度并增加休息",
            "resolved": False,
            "days_ago": 8,
        },
    ],
}

# ==================== 患者 18：孙七（早期女性，非吸烟） ====================
patient_18_config = {
    "profile": {
        "is_post_pneumonia": True,
        "discharge_date": date(2026, 6, 10),
        "recovery_stage": "early",
        "is_long_term_smoker": False,
        "has_chronic_respiratory_disease": False,
        "has_cardiovascular_disease": False,
        "rehab_level": 2,
    },
    "training": {
        "base_duration": 10,
        "base_sets": 2,
        "train_frequency": 3,  # 周一三五
        "trend": "starting",
    },
    "assessments": {
        "hr_base": 90,
        "spo2_base": 93,
        "dyspnea_base": 3,
        "fatigue_base": 6,
    },
    "plans": {
        "old_plan_title": "肺炎出院后呼吸康复初始方案",
        "old_plan_content": "1. 腹式呼吸：每日1次，每次5分钟\n2. 轻度活动：每日散步5-10分钟",
        "new_plan_title": "恢复早期呼吸康复方案（低强度起步）",
        "new_plan_content": "1. 腹式呼吸训练：每日2次，每次8分钟\n2. 缩唇呼吸：每日1次，每次5分钟\n3. 呼吸节奏感知：每日1次，每次5分钟\n4. 注意训练前后监测血氧",
        "exercises": [
            {
                "name": "腹式呼吸训练",
                "purpose": "建立正确呼吸模式，改善通气",
                "duration": "每次8分钟，每日2次",
                "steps": ["半卧位放松", "一手放腹部", "经鼻吸气腹部鼓起", "缩唇缓缓呼出"],
                "precautions": ["动作务必缓慢", "出现胸闷立即停止"],
            },
        ],
        "adjustment_note": "患者刚出院不久，恢复早期，需从最基础的低强度训练开始。重点在于建立训练习惯和正确呼吸模式。",
    },
    "summary": {
        "summary_content": """【本周康复小结】

■ 训练执行情况
本周完成训练 3 天，累计训练时长 30 分钟，训练处于起步阶段，正在适应康复节奏。

■ 生理指标变化
- 心率：90 bpm，偏高
- 血氧：93%，偏低
- 呼吸困难评分：3 分（活动后明显气短）
- 疲劳评分：6 分（较明显疲劳）

■ 康复评估
患者处于恢复早期，体能较弱，训练耐受性有待提高。当前以最低强度起步，优先建立正确的呼吸模式。

■ 建议
1. 坚持低强度基础训练，不急于提升
2. 保证充分休息和营养
3. 认真记录每次训练后的体感
4. 如出现不适及时反馈""",
    },
    "warnings": [],
}

# ==================== 患者 19：周八（早期+心血管疾病+吸烟） ====================
patient_19_config = {
    "profile": {
        "is_post_pneumonia": True,
        "discharge_date": date(2026, 5, 28),
        "recovery_stage": "early",
        "is_long_term_smoker": True,
        "has_chronic_respiratory_disease": True,
        "has_cardiovascular_disease": True,
        "rehab_level": 1,
    },
    "training": {
        "base_duration": 8,
        "base_sets": 2,
        "train_frequency": 2,  # 极少训练
        "trend": "declining",
    },
    "assessments": {
        "hr_base": 100,
        "spo2_base": 91,
        "dyspnea_base": 4,
        "fatigue_base": 8,
    },
    "plans": {
        "old_plan_title": "重症肺炎合并症基础康复方案",
        "old_plan_content": "1. 腹式呼吸：每日1次，每次5分钟\n2. 训练前后必须监测血氧和心率\n3. 如出现不适立即停止",
        "new_plan_title": "重度恢复呼吸训练方案（最低强度）",
        "new_plan_content": "1. 腹式呼吸：每日1次，每次5分钟\n2. 缩唇呼吸：每日1次，每次3分钟\n3. 严格控制训练强度，以不加重症状为原则\n4. 训练全程监测生命体征\n5. 建议多学科会诊（呼吸+心血管）",
        "exercises": [
            {
                "name": "腹式呼吸训练",
                "purpose": "极轻度激活膈肌，改善基础呼吸",
                "duration": "每次5分钟，每日1次",
                "steps": ["完全放松仰卧", "经鼻极小口吸气", "自然呼气不屏气", "感受腹部微动"],
                "precautions": ["血氧<90%禁止训练", "心率>110立即停止", "任何不适立即终止"],
            },
        ],
        "adjustment_note": "患者合并症多且重（心血管+呼吸+吸烟），处于高危恢复期。训练方案必须极端保守，以维持基本呼吸功能为目标，不能追求进步。",
    },
    "summary": {
        "summary_content": """【本周康复小结】

■ 训练执行情况
本周仅完成训练 2 天，累计训练时长 16 分钟。患者训练中断严重，依从性极低。

■ 生理指标变化
- 心率：100 bpm，持续偏高
- 血氧：91%，远低于安全水平
- 呼吸困难评分：4 分（日常活动困难）
- 疲劳评分：8 分（严重疲劳）

■ 康复评估
患者处于高危恢复期，合并心血管疾病、慢性呼吸疾病和长期吸烟史。训练耐受性极低，多次因气短或疲劳中断。当前以最低强度训练维持基础呼吸功能，需在严密监护下进行。

■ 建议
1. 必须严格遵循最低强度训练方案
2. 建议住院或门诊密切监护下训练
3. 多学科协作管理（呼吸科+心内科）
4. 戒烟是改善预后的关键一步
5. 优先稳定生命体征，再考虑康复进展""",
    },
    "warnings": [
        {
            "type": WarningType.SPO2_LOW,
            "value": 88,
            "threshold": 92,
            "message": "血氧饱和度降至 88%，严重低于安全阈值 92%，立即停止训练并吸氧",
            "resolved": False,
            "days_ago": 2,
        },
        {
            "type": WarningType.HEART_RATE_HIGH,
            "value": 135,
            "threshold": 120,
            "message": "训练中心率达 135 bpm，严重超过安全阈值 120 bpm",
            "resolved": False,
            "days_ago": 3,
        },
        {
            "type": WarningType.DYSPNEA_SEVERE,
            "value": 4,
            "threshold": 4,
            "message": "呼吸困难评分达 4 分（日常活动困难），需重新评估训练方案",
            "resolved": False,
            "days_ago": 7,
        },
    ],
}


def main():
    print("=" * 60)
    print("开始生成模拟数据")
    print("=" * 60)

    # 先修复数据库 recovery_stage enum 定义（大写→小写，与模型一致）
    from sqlalchemy import text
    db_fix = SessionLocal()
    try:
        # 先查看当前 enum 定义
        cols = db_fix.execute(text("SHOW COLUMNS FROM users LIKE 'recovery_stage'")).fetchall()
        print(f"  当前列定义: {cols}")

        # 查看当前数据
        rows = db_fix.execute(text("SELECT id, recovery_stage FROM users WHERE recovery_stage IS NOT NULL")).fetchall()
        print(f"  当前数据: {rows}")

        # 1. 先把 enum 列改成 VARCHAR 临时存储
        db_fix.execute(text("ALTER TABLE users MODIFY COLUMN recovery_stage VARCHAR(20) DEFAULT NULL"))
        db_fix.commit()

        # 2. 把所有大写值更新为小写
        db_fix.execute(text("UPDATE users SET recovery_stage = LOWER(recovery_stage) WHERE recovery_stage IS NOT NULL"))
        db_fix.commit()

        # 3. 改回 enum（小写值）
        db_fix.execute(text(
            "ALTER TABLE users MODIFY COLUMN recovery_stage "
            "ENUM('early','mid','stable') CHARACTER SET utf8mb4 DEFAULT NULL"
        ))
        db_fix.commit()
        print("已修复 recovery_stage enum 定义为小写")

        # 验证
        rows2 = db_fix.execute(text("SELECT id, recovery_stage FROM users WHERE recovery_stage IS NOT NULL")).fetchall()
        print(f"  修复后数据: {rows2}")
    except Exception as e:
        print(f"  recovery_stage enum 修复失败: {e}")
        import traceback
        traceback.print_exc()
    finally:
        db_fix.close()

    db = SessionLocal()
    try:
        doctor_id = 13

        # 确保新患者用户存在
        from sqlalchemy import text as sql_text
        for pid, pname in [(16, "王五"), (17, "赵六"), (18, "孙七"), (19, "周八")]:
            existing = db.execute(sql_text("SELECT id FROM users WHERE id = :pid"), {"pid": pid}).fetchone()
            if not existing:
                db.execute(sql_text(
                    "INSERT INTO users (id, name, role, doctor_id, created_at) VALUES (:pid, :name, 'patient', 13, NOW())"
                ), {"pid": pid, "name": pname})
                print(f"  创建用户 {pname} (ID={pid})")
            else:
                db.execute(sql_text("UPDATE users SET doctor_id = 13 WHERE id = :pid"), {"pid": pid})
                print(f"  关联用户 {pname} (ID={pid}) → 医生13")
        db.commit()

        # 患者 14
        print("\n[患者 14 - 测试患者]")
        seed_patient_profile(db, 14, patient_14_config["profile"])
        seed_training_logs(db, 14, patient_14_config["training"])
        seed_assessments(db, 14, patient_14_config["assessments"])
        seed_rehab_plans(db, 14, doctor_id, patient_14_config["plans"])
        seed_ai_summary(db, 14, patient_14_config["summary"])
        seed_warnings(db, 14, patient_14_config)

        # 患者 15
        print("\n[患者 15 - 测试患者2号]")
        seed_patient_profile(db, 15, patient_15_config["profile"])
        seed_training_logs(db, 15, patient_15_config["training"])
        seed_assessments(db, 15, patient_15_config["assessments"])
        seed_rehab_plans(db, 15, doctor_id, patient_15_config["plans"])
        seed_ai_summary(db, 15, patient_15_config["summary"])
        seed_warnings(db, 15, patient_15_config)

        # 患者 16
        print("\n[患者 16 - 王五（稳定期）]")
        seed_patient_profile(db, 16, patient_16_config["profile"])
        seed_training_logs(db, 16, patient_16_config["training"])
        seed_assessments(db, 16, patient_16_config["assessments"])
        seed_rehab_plans(db, 16, doctor_id, patient_16_config["plans"])
        seed_ai_summary(db, 16, patient_16_config["summary"])
        seed_warnings(db, 16, patient_16_config)

        # 患者 17
        print("\n[患者 17 - 赵六（中期吸烟史）]")
        seed_patient_profile(db, 17, patient_17_config["profile"])
        seed_training_logs(db, 17, patient_17_config["training"])
        seed_assessments(db, 17, patient_17_config["assessments"])
        seed_rehab_plans(db, 17, doctor_id, patient_17_config["plans"])
        seed_ai_summary(db, 17, patient_17_config["summary"])
        seed_warnings(db, 17, patient_17_config)

        # 患者 18
        print("\n[患者 18 - 孙七（早期女性）]")
        seed_patient_profile(db, 18, patient_18_config["profile"])
        seed_training_logs(db, 18, patient_18_config["training"])
        seed_assessments(db, 18, patient_18_config["assessments"])
        seed_rehab_plans(db, 18, doctor_id, patient_18_config["plans"])
        seed_ai_summary(db, 18, patient_18_config["summary"])
        seed_warnings(db, 18, patient_18_config)

        # 患者 19
        print("\n[患者 19 - 周八（高危多重合并症）]")
        seed_patient_profile(db, 19, patient_19_config["profile"])
        seed_training_logs(db, 19, patient_19_config["training"])
        seed_assessments(db, 19, patient_19_config["assessments"])
        seed_rehab_plans(db, 19, doctor_id, patient_19_config["plans"])
        seed_ai_summary(db, 19, patient_19_config["summary"])
        seed_warnings(db, 19, patient_19_config)

        print("\n" + "=" * 60)
        print("模拟数据生成完成！")
        print("=" * 60)
    finally:
        db.close()


if __name__ == "__main__":
    main()
