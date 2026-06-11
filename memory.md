# Agent Memory

## 1. 项目背景

- 项目是"肺康复管理 MVP"，目标是先做出可运行闭环，再逐步补齐工程化与视觉细节。
- 系统分三块：
  - `backend/`：FastAPI + SQLAlchemy + MySQL
  - `doctor-web/`：React + Vite + TypeScript 医生端
  - `patient-app/`：当前是原生微信小程序壳，不是 UniApp 工程
- 详细接口、运行方式、字段和示例统一看 `README.md`，本文件只保留交接信息与协作规则。

## 2. 用户协作偏好

- 用户希望协作角色是"工程导师 + 代码合作者"，不是一次性全生成器。
- 强规则：
  - 每次只做一个模块 / 一个最小可运行单元
  - 写代码前先给设计，至少说明：名称、输入、输出、作用
  - 所有实现尽量简单优先，先跑通再优化
  - 不清楚就反问，不要脑补需求
  - debug 优先，先分析问题，不要一上来重写
- 用户很在意文档治理：
  - 默认不新增 `md`
  - 交接信息写 `memory.md`
  - 公共事实和阶段进度写 `README.md`

## 3. 当前阶段判断

- 医生端 Web 三页主流程已经完成一轮联调验收，可视为当前稳定基线。
- 当前阶段重点已经从医生端 Web 转到患者端 `patient-app/`。
- 患者端当前不是要继续抠 UI，而是要优先把"真实功能闭环"打通。
- 当前最重要方向：
  - 患者训练打卡
  - 首页真实进度
  - 30 天进度真实数据
  - 训练方案展示
  - AI 小结读取

## 4. 已确认业务规则

- 患者直接通过 `doctor_id` 归属医生，不做医患关系表。
- `training_logs` 每个患者每天只保留 1 条记录，重复提交时覆盖更新。
- 近 30 天进度图按包含今天的滚动窗口计算，无记录日期补 0。
- `rehab_plans` 保留历史，每次下发新增，不覆盖。
- 医生患者列表只返回 3 个核心指标：
  - 近 7 天打卡次数
  - 累计训练时长
  - 最近一次训练日期
- AI 小结默认读取最新一条，无数据返回 `null`。
- 所有接口统一返回：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

## 5. 当前已完成情况

### 后端

- 已完成：
  - FastAPI 基础骨架、数据库连接、模型
  - `GET /api/health`
  - `POST /api/training-logs`
  - `GET /api/training-logs`
  - `GET /api/training-logs/progress-30d`
  - `POST /api/rehab-plans`
  - `GET /api/rehab-plans`
  - `GET /api/doctors/{doctor_id}/patients`
  - `GET /api/ai-summaries/latest`
  - AI 周报定时任务骨架与 DeepSeek 客户端封装
- 已做过的关键修正：
  - 训练方案接口加了医生-患者归属校验
  - 医生患者列表最近训练时间改按 `train_date`
  - `.env` 缺失导致数据库连不上问题已排过一次

### 医生端 Web

- 当前为稳定基线，主流程：
  - 登录
  - 患者列表
  - 患者详情
- 已完成真实数据联调和主要风险修复：
  - 列表错误态
  - 风险分组与行动提示
  - 详情页 30 天进度 / 训练记录 / AI 小结 / 方案历史
  - 方案状态提示与下发成功反馈
  - 旧请求覆盖保护
  - `DirectorDashboard` 已隐藏但不删除
- 视觉边界文档：`doctor-web/style-boundary.md`
- 页面扩展判断文档：`doctor-web/page-expansion-assessment.md`

### 患者端小程序

- 当前目录：`patient-app/`
- 重要事实：
  - 这是原生微信小程序壳
  - 不是 UniApp 工程
  - 当前先沿这套壳推进 MVP，而不是先重构技术栈
- 已完成：
  - 页面结构已重构为 `3 个主页面 + 3 个二级页面`
  - 主页面：首页、训练打卡、我的康复
  - 二级页：训练方案详情、30天进度、AI 小结
  - 首页已按 Gemini 参考项目做过多轮 UI 收敛
  - 首页"今日康复进度"已开始接真实数据
  - 训练打卡页已接入真实提交闭环
  - 30天进度页已接入真实趋势数据
  - 我的康复页已接入真实训练方案
  - 训练方案详情页已接入真实历史方案列表
  - AI 小结页已接入真实查询
  - 首页 AI 小结卡、我的康复页 30 天摘要、我的康复页 AI 预览已完成真实数据收口

