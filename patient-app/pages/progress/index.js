const TEST_PATIENT_ID = 1
const API_BASE_URL = "http://127.0.0.1:8000/api"

function formatLabel(dateString) {
  if (!dateString) {
    return "--"
  }

  const [year, month, day] = dateString.split("-")
  if (!year || !month || !day) {
    return dateString
  }

  return `${month}-${day}`
}

function buildSummary(days) {
  const trainedDays = days.filter((item) => item.duration_minutes > 0).length
  const totalDuration = days.reduce((sum, item) => sum + item.duration_minutes, 0)
  const totalSets = days.reduce((sum, item) => sum + item.sets_count, 0)

  return {
    progressSummary: `近30天已训练 ${trainedDays} 天，累计 ${totalDuration} 分钟。`,
    trainedDays,
    totalDuration,
    totalSets,
  }
}

Page({
  data: {
    patientId: TEST_PATIENT_ID,
    progressSummary: "正在同步近30天训练趋势。",
    trainedDays: 0,
    totalDuration: 0,
    totalSets: 0,
    maxDuration: 1,
    isLoading: true,
    errorMessage: "",
    days: [],
  },

  onShow() {
    this.loadProgress30d()
  },

  loadProgress30d() {
    this.setData({
      isLoading: true,
      errorMessage: "",
    })

    wx.request({
      url: `${API_BASE_URL}/training-logs/progress-30d`,
      method: "GET",
      data: {
        patient_id: this.data.patientId,
      },
      success: (response) => {
        const { data } = response
        const days =
          response.statusCode === 200 &&
          data &&
          data.code === 200 &&
          data.data &&
          Array.isArray(data.data.days)
            ? data.data.days
            : []

        const maxDuration = Math.max(
          1,
          ...days.map((item) => item.duration_minutes),
        )
        const normalizedDays = days.map((item) => ({
          label: formatLabel(item.date),
          durationMinutes: item.duration_minutes,
          setsCount: item.sets_count,
          fullDate: item.date,
          barHeight:
            item.duration_minutes > 0
              ? Math.max(12, Math.round((item.duration_minutes / maxDuration) * 180))
              : 12,
        }))

        const summary = buildSummary(days)

        this.setData({
          ...summary,
          maxDuration,
          days: normalizedDays,
          isLoading: false,
        })
      },
      fail: () => {
        this.setData({
          isLoading: false,
          errorMessage: "暂时无法读取近30天训练趋势，请稍后重试。",
          progressSummary: "近30天训练趋势暂不可用。",
          days: [],
        })
      },
    })
  },
})
