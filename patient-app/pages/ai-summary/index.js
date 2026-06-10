const TEST_PATIENT_ID = 1
const API_BASE_URL = "http://127.0.0.1:8000/api"

function formatDate(value) {
  if (!value) {
    return ""
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function formatDateTime(value) {
  if (!value) {
    return "暂无生成时间"
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}`
}

function formatPeriod(summaryWeekStart, summaryWeekEnd) {
  if (!summaryWeekStart || !summaryWeekEnd) {
    return "暂无周期信息"
  }

  return `${formatDate(summaryWeekStart)} 至 ${formatDate(summaryWeekEnd)}`
}

Page({
  data: {
    patientId: TEST_PATIENT_ID,
    isLoading: true,
    errorMessage: "",
    hasSummary: false,
    summaryPeriod: "正在同步 AI 康复小结",
    summaryCreatedAt: "请稍候",
    summaryContent: "正在读取最新 AI 康复小结，请稍候。",
    disclaimer: "AI 内容仅作康复训练管理参考，不构成医疗建议。",
  },

  onShow() {
    this.loadLatestAiSummary()
  },

  loadLatestAiSummary() {
    this.setData({
      isLoading: true,
      errorMessage: "",
    })

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
            isLoading: false,
            hasSummary: false,
            summaryPeriod: "当前暂无 AI 康复小结",
            summaryCreatedAt: "请等待后续生成",
            summaryContent: "系统暂未生成最新 AI 康复小结，可先继续完成训练打卡并关注后续更新。",
          })
          return
        }

        this.setData({
          isLoading: false,
          hasSummary: true,
          summaryPeriod: formatPeriod(
            summary.summary_week_start,
            summary.summary_week_end,
          ),
          summaryCreatedAt: formatDateTime(summary.created_at),
          summaryContent: summary.content,
        })
      },
      fail: () => {
        this.setData({
          isLoading: false,
          hasSummary: false,
          errorMessage: "暂时无法读取 AI 康复小结，请稍后重试。",
          summaryPeriod: "AI 康复小结暂不可用",
          summaryCreatedAt: "请稍后重试",
          summaryContent: "当前无法同步最新 AI 康复小结，请先继续查看训练方案和30天进度。",
        })
      },
    })
  },
})
