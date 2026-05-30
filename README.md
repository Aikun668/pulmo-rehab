# Pulmo Rehab MVP

肺康复管理 MVP 项目，目标是在 2 个月内完成可运行版本，并支撑后续软著申请。

## 项目概览

- 患者端：`Uniapp` 微信小程序
- 医生端：`React + Vite + TypeScript` Web 后台（目录：`doctor-web/`）
- 后端：`FastAPI + SQLAlchemy`
- 数据库：`MySQL 8+`
- 部署目标：腾讯云轻量服务器

## 文档分工

为避免文档越来越多、职责重叠，后续默认不新增 `md` 文件。

先判断能否写入已有文档，只有在现有文档确实装不下、且职责无法合并时，才允许新增文档。

当前文档分工如下：

- `README.md`
  - 看项目公开事实：当前能力、运行方式、接口概览、阶段状态
- `memory.md`
  - 看交接上下文：分工边界、当前阶段重点、接手说明
- `doctor-web/style-boundary.md`
  - 看医生端设计借鉴边界：`IBM / Intercom / Airtable` 各负责什么、哪些地方禁止混用
- `doctor-web/page-expansion-assessment.md`
  - 看医生端页面是否需要扩展：当前三页是否足够、哪些能力先不拆页、哪些能力后续值得扩出

后续更新规则：

- 新功能完成后，优先更新 `README.md`
- 阶段变化或交接变化，更新 `memory.md`
- 视觉规则变化，只更新 `doctor-web/style-boundary.md`
- 页面扩展判断变化，只更新 `doctor-web/page-expansion-assessment.md`
- 一次性的任务计划或临时讨论，默认不落新文档

## 当前能力

已完成：

- 基础 FastAPI 服务启动
- MySQL 连接与表自动创建
- 健康检查接口
- 患者训练打卡接口
- 近 30 天训练进度接口
- 医生下发训练方案接口
- 患者查看历史训练方案接口
- 训练方案接口已补医生-患者归属校验，方案历史查询需同时传 `patient_id` 与 `doctor_id`
- 医生端患者列表与 3 个核心指标接口
- 医生患者列表中的最近训练指标已改为按 `train_date` 统计最近训练日期，不再使用记录创建时间
- AI 周报最新一条查询接口
- AI 周报定时任务骨架与 DeepSeek 客户端封装
- 医生端 Web 三页主流程骨架：
  - 登录页
  - 患者列表页
  - 患者详情页
- 登录页已完成一轮卡片信息清理：
  - 删除冗余包装信息与长说明
  - 保留最小登录入口信息与开发联调提示
- 患者列表页已按风格边界文档完成第一轮收敛：
  - 顶部工作台摘要
  - 搜索与视图切换工具栏
  - 更克制的患者卡片 / 列表视图
  - 统一的空态、错误态与跟进提示
  - 新增“全部患者 / 待跟进 / 训练稳定”筛选模式，不扩页先承载待跟进视图能力
  - 卡片视图支持按风险分组展示，按“需尽快跟进 / 需要关注 / 训练稳定”组织患者工作队列
  - 列表页已补行动导向提示，先把“风险判断”推进到“查看详情后该做什么”的入口引导
- 医生端患者详情页已接入真实后端数据块：
  - 患者基础信息
  - 近 30 天训练进度
  - 训练记录列表
  - 训练方案历史与下发
  - 最新 AI 小结
- 患者详情页已按风格边界文档完成第一轮收敛：
  - 工作台页头与患者状态摘要
  - 主区优先展示30天训练进度与训练记录
  - 右侧展示患者概览、AI 小结、方案历史
  - 方案弹窗与列表页保持同一套组件语言
  - 详情页风险标签、颜色语义与跟进提示已对齐患者列表页三档状态
  - 详情页新增“跟进建议”卡片，可按当前状态直接跳转到进度、记录或方案区
  - 详情页已补请求版本保护，快速切换患者时旧请求结果不会覆盖当前患者数据
  - 详情页方案区已补“当前是否已有方案”的状态提示，方案下发成功后会给出闭环反馈

待完成：

- 登录鉴权接口
- DeepSeek 真 API 联调与提示词调优
- 前后端联调与部署

## 数据模型

当前核心表：

- `users`：患者与医生共用，`role` 区分身份，患者记录直接挂 `doctor_id`
- `training_logs`：每日训练打卡记录
- `rehab_plans`：医生下发的训练方案，保留历史
- `ai_summaries`：AI 每周康复小结

## 后端目录

```text
backend/
  core/
    config.py
  routers/
    health.py
    training_logs.py
    rehab_plans.py
    doctors.py
    ai_summaries.py
  services/
    ai_summary_service.py
    deepseek_client.py
  tasks/
    ai_summary_job.py
  database.py
  main.py
  models.py
  schemas.py
```

## 本地启动

1. 配置 `backend/.env`

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=你的MySQL密码
DB_NAME=pulmo_rehab

SECRET_KEY=pulmo-rehab-dev-key-2026
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

