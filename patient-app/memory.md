# 患者端小程序 - Agent 交接文档

> 锚定文档：`../PLAN.md`
> 产品定位：重症肺炎恢复期居家肺康复智能系统
> 更新时间：2026-06-14

---

## 1. 产品定位

面向重症肺炎恢复期患者，通过 AI 智能分析、呼吸训练指导、健康监测和动态处方调整，实现居家肺康复闭环管理。

**明确不做：** ICU 管理、复杂临床指标、普通打卡软件逻辑。

---

## 2. 项目性质

- **项目类型**：微信小程序原生项目（JS + WXML + WXSS）
- **不是**：Taro / UniApp / Vue / React 项目
- **无 npm 依赖**
- **渲染引擎**：WebView（已从 Skyline 回退）
- **开发工具**：微信开发者工具
- **appid**：`wx7761ea799e603529`

---

## 3. 当前阶段

### 已完成
- 6 页全真实 API 接入
- **训练页处方驱动**（P0 已完成）：
  - 从硬编码 `DEFAULT_TASKS` → 后端 AI 处方动态加载
  - 降级链：AI 缓存 → AI 生成 → 等级默认方案
  - 呼吸计时器按等级动态调整（Level 1: 3s/1s/5s, Level 3: 4s/2s/6s, Level 5: 5s/3s/8s）
  - 任务支持可展开步骤 + 注意事项
- **首页康复等级展示**（P1 已完成）：
  - 等级徽章（Level 1-5 + 颜色编码）
  - 进度环目标时长从硬编码 20 分钟 → 处方动态计算
  - 任务速览从处方缓存读取
- **训练前自评入口**（P1 已完成）：
  - 呼吸困难滑块（1-5）+ 疲劳滑块（1-10）
  - 可选心率/血氧手动输入
  - 提交到 `POST /api/assessments`，触发后端自动分级 + 预警
  - 评估后自动重新加载等级
  - 安全预警弹窗（心率>120/血氧<92%/疲劳>8/呼吸困难≥4）
- **康复知识页**（P2 已完成）：
  - 新建 `pages/knowledge/index` 二级页面
  - 5 个等级各有 3 篇专属文章 + 2 篇通用文章
  - 主题涵盖：呼吸训练、运动康复、饮食调理、健康防护、心理健康、用药指导
  - 按等级自动推荐，可展开阅读
  - 入口在康复页
- 呼吸陪练计时器（吸气/屏气/呼气 + 圆圈缩放动画）
- 首页：Canvas 2D 进度环 + 连续打卡天数
- 康复页：统计横栏（训练天数/完成率/累计时长）+ 知识页入口
- 方案详情页：训练动作分步骤指导（可折叠）
- AI 小结页：最新 + 历史
- dev-login 鉴权 + 全局 auth 封装

### 联调参数（全项目统一）
- `API_BASE_URL`：通过 `utils/auth.js` 动态获取
- 鉴权：`auth.request()` 自动携带 Bearer token

---

## 4. 页面文件清单

| 文件 | 类型 | 说明 |
|------|------|------|
| `pages/home/index.js` | tabBar 首页 | 进度环 + 等级徽章 + 处方任务速览 + AI 预览 |
| `pages/check-in/index.js` | tabBar 训练 | **处方驱动** + 等级节拍呼吸计时器 + 可展开步骤 |
| `pages/rehab/index.js` | tabBar 康复 | 统计横栏 + 方案/进度/AI 入口 |
| `pages/progress/index.js` | 二级 | 30 天柱状趋势图 |
| `pages/plan-detail/index.js` | 二级 | 方案历史 + 动作指导 |
| `pages/ai-summary/index.js` | 二级 | AI 小结最新 + 历史 |
| `pages/knowledge/index.js` | 二级 | 康复知识（按等级推荐） |

---

## 5. 关键代码规范

### 鉴权方式
- 所有页面通过 `utils/auth.js` 获取 token 和 patient_id
- API 调用统一使用 `auth.request()`，不要直接 `wx.request`

### 训练页处方驱动流程
1. `onShow` → `loadRehabLevel(patientId)` → `GET /api/patients/{id}/rehab-level`
2. → `loadPrescription(patientId, level)` → 检查本地缓存 → `POST /api/prescriptions/generate`
3. 缓存 key：`prescription_{patientId}_{date}`，仅当日有效
4. 降级：AI 失败 → `LEVEL_DEFAULT_EXERCISES[level]`（5 个等级各有默认方案）
5. 处方 exercises 映射为 tasks，支持可展开 steps/precautions

### 呼吸计时器等级配置
- Level 1: 吸气3s/屏气1s/呼气5s × 5轮（最温和）
- Level 2: 吸气4s/屏气2s/呼气6s × 5轮
- Level 3: 吸气4s/屏气2s/呼气6s × 8轮
- Level 4: 吸气5s/屏气3s/呼气7s × 8轮
- Level 5: 吸气5s/屏气3s/呼气8s × 10轮（最强）

### 数据刷新
- 所有页面 `onShow` 时重新拉取数据

---

## 6. 未完成（按优先级）

### P1
- [ ] 首页"今日 AI 建议"卡片

### P2
- [x] 心率/血氧趋势图（progress 页已改造为 3 tab：训练时长/生命体征/自评评分）

### 第二阶段（进行中）
- [x] **AI 动态处方调整**（P0）：prescription_service 增加趋势分析（呼吸困难/疲劳/心率/血氧趋势 + 训练完成率 + 整体判断），AI 根据趋势方向调整方案
- [x] **医生端处方审核工作流**（P1）：RehabPlan 增加 status(draft/approved/active) + exercises_json + adjustment_note，新增 PUT /api/rehab-plans/{id} 和 GET /api/rehab-plans/active，小程序端优先读取 active 处方
- [ ] 第二阶段剩余：处方列表显示 status 标签、处方历史对比

---

## 7. 接手提醒

1. **不要改后端代码**。后端问题回 `../backend/` 目录处理。
2. **不要在 patient-app 里引入 npm 包**。
3. **当前 6 页已覆盖 MVP**，新页面需明确理由。
4. **开发前先看 PLAN.md** 第一节"明确不做"和第六节"开发阶段"。
5. **联调参数统一通过 auth 获取**，不要硬编码 `patient_id`。
6. **README 和 memory 要同步更新**。
7. **处方缓存与训练页共享**，首页 `loadPrescriptionTasks()` 读取同一缓存 key。

---

## 8. 相关文档

| 文档 | 说明 |
|------|------|
| `../PLAN.md` | 项目总开发计划 |
| `../README.md` | 项目总览 |
| `../memory.md` | 项目总交接文档 |
| `README.md` | 本目录项目说明 |
