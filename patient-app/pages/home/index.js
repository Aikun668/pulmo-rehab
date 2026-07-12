var auth = require("../../utils/auth.js")
var rehabConfig = require("../../utils/rehab-config.js")

var LEVEL_NAMES = rehabConfig.LEVEL_NAMES
var LEVEL_COLORS = rehabConfig.LEVEL_COLORS
var LEVEL_ADVICE = rehabConfig.LEVEL_ADVICE

function truncateText(value, maxLength) {
  if (!value) return ""
  return value.length > maxLength ? value.slice(0, maxLength) + "..." : value
}

var formatToday = rehabConfig.formatToday

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
  var remaining = Math.max(0, target - safeDuration)

  return {
    todayDurationMinutes: safeDuration,
    targetDurationMinutes: target,
    remainingMinutes: remaining,
    progressPercent: progressPercent,
    progressCurrent: safeDuration,
    progressTarget: target,
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
    contentTopPadding: 0,
    headerRightPad: 0,
    avatarSurname: "赵",
    greetingText: "赵先生，晚上好",
    todayStatusLabel: "今日尚未打卡",
    progressPercent: 60,
    progressCurrent: 12,
    progressTarget: 35,
    progressSummaryText: "12/35",
    todayDurationMinutes: 12,
    targetDurationMinutes: 35,
    remainingMinutes: 23,
    streakDays: 0,
    // 康复等级
    rehabLevel: 0,
    rehabLevelName: "",
    rehabLevelColor: "#eab308",
    // 今日任务速览（从处方动态生成）
    todayTasks: [],
    // 康复指导
    aiTip: "正在同步康复指导，请稍候。",
    aiTipUpdatedAt: "请稍候",
    // 今日训练建议
    todayAdvice: "",
    // ===== 快捷入口列表副标题 =====
    progress30dSummary: "近30天完成率 67%",
    adviceSummary: "Level 3 · 中度恢复阶段",
    aiSummarySubtitle: "查看医生下发的康复建议与训练方案",
    // ===== 分项进度指标 =====
    metricsItems: [
      { label: "训练时长", value: "12", unit: "min", target: "35", percent: 34, color: "#2A6BFF" },
      { label: "训练组数", value: "3", unit: "组", target: "6", percent: 50, color: "#F59E0B" },
      { label: "血氧SpO₂", value: "96", unit: "%", target: "100", percent: 96, color: "#16a34a" },
    ],
    // ===== 日期选择组件 =====
    weekDays: [],
    selectedDateIndex: 0,
    selectedDateStr: "",
    todayDateLabel: "",
    hasUnreadMessage: true,
    showCalendar: false,
    calendarYear: 2026,
    calendarMonth: 7,
    calendarDays: [],
    calendarSelectedDate: "",
  },

  onLoad: function () {
    // 利用系统胶囊按钮位置，让铃铛与微信胶囊按钮同行
    var sysInfo = wx.getWindowInfo() || wx.getSystemInfoSync()
    var menuButton = wx.getMenuButtonBoundingClientRect()
    var statusBarH = sysInfo.statusBarHeight || 20
    var screenWidth = sysInfo.screenWidth || 375

    // 与微信胶囊按钮中心对齐，再往上微调4px
    var contentTopPadding = (menuButton.top || (statusBarH + 6)) - 4
    // 兜底：不能小于状态栏高度
    if (contentTopPadding < statusBarH) {
      contentTopPadding = statusBarH + 6
    }

    // 右侧预留空间：避免铃铛与系统胶囊重叠
    var capsuleLeft = menuButton.left || (screenWidth - 100)
    var headerRightPad = screenWidth - capsuleLeft + 10

    this.setData({
      contentTopPadding: contentTopPadding,
      headerRightPad: headerRightPad,
    })
  },

  onReady: function () {
    this.drawProgressRing()
  },

  onShow: function () {
    // 自定义 tabBar：设置选中状态
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 0 })
    }

    var userName = auth.getUserName()
    if (!userName || userName === "用户") {
      userName = "赵六"
    }
    var greeting = getGreeting()
    // 取姓氏：名字第一个字
    var surname = userName.charAt(0) || "赵"
    // 胶囊内问候文案："张先生，早上好"
    var greetingText = surname + "先生，" + greeting
    // 今日日期标签：如"7月8日"
    var now = new Date()
    var todayDateLabel = (now.getMonth() + 1) + "月" + now.getDate() + "日"
    this.setData({
      patientId: auth.getPatientId(),
      patientName: greeting + "，" + userName,
      avatarSurname: surname,
      greetingText: greetingText,
      todayDateLabel: todayDateLabel,
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
    this.generateWeekDays()
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
            adviceSummary: "Level " + d.rehab_level + " · " + (LEVEL_NAMES[d.rehab_level] || "中度恢复"),
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
        var backendMinutes = todayLog ? todayLog.duration_minutes : 0
        var backendSets = todayLog ? todayLog.sets_count : 0

        // 同时读取本地 Storage 的训练进度（方案页计时数据）
        var localMinutes = that._calcLocalTrainingMinutes()
        // 取后端与本地最大值，确保圆环始终显示最新进度
        var displayMinutes = Math.max(backendMinutes, localMinutes)

        var localSets = that._calcLocalTrainingSets()
        var displaySets = Math.max(backendSets, localSets)
        // 无真实数据时用Mock兜底，避免进度条/环形全空
        var mockMinutes = 12
        var mockSets = 3
        var finalMinutes = displayMinutes > 0 ? displayMinutes : mockMinutes
        var finalSets = displaySets > 0 ? displaySets : mockSets

        var targetDuration = that.data.targetDurationMinutes
        var nextState = buildTodayProgressState(finalMinutes, targetDuration)

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

        // 更新分项进度指标（训练时长/组数动态更新）
        var metricsItems = that.data.metricsItems
        metricsItems[0] = {
          label: "训练时长",
          value: String(finalMinutes),
          unit: "min",
          target: String(targetDuration),
          percent: Math.min(100, Math.round((finalMinutes / targetDuration) * 100)),
          color: "#2A6BFF",
        }
        metricsItems[1] = {
          label: "训练组数",
          value: String(finalSets),
          unit: "组",
          target: String(that.data.todayTasks.length * 2 || 5),
          percent: Math.min(100, Math.round((finalSets / (that.data.todayTasks.length * 2 || 5)) * 100)),
          color: "#F59E0B",
        }
        nextState.metricsItems = metricsItems

        that.setData(nextState, function () {
          that.drawProgressRing()
        })
      },
      fail: function () {
        // 后端失败时，仍从本地 Storage 读取进度（确保圆环不空白）
        var localMinutes = that._calcLocalTrainingMinutes()
        var localSets = that._calcLocalTrainingSets()
        // 无真实数据时用Mock兜底
        var mockMinutes = 12
        var mockSets = 3
        var finalMinutes = localMinutes > 0 ? localMinutes : mockMinutes
        var finalSets = localSets > 0 ? localSets : mockSets
        var targetDuration = that.data.targetDurationMinutes
        var nextState = buildTodayProgressState(finalMinutes, targetDuration)
        var metricsItems = that.data.metricsItems
        metricsItems[0] = {
          label: "训练时长",
          value: String(finalMinutes),
          unit: "min",
          target: String(targetDuration),
          percent: Math.min(100, Math.round((finalMinutes / targetDuration) * 100)),
          color: "#2A6BFF",
        }
        metricsItems[1] = {
          label: "训练组数",
          value: String(finalSets),
          unit: "组",
          target: "5",
          percent: Math.min(100, Math.round((finalSets / 5) * 100)),
          color: "#F59E0B",
        }
        nextState.metricsItems = metricsItems
        that.setData(nextState, function () {
          that.drawProgressRing()
        })
      },
    })
  },

  // 从本地 Storage 计算训练时长（方案页计时数据）
  _calcLocalTrainingMinutes: function () {
    var savedDate = wx.getStorageSync("exerciseProgressDate") || ""
    var todayStr = this._formatToday ? this._formatToday() : formatToday()
    // 只取今天的数据
    if (savedDate !== todayStr) return 0

    var exerciseProgress = wx.getStorageSync("exerciseProgress") || {}
    var totalMin = 0
    var guideIds = ["breathing", "walking", "cough"]
    for (var i = 0; i < guideIds.length; i++) {
      var prog = exerciseProgress[guideIds[i]]
      if (prog && prog.elapsedSeconds) {
        // 每项最多 45 分钟（防脏数据）
        totalMin += Math.min(Math.round(prog.elapsedSeconds / 60), 45)
      }
    }
    return totalMin
  },

  // 从本地 Storage 计算训练组数
  _calcLocalTrainingSets: function () {
    var savedDate = wx.getStorageSync("exerciseProgressDate") || ""
    var todayStr = this._formatToday ? this._formatToday() : formatToday()
    if (savedDate !== todayStr) return 0

    var exerciseProgress = wx.getStorageSync("exerciseProgress") || {}
    var totalSets = 0
    var guideIds = ["breathing", "walking", "cough"]
    for (var i = 0; i < guideIds.length; i++) {
      var prog = exerciseProgress[guideIds[i]]
      if (prog && prog.completedSets) {
        totalSets += prog.completedSets
      }
    }
    return totalSets
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
    var exercises = rehabConfig.LEVEL_DEFAULT_EXERCISES[level] || rehabConfig.LEVEL_DEFAULT_EXERCISES[3]

    var tasks = exercises.map(function (ex, i) {
      var mins = rehabConfig.parseDurationMinutes(ex.duration)
      return { id: "task_" + i, name: ex.name, target: mins + "分钟", done: false }
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
        // 计算30天完成率
        var completedDays = 0
        for (var i = 0; i < days.length; i++) {
          if (days[i].duration_minutes > 0) completedDays++
        }
        var rate = days.length > 0 ? Math.round((completedDays / days.length) * 100) : 0
        var summary = "近30天完成率 " + rate + "%"
        if (streak > 0) summary += "，连续打卡 " + streak + " 天"
        that.setData({ streakDays: streak, progress30dSummary: summary })
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
            aiTip: "暂无康复指导，继续打卡后医生将为您下发建议与方案。",
            aiTipUpdatedAt: "等待生成",
            aiSummarySubtitle: "坚持打卡，医生将为您制定专属指导",
          })
          return
        }

        that.setData({
          aiTip: truncateText(summary.doctor_input || summary.content, 42),
          aiTipUpdatedAt: formatAiUpdatedAt(summary.dispatched_at || summary.created_at),
          aiSummarySubtitle: formatAiUpdatedAt(summary.dispatched_at || summary.created_at),
        })
      },
      fail: function () {
        that.setData({
          aiTip: "暂无康复指导，继续打卡后医生将为您下发建议与方案。",
          aiTipUpdatedAt: "等待生成",
          aiSummarySubtitle: "坚持打卡，医生将为您制定专属指导",
        })
      },
    })
  },

  // ===== 进度环：conic-gradient 方案，无需手动计算 =====
  drawProgressRing: function () {
    // conic-gradient 通过 WXML inline style 自动根据 progressPercent 渲染
    // setData 已在 loadTodayProgress 中完成，无需额外操作
  },

  handleGoCheckIn: function () {
    wx.switchTab({ url: "/pages/check-in/index" })
  },

  handleBellTap: function () {
    wx.showToast({ title: "暂无新通知", icon: "none", duration: 1500 })
  },

  handleUserPillTap: function () {
    wx.switchTab({ url: "/pages/profile/index" })
  },

  // ===== 日期选择组件逻辑 =====

  generateWeekDays: function () {
    var WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"]
    var today = new Date()
    var todayStr = this._formatDateStr(today)
    var days = []
    // 以今天为中心，前后各3天 = 7天
    for (var offset = -3; offset <= 3; offset++) {
      var d = new Date(today)
      d.setDate(d.getDate() + offset)
      var weekday = WEEKDAY_NAMES[d.getDay()]
      var dayNum = d.getDate()
      var fullDate = this._formatDateStr(d)
      var isToday = fullDate === todayStr
      days.push({
        weekday: weekday,
        day: dayNum,
        fullDate: fullDate,
        isToday: isToday,
        isSelected: isToday,
      })
    }
    // 默认选中今天（index 3）
    this.setData({
      weekDays: days,
      selectedDateIndex: 3,
      selectedDateStr: todayStr,
    })
  },

  _formatDateStr: function (date) {
    var y = date.getFullYear()
    var m = String(date.getMonth() + 1).padStart(2, "0")
    var d = String(date.getDate()).padStart(2, "0")
    return y + "-" + m + "-" + d
  },

  handleDateTap: function (e) {
    var idx = e.currentTarget.dataset.index
    var days = this.data.weekDays
    for (var i = 0; i < days.length; i++) {
      days[i].isSelected = (i === idx)
    }
    this.setData({
      weekDays: days,
      selectedDateIndex: idx,
      selectedDateStr: days[idx].fullDate,
    })
  },

  handleCalendarToggle: function () {
    if (this.data.showCalendar) {
      this.setData({ showCalendar: false })
      return
    }
    // 初始化日历到选中日期所在月份
    var parts = this.data.selectedDateStr.split("-")
    var year = parseInt(parts[0], 10)
    var month = parseInt(parts[1], 10)
    this.setData({ calendarYear: year, calendarMonth: month })
    this._generateCalendarDays(year, month)
    this.setData({ showCalendar: true })
  },

  _generateCalendarDays: function (year, month) {
    var WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"]
    var todayStr = this._formatDateStr(new Date())
    var selectedStr = this.data.selectedDateStr
    // 本月第一天是星期几
    var firstDay = new Date(year, month - 1, 1).getDay()
    // 本月天数
    var daysInMonth = new Date(year, month, 0).getDate()
    var items = []
    // 前面补空格
    for (var i = 0; i < firstDay; i++) {
      items.push({ day: 0, weekday: WEEKDAY_NAMES[i], fullDate: "", isToday: false, isSelected: false })
    }
    // 填充日期
    for (var d = 1; d <= daysInMonth; d++) {
      var fullDate = year + "-" + String(month).padStart(2, "0") + "-" + String(d).padStart(2, "0")
      items.push({
        day: d,
        weekday: WEEKDAY_NAMES[new Date(year, month - 1, d).getDay()],
        fullDate: fullDate,
        isToday: fullDate === todayStr,
        isSelected: fullDate === selectedStr,
      })
    }
    this.setData({ calendarDays: items })
  },

  handleCalendarPrevMonth: function () {
    var y = this.data.calendarYear
    var m = this.data.calendarMonth - 1
    if (m < 1) { m = 12; y = y - 1 }
    this.setData({ calendarYear: y, calendarMonth: m })
    this._generateCalendarDays(y, m)
  },

  handleCalendarNextMonth: function () {
    var y = this.data.calendarYear
    var m = this.data.calendarMonth + 1
    if (m > 12) { m = 1; y = y + 1 }
    this.setData({ calendarYear: y, calendarMonth: m })
    this._generateCalendarDays(y, m)
  },

  handleCalendarDayTap: function (e) {
    var fullDate = e.currentTarget.dataset.date
    if (!fullDate) return
    var items = this.data.calendarDays
    for (var i = 0; i < items.length; i++) {
      items[i].isSelected = (items[i].fullDate === fullDate)
    }
    this.setData({
      calendarDays: items,
      calendarSelectedDate: fullDate,
    })
  },

  handleCalendarConfirm: function () {
    var selDate = this.data.calendarSelectedDate || this.data.selectedDateStr
    // 同步到日期条：重新生成以 selDate 为中心的7天
    var WEEKDAY_NAMES = ["日", "一", "二", "三", "四", "五", "六"]
    var sel = new Date(selDate)
    var selStr = selDate
    var days = []
    for (var offset = -3; offset <= 3; offset++) {
      var d = new Date(sel)
      d.setDate(d.getDate() + offset)
      days.push({
        weekday: WEEKDAY_NAMES[d.getDay()],
        day: d.getDate(),
        fullDate: this._formatDateStr(d),
        isToday: this._formatDateStr(d) === this._formatDateStr(new Date()),
        isSelected: this._formatDateStr(d) === selStr,
      })
    }
    var selIdx = 3 // selDate 在数组中的位置（中心）
    this.setData({
      showCalendar: false,
      weekDays: days,
      selectedDateIndex: selIdx,
      selectedDateStr: selStr,
    })
  },

  handleCalendarOverlayTap: function () {
    this.setData({ showCalendar: false })
  },

  handleQuickActionTap: function (event) {
    var key = event.currentTarget.dataset.key
    if (key === "progress") {
      wx.navigateTo({ url: "/pages/progress/index" })
      return
    }
    if (key === "ai-summary") {
      wx.navigateTo({ url: "/pages/ai-summary/index" })
      return
    }
    // advice: 滚动到训练建议卡片（无独立页面，暂用toast提示）
    wx.showToast({ title: "训练建议已展示在首页", icon: "none", duration: 1500 })
  },
})
