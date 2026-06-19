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
| 2. 智能康复评估 | 后端评估记录+前端录入弹窗+小程序训练前自评已实现 | ✅ 已完成 |
| 3. 五级康复分级 | 后端判定逻辑+前端等级展示已实现 | ✅ 已完成 |
| 4. AI 训练处方生成 | DeepSeek 驱动处方生成+医生审核工作流+趋势感知动态调整已实现 | ✅ 已完成 |
| **5. 患者训练执行** | 处方驱动训练+呼吸陪练+训练前自评+安全预警弹窗已实现 | ✅ 已完成 |
| 6. AI 动态处方调整 | 趋势分析+上版处方参考+调整说明已实现 | ✅ 已完成 |
| 7. AI 康复小结 | 已实现，定位降为辅助报告 | ✅ 已完成 |
| 8. 安全预警 | 心率/血氧/疲劳阈值自动检测+医患双端预警已实现 | ✅ 已完成 |
| 9. 智能设备接入 | V2 前瞻，当前预留接口 | 📋 V2 |
| 10. 康复知识推荐 | 按等级推荐17篇知识文章（5级×3+通用2篇）已实现 | ✅ 已完成 |

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
- 首页：动态进度环 + 连续打卡天数 + 等级徽章 + 处方任务速览 + 今日训练建议
- 训练页：4 级处方加载优先级（医生审核→缓存→AI→等级默认）+ 等级呼吸陪练 + 训练前自评弹窗 + 安全预警弹窗
- 康复页：统计横栏 + 方案/进度/AI/知识入口
- 康复知识：按等级推荐17篇文章（5级×3+通用2篇），手风琴展开
- 30 天进度：3-Tab 设计（训练时长/生命体征/自评评分）+ 散点趋势图
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
- `POST /api/rehab-plans` — 医生下发方案（支持结构化 exercises）
- `GET /api/rehab-plans` — 查询方案历史
- `PUT /api/rehab-plans/{id}` — 审核/编辑方案（修改标题/内容/动作/状态）
- `GET /api/rehab-plans/active` — 查询患者当前生效方案

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
- `POST /api/prescriptions/generate` — AI 生成训练处方（趋势感知版，支持 save_as_draft）

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

---

## 代码审查修复记录（2026-06-14）

本轮对第二阶段所有变更进行了全面代码审查，修复 10 项问题：

| # | 严重度 | 文件 | 问题 | 修复方式 |
|---|--------|------|------|----------|
| 1 | 🔴 严重 | `prescription_service.py` | 趋势判断 `and/or` 运算符优先级错误，心率下降/血氧上升误判 | 改为按 key 的 `if/elif` 链 |
| 2 | 🔴 严重 | `rehab_plans.py` | `update_rehab_plan` 无权限校验，任意登录用户可改方案 | 添加 `current_user.id == plan.doctor_id` 校验 |
| 3 | 🔴 严重 | `progress/index.js+wxml` | 散点图 `bottom` 可能为负值，数据点溢出不可见 | JS 层预计算 `bottomRpx` 并 `Math.max(0, ...)` |
| 4 | 🟡 中等 | `prescriptions.py` | `patient.rehab_level or 3` 在 level=0 时错误默认 | 改为 `is not None` 判断 |
| 5 | 🟡 中等 | `prescriptions.py` | `save_as_draft=true` 但患者无 `doctor_id` 时静默失败 | 添加 `logger.warning` 记录 |
| 6 | 🟡 低 | `PatientDetailView.tsx` | `window.location.reload()` 硬刷新 | 保留但添加注释说明原因 |
| 7 | 🟡 中等 | `progress/index.js` | 评估数据全量加载 | 添加 `limit: 15` 参数 |
| 8 | 🟡 中等 | `knowledge/index.js+wxml` | 内容行检测过宽（"2型糖尿病"误判列表） | JS 层预解析 `_parseContentLines`，正则匹配 `^\d+[\.．、\s]` |
| 10 | 🟢 低 | `models.py` | `RehabPlan.status` 无数据库级约束 | 添加 `CheckConstraint` |
| 11 | 🟢 低 | `prescription_service.py` | `_get_last_prescription_context` 方法内 `import` | 移至文件顶部 |

---

## 登录卡死 Bug 修复（2026-06-14）

**现象**：医生端登录按钮点击后一直转圈，无法进入系统。

**根因**：`LoginView.tsx` 使用了 `mountedRef` 模式防止 setState on unmounted component，但该模式在 React 18 StrictMode 下被破坏：