AI_SUMMARY_ENABLED=false
AI_SUMMARY_CRON=0 0 * * 1
DEEPSEEK_API_KEY=你的DeepSeekKey
DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
DEEPSEEK_MODEL=deepseek-chat
```

2. 确保数据库存在

```sql
CREATE DATABASE IF NOT EXISTS pulmo_rehab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. 启动后端

```bash
cd backend
uvicorn main:app --reload
```

4. 访问接口文档

- `http://127.0.0.1:8000/api/docs`
- `http://127.0.0.1:8000/api/health`

5. 启动医生端 Web（可选）

```bash
cd doctor-web
npm install
npm run dev
```

- 默认使用 Vite 开发服务
- `doctor-web/src/App.tsx` 维护三页主流程状态切换
- `doctor-web/src/components/PatientDetailView.tsx` 已按真实后端接口展示详情块

6. AI 周报定时任务说明

- 默认 `AI_SUMMARY_ENABLED=false`，不会自动启动任务
- 打开后端服务时会挂载 `APScheduler`
- 定时表达式默认 `0 0 * * 1`，表示每周一 00:00 触发
- 任务逻辑：读取上周训练数据 -> 调用 DeepSeek -> 写入 `ai_summaries`
- 同一患者同一周如果已存在周报，则跳过
- 单患者调用失败时只记日志，不中断整批任务

## 当前接口

统一返回结构：

```json
{
  "code": 200,
  "message": "success",
  "data": {}
}
```

### Health

- `GET /api/health`

### Training Logs

- `POST /api/training-logs`
  - 新增或覆盖当天打卡
- `GET /api/training-logs`
  - 查询某位患者的打卡记录
- `GET /api/training-logs/progress-30d`
  - 查询患者近 30 天训练进度，空白日期补 0

### Rehab Plans

- `POST /api/rehab-plans`
  - 医生给自己名下患者新增训练方案
- `GET /api/rehab-plans`
  - 查询当前医生名下指定患者的全部历史训练方案
  - 查询参数：`patient_id`、`doctor_id`

### Doctors

- `GET /api/doctors/{doctor_id}/patients`
  - 查询医生名下患者列表与 3 个核心看板指标

### AI Summaries

- `GET /api/ai-summaries/latest`
  - 查询患者最新一条 AI 周报

## 医生端 Web 当前说明

- 当前优先目标是医生端 Web 三页主流程，不扩页：
  - 登录 -> 患者列表 -> 患者详情
- 医生端视觉借鉴边界已单独落文档：
  - `doctor-web/style-boundary.md`
  - 后续设计必须先按该文档划定 `IBM / Intercom / Airtable` 的模块归属，再进入实现
- 医生端页面扩展判断已单独落文档：
  - `doctor-web/page-expansion-assessment.md`
  - 用于判断当前三页主流程是否足够、哪些能力先不拆页、哪些能力后续值得扩出
- `DirectorDashboard` 暂不纳入当前 MVP 验收范围：
  - 不删除源码
  - 不作为默认首页
  - 不出现在正式导航
- 当前详情页优先保证 3 个核心信息块稳定可见：
  - 患者基础信息
  - 近 30 天进度图
  - 训练记录列表
- 训练方案与 AI 小结也已保留在详情页中，但以真实接口联调和稳定展示为先

## 页面维度接口清单

### 患者端（Uniapp）

- 训练打卡页
  - `POST /api/training-logs`
- 训练记录列表页
  - `GET /api/training-logs`
- 近30天进度图页
  - `GET /api/training-logs/progress-30d`
- 训练方案页
  - `GET /api/rehab-plans?patient_id={patient_id}&doctor_id={doctor_id}`
- AI 周报页
  - `GET /api/ai-summaries/latest`

### 医生端（Web）

- 患者列表与看板页
  - `GET /api/doctors/{doctor_id}/patients`
- 训练方案下发页
  - `POST /api/rehab-plans`
- 方案历史查询
  - `GET /api/rehab-plans?patient_id={patient_id}&doctor_id={doctor_id}`

## 字段表

### POST /api/training-logs

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | 是 | 患者 ID |
| `train_date` | string | 是 | 训练日期，格式 `YYYY-MM-DD` |
| `duration_minutes` | int | 是 | 训练时长，必须大于 0 |
| `sets_count` | int | 是 | 训练组数，必须大于 0 |
| `note` | string/null | 否 | 备注，最长 200 字 |

响应 `data` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `action` | string | `created` 或 `updated` |
| `data.id` | int | 打卡记录 ID |
| `data.patient_id` | int | 患者 ID |
| `data.train_date` | string | 训练日期 |
| `data.duration_minutes` | int | 训练时长 |
| `data.sets_count` | int | 训练组数 |
| `data.note` | string/null | 备注 |
| `data.created_at` | string | 创建时间，ISO 8601 |

### GET /api/training-logs

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | 是 | 患者 ID |
| `start_date` | string | 否 | 开始日期，格式 `YYYY-MM-DD` |
| `end_date` | string | 否 | 结束日期，格式 `YYYY-MM-DD` |

