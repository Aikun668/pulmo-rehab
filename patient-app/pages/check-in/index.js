var auth = require("../../utils/auth.js")

// ===== 按等级的默认训练方案（AI 处方不可用时的降级方案） =====
var LEVEL_DEFAULT_EXERCISES = {
  1: [
    {
      name: "腹式呼吸训练",
      purpose: "增强膈肌力量，改善呼吸深度",
      duration: "每次5-10分钟",
      steps: ["仰卧或坐位，放松全身", "一手放胸前，一手放腹部", "用鼻缓慢吸气，腹部隆起", "用口缓慢呼气，腹部下陷"],
      precautions: ["动作缓慢柔和", "如感头晕立即停止"],
    },
    {
      name: "被动活动训练",
      purpose: "维持关节活动度，预防僵硬",
      duration: "每次5分钟",
      steps: ["家属协助活动四肢关节", "动作轻柔，避免疼痛"],
      precautions: ["避免剧烈活动"],
    },
  ],
  2: [
    {
      name: "缩唇呼吸训练",
      purpose: "改善呼吸效率，延长呼气时间",
      duration: "每次10分钟，每日3次",
      steps: ["鼻吸气4秒", "缩唇缓慢呼气6秒", "自然停顿2秒"],
      precautions: ["不要用力呼气", "如感头晕请停止"],
    },
    {
      name: "床边坐立训练",
      purpose: "增强体力，提高活动耐力",
      duration: "每次10-15分钟",
      steps: ["床边坐起，双脚着地", "保持坐姿5分钟", "逐步延长坐立时间"],
      precautions: ["如有头晕立即躺下"],
    },
  ],
  3: [
    {
      name: "深吸气训练",
      purpose: "增加肺活量，改善通气功能",
      duration: "每次10分钟",
      steps: ["经鼻深吸气4秒", "屏气2秒", "缩唇缓慢呼气6秒"],
      precautions: ["呼气时间是吸气时间的2-3倍"],
    },
    {
      name: "呼吸节奏控制",
      purpose: "建立良好呼吸模式",
      duration: "每次10分钟",
      steps: ["正常呼吸节奏", "逐步延长呼气时间", "配合步行训练"],
      precautions: ["保持呼吸节律稳定"],
    },
    {
      name: "平地行走训练",
      purpose: "提升运动耐力",
      duration: "每次15-20分钟",
      steps: ["平地慢速行走", "维持轻度气短水平", "逐渐增加距离"],
      precautions: ["携带血氧仪监测"],
    },
  ],
  4: [
    {
      name: "呼吸耐力训练",
      purpose: "提升呼吸肌耐力",
      duration: "每次15分钟",
      steps: ["深吸气5秒", "屏气3秒", "缩唇呼气7秒", "重复10次为一组"],
      precautions: ["训练后充分休息"],
    },
    {
      name: "步行耐力训练",
      purpose: "提高有氧运动能力",
      duration: "每次20-30分钟",
      steps: ["中等速度步行", "可适当增加坡度", "监测心率不超过120"],
      precautions: ["注意运动强度"],
    },
    {
      name: "上肢力量训练",
      purpose: "增强上肢肌力，辅助呼吸",
      duration: "每次10分钟",
      steps: ["持轻物做肩关节活动", "配合呼吸节奏", "逐步增加重量"],
      precautions: ["避免屏气动作"],
    },
  ],
  5: [
    {
      name: "综合肺功能训练",
      purpose: "全面提升呼吸功能",
      duration: "每次20分钟",
      steps: ["深吸气5秒", "屏气3秒", "用力快速呼气", "配合全身运动"],
      precautions: ["如有不适当即停止"],
    },
    {
      name: "有氧运动训练",
      purpose: "提升心肺耐力",
      duration: "每次30分钟",
      steps: ["快步走或慢跑", "心率控制在目标范围", "循序渐进增加强度"],
      precautions: ["注意运动后恢复"],
    },
    {
      name: "呼吸肌力量训练",
      purpose: "增强呼吸肌力量",
      duration: "每次15分钟",
      steps: ["深呼吸练习", "阻抗呼吸训练", "呼吸肌拉伸"],
      precautions: ["避免过度疲劳"],
    },
  ],
}

