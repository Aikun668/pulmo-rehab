# 智能重症肺炎肺康复训练与健康管理系统

> 面向重症肺炎恢复期患者，通过 AI 智能分析、呼吸训练指导、健康监测和动态处方调整，实现居家肺康复闭环管理的智能康复系统。
> 锚定文档：`PLAN.md`

## 项目概览

- **产品定位**：重症肺炎恢复期居家肺康复智能系统
- **患者端**：微信小程序（目录：`patient-app/`）
- **医生端**：React + Vite + TypeScript Web 后台（目录：`doctor-web/`）
- **后端**：FastAPI + SQLAlchemy
- **数据库**：MySQL 8+
- **AI**：DeepSeek 驱动（处方生成 + 动态分析 + 小结生成）

## 文档分工

为防止文档膨胀，后续默认不新增 `md` 文件：

| 文档 | 职责 |
|------|------|
| `README.md` | 项目总览、接口概览、当前能力、阶段状态 |
| `memory.md` | Agent 交接上下文、分工边界、阶段重点 |
| `PLAN.md` | 产品定义、10 大模块状态、开发阶段优先级 |
| `doctor-web/style-boundary.md` | 医生端设计借鉴边界 |
| `doctor-web/page-expansion-assessment.md` | 医生端页面扩展判断 |
| `patient-app/README.md` | 小程序项目说明 |
| `patient-app/memory.md` | 小程序交接文档 |

---

## 十模块当前状态（详见 PLAN.md）

| 模块 | 核心能力 | 状态 |
|------|----------|------|
| 1. 患者健康档案 | 6 个扩展字段已加入后端+前端，支持展示/编辑 | ⚠️ 部分完成（缺年龄/性别/身高/体重） |
| 2. 智能康复评估 | 后端评估记录+前端录入弹窗已实现，缺小程序自评入口 | ⚠️ 部分完成 |
| 3. 五级康复分级 | 后端判定逻辑+前端等级展示已实现 | ✅ 已完成 |
| 4. AI 训练处方生成 | DeepSeek 驱动处方生成+医生审核工作流已实现 | ✅ 已完成 |
| **5. 患者训练执行** | 当前为任务清单+呼吸计时器，需升级为真正陪练页 | **P0 重构** |
| 6. AI 动态处方调整 | 缺体征数据源，分析维度不足 | ❌ 待开发 |
| 7. AI 康复小结 | 已实现，定位降为辅助报告 | ✅ 已完成 |
| 8. 安全预警 | 心率/血氧/疲劳阈值自动检测+医生端预警中心已实现 | ✅ 已完成 |
| 9. 智能设备接入 | V2 前瞻，当前预留接口 | 📋 V2 |
| 10. 康复知识推荐 | 按等级推荐文章 | ❌ 待开发 |

---

## 当前能力

### 后端
- FastAPI + SQLAlchemy + MySQL
- 训练记录 CRUD + 30 天趋势
- 康复方案管理
- 医生患者列表与看板指标
- AI 小结生成（DeepSeek）
- **患者健康档案管理（新增）**：6 个字段扩展（恢复阶段/出院时间/吸烟史/慢性呼吸疾病/心血管疾病/是否重症肺炎恢复期）
- **康复评估记录（新增）**：心率/血氧/呼吸困难评分/疲劳评分 CRUD
- **五级康复分级判定（新增）**：根据评估数据+档案自动计算 Level 1-5，评估提交/档案变更时自动重算
- **AI 训练处方生成（新增）**：DeepSeek 驱动，根据等级+档案+评估自动生成个性化训练方案，医生审核修改后下发
- **安全预警检测（新增）**：评估提交时自动检测心率>120/血氧<92%/疲劳>8/呼吸困难≥4，触发预警记录
- 鉴权：dev-login + wx-login + JWT

