# Agent Memory

## 1. 项目背景

- 项目是“肺康复管理 MVP”，目标是先做出可运行闭环，再逐步补齐工程化与视觉细节。
- 系统分三块：
  - `backend/`：FastAPI + SQLAlchemy + MySQL
  - `doctor-web/`：React + Vite + TypeScript 医生端
  - `patient-app/`：当前是原生微信小程序壳，不是 UniApp 工程
- 详细接口、运行方式、字段和示例统一看 `README.md`，本文件只保留交接信息与协作规则。

## 2. 用户协作偏好

- 用户希望协作角色是“工程导师 + 代码合作者”，不是一次性全生成器。
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
- 患者端当前不是要继续抠 UI，而是要优先把“真实功能闭环”打通。
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
  - 首页“今日康复进度”已开始接真实数据
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
- 当前性质：
  - 已经是“半真实 + 半配置化”
  - 真实部分：今天训练分钟数、AI 小结预览
  - 固定部分：目标时长 20 分钟

### 训练打卡页 `pages/check-in`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`
  - 页面打开时先读取今天记录并回填表单
  - 提交时调用 `POST /api/training-logs`
  - 同日重复提交时会覆盖更新
  - 提交成功后自动回首页，首页会刷新进度
- 这意味着：
  - 患者端第一个真实业务闭环已经打通
  - 闭环是：打卡页提交 -> 后端写入 -> 首页刷新

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
  - 通过 `GET /api/rehab-plans`
    读取最新训练方案摘要
  - 通过 `GET /api/training-logs/progress-30d`
    读取 30 天摘要
  - 通过 `GET /api/ai-summaries/latest`
    读取 AI 小结预览
- 当前性质：
  - 已从静态入口页升级为真实概览页
  - 训练方案、30 天摘要、AI 预览已统一为真实口径

### 训练方案详情页 `pages/plan-detail`

- 当前逻辑：
  - 联调阶段固定 `patient_id=1`、`doctor_id=13`
  - 通过 `GET /api/rehab-plans`
    读取最新方案和历史方案列表
- 当前性质：
  - 已是真实数据页
  - 支持加载态 / 空态 / 错误态

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

- 当前最合理的下一步，不是继续扩页，而是做一轮患者端联调收口。
- 推荐顺序：
  1. `患者端联调收口检查`
  2. `修剩余口径不一致 / 跳转刷新 / 空态问题`
  3. `再考虑把目标时长从“前端固定 20 分钟”升级为“结构化方案字段”`
  4. `最后再决定是否进入登录态或进一步工程化`

### 下一模块建议

- 名称：`患者端联调收口检查`
- 输入：
  - 固定测试 `patient_id=1`
  - 固定测试 `doctor_id=13`
  - 当前已接入的真实接口链路
- 输出：
  - 一份当前患者端“已通 / 未通 / 需修复项”结果
  - 找出剩余逻辑问题并按优先级修复
- 作用：
  - 把当前患者端收成稳定联调基线

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
- 不要一下子扩散多个患者端页面；继续遵守“一次一个模块”。
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
- 如果下一位 Agent 继续改 UI，先确认用户是否要“先功能还是先样式”；用户当前最新偏好是：先把功能和逻辑打通，再做联调收口。
- 如果业务定义不清楚，必须先问用户，不要自行扩需求。
