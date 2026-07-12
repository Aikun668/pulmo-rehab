var auth = require("../../utils/auth.js")

var LEVEL_NAMES = {
  1: "重度恢复",
  2: "轻度活动受限",
  3: "中度恢复",
  4: "恢复良好",
  5: "接近完全恢复",
}

var LEVEL_COLORS = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#3b82f6",
}

var LEVEL_ADVICE = {
  1: "当前为重度恢复期，请以腹式呼吸训练为主，动作缓慢柔和，避免剧烈活动。如感头晕请立即停止并休息。",
  2: "当前为轻度活动受限阶段，建议以缩唇呼吸训练为核心，配合床边坐立练习。注意控制活动强度，有头晕时立即坐下。",
  3: "当前为中度恢复阶段，可进行深吸气训练和呼吸节奏控制，配合平地行走。保持呼吸节律稳定，携带血氧仪监测。",
  4: "当前恢复良好，可进行呼吸耐力训练和步行耐力训练。注意运动后充分休息，监测心率不超过安全范围。",
  5: "当前接近完全恢复，可进行综合肺功能训练和有氧运动。坚持每日训练，注意运动后恢复，警惕复发信号。",
}

function truncateText(value, maxLength) {
  if (!value) return ""
  return value.length > maxLength ? value.slice(0, maxLength) + "..." : value
}

