# 患者端小程序

> 产品定位：面向重症肺炎恢复期患者，通过 AI 智能分析、呼吸训练指导、健康监测和动态处方调整，实现居家肺康复闭环管理的智能康复系统。
> 锚定文档：`../PLAN.md`

## 技术栈
- **框架**：微信小程序原生开发（JS + WXML + WXSS）
- **渲染引擎**：WebView
- **appid**：`wx7761ea799e603529`
- **npm 依赖**：无

## 页面结构

### 底部 tabBar（4 个）
| 页面 | 路径 | 职责 |
|------|------|------|
| 首页 | `pages/home/index` | 自定义顶部导航（用户胶囊头像+铃铛通知） + 康复等级徽章 + Canvas 2D 进度环 + 连续打卡天数 + 今日任务速览 + 今日训练建议 + 康复指导预览 |
| 打卡 | `pages/check-in/index` | 绿色渐变背景 + 日期行(最近一周›) + 等级徽章 + 大数字min时长 + 迷你4天柱状图 + 最近一周弹窗 + Canvas 2D 呼吸陪练 + 训练前自评 + 任务勾选 + 提交反馈 |
| 康复 | `pages/rehab/index` | Banner400rpx+叠层内容区(-80rpx+圆角32rpx)+蓝发光数据总览卡(CSS日历/趋势/时钟图标,52rpx纯数字)+分组标题(4rpx蓝条)+"训练总览"3列小卡片(固定副标题+微立体CSS插图:剪贴板+笔/折线图+面积填充/3D-AI方块)+"康复支持"大卡片(康复知识库+3D书籍+播放按钮) |
| 我的 | `pages/profile/index` | 用户信息 + 功能菜单(个人信息/我的方案/训练记录/设置/免责声明/退出登录) |

### 二级页面（4 个）
| 页面 | 路径 | 职责 |
|------|------|------|
| 训练方案详情 | `pages/plan-detail/index` | 方案历史 + 训练动作分步骤指导（可折叠）+ 量化计时器 + 组数计数 + 数据闭环回打卡页 |
| 30天进度 | `pages/progress/index` | 近30天趋势柱状图 + 统计摘要 |
| 康复指导 | `pages/ai-summary/index` | 双Tab切换：康复建议(医生下发AiSummary) + 训练方案(RehabPlan active) |
| 康复知识 | `pages/knowledge/index` | 按等级推荐康复知识文章 |

## 组件
- `components/navigation-bar/`：自定义导航栏

## 鉴权
- `utils/auth.js`：`auth.request()` 封装 wx.request，自动带 Bearer token + 动态 API_BASE
- `app.js`：启动时检查本地缓存恢复登录态，未登录自动 dev-login(patient_id=1)
- 所有页面通过 `auth.request()` 调用后端，不直接 `wx.request`

## 已接后端接口
| 接口 | 用途 |
|------|------|
| `POST /api/auth/dev-login` | 开发登录 |
| `GET /api/patients/{id}/rehab-level` | 康复等级（Level 1-5） |
| `GET /api/training-logs` | 读取训练记录 |
| `POST /api/training-logs` | 提交/覆盖打卡 |
| `GET /api/training-logs/progress-30d` | 近30天趋势 |
| `GET /api/rehab-plans` | 训练方案列表 |
| `GET /api/rehab-plans/active` | 医生已审核活跃处方 |
| `POST /api/prescriptions/generate` | AI 生成处方（降级） |
| `POST /api/assessments` | 提交训练前自评 |
| `GET /api/assessments` | 获取评估记录 |
| `GET /api/ai-summaries/latest` | 最新 AI 小结 |
| `GET /api/ai-summaries` | 小结历史 |
| `GET /api/warnings/latest-unresolved` | 未解决安全预警 |

