-- RehabPlan 表新增字段：status / exercises_json / adjustment_note
-- 执行时间：第二阶段

ALTER TABLE rehab_plans
  ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft' COMMENT '处方状态: draft/approved/active',
  ADD COLUMN exercises_json TEXT NULL COMMENT '结构化训练动作 JSON',
  ADD COLUMN adjustment_note TEXT NULL COMMENT 'AI 动态调整说明';

-- 将已有记录的 status 设为 active（历史数据兼容）
UPDATE rehab_plans SET status = 'active' WHERE status = 'draft';