// ===== 按等级的呼吸计时器节拍配置 =====
var LEVEL_BREATH_CONFIG = {
  1: {
    phases: [
      { key: "inhale", label: "吸气", duration: 3 },
      { key: "hold", label: "屏气", duration: 1 },
      { key: "exhale", label: "呼气", duration: 5 },
    ],
    rounds: 5,
  },
  2: {
    phases: [
      { key: "inhale", label: "吸气", duration: 4 },
      { key: "hold", label: "屏气", duration: 2 },
      { key: "exhale", label: "呼气", duration: 6 },
    ],
    rounds: 5,
  },
  3: {
    phases: [
      { key: "inhale", label: "吸气", duration: 4 },
      { key: "hold", label: "屏气", duration: 2 },
      { key: "exhale", label: "呼气", duration: 6 },
    ],
    rounds: 8,
  },
  4: {
    phases: [
      { key: "inhale", label: "吸气", duration: 5 },
      { key: "hold", label: "屏气", duration: 3 },
      { key: "exhale", label: "呼气", duration: 7 },
    ],
    rounds: 8,
  },
  5: {
    phases: [
      { key: "inhale", label: "吸气", duration: 5 },
      { key: "hold", label: "屏气", duration: 3 },
      { key: "exhale", label: "呼气", duration: 8 },
    ],
    rounds: 10,
  },
}

var DEFAULT_BREATH_CONFIG = LEVEL_BREATH_CONFIG[3]

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

