var auth = require("../../utils/auth.js")

function formatLabel(dateString) {
  if (!dateString) return "--"
  var parts = dateString.split("-")
  if (parts.length < 3) return dateString
  var month = parseInt(parts[1], 10)
  var day = parseInt(parts[2], 10)
  return month + "/" + day
}

// ===== 动态生成模拟数据（以今天为基准往前推，日期永远正确） =====
var MOCK_30D_DURATION_TEMPLATE = [
  12, 0, 15, 18, 16, 0, 14,
  17, 20, 0, 22, 19, 24, 21,
  23, 0, 26, 25, 28, 24, 27,
  29, 0, 30, 28, 32, 31, 33,
  30
]

var MOCK_30D_SETS_TEMPLATE = [
  2, 0, 3, 3, 3, 0, 2,
  3, 4, 0, 4, 3, 4, 4,
  4, 0, 5, 5, 5, 4, 5,
  5, 0, 5, 5, 6, 6, 6,
  5
]

// 根据今天日期动态生成30天数据
function buildMock30DDays() {
  var today = new Date()
  var days = []
  for (var i = 29; i >= 0; i--) {
    var d = new Date(today)
    d.setDate(d.getDate() - i)
    var y = d.getFullYear()
    var m = String(d.getMonth() + 1).padStart(2, "0")
    var day = String(d.getDate()).padStart(2, "0")
    days.push({
      date: y + "-" + m + "-" + day,
      duration_minutes: MOCK_30D_DURATION_TEMPLATE[29 - i],
      sets_count: MOCK_30D_SETS_TEMPLATE[29 - i],
    })
  }
  return days
}

// 生命体征模拟数据（动态日期）
function buildMockVitals() {
  var today = new Date()
  var offsets = [0, 3, 6, 9, 14, 20, 26]
  var hrValues = [70, 72, 74, 76, 80, 82, 78]
  var spo2Values = [99, 99, 98, 98, 97, 96, 97]
  var dyspneaValues = [1, 1, 1, 1, 2, 2, 2]
  var fatigueValues = [2, 2, 2, 3, 3, 4, 3]
  var vitals = []
  for (var i = 0; i < offsets.length; i++) {
    var d = new Date(today)
    d.setDate(d.getDate() - offsets[i])
    var y = d.getFullYear()
    var m = String(d.getMonth() + 1).padStart(2, "0")
    var day = String(d.getDate()).padStart(2, "0")
    vitals.push({
      created_at: y + "-" + m + "-" + day + "T08:00:00",
      heart_rate: hrValues[i],
      spo2: spo2Values[i],
      dyspnea_score: dyspneaValues[i],
      fatigue_score: fatigueValues[i],
    })
  }
  return vitals
}

function buildSummary(days) {
  var trainedDays = 0
  var totalDuration = 0
  var totalSets = 0
  for (var i = 0; i < days.length; i++) {
    var dm = Number(days[i].duration_minutes) || 0
    var sc = Number(days[i].sets_count) || 0
    if (dm > 0) trainedDays++
    totalDuration += dm
    totalSets += sc
  }
  return {
    progressSummary: "近30天已训练 " + trainedDays + " 天，累计 " + totalDuration + " 分钟。",
    trainedDays: trainedDays,
    totalDuration: totalDuration,
    totalSets: totalSets,
  }
}

// ===== 计算4个豆腐块指标 =====
function calcMetrics(days, fatigueScore) {
  var trainedDays = 0
  var totalDuration = 0
  var maxDuration = 0
  var maxStreak = 0
  var currentStreak = 0

  for (var i = 0; i < days.length; i++) {
    var dm = Number(days[i].duration_minutes) || 0
    if (dm > 0) {
      trainedDays++
      totalDuration += dm
      if (dm > maxDuration) maxDuration = dm
      currentStreak++
      if (currentStreak > maxStreak) maxStreak = currentStreak
    } else {
      currentStreak = 0
    }
  }

  var avgDuration = trainedDays > 0 ? Math.round(totalDuration / trainedDays) : 0

  return {
    avgDuration: avgDuration,       // 日均时长
    maxDuration: maxDuration,        // 单日最高
    maxStreak: maxStreak,            // 最长连续
    fatigueScore: fatigueScore || 0, // 疲劳评分
  }
}

