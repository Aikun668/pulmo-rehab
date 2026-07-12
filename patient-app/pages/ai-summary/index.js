var auth = require("../../utils/auth.js")

function formatDate(value) {
  if (!value) return ""
  var date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

function formatDateTime(value) {
  if (!value) return "暂无时间"
  var date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  var hours = String(date.getHours()).padStart(2, "0")
  var minutes = String(date.getMinutes()).padStart(2, "0")
  return year + "-" + month + "-" + day + " " + hours + ":" + minutes
}

function formatPeriod(start, end) {
  if (!start || !end) return "暂无周期信息"
  return formatDate(start) + " 至 " + formatDate(end)
}

// 截断文字：返回前 maxLen 字符 + "…"
function truncateText(text, maxLen) {
  if (!text) return ""
  if (text.length <= maxLen) return text
  return text.substring(0, maxLen) + "…"
}

// ===== 动态日期生成 =====
function daysAgo(n) {
  var d = new Date()
  d.setDate(d.getDate() - n)
  var y = d.getFullYear()
  var m = String(d.getMonth() + 1).padStart(2, "0")
  var day = String(d.getDate()).padStart(2, "0")
  return y + "-" + m + "-" + day
}

function daysAgoFull(n, hour, minute) {
  var d = new Date()
  d.setDate(d.getDate() - n)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

// ===== 模拟数据：康复建议 =====
function buildMockAdvice() {
  var weekStart = daysAgo(6)
  var weekEnd = daysAgo(0)

  var latestAdvice = {
    id: 101,
    period: formatPeriod(weekStart, weekEnd),
    dispatchedAt: formatDateTime(daysAgoFull(1, 14, 30)),
    doctorInput: "本周重点关注血氧波动情况，患者反映爬楼后气促加重，建议适当减少步行训练强度，增加缩唇呼吸练习频次。血氧低于92%时请立即休息并联系我。",
    doctorInputShort: truncateText("本周重点关注血氧波动情况，患者反映爬楼后气促加重，建议适当减少步行训练强度，增加缩唇呼吸练习频次。血氧低于92%时请立即休息并联系我。", 40),
    aiContent: "数据补充：本周3次训练中，血氧从97%下降至96%，心率波动范围72-82bpm，整体处于安全区间。训练完成率较上周提升10%，连续训练天数已达5天。建议维持缩唇呼吸训练强度，步行训练可从每日30分钟降至20分钟，观察血氧恢复速度后再逐步恢复。",
    needExpand: true,
  }

  var adviceHistory = [
    {
      id: 88,
      period: formatPeriod(daysAgo(13), daysAgo(7)),
      dispatchedAt: formatDateTime(daysAgoFull(8, 10, 15)),
      doctorInput: "上周训练恢复良好，疲劳评分从4降至3，可以开始尝试增加每组训练时长，从10分钟逐步过渡到15分钟。注意训练后休息5分钟再测量血氧。",
      aiContent: "上周训练数据：完成5天训练，累计时长135分钟，日均27分钟。疲劳评分趋势稳定下降，呼吸困难评分维持在1-2级。身体适应性正在改善，可以适度增加训练量。",
    },
  ]

  return {
    hasAdvice: true,
    latestAdvice: latestAdvice,
    adviceHistory: adviceHistory,
  }
}

// ===== 模拟数据：训练方案 =====
function buildMockPlan() {
  return {
    hasPlan: true,
    activePlan: {
      id: 5,
      title: "居家肺康复训练方案（中度恢复）",
      content: "每日进行呼吸训练 20-25 分钟，分 3 组完成。步行训练 20 分钟，注意监测血氧变化。",
      exercises: [
        {
          name: "缩唇呼吸训练",
          purpose: "改善呼吸效率，延长呼气时间，减少气促感",
          duration: "每次10分钟，每日3次",
          steps: [
            "经鼻缓慢吸气4秒，感受腹部隆起",
            "缩唇如吹口哨状，缓慢呼气6秒",
            "自然停顿2秒后重复",
            "每组10次呼吸循环，组间休息1分钟",
          ],
          precautions: [
            "不要用力呼气，保持呼气气流平缓",
            "如感头晕请立即停止并坐下休息",
            "训练中血氧低于92%请暂停并联系医生",
          ],
        },
        {
          name: "腹式呼吸训练",
          purpose: "增强膈肌力量，提高肺活量，改善深呼吸能力",
          duration: "每次8分钟，每日2次",
          steps: [
            "平卧或坐位，一手放胸部一手放腹部",
            "经鼻深吸气，腹部隆起（胸部不动）",
            "缓慢呼气，腹部回落",
            "每次呼吸8-10秒，练习5分钟",
          ],
          precautions: [
            "确保胸部不动，只有腹部起伏",
            "不要过度用力吸气，避免气促",
            "训练后静坐休息3分钟再进行其他活动",
          ],
        },
        {
          name: "步行训练",
          purpose: "提升运动耐力，改善心肺功能，逐步恢复日常活动能力",
          duration: "每日20分钟，分2次完成",
          steps: [
            "开始前测量血氧和心率作为基准",
            "以舒适速度步行10分钟",
            "休息2-3分钟，测量血氧",
            "继续步行10分钟，训练后再次测量",
          ],
          precautions: [
            "血氧低于92%或心率超过120bpm请立即停止",
            "步行速度以不引起明显气促为准",
            "天气不佳时可在室内走廊替代户外步行",
            "如爬楼梯引起气促加重，本周步行时长可降至15分钟",
          ],
        },
      ],
      adjustmentNote: "根据本周血氧波动趋势，步行训练强度暂维持20分钟/天，待血氧稳定回升至97%以上后再逐步恢复至30分钟。呼吸训练维持当前强度不变。",
      createdAt: formatDateTime(daysAgoFull(2, 9, 0)),
      status: "active",
    },
  }
}

// ===== 模拟数据：趋势 =====
function buildMockTrend() {
  return {
    days: { current: 5, previous: 4, trend: "up", label: "↑" },
    minutes: { current: 135, previous: 100, trend: "up", label: "↑" },
    avg: { current: 27, previous: 25, trend: "up", label: "↑" },
  }
}

// 计算本周 vs 上周训练趋势
function computeTrend(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { days: emptyMetric(), minutes: emptyMetric(), avg: emptyMetric() }
  }

  var today = new Date()
  today.setHours(0, 0, 0, 0)

  var thisWeekStart = new Date(today)
  thisWeekStart.setDate(today.getDate() - 6)
  var lastWeekStart = new Date(today)
  lastWeekStart.setDate(today.getDate() - 13)
  var lastWeekEnd = new Date(today)
  lastWeekEnd.setDate(today.getDate() - 7)

  var thisWeek = { days: 0, minutes: 0 }
  var lastWeek = { days: 0, minutes: 0 }

  for (var i = 0; i < days.length; i++) {
    var d = new Date(days[i].date)
    d.setHours(0, 0, 0, 0)
    var mins = Number(days[i].duration_minutes) || 0

    if (d >= thisWeekStart && d <= today) {
      if (mins > 0) { thisWeek.days++; thisWeek.minutes += mins }
    } else if (d >= lastWeekStart && d <= lastWeekEnd) {
      if (mins > 0) { lastWeek.days++; lastWeek.minutes += mins }
    }
  }

  var thisAvg = thisWeek.days > 0 ? Math.round(thisWeek.minutes / thisWeek.days) : 0
  var lastAvg = lastWeek.days > 0 ? Math.round(lastWeek.minutes / lastWeek.days) : 0

  return {
    days: buildMetric(thisWeek.days, lastWeek.days),
    minutes: buildMetric(thisWeek.minutes, lastWeek.minutes),
    avg: buildMetric(thisAvg, lastAvg),
  }
}

function emptyMetric() {
  return { current: 0, previous: 0, trend: "none", label: "—" }
}

function buildMetric(current, previous) {
  if (previous === 0 && current === 0) return { current: 0, previous: 0, trend: "none", label: "—" }
  if (previous === 0 && current > 0) return { current: current, previous: 0, trend: "up", label: "新增" }
  if (current > previous) return { current: current, previous: previous, trend: "up", label: "↑" }
  if (current < previous) return { current: current, previous: previous, trend: "down", label: "↓" }
  return { current: current, previous: previous, trend: "equal", label: "持平" }
}

Page({
  data: {
    patientId: 0,
    // Tab 切换
    activeTab: "advice",

    // ===== 康复建议 Tab =====
    isLoadingAdvice: true,
    hasAdvice: false,
    latestAdvice: null,
    adviceHistory: [],
    // 趋势对比
    trend: {
      days: emptyMetric(),
      minutes: emptyMetric(),
      avg: emptyMetric(),
    },
    // ===== 折叠/展开状态 =====
    doctorInputExpanded: false,
    aiSupplementExpanded: false,
    historyExpanded: false,

    // ===== 训练方案 Tab =====
    isLoadingPlan: true,
    hasPlan: false,
    activePlan: null,
    // 手风琴展开状态：用对象 key=exercise index
    expandedExercises: {},
    adjustmentExpanded: false,
  },

  onShow() {
    this.setData({ patientId: auth.getPatientId() })

    // 1. 立即加载模拟数据，页面不空白
    this._loadMockData()

    // 2. 异步拉取真实数据，成功则替换
    this.loadDispatchedAdvice()
    this.loadActivePlan()
    this.loadTrendData()
  },

  // ===== 模拟数据注入（页面立即可见） =====
  _loadMockData: function () {
    var mockAdvice = buildMockAdvice()
    var mockPlan = buildMockPlan()
    var mockTrend = buildMockTrend()

    this.setData({
      isLoadingAdvice: false,
      hasAdvice: mockAdvice.hasAdvice,
      latestAdvice: mockAdvice.latestAdvice,
      adviceHistory: mockAdvice.adviceHistory,
      isLoadingPlan: false,
      hasPlan: mockPlan.hasPlan,
      activePlan: mockPlan.activePlan,
      trend: mockTrend,
    })
  },

  // ===== Tab 切换 =====
  handleTabChange(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },

  // ===== 折叠/展开：医生建议全文 =====
  handleExpandDoctorInput() {
    this.setData({ doctorInputExpanded: !this.data.doctorInputExpanded })
  },

  // ===== 折叠/展开：AI 补充分析 =====
  handleExpandAiSupplement() {
    this.setData({ aiSupplementExpanded: !this.data.aiSupplementExpanded })
  },

  // ===== 折叠/展开：历史建议 =====
  handleExpandHistory() {
    this.setData({ historyExpanded: !this.data.historyExpanded })
  },

  // ===== 手风琴：训练动作展开/折叠 =====
  handleExpandExercise(e) {
    var idx = e.currentTarget.dataset.idx
    var current = this.data.expandedExercises
    var newState = {}
    // 复制当前状态
    for (var key in current) {
      newState[key] = current[key]
    }
    // 切换目标
    newState[idx] = !current[idx]
    this.setData({ expandedExercises: newState })
  },

  // ===== 折叠/展开：AI 调整说明 =====
  handleExpandAdjustment() {
    this.setData({ adjustmentExpanded: !this.data.adjustmentExpanded })
  },

  // ===== 加载医生下发的建议（AiSummary，只取已下发的） =====
  loadDispatchedAdvice() {
    auth.request({
      url: auth.API_BASE + "/ai-summaries",
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        var respData = response.data
        var allList =
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data)
            ? respData.data
            : []

        // 只保留已下发的（dispatched_at != null）
        var dispatched = allList.filter(function (item) {
          return item.dispatched_at != null && item.dispatched_at !== ""
        })

        if (dispatched.length === 0) {
          // API返回空 → 保留模拟数据
          return
        }

        // 最新一条作为"最新建议"卡片
        var latest = dispatched[0]
        var inputText = latest.doctor_input || ""
        var latestAdvice = {
          id: latest.id,
          period: formatPeriod(latest.summary_week_start, latest.summary_week_end),
          dispatchedAt: formatDateTime(latest.dispatched_at),
          doctorInput: inputText,
          doctorInputShort: truncateText(inputText, 40),
          aiContent: latest.content || "",
          needExpand: inputText.length > 40,
        }

        // 其余作为历史列表
        var adviceHistory = dispatched.slice(1).map(function (item) {
          return {
            id: item.id,
            period: formatPeriod(item.summary_week_start, item.summary_week_end),
            dispatchedAt: formatDateTime(item.dispatched_at),
            doctorInput: item.doctor_input || "",
            aiContent: item.content || "",
          }
        })

        this.setData({
          isLoadingAdvice: false,
          hasAdvice: true,
          latestAdvice: latestAdvice,
          adviceHistory: adviceHistory,
        })
      }.bind(this),
      fail: function () {
        // 保留模拟数据，不覆盖
      }.bind(this),
    })
  },

  // ===== 加载当前生效的训练方案 =====
  loadActivePlan() {
    auth.request({
      url: auth.API_BASE + "/rehab-plans/active",
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        var respData = response.data
        var plan =
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data
            ? respData.data
            : null

        // 如果 plan 是空对象/无效，保留模拟数据
        if (!plan || !plan.id) {
          return
        }

        // exercises 可能在 plan.exercises 里（已解析）或 plan.exercises_json（需要解析）
        var exercises = []
        if (Array.isArray(plan.exercises) && plan.exercises.length > 0) {
          exercises = plan.exercises
        } else if (plan.exercises_json) {
          try {
            var parsed = JSON.parse(plan.exercises_json)
            if (Array.isArray(parsed)) exercises = parsed
          } catch (e) { exercises = [] }
        }

        this.setData({
          isLoadingPlan: false,
          hasPlan: true,
          activePlan: {
            id: plan.id,
            title: plan.title || "训练方案",
            content: plan.content || "",
            exercises: exercises,
            adjustmentNote: plan.adjustment_note || plan.adjustmentNote || "",
            createdAt: formatDateTime(plan.created_at),
            status: plan.status,
          },
        })
      }.bind(this),
      fail: function () {
        // 保留模拟数据，不覆盖
      }.bind(this),
    })
  },

  // ===== 加载趋势数据 =====
  loadTrendData() {
    var that = this

    auth.request({
      url: auth.API_BASE + "/training-logs/progress-30d",
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        var respData = response.data
        var days = []
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data &&
          Array.isArray(respData.data.days)
        ) {
          days = respData.data.days
        }
        if (days.length > 0) {
          that.setData({ trend: computeTrend(days) })
        }
        // 空数据 → 保留模拟趋势
      },
      fail: function () {
        // 保留模拟趋势
      },
    })
  },
})