## 当前阶段状态
- [x] **新建训练方案分析页 `plan-analysis`**（2026-07-10）：
  - **定位**：打卡页 → `plan-detail`（执行训练，不变）；康复页 → `plan-analysis`（方案分析+历史数据+结果回顾）
  - **页面内容**：
    1. **方案总览**：顶部等级色彩条 + 等级徽章/来源标签 + 标题/副标题 + 三格指标区（今日进度含迷你进度条/每日目标/训练动作数）
    2. **方案解读**：紧凑一行摘要（编号用等级色+名称+时长+目的一句话+展开箭头），点击展开详情；编号圆点使用等级色而非统一蓝色
    3. **达成目标**：L1→L5里程碑路线图（节点+连接线+当前节点高亮发光）+ 当前等级身体变化/日常生活 + 下一步目标(L N 蓝底) + 最终目标(★ 金底)
    4. **近7天训练回顾**：三格指标 + 柱状图增加目标虚线（黄色 dashed）
    5. **最近训练结果**：三格带色块指标（色点+数值+单位）+ 窄进度条，更紧凑
    6. **吸底 CTA**：固定底部按钮，不随内容滚动消失
  - **数据源**：康复等级 API、处方 API（同打卡页优先级链）、30天进度 API、今日训练记录 API、本地 Storage 实时进度
  - **JS 内置解读知识库**：`EXERCISE_REASON_MAP`（选择理由）、`EXERCISE_PROGRESSION_MAP`（循序渐进路径）、`EXERCISE_RELATION_MAP`（动作关联）、`LEVEL_GOALS_MAP`（各等级达成目标：身体变化+日常生活+下一步目标）
  - **路由修改**：rehab 页"我的训练方案"卡片从跳 `plan-detail` 改为跳 `plan-analysis`
- [x] **首页圆环数据同步修复**（2026-07-10）：
  - **根源**：首页进度环数据只从后端 API `/training-logs` 获取 → 用户在方案页训练后、还没提交打卡前，本地 Storage 有进度数据但后端没有 → 首页圆环不更新
  - **修复**：`loadTodayProgress` 同时读取本地 Storage `exerciseProgress`，取 `Math.max(backendMinutes, localMinutes)` 确保圆环始终显示最新进度；后端失败时也从本地 Storage 读取（圆环不空白）
  - **附加**：`metricsItems`（训练时长/组数）从硬编码改为动态计算，同步显示方案页的训练时长和组数
  - 新增 `_calcLocalTrainingMinutes()` 和 `_calcLocalTrainingSets()` 辅助方法，带日期校验和 45 分钟上限
- [x] **打卡页446分钟修复（跨天累积重置+时长来源修正）**（2026-07-10）：
  - **根源**：plan-detail 的 `onLoad` 从 Storage 加载 `exerciseProgress` 但从不检查日期 → 昨天的 `elapsedSeconds` 继续累加 → 多天累积后天文数字；`_saveToStorage` 存 `planTrainingMinutes` 为总累积时长；打卡页 `_syncPlanTrainingProgress` 直接用 `planTrainingMinutes` 设置 `todayTrainingMinutes` → 显示 446 分钟
  - **修复 1：plan-detail 跨天重置**：`onLoad` 加日期检查（`exerciseProgressDate` vs 今天），不是今天的数据 → 全部重置为 0；`_saveToStorage` 同时保存 `exerciseProgressDate`
  - **修复 2：打卡页时长来源修正**：`_syncPlanTrainingProgress` 不再用 `planTrainingMinutes`，改为从 tasks 的 `actualMinutes` 累加 `todayTrainingMinutes`；每项 `elapsedMin` 加 `Math.min(..., 45)` 上限（防残余脏数据）
