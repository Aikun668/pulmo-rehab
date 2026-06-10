const TEST_PATIENT_ID = 1
const TARGET_DURATION_MINUTES = 20
const API_BASE_URL = "http://127.0.0.1:8000/api"
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
    currentTaskMeta:
      safeDuration > 0
        ? `目标 20 分钟 · 已完成 ${safeDuration} 分钟`
        : "预计 20 分钟 · 待开始",
  }
}

Page({
  data: {
    patientId: TEST_PATIENT_ID,
    patientName: "早上好，张先生",
    welcomeLabel: "肺康复助手",
    todayStatusLabel: "今日尚未打卡",
    progressPercent: 0,
    progressSummaryText: `0/${TARGET_DURATION_MINUTES}`,
    todayDurationMinutes: 0,
    targetDurationMinutes: TARGET_DURATION_MINUTES,
    currentTaskTitle: "平地行走 (II 期)",
    currentTaskMeta: "预计 20 分钟 · 待开始",
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
    this.loadTodayProgress()
    this.loadLatestAiTip()
  },

  loadTodayProgress() {
    const today = formatToday()

    wx.request({
      url: `${API_BASE_URL}/training-logs`,
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
          this.drawProgressRing()
        })
      },
      fail: () => {
        this.setData(
          {
            todayStatusLabel: "今日进度暂不可用",
          },
          () => {
            this.drawProgressRing()
          },
        )
      },
    })
  },

  loadLatestAiTip() {
    wx.request({
      url: `${API_BASE_URL}/ai-summaries/latest`,
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
          aiTip: "暂时无法读取 AI 康复小结，请稍后重试。",
          aiTipUpdatedAt: "请稍后重试",
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