1. `main.tsx` 使用了 `<StrictMode>`
2. StrictMode 会双重调用 effects：运行 → 清理 → 再运行
3. `mountedRef` 的 cleanup 函数设置 `mountedRef.current = false`
4. 第二次 effect 运行时，`mountedRef.current` 仍为 `false`，不会被 `useRef(true)` 重置
5. `setTimeout` 回调检查 `if (!mountedRef.current) return` → **直接返回**
6. `setIsSubmitting(false)` 和 `onLoginSuccess()` 永远不会执行 → 按钮永远转圈

**修复**：移除 `mountedRef` 及其 `useEffect`。React 18+ 已移除 "setState on unmounted component" 警告，该模式不再必要。

---

## 数据展示修复 + 模拟数据生成（2026-06-19）

### 问题
1. 患者详情页训练记录/30天进度/AI小结/方案历史全部加载失败
2. 两个患者（ID 14、15）没有任何训练数据

### 修复内容

**1. 移除开发期 JWT 鉴权**
- `training_logs.py`、`rehab_plans.py`、`ai_summaries.py` 三个路由文件移除了 `get_current_user` 依赖
- 原因：医生端为纯前端模拟登录，无 JWT token，导致所有需鉴权的接口返回 401
- 与 `doctors.py`、`assessments.py`、`warnings.py` 保持一致（这些接口本就无鉴权）

**2. 修复 RecoveryStage 枚举大小写不匹配**
- 数据库 enum 定义为小写 `enum('early','mid','stable')`
- 模型 `RecoveryStage` 枚举 name 为大写 `EARLY/MID/STABLE`，导致 SQLAlchemy 读取时报 `KeyError: 'mid'`
- 修复：将枚举改为 `early = "early"` 让 name 和 value 一致
- 同步修改 `grading_service.py`、`prescription_service.py` 中的引用

**3. 修复 ai_summaries.content 列类型**
- 数据库为 `varchar(255)`，模型定义为 `Text`
- 修复：`ALTER TABLE ai_summaries MODIFY COLUMN content TEXT NOT NULL`

**4. 模拟数据脚本 `seed_mock_data.py`**
为患者 14（测试患者）和 15（测试患者2号）生成完整数据：

| 数据类型 | 患者14 | 患者15 |
|----------|--------|--------|
| 健康档案 | 恢复中期/L3/慢性呼吸疾病 | 恢复早期/L2/吸烟+慢性呼吸+心血管 |
| 训练记录 | 22条（周一到周五，趋势改善） | 17条（周一到周四，波动较大） |
| 评估记录 | 4次（心率88→82，血氧95→97） | 4次（心率95，血氧93，呼吸困难4） |
| 训练方案 | 2条（基础方案→进阶方案，含结构化动作） | 2条（初始方案→调整方案） |
| AI小结 | 1条（依从性良好，指标改善） | 1条（恢复较慢，波动大，需关注） |
| 预警记录 | 1条（血氧低，已处理） | 2条（心率高已处理+呼吸困难未处理） |

---

## 患者详情页 UI 重构（2026-06-19）

### 问题
1. 标题排版层次不清，患者姓名/ID/状态标签挤在一起
2. 核心患者信息随页面滚动消失，操作按钮不可见
3. 右侧边栏 8+ 张卡片纵向堆叠，需大量滚动浏览

### 重构方案（参考 Linear/Jira 范式）

**1. 吸顶患者信息栏**
- 患者姓名 + ID + 状态标签 + 康复等级 固定在页面顶部
- 关键指标（近7天打卡/累计时长/记录数）内联展示
- 下发方案按钮始终可见
- 背景色与页面一致，消除"透出"效果

**2. 右侧边栏 Tab 化**
- 将 8 张卡片分为 3 个 Tab：
  - **档案评估**：健康档案、康复等级、最新评估、当前状态、跟进建议
  - **AI 分析**：AI 康复小结、安全预警
  - **方案历史**：训练方案历史
- Tab 导航栏 sticky 定位在右侧边栏顶部
- 默认展示"档案评估"Tab

**3. 排版优化**
- 患者姓名字号加大、字重加粗（`text-lg font-bold`）
- ID/状态/等级标签缩小至 `text-[10px]`，降低视觉权重
- 跟进提示独立成横条，不再占用 Header 空间
- Section 间距从 `space-y-5` 调整为 `space-y-4`，减少垂直留白
