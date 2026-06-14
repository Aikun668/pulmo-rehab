-- 五级康复等级字段迁移脚本
-- 对应 PLAN.md 模块三：rehab_level 缓存字段
-- 执行方式：mysql -u root -p your_database < add_rehab_level_field.sql

ALTER TABLE users
    ADD COLUMN rehab_level INT DEFAULT NULL COMMENT '五级康复能力等级（1-5），由后端根据评估数据自动计算';
