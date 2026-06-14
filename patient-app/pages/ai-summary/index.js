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

Page({
  data: {
    patientId: 0,
    isLoading: true,
    hasSummary: false,
    summaries: [],
    latestPeriod: "正在同步 AI 康复小结",
    latestCreatedAt: "请稍候",
    latestContent: "正在读取最新 AI 康复小结，请稍候。",
  },

  onShow() {
    this.setData({ patientId: auth.getPatientId() })
    this.loadAiSummaries()
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
})