var formatToday = function () {
  var date = new Date()
  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

// 从时长描述中解析目标分钟数
function parseDurationMinutes(durationStr) {
  if (!durationStr) return 10
  var match = durationStr.match(/(\d+)/)
  if (match) return parseInt(match[1], 10)
  return 10
}

Page({
  data: {
    patientId: 0,
    trainDate: "",
    // 康复等级
    rehabLevel: 0,
    rehabLevelName: "",
    rehabLevelColor: "#eab308",
    // 处方
    prescriptionTitle: "",
    prescriptionSource: "", // "ai" | "default"
    isLoadingPrescription: false,
    // 任务
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
    breathTotalRounds: 8,
    breathCircleScale: 1,
    breathCompleted: false,
    breathElapsedSeconds: 0,
    breathTotalMinutes: 1,
    // 训练前自评
    showAssessment: false,
    assessmentDyspnea: 1,
    assessmentFatigue: 3,
    assessmentHeartRate: "",
    assessmentSpo2: "",
    assessmentNotes: "",
    isSubmittingAssessment: false,
    hasAssessedToday: false,
    // 安全预警
    showWarningAlert: false,
    warningMessage: "",
    hasActiveWarning: false,
  },

  _breathTimer: null,
  _breathConfig: null,

  onLoad: function () {
    this.setData({
      trainDate: formatToday(),
      tasks: [],
      allChecked: false,
      hasSubmittedToday: false,
      todaySummaryText: "正在加载训练方案...",
    })
  },

  onShow: function () {
    var patientId = auth.getPatientId()
    this.setData({ patientId: patientId })
    this.loadRehabLevel(patientId)
    this._checkActiveWarning()
  },

  // ===== 训练前安全拦截：检查未解决预警 =====

  _checkActiveWarning: function () {
    var that = this
    var patientId = this.data.patientId
    if (!patientId) return

    auth.request({
      url: auth.API_BASE + "/warnings/latest-unresolved",
      method: "GET",
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data) &&
          respData.data.length > 0
        ) {
          var warning = respData.data[0]
          var warningMsg = that._buildWarningMessage(warning)
          if (warningMsg) {
            that.setData({
              hasActiveWarning: true,
              warningMessage: warningMsg,
              showWarningAlert: true,
            })
          }
        } else {
          that.setData({ hasActiveWarning: false, warningMessage: "" })
        }
      },
      fail: function () {},
    })
  },

  _buildWarningMessage: function (warning) {
    if (warning.warning_type === "heart_rate_high") {
      return "心率异常偏高（" + warning.metric_value + " bpm），建议暂停训练并休息"
    }
    if (warning.warning_type === "spo2_low") {
      return "血氧饱和度偏低（" + warning.metric_value + "%），建议立即休息并吸氧"
    }
    if (warning.warning_type === "fatigue_high") {
      return "疲劳评分过高（" + warning.metric_value + "/10），建议减少训练强度"
    }
    if (warning.warning_type === "dyspnea_severe") {
      return "呼吸困难评分过高（" + warning.metric_value + "/5），建议暂停训练"
    }
    return ""
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

  // ===== 加载康复等级 =====

  loadRehabLevel: function (patientId) {
    var that = this

    auth.request({
      url: auth.API_BASE + "/patients/" + patientId + "/rehab-level",
      method: "GET",
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data
        ) {
          var d = respData.data
          that.setData({
            rehabLevel: d.rehab_level,
            rehabLevelName: d.level_name,
            rehabLevelColor: LEVEL_COLORS[d.rehab_level] || "#eab308",
          })
          that._breathConfig =
            LEVEL_BREATH_CONFIG[d.rehab_level] || DEFAULT_BREATH_CONFIG
          that.loadPrescription(patientId, d.rehab_level)
        } else {
          that._useDefaultExercises(3)
          that.loadTodayLog()
        }
      },
      fail: function () {
        that._useDefaultExercises(3)
        that.loadTodayLog()
      },
    })
  },

  // ===== 加载处方（医生审核处方 → 缓存 → AI 生成 → 降级默认） =====

  loadPrescription: function (patientId, rehabLevel) {
    var that = this
    var trainDate = this.data.trainDate

    // 优先级1：查询医生已审核下发的 active 处方
    auth.request({
      url: auth.API_BASE + "/rehab-plans/active",
      method: "GET",
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data
        ) {
          var activePlan = respData.data
          var exercises = activePlan.exercises || []
          if (exercises.length > 0) {
            that.setData({
              prescriptionTitle: activePlan.title,
              prescriptionSource: "approved",
            })
            that._applyExercises(exercises)
            // 同时写入缓存供首页读取
            var cacheKey = "prescription_" + patientId + "_" + trainDate
            try {
              wx.setStorageSync(cacheKey, {
                title: activePlan.title,
                exercises: exercises,
                source: "approved",
                cachedAt: Date.now(),
              })
            } catch (e) { /* ignore */ }
            that.loadTodayLog()
            return
          }
        }
        // 无 active 处方，走缓存/AI/默认链
        that._loadPrescriptionFallback(patientId, rehabLevel)
      },
      fail: function () {
        that._loadPrescriptionFallback(patientId, rehabLevel)
      },
    })
  },

  _loadPrescriptionFallback: function (patientId, rehabLevel) {
    var that = this
    var trainDate = this.data.trainDate

    // 优先级2：检查今日缓存
    var cacheKey = "prescription_" + patientId + "_" + trainDate
    try {
      var cached = wx.getStorageSync(cacheKey)
      if (cached && cached.exercises && cached.exercises.length > 0) {
        that.setData({
          prescriptionTitle: cached.title,
          prescriptionSource: cached.source || "ai",
          isLoadingPrescription: false,
        })
        that._applyExercises(cached.exercises)
        that.loadTodayLog()
        return
      }
    } catch (e) {
      // 缓存读取失败，继续请求
    }

    // 优先级3：调用 AI 生成
    that.setData({ isLoadingPrescription: true })

    auth.request({
      url: auth.API_BASE + "/prescriptions/generate",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data
        ) {
          var prescriptionData = respData.data
          var exercises = prescriptionData.exercises || []

          if (exercises.length > 0) {
            // 缓存处方（仅当日有效）
            try {
              wx.setStorageSync(cacheKey, {
                title: prescriptionData.title,
                exercises: exercises,
                source: "ai",
                cachedAt: Date.now(),
              })
            } catch (e) {
              /* ignore */
            }

            that.setData({
              prescriptionTitle: prescriptionData.title,
              prescriptionSource: "ai",
            })
            that._applyExercises(exercises)
            return
          }
        }
        // AI 返回空或失败，降级到默认方案
        that._useDefaultExercises(rehabLevel)
      },
      fail: function () {
        that._useDefaultExercises(rehabLevel)
      },
      complete: function () {
        that.setData({ isLoadingPrescription: false })
        that.loadTodayLog()
      },
    })
  },

  // ===== 将处方 exercises 映射为页面任务 =====

  _applyExercises: function (exercises) {
    var tasks = []
    for (var i = 0; i < exercises.length; i++) {
      var ex = exercises[i]
      tasks.push({
        id: "exercise_" + i,
        name: ex.name || "训练动作",
        purpose: ex.purpose || "",
        duration: ex.duration || "",
        steps: Array.isArray(ex.steps) ? ex.steps : [],
        precautions: Array.isArray(ex.precautions) ? ex.precautions : [],
        checked: false,
        actualMinutes: "",
        targetMinutes: parseDurationMinutes(ex.duration),
        expanded: false,
      })
    }
    this.setData({ tasks: tasks, allChecked: false })
  },

  // ===== 降级：使用等级默认方案 =====

  _useDefaultExercises: function (rehabLevel) {
    var level = rehabLevel || 3
    var exercises = LEVEL_DEFAULT_EXERCISES[level] || LEVEL_DEFAULT_EXERCISES[3]
    this._breathConfig = LEVEL_BREATH_CONFIG[level] || DEFAULT_BREATH_CONFIG

    this.setData({
      rehabLevel: level,
      rehabLevelName: LEVEL_NAMES[level] || "中度恢复",
      rehabLevelColor: LEVEL_COLORS[level] || "#eab308",
      prescriptionTitle: "Level " + level + " " + (LEVEL_NAMES[level] || "中度恢复") + "训练方案",
      prescriptionSource: "default",
      isLoadingPrescription: false,
    })

    this._applyExercises(exercises)
  },

  // ===== 加载今日训练记录 =====

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

        // 已提交：标记所有任务完成
        var tasks = that.data.tasks.map(function (task) {
          return {
            id: task.id,
            name: task.name,
            purpose: task.purpose,
            duration: task.duration,
            steps: task.steps,
            precautions: task.precautions,
            checked: true,
            actualMinutes: String(task.targetMinutes),
            targetMinutes: task.targetMinutes,
            expanded: task.expanded,
          }
        })

        that.setData({
          tasks: tasks,
          allChecked: true,
          hasSubmittedToday: true,
          todaySummaryText:
            "今天已记录 " +
            todayLog.duration_minutes +
            " 分钟 · " +
            todayLog.sets_count +
            " 组",
        })
      },
      fail: function () {
        that.setData({
          todaySummaryText: "今天还没有提交训练记录",
        })
      },
    })
  },

  // ===== 任务展开/折叠 =====

  handleToggleExpand: function (event) {
    var idx = event.currentTarget.dataset.index
    var tasks = this.data.tasks
    tasks[idx].expanded = !tasks[idx].expanded
    this.setData({ tasks: tasks })
  },

  // ===== 呼吸计时器 =====

  handleOpenBreathTimer: function () {
    if (this.data.hasActiveWarning) {
      wx.showModal({
        title: "安全提醒",
        content: this.data.warningMessage + "\n\n建议暂停今日训练，待指标恢复后再继续。",
        confirmText: "知道了",
        showCancel: false,
      })
      return
    }

    var config = this._breathConfig || DEFAULT_BREATH_CONFIG
    this.setData({
      showBreathTimer: true,
      breathRunning: false,
      breathPhase: config.phases[0].key,
      breathCountdown: config.phases[0].duration,
      breathRound: 1,
      breathTotalRounds: config.rounds,
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
      var config = that._breathConfig || DEFAULT_BREATH_CONFIG
      var phases = config.phases
      var phase = that.data.breathPhase
      var countdown = that.data.breathCountdown
      var round = that.data.breathRound
      var elapsed = that.data.breathElapsedSeconds

      // 当前阶段继续倒计时
      if (countdown > 1) {
        var newCountdown = countdown - 1
        var currentPhaseDuration = 0
        for (var p = 0; p < phases.length; p++) {
          if (phases[p].key === phase) {
            currentPhaseDuration = phases[p].duration
            break
          }
        }
        var scale = that._calcCircleScale(
          phase,
          currentPhaseDuration,
          newCountdown,
        )
        that.setData({
          breathCountdown: newCountdown,
          breathCircleScale: scale,
          breathElapsedSeconds: elapsed + 1,
        })
        return
      }

      // 当前阶段结束，进入下一阶段
      var currentPhaseIndex = -1
      for (var i = 0; i < phases.length; i++) {
        if (phases[i].key === phase) {
          currentPhaseIndex = i
          break
        }
      }

      var nextPhaseIndex = currentPhaseIndex + 1

      if (nextPhaseIndex < phases.length) {
        var nextPhase = phases[nextPhaseIndex]
        var scale = that._calcCircleScale(
          nextPhase.key,
          nextPhase.duration,
          nextPhase.duration,
        )
        that.setData({
          breathPhase: nextPhase.key,
          breathCountdown: nextPhase.duration,
          breathCircleScale: scale,
          breathElapsedSeconds: elapsed + 1,
        })
      } else {
        // 一轮结束
        var totalRounds = config.rounds
        if (round < totalRounds) {
          var firstPhase = phases[0]
          var scale = that._calcCircleScale(
            firstPhase.key,
            firstPhase.duration,
            firstPhase.duration,
          )
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
          that._fillBreathingTaskDuration(totalMinutes)
        }
      }
    }, 1000)
  },

  handlePauseBreath: function () {
    this.clearBreathTimer()
    this.setData({ breathRunning: false })
  },

  handleResetBreath: function () {
    this.clearBreathTimer()
    var config = this._breathConfig || DEFAULT_BREATH_CONFIG
    this.setData({
      breathRunning: false,
      breathPhase: config.phases[0].key,
      breathCountdown: config.phases[0].duration,
      breathRound: 1,
      breathCompleted: false,
      breathCircleScale: 1,
      breathElapsedSeconds: 0,
    })
  },

  _calcCircleScale: function (phase, totalDuration, countdown) {
    if (phase === "inhale") {
      var progress = (totalDuration - countdown) / totalDuration
      return 1 + progress * 0.5
    } else if (phase === "hold") {
      return 1.5
    } else if (phase === "exhale") {
      var progress = (totalDuration - countdown) / totalDuration
      return 1.5 - progress * 0.5
    }
    return 1
  },

  _fillBreathingTaskDuration: function (minutes) {
    var tasks = this.data.tasks
    var filled = false
    var newTasks = []
    for (var i = 0; i < tasks.length; i++) {
      var t = tasks[i]
      if (
        !filled &&
        (t.name.indexOf("呼吸") >= 0 ||
          t.name.indexOf("缩唇") >= 0 ||
          t.name.indexOf("腹式") >= 0 ||
          t.name.indexOf("深吸") >= 0)
      ) {
        newTasks.push({
          id: t.id,
          name: t.name,
          purpose: t.purpose,
          duration: t.duration,
          steps: t.steps,
          precautions: t.precautions,
          checked: true,
          actualMinutes: String(minutes),
          targetMinutes: t.targetMinutes,
          expanded: t.expanded,
        })
        filled = true
      } else {
        newTasks.push(t)
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
      purpose: task.purpose,
      duration: task.duration,
      steps: task.steps,
      precautions: task.precautions,
      checked: newChecked,
      actualMinutes: newChecked
        ? task.actualMinutes || String(task.targetMinutes)
        : "",
      targetMinutes: task.targetMinutes,
      expanded: task.expanded,
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
          purpose: tasks[i].purpose,
          duration: tasks[i].duration,
          steps: tasks[i].steps,
          precautions: tasks[i].precautions,
          checked: tasks[i].checked,
          actualMinutes: event.detail.value,
          targetMinutes: tasks[i].targetMinutes,
          expanded: tasks[i].expanded,
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

    // 安全拦截：有未解决预警时不允许提交
    if (this.data.hasActiveWarning) {
      wx.showModal({
        title: "安全提醒",
        content: this.data.warningMessage + "\n\n建议暂停今日训练，待指标恢复后再继续。",
        confirmText: "知道了",
        showCancel: false,
      })
      return
    }

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
        noteParts.push(
          tasks[i].name + (tasks[i].actualMinutes || tasks[i].targetMinutes) + "分钟",
        )
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
        var mins = Number(tasks[i].actualMinutes) || 0
        // 每10分钟为1组，至少1组
        totalSets += mins > 0 ? Math.max(1, Math.round(mins / 10)) : 1
      }
    }
    var autoNote = "完成: " + noteParts.join(" / ")

    this.setData({ isSubmitting: true })

    auth.request({
      url: auth.API_BASE + "/training-logs",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: {
        patient_id: patientId,
        train_date: trainDate,
        duration_minutes: totalDuration,
        sets_count: totalSets,
        note: autoNote,
      },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode !== 200 ||
          !respData ||
          respData.code !== 200
        ) {
          wx.showToast({
            title:
              (respData && respData.message) || "训练记录提交失败",
            icon: "none",
            duration: 2000,
          })
          return
        }

        that.setData({
          hasSubmittedToday: true,
          todaySummaryText:
            "今天已记录 " +
            totalDuration +
            " 分钟 · " +
            totalSets +
            " 组",
          showSuccessFeedback: true,
        })

        setTimeout(function () {
          that.setData({ showSuccessFeedback: false })
          wx.switchTab({ url: "/pages/home/index" })
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

  // ===== 训练前自评 =====

  handleOpenAssessment: function () {
    this.setData({
      showAssessment: true,
      assessmentDyspnea: 1,
      assessmentFatigue: 3,
      assessmentHeartRate: "",
      assessmentSpo2: "",
      assessmentNotes: "",
    })
  },

  handleCloseAssessment: function () {
    this.setData({ showAssessment: false })
  },

  handleDyspneaChange: function (event) {
    this.setData({ assessmentDyspnea: Number(event.detail.value) + 1 })
  },

  handleFatigueChange: function (event) {
    this.setData({ assessmentFatigue: Number(event.detail.value) + 1 })
  },

  handleHeartRateInput: function (event) {
    this.setData({ assessmentHeartRate: event.detail.value })
  },

  handleSpo2Input: function (event) {
    this.setData({ assessmentSpo2: event.detail.value })
  },

  handleAssessmentNotesInput: function (event) {
    this.setData({ assessmentNotes: event.detail.value })
  },

  handleSubmitAssessment: function () {
    var that = this
    var patientId = this.data.patientId
    var dyspnea = this.data.assessmentDyspnea
    var fatigue = this.data.assessmentFatigue
    var heartRate = this.data.assessmentHeartRate
    var spo2 = this.data.assessmentSpo2
    var notes = this.data.assessmentNotes

    if (this.data.isSubmittingAssessment) return

    // 前端安全校验：心率/血氧范围
    if (heartRate) {
      var hr = Number(heartRate)
      if (hr < 40 || hr > 200 || isNaN(hr)) {
        wx.showToast({ title: "心率范围 40-200", icon: "none", duration: 1800 })
        return
      }
    }
    if (spo2) {
      var sp = Number(spo2)
      if (sp < 70 || sp > 100 || isNaN(sp)) {
        wx.showToast({ title: "血氧范围 70-100%", icon: "none", duration: 1800 })
        return
      }
    }

    this.setData({ isSubmittingAssessment: true })

    var postData = {
      patient_id: patientId,
      dyspnea_score: dyspnea,
      fatigue_score: fatigue,
    }
    if (heartRate) postData.heart_rate = Number(heartRate)
    if (spo2) postData.spo2 = Number(spo2)
    if (notes) postData.notes = notes

    auth.request({
      url: auth.API_BASE + "/assessments",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: postData,
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode !== 200 ||
          !respData ||
          respData.code !== 200
        ) {
          wx.showToast({
            title: (respData && respData.message) || "评估提交失败",
            icon: "none",
            duration: 2000,
          })
          return
        }

        // 评估成功 → 检查是否有安全预警
        that.setData({
          showAssessment: false,
          hasAssessedToday: true,
        })

        // 提交评估后重新加载等级（可能已变化）
        that.loadRehabLevel(patientId)

        // 检查预警
        that._checkWarningsAfterAssessment()

        wx.showToast({ title: "评估已记录", icon: "success", duration: 1200 })
      },
      fail: function () {
        wx.showToast({
          title: "无法连接后端服务",
          icon: "none",
          duration: 2000,
        })
      },
      complete: function () {
        that.setData({ isSubmittingAssessment: false })
      },
    })
  },

  // ===== 评估后检查预警 =====

  _checkWarningsAfterAssessment: function () {
    var that = this
    var patientId = this.data.patientId

    auth.request({
      url: auth.API_BASE + "/warnings/latest-unresolved",
      method: "GET",
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data) &&
          respData.data.length > 0
        ) {
          var warning = respData.data[0]
          var warningMsg = that._buildWarningMessage(warning)

          if (warningMsg) {
            that.setData({
              hasActiveWarning: true,
              showWarningAlert: true,
              warningMessage: warningMsg,
            })
          }
        } else {
          that.setData({ hasActiveWarning: false })
        }
      },
      fail: function () {
        // 预警检查失败不影响主流程
      },
    })
  },

  handleWarningAlertClose: function () {
    this.setData({ showWarningAlert: false, warningMessage: "" })
  },
})
