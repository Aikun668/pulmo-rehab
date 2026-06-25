# 智能重症肺炎肺康复训练与健康管理系统

> 面向重症肺炎恢复期患者，通过 AI 智能分析、呼吸训练指导、健康监测和动态处方调整，实现居家肺康复闭环管理的智能康复系统。
> 锚定文档：`PLAN.md`

## 项目概览

- **产品定位**：重症肺炎恢复期居家肺康复
- **患者端**：微信小程序（目录：`patient-app/`），8 页，4 tabBar
- **医生端**：React + Vite + TypeScript Web（目录：`doctor-web/`）
- **后端**：FastAPI + SQLAlchemy + MySQL
- **AI**：DeepSeek
- **鉴权**：JWT，dev-login（开发）+ wx-login（生产）

## 文档分工

| 文档 | 职责 |
|------|------|
| `README.md` | 项目总览、接口概览、当前能力 |
| `memory.md` | Agent 交接上下文、阶段重点 |
| `PLAN.md` | 产品定义、10 模块状态、开发阶段 |
| `doctor-web/style-boundary.md` | 设计借鉴边界 |
| `doctor-web/page-expansion-assessment.md` | 页面扩展判断 |
| `patient-app/README.md` | 小程序说明 |
| `patient-app/memory.md` | 小程序交接 |

---

## 十模块状态

| # | 模块 | 状态 |
|---|------|------|
| 1 | 患者健康档案 | ⚠️ 缺恢复阶段字段 |
| 2 | 智能康复评估 | ⚠️ 缺小程序自评入口 |
| 3 | 五级康复分级 | ✅ 已实现 Level 1-5 + 首页徽章 |
| 4 | AI 训练处方生成 | ❌ 待升级 |
| **5** | **患者训练执行** | ⚠️ 有计时器+任务清单，**待重构为陪练页（P0）** |
| 6 | AI 动态处方调整 | ❌ 待开发 |
| 7 | AI 康复小结 | ✅ 已完成 |
| 8 | 安全预警 | ❌ 待开发 |
| 9 | 智能设备接入 | 📋 V2 |
| 10 | 康复知识推荐 | ✅ 已建知识页 |

---

## 患者端小程序（8 页）

### tabBar（4 个）
| 页面 | 功能 |
|------|------|
| 首页 | 康复等级徽章 + Canvas 2D 进度环 + 连续打卡天数 + 任务速览 + 训练建议 + AI 预览 |
| 打卡 | 安全提示 + 呼吸计时器 + 3 项任务勾选 + 提交反馈 + 康复小知识 |
| 康复 | 统计横栏 + 方案/进度/AI 入口 |
| 我的 | 用户信息 + 菜单 + 免责声明 + 退出 |

### 二级页面（4 个）
| 页面 | 功能 |
|------|------|
| 训练方案详情 | 方案历史 + 动作分步骤指导 |
| 30天进度 | 柱状趋势图 + 摘要 |
| AI 小结 | 最新 + 历史 |
| 康复知识 | 按等级推荐知识文章 |

---

## 医生端 Web
- 登录 → 患者列表 → 患者详情 三页主流程
- 新增患者 / 方案下发
- 30 天进度 / 训练记录 / AI 小结
- 待跟进 / 风险分组

---

## 后端接口

### 业务接口
- `POST/GET /api/training-logs` — 训练记录
- `GET /api/training-logs/progress-30d` — 30天趋势
- `POST/GET /api/rehab-plans` — 训练方案
- `GET /api/doctors/{id}/patients` — 患者列表
- `GET /api/ai-summaries/latest` — AI 小结
- `GET /api/ai-summaries` — 小结历史

### 鉴权
- `POST /api/auth/dev-login` — 开发登录
- `POST /api/auth/wx-login` — 微信登录
- `GET /api/auth/me` — 用户信息

---

## 已知待修

| 优先级 | 问题 | 位置 |
|--------|------|------|
| P0 | 训练页重构（任务清单→呼吸陪练页） | `pages/check-in` |
| P1 | 数据端点缺 `Depends(get_current_user)` | `backend/routers/*` |
| P1 | `update_rehab_plan` 缺 doctor_id 归属校验 | `rehab_plans.py:133` |
| P2 | 患者档案缺恢复阶段/吸烟史/慢性病史 | `models.py` |
| P2 | profile 退出后首页可能 patientId=0 | `profile/index.js:78` |
