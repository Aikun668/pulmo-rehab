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
    return "暂无医生建议，继续打卡后医生将为您制定康复指导。"
  }

  return truncateText(summary.doctor_input || summary.content, 34)
}

Page({
  data: {
    patientId: 0,
    doctorId: null,
    planSubtitle: "正在同步训练方案…",
    hasPlan: false,
    isLoadingPlan: true,
    // 兜底模拟数据（与首页/打卡页对齐：患者1≈12min/天,30天≈17天训练,完成率57%）
    trainedDays: "17",
    completionRate: "57%",
    totalDuration: "204",
    progressSummary: "近30天已训练 17 天，累计 204 分钟。",
    aiSummaryPreview: "正在同步康复指导…",
  },

  onShow() {
    // 自定义 tabBar：设置选中状态（康复tab = index 3）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 3 })
    }

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

        if (latestPlan) {
          this.setData({
            planSubtitle: formatDateTime(latestPlan.created_at),
            hasPlan: true,
            isLoadingPlan: false,
          })
        } else {
          this.setData({
            planSubtitle: "暂无方案，继续打卡后医生将为您制定",
            hasPlan: false,
            isLoadingPlan: false,
          })
        }
      },
      fail: () => {
        this.setData({
          isLoadingPlan: false,
          hasPlan: false,
          planSubtitle: "暂无方案，继续打卡后医生将为您制定",
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

        // API返回空数据时保留mock兜底，避免显示"--"
        const stats = buildStatsFromDays(days)
        if (stats.trainedDays !== "--" && stats.completionRate !== "--" && stats.totalDuration !== "--") {
          this.setData({
            progressSummary: buildProgressSummary(days),
            trainedDays: stats.trainedDays,
            completionRate: stats.completionRate,
            totalDuration: stats.totalDuration,
          })
        } else {
          // 空数据 → 保持兜底模拟数据不变
        }
      },
      fail: () => {
        // API 失败时保持兜底模拟数据不变（与首页/打卡页一致）
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
          aiSummaryPreview: "暂无康复指导，继续打卡后将自动生成",
        })
      },
    })
  },

  handleOpenPlanDetail() {
    wx.navigateTo({
      url: "/pages/plan-analysis/index",
    })
  },

  handleOpenProgress() {
    wx.navigateTo({
      url: "/pages/progress/index",
    })
  },

  handleOpenAiGuidance() {
    wx.navigateTo({
      url: "/pages/ai-guidance/index",
    })
  },

  handleOpenKnowledge() {
    wx.navigateTo({
      url: "/pages/knowledge/index",
    })
  },
})
