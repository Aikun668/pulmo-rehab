var auth = require("../../utils/auth.js")

function formatDate(value) {
  if (!value) {
    return ""
  }

  var date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

function formatDateTime(value) {
  if (!value) {
    return "暂无生成时间"
  }

  var date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  var hours = String(date.getHours()).padStart(2, "0")
  var minutes = String(date.getMinutes()).padStart(2, "0")
  return year + "-" + month + "-" + day + " " + hours + ":" + minutes
}

function formatPeriod(summaryWeekStart, summaryWeekEnd) {
  if (!summaryWeekStart || !summaryWeekEnd) {
    return "暂无周期信息"
  }

  return formatDate(summaryWeekStart) + " 至 " + formatDate(summaryWeekEnd)
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
      if (mins > 0) {
        thisWeek.days++
        thisWeek.minutes += mins
      }
    } else if (d >= lastWeekStart && d <= lastWeekEnd) {
      if (mins > 0) {
        lastWeek.days++
        lastWeek.minutes += mins
      }
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
    isLoading: true,
    hasSummary: false,
    summaries: [],
    latestPeriod: "正在同步 AI 康复小结",
    latestCreatedAt: "请稍候",
    latestContent: "正在读取最新 AI 康复小结，请稍候。",
    // 趋势对比
    trend: {
      days: emptyMetric(),
      minutes: emptyMetric(),
      avg: emptyMetric(),
    },
  },

  onShow() {
    this.setData({ patientId: auth.getPatientId() })
    this.loadAiSummaries()
    this.loadTrendData()
  },

  loadAiSummaries() {
    this.setData({ isLoading: true })

    auth.request({
      url: auth.API_BASE + "/ai-summaries",
      method: "GET",
      data: {
        patient_id: this.data.patientId,
      },
      success: (response) => {
        var respData = response.data
        var list =
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data)
            ? respData.data
            : []

        if (list.length === 0) {
          this.setData({
            isLoading: false,
            hasSummary: false,
            latestPeriod: "当前暂无 AI 康复小结",
            latestCreatedAt: "请等待后续生成",
            latestContent: "系统暂未生成 AI 康复小结，可先继续完成训练打卡并关注后续更新。",
            summaries: [],
          })
          return
        }

        var latest = list[0]
        var historyItems = list.slice(1).map(function (item) {
          return {
            id: item.id,
            period: formatPeriod(item.summary_week_start, item.summary_week_end),
            createdAt: formatDateTime(item.created_at),
            content: item.content,
          }
        })

        this.setData({
          isLoading: false,
          hasSummary: true,
          latestPeriod: formatPeriod(latest.summary_week_start, latest.summary_week_end),
          latestCreatedAt: formatDateTime(latest.created_at),
          latestContent: latest.content,
          summaries: historyItems,
        })
      },
      fail: () => {
        this.setData({
          isLoading: false,
          hasSummary: false,
          latestPeriod: "暂无 AI 康复小结",
          latestCreatedAt: "等待生成",
          latestContent: "暂未生成 AI 康复小结，继续完成训练打卡后将自动生成。",
          summaries: [],
        })
      },
    })
  },

  // ===== 加载本周 vs 上周训练趋势 =====

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

        that.setData({ trend: computeTrend(days) })
      },
      fail: function () {},
    })
  },
})