function formatToday() {
  var date = new Date()
  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

function formatAiUpdatedAt(value) {
  if (!value) return "等待生成"
  var date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  var hours = String(date.getHours()).padStart(2, "0")
  var minutes = String(date.getMinutes()).padStart(2, "0")
  return "更新于 " + month + "-" + day + " " + hours + ":" + minutes
}

function buildTodayProgressState(todayDurationMinutes, targetDurationMinutes) {
  var target = targetDurationMinutes || 20
  var safeDuration = Math.max(0, Number(todayDurationMinutes) || 0)
  var progressPercent = Math.min(100, Math.round((safeDuration / target) * 100))

  return {
    todayDurationMinutes: safeDuration,
    targetDurationMinutes: target,
    progressPercent: progressPercent,
    progressSummaryText: safeDuration + "/" + target,
    todayStatusLabel: safeDuration > 0
      ? "今日已训练 " + safeDuration + " 分钟"
      : "今日尚未打卡",
  }
}

function calculateStreakDays(days) {
  if (!Array.isArray(days) || days.length === 0) return 0
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
    progressSummaryText: "0/20",
    todayDurationMinutes: 0,
    targetDurationMinutes: 20,
    streakDays: 0,
    // 康复等级
    rehabLevel: 0,
    rehabLevelName: "",
    rehabLevelColor: "#eab308",
    // 今日任务速览（从处方动态生成）
    todayTasks: [],
    // AI 小结
    aiTip: "正在同步最新 AI 康复小结，请稍候。",
    aiTipUpdatedAt: "请稍候",
    // 今日训练建议
    todayAdvice: "",
  },

  onReady: function () {
    this.drawProgressRing()
  },

  onShow: function () {
    var userName = auth.getUserName() || "用户"
    var greeting = getGreeting()
    this.setData({
      patientId: auth.getPatientId(),
      patientName: greeting + "，" + userName,
    })

    // 首次启动免责声明
    var app = getApp()
    if (app.globalData.showDisclaimer) {
      app.globalData.showDisclaimer = false
      wx.showModal({
        title: "免责声明",
        content:
          "本应用为肺康复辅助训练工具，提供的训练方案、健康建议及 AI 分析仅供参考，不构成医疗诊断或治疗建议。请在专业医生指导下使用。如训练中出现胸闷、头晕、气促等不适，请立即停止并就医。",
        confirmText: "我已知晓",
        showCancel: false,
        success: function () {
          try {
            wx.setStorageSync("disclaimer_accepted", true)
          } catch (e) {}
        },
      })
    }

    this.loadRehabLevel()
    this.loadStreakDays()
    this.loadLatestAiTip()
  },

  // ===== 加载康复等级 =====

  loadRehabLevel: function () {
    var that = this
    var patientId = this.data.patientId

    auth.request({
      url: auth.API_BASE + "/patients/" + patientId + "/rehab-level",
      method: "GET",
      success: function (response) {
        var respData = response.data
        if (response.statusCode === 200 && respData && respData.code === 200 && respData.data) {
          var d = respData.data
          that.setData({
            rehabLevel: d.rehab_level,
            rehabLevelName: d.level_name,
            rehabLevelColor: LEVEL_COLORS[d.rehab_level] || "#eab308",
            todayAdvice: LEVEL_ADVICE[d.rehab_level] || LEVEL_ADVICE[3],
          })
        }
        // loadPrescriptionTasks 内部会调用 loadTodayProgress，此处不重复调用
        that.loadPrescriptionTasks()
      },
      fail: function () {
        that.loadPrescriptionTasks()
      },
    })
  },

  // ===== 加载今日进度 =====

  loadTodayProgress: function () {
    var that = this
    var today = formatToday()

    auth.request({
      url: auth.API_BASE + "/training-logs",
      method: "GET",
      data: {
        patient_id: this.data.patientId,
        start_date: today,
        end_date: today,
      },
      success: function (response) {
        var data = response.data
        var logs =
          response.statusCode === 200 &&
          data &&
          data.code === 200 &&
          Array.isArray(data.data)
            ? data.data
            : []
        var todayLog = logs[0] || null
        var targetDuration = that.data.targetDurationMinutes
        var nextState = buildTodayProgressState(
          todayLog ? todayLog.duration_minutes : 0,
          targetDuration,
        )

        // 今日已有训练记录 → 标记所有任务完成
        if (todayLog && that.data.todayTasks.length > 0) {
          nextState.todayTasks = that.data.todayTasks.map(function (task) {
            return {
              id: task.id,
              name: task.name,
              target: task.target,
              done: true,
            }
          })
        }

        that.setData(nextState, function () {
          that.drawProgressRing()
        })
      },
      fail: function () {
        that.setData(buildTodayProgressState(0, that.data.targetDurationMinutes), function () {
          that.drawProgressRing()
        })
      },
    })
  },

  // ===== 加载处方任务速览（从缓存读取，与训练页共享） =====

  loadPrescriptionTasks: function () {
    var that = this
    var patientId = this.data.patientId
    var today = formatToday()
    var cacheKey = "prescription_" + patientId + "_" + today

    try {
      var cached = wx.getStorageSync(cacheKey)
      if (cached && cached.exercises && cached.exercises.length > 0) {
        var tasks = cached.exercises.map(function (ex, i) {
          var match = (ex.duration || "").match(/(\d+)/)
          var mins = match ? parseInt(match[1], 10) : 10
          return {
            id: "task_" + i,
            name: ex.name || "训练动作",
            target: mins + "分钟",
            done: false,
          }
        })

        // 计算总目标时长
        var totalTarget = 0
        for (var i = 0; i < tasks.length; i++) {
          var match = tasks[i].target.match(/(\d+)/)
          totalTarget += match ? parseInt(match[1], 10) : 0
        }

        that.setData({
          todayTasks: tasks,
          targetDurationMinutes: totalTarget > 0 ? totalTarget : 20,
        })

        // 更新进度环的目标时长
        that.loadTodayProgress()
        return
      }
    } catch (e) {
      // 缓存读取失败
    }

    // 没有缓存处方，使用等级默认任务
    var level = that.data.rehabLevel || 3
    var defaultExercises = {
      1: [
        { name: "腹式呼吸训练", target: "5分钟" },
        { name: "被动活动训练", target: "5分钟" },
      ],
      2: [
        { name: "缩唇呼吸训练", target: "10分钟" },
        { name: "床边坐立训练", target: "10分钟" },
      ],
      3: [
        { name: "深吸气训练", target: "10分钟" },
        { name: "呼吸节奏控制", target: "10分钟" },
        { name: "平地行走训练", target: "15分钟" },
      ],
      4: [
        { name: "呼吸耐力训练", target: "15分钟" },
        { name: "步行耐力训练", target: "20分钟" },
        { name: "上肢力量训练", target: "10分钟" },
      ],
      5: [
        { name: "综合肺功能训练", target: "20分钟" },
        { name: "有氧运动训练", target: "30分钟" },
        { name: "呼吸肌力量训练", target: "15分钟" },
      ],
    }

    var exercises = defaultExercises[level] || defaultExercises[3]
    var tasks = exercises.map(function (ex, i) {
      return { id: "task_" + i, name: ex.name, target: ex.target, done: false }
    })

    var totalTarget = 0
    for (var i = 0; i < tasks.length; i++) {
      var match = tasks[i].target.match(/(\d+)/)
      totalTarget += match ? parseInt(match[1], 10) : 0
    }

    that.setData({
      todayTasks: tasks,
      targetDurationMinutes: totalTarget > 0 ? totalTarget : 20,
    })

    // 更新进度环
    that.loadTodayProgress()
  },

  loadStreakDays: function () {
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
        var streak = calculateStreakDays(days)
        that.setData({ streakDays: streak })
      },
      fail: function () {},
    })
  },

  loadLatestAiTip: function () {
    var that = this

    auth.request({
      url: auth.API_BASE + "/ai-summaries/latest",
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        var data = response.data
        var summary =
          response.statusCode === 200 && data && data.code === 200
            ? data.data
            : null

        if (!summary) {
          that.setData({
            aiTip: "当前暂无 AI 康复小结，可继续完成训练打卡并等待后续生成。",
            aiTipUpdatedAt: "等待生成",
          })
          return
        }

        that.setData({
          aiTip: truncateText(summary.content, 42),
          aiTipUpdatedAt: formatAiUpdatedAt(summary.created_at),
        })
      },
      fail: function () {
        that.setData({
          aiTip: "暂无 AI 康复小结，继续完成训练打卡后将自动生成。",
          aiTipUpdatedAt: "等待生成",
        })
      },
    })
  },

  drawProgressRing: function () {
    var self = this
    var progressPercent = Math.max(
      0,
      Math.min(100, Number(this.data.progressPercent) || 0),
    )
    var progressSummaryText = this.data.progressSummaryText || "0/20"

    var query = wx.createSelectorQuery().in(this)
    query
      .select(".progress-ring__canvas")
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var dpr = wx.getWindowInfo().pixelRatio
        var width = res[0].width
        var height = res[0].height

        canvas.width = width * dpr
        canvas.height = height * dpr

        var ctx = canvas.getContext("2d")
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

  handleGoCheckIn: function () {
    wx.switchTab({ url: "/pages/check-in/index" })
  },

  handleQuickActionTap: function (event) {
    var key = event.currentTarget.dataset.key
    if (key === "progress") {
      wx.navigateTo({ url: "/pages/progress/index" })
      return
    }
    wx.navigateTo({ url: "/pages/ai-summary/index" })
  },
})