响应 `data`：打卡记录数组，元素字段同上。

### GET /api/training-logs/progress-30d

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | 是 | 患者 ID |

响应 `data` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `patient_id` | int | 患者 ID |
| `days` | array | 近 30 天数组，固定长度 30 |
| `days[].date` | string | 日期 |
| `days[].duration_minutes` | int | 当天训练时长，无记录则为 0 |
| `days[].sets_count` | int | 当天训练组数，无记录则为 0 |

### POST /api/rehab-plans

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | 是 | 患者 ID |
| `doctor_id` | int | 是 | 医生 ID |
| `title` | string | 是 | 方案标题，最长 100 字 |
| `content` | string | 是 | 方案内容，最长 2000 字 |

响应 `data` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 方案 ID |
| `patient_id` | int | 患者 ID |
| `doctor_id` | int | 医生 ID |
| `title` | string | 方案标题 |
| `content` | string | 方案内容 |
| `created_at` | string | 创建时间，ISO 8601 |

### GET /api/rehab-plans

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | 是 | 患者 ID |

响应 `data`：方案数组，按 `created_at` 倒序返回，元素字段同上。

### GET /api/doctors/{doctor_id}/patients

路径参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `doctor_id` | int | 是 | 医生 ID |

响应 `data` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | 患者 ID |
| `name` | string | 患者姓名 |
| `stats.check_in_count_7d` | int | 近 7 天打卡次数 |
| `stats.total_duration_minutes` | int | 历史累计训练时长 |
| `stats.last_check_in_at` | string/null | 最近一次打卡时间，无记录则为 `null` |

### GET /api/ai-summaries/latest

查询参数：

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `patient_id` | int | 是 | 患者 ID |

响应 `data` 字段：

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int | AI 周报 ID |
| `patient_id` | int | 患者 ID |
| `summary_week_start` | string | 周报开始日期 |
| `summary_week_end` | string | 周报结束日期 |
| `content` | string | AI 周报正文 |
| `created_at` | string | 创建时间，ISO 8601 |

无数据时：

```json
{
  "code": 200,
  "message": "success",
  "data": null
}
```

## 请求响应示例

### 打卡提交示例

请求：

```json
{
  "patient_id": 1,
  "train_date": "2026-05-23",
  "duration_minutes": 30,
  "sets_count": 3,
  "note": "今天训练状态稳定"
}
```

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "action": "created",
    "data": {
      "id": 1,
      "patient_id": 1,
      "train_date": "2026-05-23",
      "duration_minutes": 30,
      "sets_count": 3,
      "note": "今天训练状态稳定",
      "created_at": "2026-05-23T04:30:00Z"
    }
  }
}
```

### 近30天进度示例

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "patient_id": 1,
    "days": [
      {
        "date": "2026-05-22",
        "duration_minutes": 0,
        "sets_count": 0
      },
      {
        "date": "2026-05-23",
        "duration_minutes": 30,
        "sets_count": 3
      }
    ]
  }
}
```

### 训练方案新增示例

请求：

```json
{
  "patient_id": 1,
  "doctor_id": 2,
  "title": "第一周训练方案",
  "content": "每天进行呼吸训练 20 分钟，分 3 组完成。"
}
```

### 医生患者列表示例

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": [
    {
      "id": 1,
      "name": "张三",
      "stats": {
        "check_in_count_7d": 5,
        "total_duration_minutes": 320,
        "last_check_in_at": "2026-05-23T08:00:00Z"
      }
    },
    {
      "id": 2,
      "name": "李四",
      "stats": {
        "check_in_count_7d": 0,
        "total_duration_minutes": 0,
        "last_check_in_at": null
      }
    }
  ]
}
```

### AI 周报示例

响应：

```json
{
  "code": 200,
  "message": "success",
  "data": {
    "id": 1,
    "patient_id": 1,
    "summary_week_start": "2026-05-19",
    "summary_week_end": "2026-05-25",
    "content": "本周训练较稳定，请继续保持规律训练。",
    "created_at": "2026-05-26T00:00:00Z"
  }
}
```

## 当前 MVP 业务规则

- 打卡模块：每个患者每天只保留 1 条记录，重复提交时覆盖更新
- 进度图模块：主折线展示训练时长，近 30 天按包含今天的滚动窗口计算，空白日期补 0
- 训练方案模块：患者查看全部历史方案，医生重复下发时直接新增记录保留历史
- 医生看板模块：医生患者列表接口返回 id、name，以及近7天打卡次数、历史累计训练时长、最近一次打卡时间，默认按最近打卡时间倒序
- AI 小结模块：患者端默认查询最新一条周报；无数据时正常返回 null，不作为异常处理
- AI 生成模块：采用 APScheduler 定时任务；DeepSeek 按 OpenAI 兼容 Chat API 设计；同一患者同一周已存在则跳过；单患者失败只记录日志并继续处理其他患者

## 文档维护约定

- 每完成一个模块或一次阶段性改动，都同步更新本 README
