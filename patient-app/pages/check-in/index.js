var auth = require("../../utils/auth.js")
var rehabConfig = require("../../utils/rehab-config.js")

var LEVEL_NAMES = rehabConfig.LEVEL_NAMES
var LEVEL_COLORS = rehabConfig.LEVEL_COLORS
var LEVEL_DEFAULT_EXERCISES = rehabConfig.LEVEL_DEFAULT_EXERCISES
var LEVEL_BREATH_CONFIG = rehabConfig.LEVEL_BREATH_CONFIG
var DEFAULT_BREATH_CONFIG = rehabConfig.DEFAULT_BREATH_CONFIG
var formatToday = rehabConfig.formatToday
var parseDurationMinutes = rehabConfig.parseDurationMinutes

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
    checkedCount: 0,
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
    // 今日训练时长（大数字展示）
    todayTrainingMinutes: 0,
    // 迷你4天柱状图数据
    recent4Days: [],
    // 最近一周弹窗
    showWeeklyModal: false,
    weekly7Days: [],
    // 头像姓氏
    avatarSurname: "赵",
  },

  _breathTimer: null,
  _breathConfig: null,
  _breathCanvas: null,
  _breathCtx: null,
  _breathCanvasWidth: 0,
  _breathCanvasHeight: 0,
  _breathAnimFrameId: null,
  _breathCurrentRadius: 0,
  _initialLoadDone: false,

  onLoad: function () {
    var patientId = auth.getPatientId()
    this.setData({
      patientId: patientId,
      trainDate: formatToday(),
      tasks: [],
      allChecked: false,
      hasSubmittedToday: false,
      todaySummaryText: "正在加载训练方案...",
    })
    // 首次进入：全量加载
    this.loadRehabLevel(patientId)
    this._checkActiveWarning()
    this._initMockChartData()
  },

  onShow: function () {
    // 自定义 tabBar：设置选中状态（打卡tab = index 1）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 1 })
    }

    // 非首次进入：读取训练方案页的训练进度 + 轻量刷新
    if (this._initialLoadDone) {
      this._syncPlanTrainingProgress()
      this.loadTodayLog()
      this._checkActiveWarning()
      return
    }

    // 首次 onShow（onLoad 已发起全量加载，标记已完成）
    this._initialLoadDone = true
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

  // ===== 模拟数据：今日时长 + 4天迷你柱 + 7天弹窗 =====

  _initMockChartData: function () {
    var now = new Date()
    // 模拟最近7天训练分钟数（含今天）
    var weekMinutes = [15, 0, 22, 18, 30, 12, 12]
    var dayNames = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"]

    // 计算最近7天的日期标签
    var weekly7Days = []
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 24 * 3600 * 1000)
      var dayIndex = d.getDay()
      // getDay: 0=周日, 1=周一...
      var label = dayNames[dayIndex === 0 ? 6 : dayIndex - 1]
      var isToday = (i === 0)
      weekly7Days.push({
        dayLabel: label,
        minutes: weekMinutes[6 - i],
        widthPercent: Math.max(4, (weekMinutes[6 - i] / 30) * 100),
        isToday: isToday,
      })
    }

    // 最近4天迷你柱（含今天，只取后4个）
    var recent4 = weekly7Days.slice(3, 7)
    var maxMin4 = 0
    for (var j = 0; j < recent4.length; j++) {
      if (recent4[j].minutes > maxMin4) maxMin4 = recent4[j].minutes
    }
    var recent4Days = []
    for (var j = 0; j < recent4.length; j++) {
      var pct = maxMin4 > 0 ? Math.max(8, (recent4[j].minutes / maxMin4) * 100) : 8
      recent4Days.push({
        heightPercent: pct,
        isToday: recent4[j].isToday,
        minutes: recent4[j].minutes,
      })
    }

    // 今日时长 = 模拟数据中今天的值
    var todayMinutes = weekMinutes[6] // 今天是数组最后一个

    this.setData({
      todayTrainingMinutes: todayMinutes,
      recent4Days: recent4Days,
      weekly7Days: weekly7Days,
    })
  },

  handleOpenWeekly: function () {
    this.setData({ showWeeklyModal: true })
  },

  handleCloseWeekly: function () {
    this.setData({ showWeeklyModal: false })
  },

  onUnload: function () {
    this.clearBreathTimer()
    this._stopBreathAnim()
  },

  onHide: function () {
    this.clearBreathTimer()
    this._stopBreathAnim()
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
          todayTrainingMinutes: todayLog.duration_minutes,
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

    var that = this
    var config = this._breathConfig || DEFAULT_BREATH_CONFIG
    this.setData({
      showBreathTimer: true,
      breathRunning: false,
      breathPhase: config.phases[0].key,
      breathCountdown: config.phases[0].duration,
      breathRound: 1,
      breathTotalRounds: config.rounds,
      breathCompleted: false,
      breathElapsedSeconds: 0,
    }, function () {
      that._initBreathCanvas(function () {
        that._breathCurrentRadius = that._breathCanvasWidth * 0.30
        that.drawBreathCircle()
      })
    })
  },

  handleCloseBreathTimer: function () {
    this.clearBreathTimer()
    this._stopBreathAnim()
    this.setData({ showBreathTimer: false })
  },

  handleStartBreath: function () {
    var that = this
    this.clearBreathTimer()
    this.setData({ breathRunning: true })
    this._startBreathAnim()

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
        that.setData({
          breathCountdown: newCountdown,
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
        that.setData({
          breathPhase: nextPhase.key,
          breathCountdown: nextPhase.duration,
          breathElapsedSeconds: elapsed + 1,
        })
      } else {
        // 一轮结束
        var totalRounds = config.rounds
        if (round < totalRounds) {
          var firstPhase = phases[0]
          that.setData({
            breathRound: round + 1,
            breathPhase: firstPhase.key,
            breathCountdown: firstPhase.duration,
            breathElapsedSeconds: elapsed + 1,
          })
        } else {
          // 全部完成
          that._stopBreathAnim()
          that.clearBreathTimer()
          var totalMinutes = Math.ceil((elapsed + 1) / 60)
          that.setData({
            breathRunning: false,
            breathCompleted: true,
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
    this._stopBreathAnim()
    this.setData({ breathRunning: false })
    this.drawBreathCircle()
  },

  handleResetBreath: function () {
    this.clearBreathTimer()
    this._stopBreathAnim()
    var that = this
    var config = this._breathConfig || DEFAULT_BREATH_CONFIG
    this.setData({
      breathRunning: false,
      breathPhase: config.phases[0].key,
      breathCountdown: config.phases[0].duration,
      breathRound: 1,
      breathCompleted: false,
      breathElapsedSeconds: 0,
    }, function () {
      that._breathCurrentRadius = that._breathCanvasWidth * 0.30
      that.drawBreathCircle()
    })
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

  // ===== Canvas 呼吸动画 =====

  _initBreathCanvas: function (onReady) {
    var that = this
    var query = wx.createSelectorQuery().in(this)
    query
      .select(".breath-canvas")
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var dpr = wx.getWindowInfo().pixelRatio
        canvas.width = res[0].width * dpr
        canvas.height = res[0].height * dpr
        var ctx = canvas.getContext("2d")
        ctx.scale(dpr, dpr)
        that._breathCanvas = canvas
        that._breathCtx = ctx
        that._breathCanvasWidth = res[0].width
        that._breathCanvasHeight = res[0].height
        if (onReady) onReady()
      })
  },

  drawBreathCircle: function () {
    if (!this._breathCtx) return
    var ctx = this._breathCtx
    var w = this._breathCanvasWidth
    var h = this._breathCanvasHeight
    var phase = this.data.breathPhase
    var countdown = this.data.breathCountdown

    var config = this._breathConfig || DEFAULT_BREATH_CONFIG
    var currentPhaseDuration = 0
    for (var i = 0; i < config.phases.length; i++) {
      if (config.phases[i].key === phase) {
        currentPhaseDuration = config.phases[i].duration
        break
      }
    }

    var progress = currentPhaseDuration > 0
      ? (currentPhaseDuration - countdown) / currentPhaseDuration
      : 0

    var minR = w * 0.30
    var maxR = w * 0.45
    var radius
    if (phase === "inhale") {
      radius = minR + progress * (maxR - minR)
    } else if (phase === "hold") {
      radius = maxR
    } else if (phase === "exhale") {
      radius = maxR - progress * (maxR - minR)
    } else {
      radius = minR
    }

    this._drawBreathCircleFrame(radius, phase)
  },

  _startBreathAnim: function () {
    if (!this._breathCanvas) return
    var that = this
    var canvas = this._breathCanvas

    function frame() {
      if (!that._breathCtx) return

      var phase = that.data.breathPhase
      var countdown = that.data.breathCountdown
      var config = that._breathConfig || DEFAULT_BREATH_CONFIG

      var currentPhaseDuration = 0
      for (var p = 0; p < config.phases.length; p++) {
        if (config.phases[p].key === phase) {
          currentPhaseDuration = config.phases[p].duration
          break
        }
      }

      var progress = currentPhaseDuration > 0
        ? (currentPhaseDuration - countdown) / currentPhaseDuration
        : 0

      var w = that._breathCanvasWidth
      var minR = w * 0.30
      var maxR = w * 0.45
      var targetR
      if (phase === "inhale") {
        targetR = minR + progress * (maxR - minR)
      } else if (phase === "hold") {
        targetR = maxR
      } else if (phase === "exhale") {
        targetR = maxR - progress * (maxR - minR)
      } else {
        targetR = minR
      }

      var current = that._breathCurrentRadius || targetR
      current += (targetR - current) * 0.12
      that._breathCurrentRadius = current

      that._drawBreathCircleFrame(current, phase)
      that._breathAnimFrameId = canvas.requestAnimationFrame(frame)
    }

    this._breathAnimFrameId = canvas.requestAnimationFrame(frame)
  },

  _stopBreathAnim: function () {
    if (this._breathAnimFrameId && this._breathCanvas) {
      this._breathCanvas.cancelAnimationFrame(this._breathAnimFrameId)
      this._breathAnimFrameId = null
    }
  },

  _drawBreathCircleFrame: function (radius, phase) {
    var ctx = this._breathCtx
    var w = this._breathCanvasWidth
    var h = this._breathCanvasHeight
    var countdown = this.data.breathCountdown

    var ringColor, fillColor
    if (phase === "hold") {
      ringColor = "#60a5fa"
      fillColor = "#dbeafe"
    } else {
      ringColor = "#4ade80"
      fillColor = "#dcfce7"
    }

    var centerX = w / 2
    var centerY = h / 2

    ctx.clearRect(0, 0, w, h)

    // 外层光晕
    ctx.save()
    ctx.shadowColor = ringColor
    ctx.shadowBlur = 20
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.fillStyle = fillColor
    ctx.fill()
    ctx.restore()

    // 描边
    ctx.beginPath()
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2)
    ctx.strokeStyle = ringColor
    ctx.lineWidth = Math.max(2, w * 0.02)
    ctx.stroke()

    // 内层亮色（增添立体感）
    var innerR = radius * 0.78
    ctx.beginPath()
    ctx.arc(centerX, centerY, innerR, 0, Math.PI * 2)
    ctx.fillStyle = "#ffffff"
    ctx.globalAlpha = 0.25
    ctx.fill()
    ctx.globalAlpha = 1

    // ---- 在 Canvas 上绘制倒计时数字 ----
    var phaseLabels = { inhale: "吸气", hold: "屏气", exhale: "呼气" }
    var label = phaseLabels[phase] || ""

    // 大倒计时数字
    ctx.save()
    ctx.font = "800 " + Math.round(w * 0.24) + "px sans-serif"
    ctx.fillStyle = "#4CAF50"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(String(countdown), centerX, centerY - w * 0.04)
    ctx.restore()

    // 阶段标签（吸气/屏气/呼气）
    ctx.save()
    ctx.font = "700 " + Math.round(w * 0.07) + "px sans-serif"
    ctx.fillStyle = "#5b6b7a"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"
    ctx.fillText(label, centerX, centerY + w * 0.12)
    ctx.restore()
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

  // ===== 今日训练任务 =====

  handleGoTasks: function () {
    wx.navigateTo({ url: "/pages/plan-detail/index" })
  },

  // ===== 数据闭环：读取训练方案页的训练进度 =====

  // 方案页 exercise id → 打卡页任务名称对照表
  _EXERCISE_NAME_MAP: {
    "breathing": "缩唇腹式呼吸",
    "walking": "平地行走",
    "cough": "有效咳嗽排痰",
  },

  _syncPlanTrainingProgress: function () {
    var exerciseProgress = wx.getStorageSync("exerciseProgress") || {}
    var tasks = this.data.tasks

    // 没有任务就不同步
    if (!tasks || tasks.length === 0) return

    // 逐项匹配：方案页 exercise id 的名称 → 打卡页 task name
    var nameMap = this._EXERCISE_NAME_MAP
    var guideIds = ["breathing", "walking", "cough"]
    var anyChanged = false

    for (var g = 0; g < guideIds.length; g++) {
      var gid = guideIds[g]
      var prog = exerciseProgress[gid]
      if (!prog) continue

      var exerciseName = nameMap[gid]
      var completedSets = prog.completedSets || 0
      var elapsedSeconds = prog.elapsedSeconds || 0
      // 计算训练时长，但每项最多 45 分钟（防跨天累积导致天文数字）
      var elapsedMin = Math.min(Math.round(elapsedSeconds / 60), 45)

      // 在打卡页 tasks 里找同名的任务
      for (var t = 0; t < tasks.length; t++) {
        if (tasks[t].name === exerciseName) {
          // 如果方案页已完成至少1组，打卡页对应任务也标为已完成
          if (completedSets >= 1 && !tasks[t].checked) {
            tasks[t].checked = true
            tasks[t].actualMinutes = String(elapsedMin || tasks[t].targetMinutes)
            anyChanged = true
          }
          // 如果方案页有计时数据但没完成组数，也把时长填进去（但 cap 到 45）
          if (elapsedMin > 0 && !tasks[t].actualMinutes) {
            tasks[t].actualMinutes = String(elapsedMin)
            anyChanged = true
          }
          break
        }
      }
    }

    if (anyChanged) {
      this.setData({ tasks: tasks })
      this.updateCheckState()
    }

    // 更新总训练时长：从 tasks 的 actualMinutes 累加（不再用 planTrainingMinutes，防跨天累积）
    var todayMin = 0
    for (var t = 0; t < tasks.length; t++) {
      if (tasks[t].checked && tasks[t].actualMinutes) {
        todayMin += Number(tasks[t].actualMinutes) || 0
      }
    }
    if (todayMin > 0) {
      this.setData({ todayTrainingMinutes: todayMin })
    }
  },

  // 更新勾选状态汇总：遍历 tasks → 计算 checkedCount + allChecked
  updateCheckState: function () {
    var tasks = this.data.tasks
    var checkedCount = 0
    for (var i = 0; i < tasks.length; i++) {
      if (tasks[i].checked) checkedCount++
    }
    this.setData({
      checkedCount: checkedCount,
      allChecked: checkedCount === tasks.length && tasks.length > 0,
    })
  },
})
