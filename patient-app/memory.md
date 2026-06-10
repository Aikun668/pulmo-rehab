# 肺康复患者端小程序 - Agent 交接文档

> 本文档帮助新 Agent 快速理解 `patient-app` 当前阶段、已做内容、未做内容、接手须知。
> 更新时间：2026-06-01

---

## 1. 项目背景

肺康复管理系统的患者端微信小程序。患者用它完成每日训练打卡、查看训练进度、查看医生下发的训练方案、查看 AI 康复小结。医生端 Web 已作为稳定基线完成，当前阶段焦点在患者端小程序。

## 2. 项目性质

- **项目类型**：微信小程序原生项目（JS + WXML + WXSS）
- **不是**：Taro / UniApp / Vue / React 项目
- **无 npm 依赖**，无 `package.json`，无 `node_modules`
- **渲染引擎**：Skyline + glass-easel
- **开发工具**：微信开发者工具
- **appid**：`wx7761ea799e603529`

## 3. 当前阶段

### 已打通（真实数据链路）
- 首页今日进度（Canvas 绘制圆环，按今日训练时长/20分钟算百分比）
- 打卡页真实提交（覆盖更新，提交后回首页刷新）
- 30天进度页真实趋势（柱状图，摘要统计）
- 我的康复页真实方案摘要、30天摘要、AI 预览
- 训练方案详情页真实最新方案 + 历史方案
- AI 小结页真实内容（含正确周期字段 `summary_week_start/end`）

### 联调参数（固定值，全项目统一）
- `patient_id = 1`
- `doctor_id = 13`
- `API_BASE_URL = http://127.0.0.1:8000/api`
- 首页目标时长 = 20 分钟（固定值，非后端结构化字段）

## 4. 页面文件清单

| 文件路径 | 类型 | 说明 |
|----------|------|------|
| `pages/home/index.js` | tabBar 首页 | 今日进度 + AI 预览 + 双按钮 |
| `pages/home/index.wxml` | 模板 | 单主卡 + 双工具按钮 + AI卡 |
| `pages/home/index.wxss` | 样式 | Canvas 圆环 + 卡片布局 |
| `pages/check-in/index.js` | tabBar 打卡 | 真实读取 + 覆盖提交 |
| `pages/check-in/index.wxml` | 模板 | 表单 |
| `pages/check-in/index.wxss` | 样式 | 表单样式 |
| `pages/progress/index.js` | 二级进度页 | 30天趋势 |
| `pages/progress/index.wxml` | 模板 | 柱状图 + 摘要 |
| `pages/progress/index.wxss` | 样式 | 柱状图 |
| `pages/rehab/index.js` | tabBar 康复 | 方案 + 30天 + AI |
| `pages/rehab/index.wxml` | 模板 | 卡片入口 |
| `pages/rehab/index.wxss` | 样式 | 卡片布局 |
| `pages/plan-detail/index.js` | 二级方案页 | 最新方案 + 历史 |
| `pages/plan-detail/index.wxml` | 模板 | 方案列表 |
| `pages/plan-detail/index.wxss` | 样式 | 方案卡片 |
| `pages/ai-summary/index.js` | 二级 AI 页 | 最新小结 |
| `pages/ai-summary/index.wxml` | 模板 | 小结展示 |
| `pages/ai-summary/index.wxss` | 样式 | 小结卡片 |

## 5. 关键代码规范

### 首页进度圆环
- 使用 `wx.createCanvasContext("progressRing", this)` 动态绘制
- 不是静态图片
- 在 `onReady` + `data` 变化后都调用 `drawProgressRing()`
- 圆环配置：尺寸 200px，半径 64px，线宽 14px

### 打卡提交
- 校验：时长和组数必须是正整数
- 同一天覆盖更新，由后端 `action` 字段区分 `created` / `updated`
- 提交成功后 `setTimeout` 900ms 后 `switchTab` 回首页

### 数据刷新机制
- 所有页面在 `onShow` 时重新请求数据
- 这不是最优方案（请求较多），但适合当前阶段最小实现

### 全部页面统一使用
```
const API_BASE_URL = "http://127.0.0.1:8000/api"
```

## 6. 未完成 / 待决定

### 高优先级
- [ ] 患者端联调收口检查（全部页面串联验证）
  - 首页 -> 打卡 -> 回首页 刷新是否一致
  - 打卡 -> 30天进度 新数据是否出现
  - 康复 -> 方案详情 方案一致性
  - 空态 / 错误态 / 加载态 是否覆盖完整
- [ ] 修检查中发现的 1-3 个关键问题

### 中优先级
- [ ] 目标时长从固定 `20` 分钟改为结构化来源（训练方案字段或后端配置）
- [ ] 删除废弃的 `pages/index/`（未注册页面）

### 低优先级
- [ ] 真实登录态接入（患者身份切换）
- [ ] 自定义组件复用（如页面通用卡片组件）
- [ ] 正式部署前的检查

## 7. 接手提醒

1. **不要改后端代码**。患者端只需要读/写那 5 个接口。后端问题回 `../backend/` 目录处理。
2. **不要跨入医生端**。医生端在 `../doctor-web/`，和患者端完全独立。
3. **不要在 patient-app 里引入 npm 包**。当前是纯原生小程序项目，没有 `package.json`，引入 npm 依赖会破坏构建。
4. **不要动 app.json 的渲染引擎配置**（`renderer: "skyline"`、`componentFramework: "glass-easel"`）。改这个可能导致小程序无法正常渲染。
5. **不要在 patient-app 里写新页面**。当前 6 个页面已经覆盖 MVP 范围，如果要加新页面，必须有明确理由且先确认。
6. **联调阶段固定参数不要随意改**。`patient_id=1` 和 `doctor_id=13` 是当前全项目统一的测试用户。
7. **前端 UI 风格微调优先参考 `呼吸康复-Gemini生成参考/` 目录**。那个 Android Compose 实现的页面布局、信息层级、模块大小关系是已经认可的参考源。
8. **注意 `pages/index/` 是未注册的废弃目录**，不会被展示，但文件还在。清理它属于中优先级任务，不要优先处理。
9. **README 和 memory 要同步更新**。这两份文档是 Agent 交接的核心入口。

## 8. 相关目录

| 目录 | 说明 |
|------|------|
| `../patient-app/` | 患者端微信小程序（当前目录） |
| `../backend/` | FastAPI 后端 |
| `../doctor-web/` | 医生端 Web（React + Vite） |
| `../README.md` | 项目总 README |
| `../memory.md` | 项目总交接文档 |

## 9. 遇到问题先看

1. `README.md` - 本目录项目说明
2. `memory.md` - 本文档
3. `app.json` - 页面注册和 tabBar 配置
4. 后端接口定义 - `../backend/routers/` 对应文件
5. 参考项目 - `./呼吸康复-Gemini生成参考/`