## 6. 患者端当前真实状态

### 首页 `pages/home`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`
  - 固定目标时长 `20 分钟`
  - 通过 `GET /api/training-logs?patient_id=1&start_date=今天&end_date=今天`
    读取今天训练记录
  - 按 `今日训练时长 / 20 分钟` 计算百分比
  - 使用 canvas 动态绘制进度圆环，不再依赖静态图片
  - 通过 `GET /api/ai-summaries/latest?patient_id=1`
    读取首页 AI 小结卡真实预览
  - 通过 `GET /api/training-logs/progress-30d?patient_id=1`
    读取近 30 天数据，计算连续打卡天数并展示在标题下方
- 当前性质：
  - 已经是"半真实 + 半配置化"
  - 真实部分：今天训练分钟数、AI 小结预览、连续打卡天数
  - 固定部分：目标时长 20 分钟
  - 连续打卡天数为 0 时不显示（避免负面反馈）

### 训练打卡页 `pages/check-in`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`
  - 页面顶部安全提示："训练中出现严重气喘、头晕或胸痛，请立即停止并联系医生"
  - 呼吸陪练入口：点击"开始"展开计时器面板
  - 呼吸计时器：吸气4秒（圆圈放大/绿色）→ 屏气2秒（圆圈保持/蓝色）→ 呼气6秒（圆圈缩小/绿色），共5轮
  - 计时器支持开始/暂停/重置，完成后自动填充"缩唇腹式呼吸"任务的实际时长
  - 3 项预设肺康复训练任务清单（缩唇腹式呼吸、平地行走、有效咳嗽排痰），每项含"为什么练"提示（benefit 字段）
  - 逐项勾选后可填实际时长，全部勾选后激活提交按钮
  - 提交时前端汇总，提交成功后展示鼓励反馈 + 康复小知识再跳回首页
  - 同日重复提交时覆盖更新
- 任务项当前为前端静态配置（`DEFAULT_TASKS`），等后端方案结构化后再改为动态读取
- 这意味着：
  - 患者端打卡体验从"被动填数字"变为"主动完成任务 + 有人带练"
  - 呼吸计时器是肺康复 App 区别于普通打卡工具的核心差异点

### 30天进度页 `pages/progress`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`
  - 通过 `GET /api/training-logs/progress-30d`
    读取近 30 天训练数据
  - 页面会真实计算：
    - 训练天数
    - 累计训练时长
    - 累计组数
    - 柱状趋势图高度
- 当前性质：
  - 已是真实数据页
  - 支持加载态 / 错误态

### 我的康复页 `pages/rehab`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`、`doctor_id=13`
  - 页面顶部展示训练统计横栏：累计训练天数、完成率（训练天数/30天×100%）、累计训练时长
  - 通过 `GET /api/rehab-plans`
    读取最新训练方案摘要
  - 通过 `GET /api/training-logs/progress-30d`
    读取 30 天摘要，同时计算统计数据
  - 通过 `GET /api/ai-summaries/latest`
    读取 AI 小结预览
- 当前性质：
  - 已从静态入口页升级为真实概览页 + 统计面板
  - 训练方案、30 天摘要、AI 预览、统计数据已统一为真实口径

### 训练方案详情页 `pages/plan-detail`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`、`doctor_id=13`
  - 通过 `GET /api/rehab-plans`
    读取最新方案和历史方案列表
  - 最新方案卡片下方展示"训练动作指导"区域
  - 3 项训练动作（缩唇腹式呼吸、平地行走、有效咳嗽排痰）以可展开/收起的卡片展示
  - 每项包含：动作步骤（编号列表）+ 注意事项（黄色提示框）
  - 动作指导当前为前端静态配置（`EXERCISE_GUIDES`），与打卡页 `DEFAULT_TASKS` 一一对应
  - 等后端方案结构化后再改为动态读取
- 当前性质：
  - 已是真实数据页 + 静态动作指导
  - 支持加载态 / 空态 / 错误态
  - 患者可以在方案页看到"怎么练"的具体步骤

### AI 小结页 `pages/ai-summary`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`
  - 通过 `GET /api/ai-summaries/latest`
    读取最新 AI 小结
  - 周期字段已修正为真实周起止日期：
    - `summary_week_start`
    - `summary_week_end`
- 当前性质：
  - 已是真实数据页
  - 支持成功态 / 空态 / 错误态

## 7. 下一优先级

