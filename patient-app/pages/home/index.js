var auth = require("../../utils/auth.js")
const TARGET_DURATION_MINUTES = 20

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

  var sorted = days.slice().reverse()
  var today = formatToday()

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

function getGreeting() {
  var hour = new Date().getHours()
  if (hour >= 5 && hour < 12) return "早上好"
  if (hour >= 12 && hour < 18) return "下午好"
  return "晚上好"
}

Page({
  data: {
    patientId: 0,
    patientName: "你好，用户",
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
  },

  onReady() {
    this.drawProgressRing()
  },

  onShow() {
    var userName = auth.getUserName() || "用户"
    var greeting = getGreeting()
    this.setData({
      patientId: auth.getPatientId(),
      patientName: greeting + "，" + userName,
    })
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
        })
      },
      fail: () => {
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
    var self = this
    var progressPercent = Math.max(
      0,
      Math.min(100, Number(this.data.progressPercent) || 0),
    )
    var progressSummaryText =
      this.data.progressSummaryText || "0/" + TARGET_DURATION_MINUTES

    var query = wx.createSelectorQuery().in(this)
    query.select('.progress-ring__canvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var dpr = wx.getWindowInfo().pixelRatio
        var width = res[0].width
        var height = res[0].height

        canvas.width = width * dpr
        canvas.height = height * dpr

        var ctx = canvas.getContext('2d')
        ctx.scale(dpr, dpr)

        var center = width / 2
        var radius = width * 0.34
        var lineWidth = Math.max(4, width * 0.07)
        var fontSize = Math.max(10, width * 0.13)

        var startAngle = -Math.PI / 2
        var endAngle = startAngle + Math.PI * 2 * (progressPercent / 100)

        ctx.clearRect(0, 0, width, height)
        ctx.lineWidth = lineWidth
        ctx.lineCap = "round"

        ctx.beginPath()
        ctx.strokeStyle = "#D9E8FF"
        ctx.arc(center, center, radius, 0, Math.PI * 2, false)
        ctx.stroke()

        if (progressPercent > 0) {
          ctx.beginPath()
          ctx.strokeStyle = "#2A6BFF"
          ctx.arc(center, center, radius, startAngle, endAngle, false)
          ctx.stroke()
        }

        ctx.fillStyle = "#4A5B6C"
        ctx.font = fontSize + "px sans-serif"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(progressSummaryText, center, center + 1)
      })
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