### 医生端 Web
- 登录 → 患者列表 → 患者详情 三页主流程
- 新增患者 / 方案下发
- 30 天进度图 / 训练记录 / AI 小结查看
- 待跟进 / 风险分组视图
- **患者健康档案展示与编辑（新增）**：详情页档案卡片 + 编辑弹窗
- **患者列表恢复阶段标签（新增）**：卡片/表格视图均可见
- **康复评估录入与展示（新增）**：详情页最新评估卡片 + 评估录入弹窗
- **五级康复等级展示（新增）**：详情页等级卡片 + 列表页等级标签 + 推荐训练
- **AI 处方生成+审核工作流（新增）**：AI 生成按钮 → 结构化处方预览 → 医生可编辑 → 审核通过并下发
- **预警中心（新增）**：详情页预警记录列表 + 标记已处理 + 列表页预警图标提示

### 患者端小程序
- 首页：动态进度环 + 连续打卡天数 + AI 预览
- 训练页：呼吸陪练计时器 + 3 项任务勾选提交
- 康复页：统计横栏 + 方案/进度/AI 入口
- 方案详情：方案历史 + 训练动作分步骤指导
- 30 天进度：柱状趋势图 + 摘要统计
- AI 小结：最新 + 历史列表
- 登录鉴权：dev-login 自动获取 token

---

## 后端目录

```text
backend/
  core/
    config.py
    security.py
  routers/
    health.py
    training_logs.py
    rehab_plans.py
    doctors.py
    patients.py
    prescriptions.py
    warnings.py
    assessments.py
    ai_summaries.py
    auth.py
  services/
    ai_summary_service.py
    grading_service.py
    prescription_service.py
    deepseek_client.py
  tasks/
    ai_summary_job.py
  database.py
  main.py
  models.py
  schemas.py
```

## 当前接口

### Training Logs
- `POST /api/training-logs` — 新增或覆盖当天打卡
- `GET /api/training-logs` — 查询训练记录
- `GET /api/training-logs/progress-30d` — 近 30 天趋势

### Rehab Plans
- `POST /api/rehab-plans` — 医生下发方案
- `GET /api/rehab-plans` — 查询方案历史

### Doctors
- `GET /api/doctors/{doctor_id}/patients` — 患者列表

### AI Summaries
- `GET /api/ai-summaries/latest` — 最新小结
- `GET /api/ai-summaries` — 历史小结列表

### Auth
- `POST /api/auth/dev-login` — 开发登录
- `POST /api/auth/wx-login` — 微信登录
- `GET /api/auth/me` — 当前用户信息

### Patients（新增）
- `GET /api/patients/{patient_id}/profile` — 查询患者健康档案
- `PUT /api/patients/{patient_id}/profile` — 更新患者健康档案（部分更新，自动重算等级）
- `GET /api/patients/{patient_id}/rehab-level` — 查询/重算五级康复等级

### Assessments（新增）
- `POST /api/assessments` — 新增康复评估
- `GET /api/assessments?patient_id=X` — 查询评估记录列表
- `GET /api/assessments/latest?patient_id=X` — 查询最新评估

### Prescriptions（新增）
- `POST /api/prescriptions/generate` — AI 生成训练处方

### Warnings（新增）
- `GET /api/warnings?patient_id=X` — 查询预警记录
- `GET /api/warnings/latest-unresolved?patient_id=X` — 查询未处理预警
- `PUT /api/warnings/{id}/resolve` — 标记预警已处理

---

## 本地启动

```bash
cd backend
uvicorn main:app --reload
```

接口文档：`http://127.0.0.1:8000/api/docs`

```bash
cd doctor-web
npm install && npm run dev
```

小程序通过微信开发者工具打开 `patient-app/` 目录。

---

## MVP 业务规则

- 打卡：每人每天 1 条，覆盖更新
- 进度：近 30 天滚动窗口，空白补 0
- 方案：每次下发新增，保留历史
- AI 小结：取最新一条，无数据返回 null
- 鉴权：所有核心接口需 Bearer token
