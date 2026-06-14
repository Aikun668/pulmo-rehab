-- 康复评估表迁移脚本
-- 对应 PLAN.md 模块二：智能康复评估
-- 执行方式：mysql -u root -p your_database < create_assessments_table.sql

CREATE TABLE IF NOT EXISTS assessments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    heart_rate INT DEFAULT NULL COMMENT '心率（bpm）',
    spo2 INT DEFAULT NULL COMMENT '血氧饱和度（%）',
    dyspnea_score INT DEFAULT NULL COMMENT '呼吸困难评分（1-5级）',
    fatigue_score INT DEFAULT NULL COMMENT '疲劳评分（1-10级）',
    notes TEXT DEFAULT NULL COMMENT '评估备注',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX ix_assessments_patient_id (patient_id),
    CONSTRAINT fk_assessments_patient_id FOREIGN KEY (patient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
