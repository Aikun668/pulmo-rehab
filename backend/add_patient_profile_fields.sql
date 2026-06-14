-- 患者健康档案字段迁移脚本
-- 对应 PLAN.md 模块一：6 个待加字段
-- 执行方式：mysql -u root -p your_database < add_patient_profile_fields.sql

ALTER TABLE users
    ADD COLUMN is_post_pneumonia TINYINT(1) DEFAULT NULL COMMENT '是否为重症肺炎恢复期患者',
    ADD COLUMN discharge_date DATE DEFAULT NULL COMMENT '出院时间',
    ADD COLUMN recovery_stage ENUM('early', 'mid', 'stable') DEFAULT NULL COMMENT '当前恢复阶段：early/mid/stable',
    ADD COLUMN is_long_term_smoker TINYINT(1) DEFAULT NULL COMMENT '是否长期吸烟',
    ADD COLUMN has_chronic_respiratory_disease TINYINT(1) DEFAULT NULL COMMENT '是否存在慢性呼吸疾病',
    ADD COLUMN has_cardiovascular_disease TINYINT(1) DEFAULT NULL COMMENT '是否存在心血管疾病';
