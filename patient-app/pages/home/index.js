var auth = require("../../utils/auth.js")
const TARGET_DURATION_MINUTES = 20
const RING_CANVAS_SIZE = 200
const RING_CENTER = RING_CANVAS_SIZE / 2
const RING_RADIUS = 64
const RING_LINE_WIDTH = 14

function truncateText(value, maxLength) {
  if (!value) {
    return ""
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function formatToday() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatAiUpdatedAt(value) {
  if (!value) {
    return "等待生成"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `更新于 ${month}-${day} ${hours}:${minutes}`
}

function buildTodayProgressState(todayDurationMinutes) {
  const safeDuration = Math.max(0, Number(todayDurationMinutes) || 0)
  const progressPercent = Math.min(
    100,
    Math.round((safeDuration / TARGET_DURATION_MINUTES) * 100),
  )

  return {
    todayDurationMinutes: safeDuration,
    targetDurationMinutes: TARGET_DURATION_MINUTES,
    progressPercent,
    progressSummaryText: `${safeDuration}/${TARGET_DURATION_MINUTES}`,
    todayStatusLabel:
      safeDuration > 0
        ? `今日已训练 ${safeDuration} 分钟`
        : "今日尚未打卡",
  }
}

function calculateStreakDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return 0
  }

  // days 按日期升序，倒过来从最近一天开始数
  var sorted = days.slice().reverse()
  var today = formatToday()

  // 如果今天还没打卡，从昨天开始数
  var startIndex = 0
  if (sorted[0] && sorted[0].date === today && sorted[0].duration_minutes <= 0) {
    startIndex = 1
  }

  var streak = 0
  for (var i = startIndex; i < sorted.length; i++) {
    if (sorted[i].duration_minutes > 0) {
      streak++
    } else {
      break
    }
  }

  return streak
}

Page({
  data: {
    patientId: 0,
    patientName: "早上好，张先生",
    welcomeLabel: "肺康复助手",
    todayStatusLabel: "今日尚未打卡",
    progressPercent: 0,
    progressSummaryText: "0/" + TARGET_DURATION_MINUTES,
    todayDurationMinutes: 0,
    targetDurationMinutes: TARGET_DURATION_MINUTES,
    streakDays: 0,
    todayTasks: [
      { id: "breathing", name: "缩唇腹式呼吸", target: "10分钟 · 2组", done: false },
      { id: "walking", name: "平地行走", target: "20分钟 · 1组", done: false },
      { id: "cough", name: "有效咳嗽排痰", target: "5分钟 · 2组", done: false },
    ],
    aiTip:
      "正在同步最新 AI 康复小结，请稍候。",
    aiTipUpdatedAt: "请稍候",
    quickActions: [
      {
        key: "progress",
        title: "30 天进度",
      },
      {
        key: "ai-summary",
        title: "AI 康复小结",
      },
    ],
  },

  onReady() {
    this.drawProgressRing()
  },

  onShow() {
    this.setData({ patientId: auth.getPatientId() })
    this.loadTodayProgress()
    this.loadStreakDays()
    this.loadLatestAiTip()
  },

  loadTodayProgress() {
    const today = formatToday()

    auth.request({
      url: `${auth.API_BASE}/training-logs`,
      method: "GET",
      data: {
        patient_id: this.data.patientId,
        start_date: today,
        end_date: today,
      },
      success: (response) => {
        const { data } = response
        const logs =
          response.statusCode === 200 &&
          data &&
          data.code === 200 &&
          Array.isArray(data.data)
            ? data.data
            : []
        const todayLog = logs[0] || null
        const nextState = buildTodayProgressState(
          todayLog ? todayLog.duration_minutes : 0,
        )

        this.setData(nextState, () => {
          this._updateTaskDoneState(todayLog)
          this.drawProgressRing()
          this.drawProgressRing()
        })
      },
      fail: () => {
        // 网络失败时保持默认空态（0%进度），不显示错误信息
        this.setData(buildTodayProgressState(0), () => {
          this.drawProgressRing()
        })
      },
    })
  },

  _updateTaskDoneState(todayLog) {
    if (!todayLog) return
    var tasks = this.data.todayTasks.map(function (t) {
      return { id: t.id, name: t.name, target: t.target, done: true }
    })
    this.setData({ todayTasks: tasks })
  },

  loadStreakDays() {
    var that = this

    auth.request({
      url: `${auth.API_BASE}/training-logs/progress-30d`,
      method: "GET",
      data: {
        patient_id: this.data.patientId,
      },
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

        var streak = calculateStreakDays(days)
        that.setData({ streakDays: streak })
      },
      fail: function () {
        // 连续天数加载失败不影响页面，保持默认 0
      },
    })
  },

  loadLatestAiTip() {
    auth.request({
      url: `${auth.API_BASE}/ai-summaries/latest`,
      method: "GET",
      data: {
        patient_id: this.data.patientId,
      },
      success: (response) => {
        const { data } = response
        const summary =
          response.statusCode === 200 &&
          data &&
          data.code === 200
            ? data.data
            : null

        if (!summary) {
          this.setData({
            aiTip: "当前暂无 AI 康复小结，可继续完成训练打卡并等待后续生成。",
            aiTipUpdatedAt: "等待生成",
          })
          return
        }

        this.setData({
          aiTip: truncateText(summary.content, 42),
          aiTipUpdatedAt: formatAiUpdatedAt(summary.created_at),
        })
      },
      fail: () => {
        this.setData({
          aiTip: "暂无 AI 康复小结，继续完成训练打卡后将自动生成。",
          aiTipUpdatedAt: "等待生成",
        })
      },
    })
  },

  drawProgressRing() {
    const progressPercent = Math.max(
      0,
      Math.min(100, Number(this.data.progressPercent) || 0),
    )
    const progressSummaryText =
      this.data.progressSummaryText || `0/${TARGET_DURATION_MINUTES}`
    const startAngle = -Math.PI / 2
    const endAngle = startAngle + Math.PI * 2 * (progressPercent / 100)
    const context = wx.createCanvasContext("progressRing", this)

    context.clearRect(0, 0, RING_CANVAS_SIZE, RING_CANVAS_SIZE)

    context.setLineWidth(RING_LINE_WIDTH)
    context.setLineCap("round")

    context.beginPath()
    context.setStrokeStyle("#D9E8FF")
    context.arc(
      RING_CENTER,
      RING_CENTER,
      RING_RADIUS,
      0,
      Math.PI * 2,
      false,
    )
    context.stroke()

    if (progressPercent > 0) {
      context.beginPath()
      context.setStrokeStyle("#2A6BFF")
      context.arc(
        RING_CENTER,
        RING_CENTER,
        RING_RADIUS,
        startAngle,
        endAngle,
        false,
      )
      context.stroke()
    }

    context.setFillStyle("#4A5B6C")
    context.setFontSize(24)
    context.setTextAlign("center")
    context.setTextBaseline("middle")
    context.fillText(progressSummaryText, RING_CENTER, RING_CENTER + 2)
    context.draw()
  },

  handleGoCheckIn() {
    wx.switchTab({
      url: "/pages/check-in/index",
    })
  },

  handleQuickActionTap(event) {
    const { key } = event.currentTarget.dataset

    if (key === "progress") {
      wx.navigateTo({
        url: "/pages/progress/index",
      })
      return
    }

    wx.navigateTo({
      url: "/pages/ai-summary/index",
    })
  },
})