- 打卡页任务清单模式已完成，首页连续打卡天数已完成，方案详情页训练动作指导已完成，空态/错误态文案已统一修正，下一步按优先级：
  1. `打卡天数 + 达标率统计`（已完成，康复页顶部统计横栏）
  2. `训练计时器/引导器`（已完成，打卡页呼吸陪练计时器）
  3. `康复知识/教育`（已完成，嵌入打卡页：任务项 benefit 提示 + 成功反馈小知识）
  4. `紧急安全提示`（已完成，打卡页顶部安全提示）
- 白屏问题已修复：移除了 `app.json` 中的 Skyline 渲染引擎配置，回退为 WebView 渲染
- 空态/错误态文案已统一修正：
  - 空态（后端正常但数据为空）：友好引导，如"暂无训练方案，建议先完成训练打卡"
  - 错误态（网络故障/后端不可用）：仅在方案详情页保留"网络异常"提示，其他页面静默处理显示空态
  - 已删除康复页和AI小结页的免责声明黄色大框

### 联调收口检查（已完成）

- 检查范围：6 个页面全部代码（home / check-in / rehab / plan-detail / ai-summary / progress）
- 发现并修复 4 个问题：
  1. **BUG（严重）**：打卡页 WXML 中使用 `Math.ceil` —— 小程序 WXML 不支持 `Math` 对象，改为 JS 中计算 `breathTotalMinutes` 字段
  2. **BUG（中等）**：呼吸计时器 `_calcCircleScale` 始终传 `BREATH_PHASES[0].duration`（4秒），导致呼气阶段圆圈缩放动画错误，改为动态查找当前阶段 duration
  3. **一致性**：30天进度页的错误态文案/样式仍为旧式"暂时无法读取...请稍后重试"，改为空态友好引导"暂无训练记录"，清理 `errorMessage` 字段和 `--error` 样式
  4. **BUG（严重）**：首页进度环用的是静态 `progress-33.png` 图片，JS 中 `drawProgressRing()` Canvas 代码写了但 WXML 没接 `<canvas>` 元素，导致进度永远显示 33%。已改为 `<canvas canvas-id="progressRing">`
- 所有页面 API URL 一致（`http://127.0.0.1:8000/api`）、patient_id 一致（1）、doctor_id 一致（13）
- 页面导航链路完整，无死链
- 空态/错误态全部统一为友好引导风格

## 8. 关键文件

- 交接先看：
  - `README.md`
  - `memory.md`
- 后端核心：
  - `backend/routers/training_logs.py`
  - `backend/routers/rehab_plans.py`
  - `backend/routers/ai_summaries.py`
  - `backend/routers/doctors.py`
  - `backend/schemas.py`
- 患者端当前重点：
  - `patient-app/pages/home/index.js`
  - `patient-app/pages/home/index.wxml`
  - `patient-app/pages/home/index.wxss`
  - `patient-app/pages/check-in/index.js`
  - `patient-app/pages/check-in/index.wxml`
  - `patient-app/pages/check-in/index.wxss`
  - `patient-app/pages/progress/index.js`
  - `patient-app/pages/progress/index.wxml`
  - `patient-app/pages/rehab/index.js`
  - `patient-app/pages/plan-detail/index.js`
  - `patient-app/pages/ai-summary/index.js`
- Gemini 参考项目：
  - `patient-app/呼吸康复-Gemini生成参考/`
  - 这是 Android Compose 参考工程，主要借鉴布局、留白、模块大小关系，不直接照搬技术实现

## 9. 接手提醒

- 不要再默认新增文档，优先维护 `README.md` 和 `memory.md`。
- 不要一下子扩散多个患者端页面；继续遵守"一次一个模块"。
- 当前患者端联调阶段默认用固定测试患者：
  - `patient_id=1`
- 当前训练方案联调阶段默认医生：
  - `doctor_id=13`
- 当前首页目标时长仍是前端固定 `20 分钟`，这是已确认的临时方案，不是最终结构化能力。
- 当前患者端主要真实链路已打通：
  - 首页今日进度
  - 打卡页提交
  - 30 天进度页
  - 我的康复页方案摘要
  - 训练方案详情页
  - AI 小结页
  - 首页 / 康复页 AI 预览
- 如果下一位 Agent 继续改 UI，先确认用户是否要"先功能还是先样式"；用户当前最新偏好是：先把功能和逻辑打通，再做联调收口。
- 如果业务定义不清楚，必须先问用户，不要自行扩需求。