Page({
  data: {
    patientId: 0,
    progressSummary: "正在同步近30天训练趋势。",
    trainedDays: 0,
    totalDuration: 0,
    totalSets: 0,
    isLoading: true,
    days: [],
    // 4个豆腐块指标
    avgDuration: 0,
    maxDuration: 0,
    maxStreak: 0,
    fatigueScore: 0,
    // 训练趋势点（纯 WXML，不用 Canvas）
    trainingPoints: [],
    yAxisMax: '',
    yAxisMid: '',
    // 评估趋势
    assessments: { heartRate: [], spo2: [], dyspnea: [], fatigue: [] },
    isLoadingAssessments: true,
    // Tab 切换
    activeTab: "training",
  },

  onShow: function () {
    this.setData({ patientId: auth.getPatientId() })
    this._loadMockData()
    this.loadProgress30d()
    this.loadAssessments()
  },

  // ===== 加载模拟数据（页面立即可见） =====
  _loadMockData: function () {
    var days = buildMock30DDays()
    var normalizedDays = []
    for (var j = 0; j < days.length; j++) {
      normalizedDays.push({
        date: days[j].date,
        durationMinutes: days[j].duration_minutes || 0,
        setsCount: days[j].sets_count || 0,
      })
    }

    var summary = buildSummary(days)
    // 疲劳评分取模拟数据最近一条
    var mockVitals = buildMockVitals()
    var fatigueScore = mockVitals.length > 0 ? mockVitals[0].fatigue_score : 0
    var metrics = calcMetrics(days, fatigueScore)

    // 生命体征
    var heartRatePoints = []
    var spo2Points = []
    var dyspneaPoints = []
    var fatiguePoints = []

    for (var i = 0; i < mockVitals.length; i++) {
      var a = mockVitals[i]
      var dateLabel = formatLabel(a.created_at ? a.created_at.split("T")[0] : "")
      if (a.heart_rate != null) {
        heartRatePoints.push({ date: dateLabel, value: a.heart_rate, isWarning: a.heart_rate > 120, bottomRpx: Math.max(0, (a.heart_rate - 40) / 80 * 200) })
      }
      if (a.spo2 != null) {
        spo2Points.push({ date: dateLabel, value: a.spo2, isWarning: a.spo2 < 92, bottomRpx: Math.max(0, (a.spo2 - 90) / 10 * 200) })
      }
      dyspneaPoints.push({ date: dateLabel, value: a.dyspnea_score || 0, isWarning: a.dyspnea_score >= 4, bottomRpx: Math.max(0, (a.dyspnea_score - 1) / 4 * 140) })
      fatiguePoints.push({ date: dateLabel, value: a.fatigue_score || 0, isWarning: a.fatigue_score > 8, bottomRpx: Math.max(0, (a.fatigue_score - 1) / 9 * 140) })
    }

    // 计算训练趋势点（只取 duration > 0 的天）
    var tpMaxVal = 0
    for (var k = 0; k < normalizedDays.length; k++) {
      if (normalizedDays[k].durationMinutes > tpMaxVal) tpMaxVal = normalizedDays[k].durationMinutes
    }
    if (tpMaxVal === 0) tpMaxVal = 30
    var trainingPoints = []
    for (var k = 0; k < normalizedDays.length; k++) {
      if (normalizedDays[k].durationMinutes > 0) {
        trainingPoints.push({
          date: formatLabel(normalizedDays[k].date),
          value: normalizedDays[k].durationMinutes,
          bottomRpx: Math.round(normalizedDays[k].durationMinutes / tpMaxVal * 200),
        })
      }
    }

    this.setData({
      progressSummary: summary.progressSummary,
      trainedDays: summary.trainedDays,
      totalDuration: summary.totalDuration,
      totalSets: summary.totalSets,
      days: normalizedDays,
      avgDuration: metrics.avgDuration,
      maxDuration: metrics.maxDuration,
      maxStreak: metrics.maxStreak,
      fatigueScore: metrics.fatigueScore,
      trainingPoints: trainingPoints,
      yAxisMax: String(Math.round(tpMaxVal)),
      yAxisMid: String(Math.round(tpMaxVal / 2)),
      isLoading: false,
      assessments: { heartRate: heartRatePoints, spo2: spo2Points, dyspnea: dyspneaPoints, fatigue: fatiguePoints },
      isLoadingAssessments: false,
    })
  },

  loadProgress30d: function () {
    var that = this
    auth.request({
      url: auth.API_BASE + "/training-logs/progress-30d",
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data &&
          Array.isArray(respData.data.days) &&
          respData.data.days.length > 0
        ) {
          var days = respData.data.days
          var normalizedDays = []
          for (var j = 0; j < days.length; j++) {
            normalizedDays.push({
              date: days[j].date,
              durationMinutes: Number(days[j].duration_minutes) || 0,
              setsCount: Number(days[j].sets_count) || 0,
            })
          }
          var summary = buildSummary(days)
          var metrics = calcMetrics(days, that.data.fatigueScore)
          // 计算训练趋势点
          var tpMaxVal = 0
          for (var k = 0; k < normalizedDays.length; k++) {
            if (normalizedDays[k].durationMinutes > tpMaxVal) tpMaxVal = normalizedDays[k].durationMinutes
          }
          if (tpMaxVal === 0) tpMaxVal = 30
          var trainingPoints = []
          for (var k = 0; k < normalizedDays.length; k++) {
            if (normalizedDays[k].durationMinutes > 0) {
              trainingPoints.push({
                date: formatLabel(normalizedDays[k].date),
                value: normalizedDays[k].durationMinutes,
                bottomRpx: Math.round(normalizedDays[k].durationMinutes / tpMaxVal * 200),
              })
            }
          }
          that.setData({
            progressSummary: summary.progressSummary,
            trainedDays: summary.trainedDays,
            totalDuration: summary.totalDuration,
            totalSets: summary.totalSets,
            days: normalizedDays,
            avgDuration: metrics.avgDuration,
            maxDuration: metrics.maxDuration,
            maxStreak: metrics.maxStreak,
            trainingPoints: trainingPoints,
            yAxisMax: String(Math.round(tpMaxVal)),
            yAxisMid: String(Math.round(tpMaxVal / 2)),
          })
        }
      },
      fail: function () {
        // 保留模拟数据
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
        if (response.statusCode === 200 && respData && respData.code === 200 && Array.isArray(respData.data)) {
          rawAssessments = respData.data
        }
        if (rawAssessments.length === 0) {
          rawAssessments = buildMockVitals()
        }

        var recent = rawAssessments.slice(0, 15).reverse()
        var heartRatePoints = []
        var spo2Points = []
        var dyspneaPoints = []
        var fatiguePoints = []

        for (var i = 0; i < recent.length; i++) {
          var a = recent[i]
          var dateLabel = formatLabel(a.created_at ? a.created_at.split("T")[0] : "")
          if (a.heart_rate != null) {
            heartRatePoints.push({ date: dateLabel, value: a.heart_rate, isWarning: a.heart_rate > 120, bottomRpx: Math.max(0, (a.heart_rate - 40) / 80 * 200) })
          }
          if (a.spo2 != null) {
            spo2Points.push({ date: dateLabel, value: a.spo2, isWarning: a.spo2 < 92, bottomRpx: Math.max(0, (a.spo2 - 90) / 10 * 200) })
          }
          dyspneaPoints.push({ date: dateLabel, value: a.dyspnea_score || 0, isWarning: a.dyspnea_score >= 4, bottomRpx: Math.max(0, (a.dyspnea_score - 1) / 4 * 140) })
          fatiguePoints.push({ date: dateLabel, value: a.fatigue_score || 0, isWarning: a.fatigue_score > 8, bottomRpx: Math.max(0, (a.fatigue_score - 1) / 9 * 140) })
        }

        // 取最近一条疲劳评分
        var latestFatigue = 0
        if (fatiguePoints.length > 0) {
          latestFatigue = fatiguePoints[fatiguePoints.length - 1].value
        }

        that.setData({
          assessments: { heartRate: heartRatePoints, spo2: spo2Points, dyspnea: dyspneaPoints, fatigue: fatiguePoints },
          isLoadingAssessments: false,
          fatigueScore: latestFatigue,
        })
      },
      fail: function () {
        var recent = buildMockVitals()
        var heartRatePoints = []
        var spo2Points = []
        var dyspneaPoints = []
        var fatiguePoints = []

        for (var i = 0; i < recent.length; i++) {
          var a = recent[i]
          var dateLabel = formatLabel(a.created_at ? a.created_at.split("T")[0] : "")
          if (a.heart_rate != null) {
            heartRatePoints.push({ date: dateLabel, value: a.heart_rate, isWarning: a.heart_rate > 120, bottomRpx: Math.max(0, (a.heart_rate - 40) / 80 * 200) })
          }
          if (a.spo2 != null) {
            spo2Points.push({ date: dateLabel, value: a.spo2, isWarning: a.spo2 < 92, bottomRpx: Math.max(0, (a.spo2 - 90) / 10 * 200) })
          }
          dyspneaPoints.push({ date: dateLabel, value: a.dyspnea_score || 0, isWarning: a.dyspnea_score >= 4, bottomRpx: Math.max(0, (a.dyspnea_score - 1) / 4 * 140) })
          fatiguePoints.push({ date: dateLabel, value: a.fatigue_score || 0, isWarning: a.fatigue_score > 8, bottomRpx: Math.max(0, (a.fatigue_score - 1) / 9 * 140) })
        }

        that.setData({
          assessments: { heartRate: heartRatePoints, spo2: spo2Points, dyspnea: dyspneaPoints, fatigue: fatiguePoints },
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
