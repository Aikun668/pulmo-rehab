-- 安全预警表迁移脚本
-- 对应 PLAN.md 模块八：安全预警
-- 执行方式：mysql -u root -p your_database < create_warnings_table.sql

CREATE TABLE IF NOT EXISTS warnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    patient_id INT NOT NULL,
    assessment_id INT DEFAULT NULL COMMENT '关联的评估记录 ID',
    warning_type ENUM('heart_rate_high', 'spo2_low', 'fatigue_high', 'dyspnea_severe') NOT NULL COMMENT '预警类型',
    metric_value INT NOT NULL COMMENT '触发预警的指标值',
    threshold INT NOT NULL COMMENT '触发阈值',
    message VARCHAR(500) NOT NULL COMMENT '预警描述',
    is_resolved TINYINT(1) NOT NULL DEFAULT 0 COMMENT '是否已处理',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP NOT NULL,
    INDEX ix_warnings_patient_id (patient_id),
    INDEX ix_warnings_is_resolved (is_resolved),
    CONSTRAINT fk_warnings_patient_id FOREIGN KEY (patient_id) REFERENCES users(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
