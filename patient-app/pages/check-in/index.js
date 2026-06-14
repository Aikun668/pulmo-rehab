var auth = require("../../utils/auth.js")

const DEFAULT_TASKS = [
  {
    id: "breathing",
    name: "缩唇腹式呼吸",
    description: "吸气2秒，缩唇呼气4-6秒",
    benefit: "缩唇呼吸可改善通气效率，缓解气短",
    targetMinutes: 10,
    targetSets: 2,
  },
  {
    id: "walking",
    name: "平地行走",
    description: "维持轻度气短水平行走",
    benefit: "规律行走可提升运动耐力，减少日常气喘",
    targetMinutes: 20,
    targetSets: 1,
  },
  {
    id: "cough",
    name: "有效咳嗽排痰",
    description: "早晚各1次，配合深呼吸",
    benefit: "有效排痰可减少肺部感染风险",
    targetMinutes: 5,
    targetSets: 2,
  },
]

// 呼吸计时器节拍配置
var BREATH_PHASES = [
  { key: "inhale", label: "吸气", duration: 4 },
  { key: "hold", label: "屏气", duration: 2 },
  { key: "exhale", label: "呼气", duration: 6 },
]
var TOTAL_ROUNDS = 5

var formatToday = function () {
  var date = new Date()
  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

Page({
  data: {
    patientId: 0,
    trainDate: "",
    tasks: [],
    allChecked: false,
    hasSubmittedToday: false,
    todaySummaryText: "正在加载...",
    isSubmitting: false,
    showSuccessFeedback: false,
    // 呼吸计时器
    showBreathTimer: false,
    breathRunning: false,
    breathPhase: "inhale",
    breathCountdown: 4,
    breathRound: 1,
    breathTotalRounds: TOTAL_ROUNDS,
    breathCircleScale: 1,
    breathCompleted: false,
    breathElapsedSeconds: 0,
    breathTotalMinutes: 1,
  },

  _breathTimer: null,

  onLoad: function () {
    this.setData({
      trainDate: formatToday(),
      tasks: DEFAULT_TASKS.map(function (task) {
        return {
          id: task.id,
          name: task.name,
          description: task.description,
          benefit: task.benefit,
          targetMinutes: task.targetMinutes,
          targetSets: task.targetSets,
          checked: false,
          actualMinutes: "",
        }
      }),
      allChecked: false,
      hasSubmittedToday: false,
      todaySummaryText: "今天还没有提交训练记录",
    })
  },

  onShow: function () {
    this.setData({ patientId: auth.getPatientId() })
    this.loadTodayLog()
  },

  onUnload: function () {
    this.clearBreathTimer()
  },

  onHide: function () {
    this.clearBreathTimer()
  },

  updateCheckState: function () {
    var allChecked = true
    var tasks = this.data.tasks
    for (var i = 0; i < tasks.length; i++) {
      if (!tasks[i].checked) {
        allChecked = false
        break
      }
    }
    this.setData({ allChecked: allChecked })
  },

  loadTodayLog: function () {
    var that = this
    var patientId = this.data.patientId
    var trainDate = this.data.trainDate

    if (!trainDate) return

    auth.request({
      url: auth.API_BASE + "/training-logs",
      method: "GET",
      data: {
        patient_id: patientId,
        start_date: trainDate,
        end_date: trainDate,
      },
      success: function (response) {
        var respData = response.data
        var logs = []
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data)
        ) {
          logs = respData.data
        }
        var todayLog = logs[0] || null

        if (!todayLog) {
          that.setData({
            hasSubmittedToday: false,
            todaySummaryText: "今天还没有提交训练记录",
          })
          return
        }

        var tasks = DEFAULT_TASKS.map(function (task) {
          return {
            id: task.id,
            name: task.name,
            description: task.description,
            benefit: task.benefit,
            targetMinutes: task.targetMinutes,
            targetSets: task.targetSets,
            checked: true,
            actualMinutes: String(task.targetMinutes),
          }
        })

        that.setData({
          tasks: tasks,
          allChecked: true,
          hasSubmittedToday: true,
          todaySummaryText: "今天已记录 " + todayLog.duration_minutes + " 分钟 · " + todayLog.sets_count + " 组",
        })
      },
      fail: function () {
        that.setData({
          todaySummaryText: "今天还没有提交训练记录",
        })
      },
    })
  },

  // ===== 呼吸计时器 =====

  handleOpenBreathTimer: function () {
    this.setData({
      showBreathTimer: true,
      breathRunning: false,
      breathPhase: "inhale",
      breathCountdown: BREATH_PHASES[0].duration,
      breathRound: 1,
      breathCompleted: false,
      breathCircleScale: 1,
      breathElapsedSeconds: 0,
    })
  },

  handleCloseBreathTimer: function () {
    this.clearBreathTimer()
    this.setData({ showBreathTimer: false })
  },

  handleStartBreath: function () {
    var that = this
    this.clearBreathTimer()

    this.setData({ breathRunning: true })

    this._breathTimer = setInterval(function () {
      var phase = that.data.breathPhase
      var countdown = that.data.breathCountdown
      var round = that.data.breathRound
      var elapsed = that.data.breathElapsedSeconds

      // 计算下一个状态
      if (countdown > 1) {
        // 当前阶段继续倒计时
        var newCountdown = countdown - 1
        var currentPhaseDuration = 0
        for (var p = 0; p < BREATH_PHASES.length; p++) {
          if (BREATH_PHASES[p].key === phase) {
            currentPhaseDuration = BREATH_PHASES[p].duration
            break
          }
        }
        var scale = that._calcCircleScale(phase, currentPhaseDuration, newCountdown)
        that.setData({
          breathCountdown: newCountdown,
          breathCircleScale: scale,
          breathElapsedSeconds: elapsed + 1,
        })
        return
      }

      // 当前阶段结束，进入下一阶段
      var currentPhaseIndex = -1
      for (var i = 0; i < BREATH_PHASES.length; i++) {
        if (BREATH_PHASES[i].key === phase) {
          currentPhaseIndex = i
          break
        }
      }

      var nextPhaseIndex = currentPhaseIndex + 1

      if (nextPhaseIndex < BREATH_PHASES.length) {
        // 进入下一个阶段
        var nextPhase = BREATH_PHASES[nextPhaseIndex]
        var scale = that._calcCircleScale(nextPhase.key, nextPhase.duration, nextPhase.duration)
        that.setData({
          breathPhase: nextPhase.key,
          breathCountdown: nextPhase.duration,
          breathCircleScale: scale,
          breathElapsedSeconds: elapsed + 1,
        })
      } else {
        // 一轮结束
        if (round < TOTAL_ROUNDS) {
          // 进入下一轮
          var firstPhase = BREATH_PHASES[0]
          var scale = that._calcCircleScale(firstPhase.key, firstPhase.duration, firstPhase.duration)
          that.setData({
            breathRound: round + 1,
            breathPhase: firstPhase.key,
            breathCountdown: firstPhase.duration,
            breathCircleScale: scale,
            breathElapsedSeconds: elapsed + 1,
          })
        } else {
          // 全部完成
          that.clearBreathTimer()
          var totalMinutes = Math.ceil((elapsed + 1) / 60)
          that.setData({
            breathRunning: false,
            breathCompleted: true,
            breathCircleScale: 1,
            breathElapsedSeconds: elapsed + 1,
            breathTotalMinutes: totalMinutes,
          })

          // 自动填充 breathing 任务的时长
          that._fillBreathingTaskDuration(totalMinutes)
        }
      }
    }, 1000)
  },

  handlePauseBreath: function () {
    this.clearBreathTimer()
    this.setData({ breathRunning: false })
  },

  handleResumeBreath: function () {
    this.handleStartBreath()
  },

  handleResetBreath: function () {
    this.clearBreathTimer()
    this.setData({
      breathRunning: false,
      breathPhase: "inhale",
      breathCountdown: BREATH_PHASES[0].duration,
      breathRound: 1,
      breathCompleted: false,
      breathCircleScale: 1,
      breathElapsedSeconds: 0,
    })
  },

  _calcCircleScale: function (phase, totalDuration, countdown) {
    if (phase === "inhale") {
      var progress = (totalDuration - countdown) / totalDuration
      return 1 + progress * 0.5 // 1 → 1.5
    } else if (phase === "hold") {
      return 1.5
    } else if (phase === "exhale") {
      var progress = (totalDuration - countdown) / totalDuration
      return 1.5 - progress * 0.5 // 1.5 → 1
    }
    return 1
  },

  _fillBreathingTaskDuration: function (minutes) {
    var tasks = this.data.tasks
    var newTasks = []
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].id === "breathing") {
        newTasks.push({
          id: tasks[i].id,
          name: tasks[i].name,
          description: tasks[i].description,
          benefit: tasks[i].benefit,
          targetMinutes: tasks[i].targetMinutes,
          targetSets: tasks[i].targetSets,
          checked: true,
          actualMinutes: String(minutes),
        })
      } else {
        newTasks.push(tasks[i])
      }
    }
    this.setData({ tasks: newTasks })
    this.updateCheckState()
  },

  clearBreathTimer: function () {
    if (this._breathTimer) {
      clearInterval(this._breathTimer)
      this._breathTimer = null
    }
  },

  // ===== 任务操作 =====

  handleTaskCheck: function (event) {
    var idx = event.currentTarget.dataset.index
    var tasks = this.data.tasks
    var task = tasks[idx]
    var newChecked = !task.checked

    tasks[idx] = {
      id: task.id,
      name: task.name,
      description: task.description,
      benefit: task.benefit,
      targetMinutes: task.targetMinutes,
      targetSets: task.targetSets,
      checked: newChecked,
      actualMinutes: newChecked
        ? task.actualMinutes || String(task.targetMinutes)
        : "",
    }

    this.setData({ tasks: tasks })
    this.updateCheckState()
  },

  handleDurationInput: function (event) {
    var idx = event.currentTarget.dataset.index
    var tasks = this.data.tasks
    var newTasks = []
    for (var i = 0; i < tasks.length; i++) {
      if (i === idx) {
        newTasks.push({
          id: tasks[i].id,
          name: tasks[i].name,
          description: tasks[i].description,
          benefit: tasks[i].benefit,
          targetMinutes: tasks[i].targetMinutes,
          targetSets: tasks[i].targetSets,
          checked: tasks[i].checked,
          actualMinutes: event.detail.value,
        })
      } else {
        newTasks.push(tasks[i])
      }
    }
    this.setData({ tasks: newTasks })
  },

  handleSubmit: function () {
    var that = this
    var patientId = this.data.patientId
    var trainDate = this.data.trainDate
    var tasks = this.data.tasks
    var isSubmitting = this.data.isSubmitting

    if (isSubmitting) return

    var allChecked = true
    for (var i = 0; i < tasks.length; i++) {
      if (!tasks[i].checked) {
        allChecked = false
        break
      }
    }
    if (!allChecked) {
      wx.showToast({
        title: "请先完成所有训练任务",
        icon: "none",
        duration: 1800,
      })
      return
    }

    var totalDuration = 0
    var noteParts = []
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].checked) {
        totalDuration += Number(tasks[i].actualMinutes) || 0
        noteParts.push(tasks[i].name + (tasks[i].actualMinutes || tasks[i].targetMinutes) + "分钟")
      }
    }

    if (totalDuration <= 0) {
      wx.showToast({
        title: "请输入有效训练时长",
        icon: "none",
        duration: 1800,
      })
      return
    }

    // 校验每个勾选任务的实际时长 >= 1
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].checked) {
        var mins = Number(tasks[i].actualMinutes) || 0
        if (mins < 1) {
          wx.showToast({
            title: tasks[i].name + " 的时长不能少于1分钟",
            icon: "none",
            duration: 2000,
          })
          return
        }
        if (mins > 300) {
          wx.showToast({
            title: tasks[i].name + " 的时长不能超过300分钟",
            icon: "none",
            duration: 2000,
          })
          return
        }
      }
    }

    var totalSets = 0
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].checked) {
        totalSets += Number(tasks[i].targetSets) || 0
      }
    }
    var autoNote = "完成: " + noteParts.join(" / ")

    this.setData({ isSubmitting: true })

    auth.request({
      url: auth.API_BASE + "/training-logs",
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      data: {
        patient_id: patientId,
        train_date: trainDate,
        duration_minutes: totalDuration,
        sets_count: totalSets,
        note: autoNote,
      },
      success: function (response) {
        var respData = response.data
        if (response.statusCode !== 200 || !respData || respData.code !== 200) {
          wx.showToast({
            title: (respData && respData.message) || "训练记录提交失败",
            icon: "none",
            duration: 2000,
          })
          return
        }

        that.setData({
          hasSubmittedToday: true,
          todaySummaryText: "今天已记录 " + totalDuration + " 分钟 · " + totalSets + " 组",
          showSuccessFeedback: true,
        })

        setTimeout(function () {
          that.setData({ showSuccessFeedback: false })
          wx.switchTab({
            url: "/pages/home/index",
          })
        }, 1500)
      },
      fail: function () {
        wx.showToast({
          title: "无法连接后端服务",
          icon: "none",
          duration: 2000,
        })
      },
      complete: function () {
        that.setData({ isSubmitting: false })
      },
    })
  },
})