- [x] **训练方案页量化改造 v7（计时闪烁根治 — 单按钮+占位圆点）**（2026-07-10）：
  - **闪烁真正的根源**：计时按钮和暂停按钮是两个独立 DOM 元素，用 `hidden` 切换 → 一个 `display:none` 另一个出现 → **flex 容器重排布局** → 按钮位置瞬间变化 = 闪烁。同理圆点 `hidden` 切换也导致同行 progress-item 布局重排
  - **根治方案**：
    1. **计时/暂停合并为同一个 `<view>` 按钮**：`class="{{isTimerRunning ? '--pause' : '--timer'}}"` + `catchtap="handleTimerToggle"` — 同一 DOM 元素只改 class 和文字，**零布局变化**
    2. **圆点改为动态 class 切换背景色**：`background: transparent` → `background: #10B981` — 始终占位（12rpx 宽 + 6rpx margin），**零布局变化**，删除 `dot-blink` 动画
    3. JS 新增 `handleTimerToggle` 根据 `isTimerRunning` 分流到 `_doStart/_doPause`；一次 setData 合并旧 false + 新 true
  - 不再有两按钮 hidden 切换、不再有圆点 hidden 切换、不再有 blink 动画 — **所有触发 flex 重排的因素全部消除**
  - `_pauseTimerInternal` 也改用 `_clearTimerState()` 保持一致
- [x] **康复页30天进度模拟数据兜底**（2026-07-10）：
  - **根源**：progress 页面的训练时长柱状图和生命体征/自评评分，API 失败时显示"暂无训练记录"，整个页面空白
  - **修复**：`loadProgress30d` 和 `loadAssessments` 的 `fail` 回调 + `success` 返回空数据时，注入固定模拟数据
  - **`MOCK_30D_DURATION_TEMPLATE`**：30天训练时长数值模板（Week1 起步12-18min → Week2 进步17-24 → Week3 稳定23-28 → Week4 达标29-33 → 今天30min），日期由 `buildMock30DDays()` 动态生成（以当天为基准往前推30天）
  - **`buildMockVitals()`**：7次生命体征评估（以当天为基准往前推），心率从78→70下降、血氧97→99上升、呼吸困难2→1改善、疲劳3→2改善
- [x] **进度页豆腐块指标卡视觉优化**（2026-07-11）：
  - **去掉顶部色条**：删除 `.metric-tile--blue/--amber/--green/--purple` 的 `border-top`
  - **缩小卡片体量**：padding 32rpx→24rpx，插图 120rpx→72rpx(内部按0.72比例缩放)，数值 48rpx→32rpx，标签 24rpx→22rpx
  - **拉开间距+呼吸感**：`.metric-grid` 加 `padding: 0 32rpx`(左右不贴边) + `gap: 24rpx`(4块间距) + `margin-top: 32rpx`
  - **柔和阴影**：`box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.06), 0 2rpx 4rpx rgba(0,0,0,0.04)`，去掉 border
  - **active 交互态**：点击时 `transform: translateY(-4rpx)` + 阴影加深 + `transition: transform/shadow 0.25s ease`
    - 48rpx 大数字 + 24rpx 标签
