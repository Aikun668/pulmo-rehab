var auth = require("../../utils/auth.js")

function truncateText(value, maxLength) {
  if (!value) {
    return ""
  }

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value
}

function formatDateTime(value) {
  if (!value) {
    return "暂无更新时间"
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

function createPlanPreview(plan) {
  if (!plan) {
    return {
      title: "当前暂无训练方案",
      description: "医生暂未下发训练方案，建议先查看30天进度并等待方案更新。",
      updatedAt: "暂无更新时间",
      hasPlan: false,
    }
  }

  return {
    title: plan.title,
    description: plan.content,
    updatedAt: formatDateTime(plan.created_at),
    hasPlan: true,
  }
}

function buildProgressSummary(days) {
  const trainedDays = days.filter((item) => item.duration_minutes > 0).length
  const totalDuration = days.reduce((sum, item) => sum + item.duration_minutes, 0)
  return `近30天已训练 ${trainedDays} 天，累计 ${totalDuration} 分钟。`
}

function buildStatsFromDays(days) {
  if (!Array.isArray(days) || days.length === 0) {
    return { trainedDays: "--", completionRate: "--", totalDuration: "--" }
  }
  var trainedDays = days.filter(function (item) { return item.duration_minutes > 0 }).length
  var totalDuration = days.reduce(function (sum, item) { return sum + item.duration_minutes }, 0)
  var completionRate = Math.round((trainedDays / days.length) * 100)
  return {
    trainedDays: String(trainedDays),
    completionRate: String(completionRate) + "%",
    totalDuration: String(totalDuration),
  }
}

function createAiPreview(summary) {
  if (!summary) {
    return "当前暂无 AI 康复小结，可继续完成训练打卡并等待后续生成。"
  }

  return truncateText(summary.content, 34)
}

Page({
  data: {
    patientId: 0,
    doctorId: null,
    latestPlanTitle: "正在同步训练方案",
    latestPlanDescription: "正在读取医生最新下发的训练方案，请稍候。",
    latestPlanUpdatedAt: "请稍候",
    hasPlan: false,
    isLoadingPlan: true,
    trainedDays: "--",
    completionRate: "--",
    totalDuration: "--",
    progressSummary: "正在同步30天进度摘要。",
    aiSummaryPreview: "正在同步最新 AI 康复小结。",
  },

  onShow() {
    this.setData({ patientId: auth.getPatientId(), doctorId: auth.getDoctorId() })
    this.loadLatestPlan()
    this.loadProgressSummary()
    this.loadLatestAiPreview()
  },

  loadLatestPlan() {
    const { patientId, doctorId } = this.data

    this.setData({
      isLoadingPlan: true,
    })

    auth.request({
      url: `${auth.API_BASE}/rehab-plans`,
      method: "GET",
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
      },
      success: (response) => {
        const { data } = response
        const plans =
          response.statusCode === 200 &&
          data &&
          data.code === 200 &&
          Array.isArray(data.data)
            ? data.data
            : []
        const latestPlan = plans[0] || null
        const preview = createPlanPreview(latestPlan)

        this.setData({
          latestPlanTitle: preview.title,
          latestPlanDescription: preview.description,
          latestPlanUpdatedAt: preview.updatedAt,
          hasPlan: preview.hasPlan,
          isLoadingPlan: false,
        })
      },
      fail: () => {
        this.setData({
          isLoadingPlan: false,
          hasPlan: false,
          latestPlanTitle: "暂无训练方案",
          latestPlanDescription: "医生尚未下发训练方案，建议先完成训练打卡，医生将更有依据为您制定方案。",
          latestPlanUpdatedAt: "",
        })
      },
    })
  },

  loadProgressSummary() {
    auth.request({
      url: `${auth.API_BASE}/training-logs/progress-30d`,
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

        const stats = buildStatsFromDays(days)

        this.setData({
          progressSummary: buildProgressSummary(days),
          trainedDays: stats.trainedDays,
          completionRate: stats.completionRate,
          totalDuration: stats.totalDuration,
        })
      },
      fail: () => {
        this.setData({
          progressSummary: "暂无训练记录，开始训练后将在这里展示进度。",
        })
      },
    })
  },

  loadLatestAiPreview() {
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

        this.setData({
          aiSummaryPreview: createAiPreview(summary),
        })
      },
      fail: () => {
        this.setData({
          aiSummaryPreview: "暂无 AI 康复小结，继续完成训练打卡后将自动生成。",
        })
      },
    })
  },

  handleOpenPlanDetail() {
    wx.navigateTo({
      url: "/pages/plan-detail/index",
    })
  },

  handleOpenProgress() {
    wx.navigateTo({
      url: "/pages/progress/index",
    })
  },

  handleOpenAiSummary() {
    wx.navigateTo({
      url: "/pages/ai-summary/index",
    })
  },
})
