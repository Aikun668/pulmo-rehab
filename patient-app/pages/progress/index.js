var auth = require("../../utils/auth.js")

function formatLabel(dateString) {
  if (!dateString) return "--"
  var parts = dateString.split("-")
  if (parts.length < 3) return dateString
  return parts[1] + "-" + parts[2]
}

function buildSummary(days) {
  var trainedDays = 0
  var totalDuration = 0
  var totalSets = 0
  for (var i = 0; i < days.length; i++) {
    if (days[i].duration_minutes > 0) trainedDays++
    totalDuration += days[i].duration_minutes
    totalSets += days[i].sets_count
  }
  return {
    progressSummary: "近30天已训练 " + trainedDays + " 天，累计 " + totalDuration + " 分钟。",
    trainedDays: trainedDays,
    totalDuration: totalDuration,
    totalSets: totalSets,
  }
}

Page({
  data: {
    patientId: 0,
    progressSummary: "正在同步近30天训练趋势。",
    trainedDays: 0,
    totalDuration: 0,
    totalSets: 0,
    maxDuration: 1,
    isLoading: true,
    days: [],
    // 评估趋势
    assessments: [],
    isLoadingAssessments: true,
    // Tab 切换
    activeTab: "training", // "training" | "vitals" | "scores"
  },

  onShow: function () {
    this.setData({ patientId: auth.getPatientId() })
    this.loadProgress30d()
    this.loadAssessments()
  },

  loadProgress30d: function () {
    var that = this
    this.setData({ isLoading: true })

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

        var maxDuration = 1
        for (var i = 0; i < days.length; i++) {
          if (days[i].duration_minutes > maxDuration) {
            maxDuration = days[i].duration_minutes
          }
        }

        var normalizedDays = []
        for (var j = 0; j < days.length; j++) {
          var item = days[j]
          normalizedDays.push({
            label: formatLabel(item.date),
            durationMinutes: item.duration_minutes,
            setsCount: item.sets_count,
            fullDate: item.date,
            barHeight: item.duration_minutes > 0
              ? Math.max(12, Math.round((item.duration_minutes / maxDuration) * 180))
              : 12,
          })
        }

        var summary = buildSummary(days)
        that.setData({
          progressSummary: summary.progressSummary,
          trainedDays: summary.trainedDays,
          totalDuration: summary.totalDuration,
          totalSets: summary.totalSets,
          maxDuration: maxDuration,
          days: normalizedDays,
          isLoading: false,
        })
      },
      fail: function () {
        that.setData({
          isLoading: false,
          progressSummary: "暂无训练记录，开始训练后将在这里展示趋势。",
          days: [],
        })
      },
    })
  },

  loadAssessments: function () {
    var that = this
    this.setData({ isLoadingAssessments: true })

    auth.request({
      url: auth.API_BASE + "/assessments",
      method: "GET",
      data: { patient_id: this.data.patientId, limit: 15 },
      success: function (response) {
        var respData = response.data
        var rawAssessments = []
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data)
        ) {
          rawAssessments = respData.data
        }

        // 只取最近 15 条，倒序变正序（时间从左到右）
        var recent = rawAssessments.slice(0, 15).reverse()

        // 构建趋势数据
        var heartRatePoints = []
        var spo2Points = []
        var dyspneaPoints = []
        var fatiguePoints = []

        for (var i = 0; i < recent.length; i++) {
          var a = recent[i]
          var dateLabel = formatLabel(a.created_at ? a.created_at.split("T")[0] : "")

          if (a.heart_rate != null) {
            var hrBottom = Math.max(0, (a.heart_rate - 40) / 80 * 200)
            heartRatePoints.push({
              date: dateLabel,
              value: a.heart_rate,
              isWarning: a.heart_rate > 120,
              bottomRpx: hrBottom,
            })
          }
          if (a.spo2 != null) {
            var spo2Bottom = Math.max(0, (a.spo2 - 90) / 10 * 200)
            spo2Points.push({
              date: dateLabel,
              value: a.spo2,
              isWarning: a.spo2 < 92,
              bottomRpx: spo2Bottom,
            })
          }
          var dyspneaBottom = Math.max(0, (a.dyspnea_score - 1) / 4 * 140)
          dyspneaPoints.push({
            date: dateLabel,
            value: a.dyspnea_score || 0,
            isWarning: a.dyspnea_score >= 4,
            bottomRpx: dyspneaBottom,
          })
          var fatigueBottom = Math.max(0, (a.fatigue_score - 1) / 9 * 140)
          fatiguePoints.push({
            date: dateLabel,
            value: a.fatigue_score || 0,
            isWarning: a.fatigue_score > 8,
            bottomRpx: fatigueBottom,
          })
        }

        that.setData({
          assessments: {
            heartRate: heartRatePoints,
            spo2: spo2Points,
            dyspnea: dyspneaPoints,
            fatigue: fatiguePoints,
          },
          isLoadingAssessments: false,
        })
      },
      fail: function () {
        that.setData({
          assessments: { heartRate: [], spo2: [], dyspnea: [], fatigue: [] },
          isLoadingAssessments: false,
        })
      },
    })
  },

  handleTabChange: function (event) {
    var tab = event.currentTarget.dataset.tab
    this.setData({ activeTab: tab })
  },
})