- [x] **「AI康复小结」→「康复指导」改造**（2026-07-11）：
  - **首页入口改名**：康复页 mini-card 从"AI 康复小结 / 智能分析训练表现" → "康复指导 / 医生建议与训练方案"
  - **ai-summary 页面全面重构**：导航栏标题 → "康复指导"
  - **双 Tab 切换**：
    - Tab 1「康复建议」：只展示已下发的 AiSummary (`dispatched_at != null`)，医生原文 `doctor_input` 为核心内容（绿色边框高亮区），AI 补充分析 `content` 为辅助内容（蓝色淡底区）
    - Tab 2「训练方案」：调用 `/rehab-plans/active` 获取 status=active 的方案，展示方案标题+概述+结构化动作列表(exercises: name/purpose/duration/steps/precautions)+AI调整说明
  - **空态设计**：两个 Tab 各有独立空态卡片，文案提示继续打卡后医生将下发
  - **趋势数据保留**：康复建议 Tab 保留"本周vs上周"训练趋势对比
  - **模拟数据兜底**：页面立即可见模拟数据（建议：血氧关注+步行降强度+缩唇增频次；方案：缩唇呼吸/腹式呼吸/步行训练含完整steps+precautions；趋势：5天↑135分↑日均27↑）；API成功替换，失败保留
  - **渐进式披露改造**（2026-07-11）：
    - **设计理念**：Progressive Disclosure，先给摘要让用户一眼抓重点，想看细节再展开，解决"一大块一大块堆叠"的冗长感
    - **康复建议Tab**：
      - 趋势指标改为紧凑行内三指标（5天↑ | 135分↑ | 27分/日↑），淡绿底行内排列，不占一大块
      - 医生建议默认截断显示前40字 + "展开全文 ▼"按钮，展开后才显示完整文字
      - AI补充分析默认折叠（▼），点击才展开（▲）
      - 历史建议默认折叠只显示条数（"历史建议(1条) ▼"），点击才展开
    - **训练方案Tab**：
      - 方案概述始终可见（短内容不需要折叠）
      - 训练动作改为手风琴卡片：默认只显示名称+时长+目的一行，点击展开才看到步骤（数字圆点编号）和注意事项（黄色底+!前缀）
      - AI调整说明默认折叠，点击才展开
  - **图标改造**（2026-07-11）：CSS手绘 → 微立体AI字母徽章（紫色系#8B5CF6，跟剪贴板/图表同风格：3D偏移阴影+渐变背景+圆角边框+细节元素），88×110rpx，内含粗体"AI"字样+右上角金色sparkle圆点；首页"康复指导"：44px圆形+绿色SVG听诊器mask(#10B981)
  - **首页快捷入口subtitle修正**（2026-07-11）："暂无指导，等待下发" → 介绍性文案："查看医生下发的康复建议与训练方案"（有数据时显示更新时间），空态改为"坚持打卡，医生将为您制定专属指导"
  - **康复页卡片恢复为AI指导**（2026-07-11）：从"康复指导/医生建议与训练方案"恢复为"AI指导/智能问答·随时咨询"，link文字从"开始问答 ›"改为"查看AI指导 ›"与旁边卡片格式统一，与首页"康复指导(医生下发)"明确区分
  - **新增AI指导页**（2026-07-11）：`pages/ai-guidance/`，"内容先行+对话延伸"设计
    - **康复状态摘要**：蓝色边框卡片（降饱和蓝色 #60A5FA），3列数据（康复等级/近7天训练/完成率），蓝色系CSS微立体图标
    - **AI综合指导**：蓝色section标题栏，白色卡片+蓝色badge，总结语在上（始终展示）+ 详细指导在下（展开收起式），总结语无边框线
    - **继续提问区**：快捷问题胶囊 + 聊天对话区（AI回复支持换行渲染）+ 固定底部输入栏（发送按钮loading时禁用）
    - 风格完全融入康复模块蓝色基调(#60A5FA)，降饱和度，无紫色残留
    - 注册navigation-bar组件+navigationStyle:custom
    - **接入DeepSeek API**：前端调 `/ai-guidance/latest` 获取AI指导内容（后端基于已下发周报+训练数据动态构建），对话调 `/ai-guidance/chat`（后端动态注入患者上下文prompt），API失败时Mock兜底
- [x] **训练方案页量化改造 v5.1（编译修复）**（2026-07-10）：修复 WXML `hidden` 属性少一个 `}` 导致编译失败
- [x] **训练方案页量化改造 v5（全局防闪烁）**（2026-07-10）：
  - **收起时计时消失的根源**：`guide-card__body` 用 `wx:if="{{item.expanded}}"`，收起时 DOM 被销毁 → 微信小程序渲染引擎连带重渲染同卡片的 progress 区域 → 计时数字闪烁
  - **全局修复：卡片内所有动态显隐统一从 `wx:if` 改为 `hidden`**：
    - `guide-card__body`（步骤+注意事项）：`wx:if` → `hidden="{{!item.expanded}}"` — **最关键的修复**
    - `guide-card__done-badge`（徽章）：`wx:if` → `hidden="{{!item.isCompleted}}"`
    - `guide-card__timer-dot`（计时圆点）：`wx:if` → `hidden="{{!item.isTimerRunning}}"`
    - `guide-card__exceeded-tag`（超额标签）：`wx:if` → `hidden="{{!(item.exceededSets > 0)}}"`
    - `guide-card__status-text`（已完成文字）：`wx:if` → `hidden="{{!(item.isCompleted && item.exceededSets <= 0)}}"`
    - `guide-card__btn-reset`（重置按钮）：`wx:if` → `hidden="{{!(item.elapsedSeconds > 0 || item.completedSets > 0)}}"`
    - 计时/暂停按钮：`hidden`（上一版已改）
  - **`hidden` vs `wx:if` 的区别**：`wx:if` 销毁+重建 DOM → 触发整卡片重渲染 → 连带闪烁；`hidden` 只设 `display:none` → DOM 保留 → 不触发重渲染 → 无闪烁
  - CSS：`.guide-card` 恢复 `overflow: hidden`（配合 hidden 替代 wx:if，内容不会溢出，圆角正常）；移除 `.progress-value` 的 `transition: color` 和 `.guide-card` 的 `transition: background/border`（这些 transition 与 setData 渲染冲突反而加剧闪烁）
  - `<button>` → `<view>`；按钮布局主次分层；单次 setData；`dot-blink` 圆点替代 pulse 动画
- [x] **首页「今日康复进度」模块横向布局改造**（2026-07-10）：
  - 进度环：112rpx→128rpx(64px)，环宽6px，轨道`#F0F0F0`/进度`#4CAF50`
  - 环心文字拆分：单行→大数字16px粗体#333 + 小目标/35 12px浅灰#999
  - 布局改为横向三段：环(左) | 文字区(中flex:1) | 按钮(右居中)
  - 文字区主文字15px#333 + 副文字"坚持训练..."11px#BBBBBB（小且不抢眼）
  - "去打卡"按钮：镂空→实心绿`#4CAF50`+白字+圆角20px+`align-self:center`
  - JS新增`progressCurrent`/`progressTarget`拆分字段
- [x] **首页 Glassmorphism 大改造**（2026-07-10）：整体风格升级为毛玻璃通透感 UI，核心改动：
  - 页面背景：`#F4F7FB` → 多层淡蓝绿渐变 `#F0FDF4→#ECFEFF→#F0F9FF→#F8FAFC`
  - 所有卡片统一为毛玻璃效果：`rgba(255,255,255,0.72)` + `backdrop-filter: blur(20px)` + 绿色光晕阴影 + 白色半透明边框
  - 颜色体系：蓝 `#2A6BFF/#2563EB` 统一替换为医疗绿调 `#10B981/#34D399`
  - 用户胶囊：白色实心→毛玻璃+粉色渐变头像(`#F472B6→#EC4899`)
  - 日期选择器："今日"文字改为医疗绿 `#10B981`，选中日期从黑底→绿色渐变(`#10B981→#34D399`)带光晕阴影
  - 指标卡：白底→毛玻璃；"血氧SpO₂"→**"完成率"**；进度条加高光层；颜色统一绿/蓝调
  - 康复进度环：Canvas→CSS conic-gradient（解决不显示问题）；蓝色→绿色 `#34D399`；尺寸112rpx精致化
  - "去打卡"按钮：蓝色实心→**绿色药丸形边框**(`border:1.5px solid #10B981` + 绿色文字)；文案改为"去打卡 >"
  - 快捷功能：链接按钮蓝色→**绿色药丸** (`rgba(16,185,129,0.08)` 底色 + 绿色边框) + 箭头">"
  - 区域标题：左侧新增 **6rpx 宽绿色渐变竖条装饰**
  - Tabbar 选中态：蓝色 `#2563EB` → 医疗绿 `#10B981`；背景加毛玻璃 `backdrop-filter: blur(16px)`
- [x] 8 页全真实 API 接入（3 主 + 1 我 + 4 二级）
- [x] 首页自定义顶部导航（方案A：去掉 navigation-bar，利用系统胶囊按钮位置对齐）
- [x] 用户胶囊头像组件：玫瑰色圆形头像显示姓氏（默认"张三"→"张先生，早上好"）+ 灰色问候文案
- [x] 铃铛通知图标按钮：纯线条镂空风格，右侧预留空间避免与系统胶囊重叠
- [x] 胶囊+铃铛上移至系统胶囊行（利用 wx.getMenuButtonBoundingClientRect 精确对齐）
- [x] 首页日期选择条（精细化版）：#EBF5FB纯色背景，总高68-72px，32px圆圈，10px星期/12px日期，选中态黑底白勾（不显示数字），4px蓝点指示器#4A90E2标记今天，"今日▼"左上角同行排列，点击▼展开月历弹层
- [x] 首页日历弹层：底部滑出，月份切换，黑底白勾选中日期，"确定"按钮确认选择
- [x] 首页分项进度卡：白底16px圆角，三列横排（训练时长蓝#2A6BFF / 训练组数橙#F59E0B / 血氧SpO₂绿#16a34a），每列：标签+当前/目标值+彩色进度条，模拟数据12min/20/96%
- [x] 首页进度总览卡：白底16px圆角，左120rpx进度环+右侧"还剩X分钟达标"+[去打卡]按钮同行，无任务列表
- [x] 首页快捷入口列表：白底16px圆角，3行统一列表式（30天训练进度·蓝图标#EFF6FF / 今日训练建议·橙图标#FEF3C7 / AI康复小结·绿图标#D1FAE5），每行：图标框+标题+动态副标题+蓝色描边胶囊"查看"按钮，1px分割线分隔（已删除独立advice-card和tips-card，风格统一）
- [x] 首页区域标题样式升级：字号13px→16px、粗细500→700、颜色#6b7280→#4b5563，标题与下方模块间距8px→16px、与上方间距16px→24px，"今日训练指标"和"快捷功能"同步生效
- [x] 首页渐变顶部区域：绝对定位 gradient-bg 背景层，从页面最顶部延伸到 metrics-card 中部(680rpx)，清透蓝绿渐变 linear-gradient(to bottom,#CCFBF1→#DBEAFE→#EFF6FF→#F4F7FB) 传递清新呼吸感+医疗信任感+康复希望感，content-layer(z-index:1)确保模块浮在渐变之上
- [x] 首页免责声明弹窗（首次启动 + 个人中心菜单）
- [x] 首页任务速览标注完成状态（todayLog 存在时 map done:true）
- [x] 打卡页安全提示 + 呼吸陪练计时器 + 任务清单
- [x] 打卡页呼吸陪练（Canvas 2D 动画 + requestAnimationFrame + 按等级节拍 + 轮次控制）
- [x] 打卡页处方加载链（active → 缓存 → AI生成 → 等级默认）
- [x] 打卡页训练前自评弹窗（呼吸困难+疲劳+心率+血氧+备注）
- [x] 打卡页心率/血氧前置拦截（hasActiveWarning 拦截开计时器+提交）
- [x] 打卡页提交后鼓励反馈 + 康复小知识
- [x] 打卡页组数计算修正（actualMinutes / 10，最低1组）
- [x] 方案详情页训练动作分步骤指导
- [x] 康复页统计横栏
- [x] 康复页顶部 Banner：康复场景图置顶(680rpx)，底部渐变遮罩(360rpx)从透明→#F4F7FB自然过渡，统计栏半透白底浮在banner底部渐变区之上
- [x] 康复页统计栏兜底模拟数据：17天/57%/204分钟（与首页metricsItems 12min/天对齐，30天×57%=17天，17×12≈204min）
- [x] 康复页卡片内容精简：训练方案只显示副标题(更新时间或兜底文案)，删除card__meta/card__status冗余内容
- [x] 进度分析页 30天柱状图 + 评估趋势（心率/血氧/呼吸困难/疲劳）
- [x] AI 小结页趋势对比（本周 vs 上周：训练天数/累计时长/日均时长）
- [x] AI 小结页最新周期 + 历史列表
- [x] 个人中心页 + 免责声明 + 退出登录 + 设置菜单项（紫色图标⚙），导航栏清空标题+移除右上角设置按钮
- [x] 康复知识页（5级×3篇 + 通用2篇，按等级推荐）
- [x] dev-login 鉴权 + 全局 auth 封装 + 401 自动重登
- [x] AI 处方生成（POST /prescriptions/generate）
- [x] 打卡页呼吸陪练 Canvas 2D 动画（PLAN P0 #3 已完成）
- [ ] AI 小结内容增加训练建议文字（后端依赖）
- [ ] 后端鉴权补全（数据端点加 Depends(get_current_user)）
- [ ] 患者档案补充恢复阶段字段
- [x] **后端+前端多项修复**（2026-07-12）：
  - **deepseek_client.py 语法修复**：第43行中文引号`"您"` → `「您」`（Python识别中文引号为字符串结束符导致SyntaxError）；第60行损坏字段`self.timeout_seconds = value` → 正确dataclass字段`timeout_seconds: int = 60`；timeout从30秒→60秒（复杂对话prompt需要更长处理时间）
  - **首页进度环数据空白修复**：`loadTodayProgress`中`finalMinutes`变量在使用后才赋值（`var`提升声明但不赋值，导致值为`undefined`→环形0%+还剩35分钟），已将变量定义移到`buildTodayProgressState`调用之前；无真实训练数据时注入Mock兜底（12min/3组），进度条和环形不再空白
  - **康复页残留文字清理**：`rehab/index.wxml`第1行残留对话文字已删除
  - **三端数据统一对齐**：打卡页mock今日时长从8→12min（与首页一致）；康复页`loadProgressSummary` API返回空数据时保留mock兜底值（17天/57%/204min），不再被覆盖为"--"
  - **AI指导页Mock对话兜底**：进入页面预置一条mock问答（缩唇呼吸怎么做更有效→专业回复）；用户发问题时API优先调用，失败/无有效回复时用`_mockChatReply`生成mock回复（3条快捷问题有精确匹配+1条通用回复），1秒延迟模拟"思考"效果
  - **两端数据统一对齐**：小程序端默认患者从"张三(ID=1)"→"赵六(ID=17)"，与后端seed_mock_data.py患者17（赵六，Level 3中度恢复，慢性呼吸疾病+吸烟史）完全对齐；修改覆盖app.js、auth.js、home/index.js、profile/index.js、check-in/index.js全局5个文件；头像姓氏"张"→"赵"、问候语"张先生"→"赵先生"、兜底姓名"张三"→"赵六"、默认登录ID 1→17、401重登兜底ID 1→17；首页初始指标对齐赵六后端数据（目标时长35min、组数6组、血氧96%）

## 开发备注
- 进度环使用 Canvas 2D 新版 API + SelectorQuery
- 呼吸计时器：Canvas 2D 动画，吸气圆圈放大 → 屏气保持 → 呼气缩小，requestAnimationFrame 60fps 平滑插值
- 401 拦截：auth.request() 遇 401 自动 dev-login 重登并重试原请求（仅重试一次）
- 打卡页 `onLoad` 首次全量加载，`onShow` 非首次仅刷新今日提交状态（不再全量重拉）
- 公共配置抽至 `utils/rehab-config.js`（等级名称/颜色/建议/默认方案/呼吸节拍/工具函数），首页和打卡页共享引用
- 聊天消息本地持久化（wx.setStorageSync，key=chat_messages_{patientId}）
- 提交打卡后自动跳回首页刷新进度
- 打卡页 status-card 重构：日期行(最近一周›箭头) → 等级徽章(左对齐) → 大数字min(64rpx黑粗+24rpx灰小) → 右下迷你4天柱状图(只显示条不显示数据) → 点击最近一周弹出7天横条统计图弹窗

## 相关文档
- `memory.md`：交接文档
- `../PLAN.md`：项目总开发计划
- `../README.md`：项目总览
