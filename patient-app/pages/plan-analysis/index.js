var auth = require("../../utils/auth.js")
var rehabConfig = require("../../utils/rehab-config.js")

var LEVEL_NAMES = rehabConfig.LEVEL_NAMES
var LEVEL_COLORS = rehabConfig.LEVEL_COLORS
var LEVEL_ADVICE = rehabConfig.LEVEL_ADVICE
var LEVEL_DEFAULT_EXERCISES = rehabConfig.LEVEL_DEFAULT_EXERCISES
var formatToday = rehabConfig.formatToday
var parseDurationMinutes = rehabConfig.parseDurationMinutes

// ===== 方案解读：各动作的"选择理由"和"循序渐进"逻辑 =====

var EXERCISE_REASON_MAP = {
  "腹式呼吸训练": "腹式呼吸是所有呼吸训练的基础，通过增强膈肌力量改善呼吸深度，为后续呼吸耐力训练奠定基石。",
  "缩唇呼吸训练": "缩唇呼吸通过延长呼气时间、增加气道内压，防止小气道过早塌陷，是COPD患者最核心的呼吸技巧。",
  "深吸气训练": "在缩唇呼吸掌握后，深吸气训练进一步提升肺活量，改善通气/血流比，为运动耐力训练提供呼吸保障。",
  "呼吸节奏控制": "建立稳定呼吸节律是连接静态呼吸训练和动态运动训练的关键桥梁，确保行走时呼吸不紊乱。",
  "呼吸耐力训练": "呼吸肌耐力是维持长时间运动的基础，延长吸气/屏气/呼气周期，让呼吸肌适应更高负荷。",
  "综合肺功能训练": "综合训练融合深吸、屏气、快速呼气，全面提升呼吸肌力量、耐力和协调性。",
  "呼吸肌力量训练": "阻抗呼吸和呼吸肌拉伸直接增强呼吸肌收缩力，是最高等级的呼吸专项训练。",
  "被动活动训练": "重度恢复期患者体力极度有限，被动活动维持关节活动度，防止肌肉萎缩和关节僵硬。",
  "床边坐立训练": "从卧位过渡到坐位是恢复自主活动能力的第一步，循序渐进提高直立耐力。",
  "平地行走训练": "平地行走是中度恢复阶段的核心运动训练，在呼吸训练保障下逐步提升运动耐力。",
  "步行耐力训练": "中等速度步行并逐步增加坡度，提升有氧运动能力，心率控制在安全范围。",
  "有氧运动训练": "快步走或慢跑，心率目标化控制，是接近完全恢复阶段的核心心肺耐力训练。",
  "上肢力量训练": "上肢活动与呼吸密切相关（辅助呼吸肌），增强上肢肌力可减轻呼吸负担。",
}

// ===== 各动作的"循序渐进路径"（低→高级别如何演进） =====

var EXERCISE_PROGRESSION_MAP = {
  "腹式呼吸训练": "Level 1 基础腹式呼吸 → Level 2 缩唇+腹式 → Level 3 深吸气+节奏控制 → Level 4 呼吸耐力 → Level 5 综合肺功能",
  "缩唇呼吸训练": "Level 2 缩唇呼吸基础 → Level 3 深吸气(延长呼气) → Level 4 呼吸耐力(更长周期) → Level 5 综合肺功能",
  "深吸气训练": "Level 3 4秒吸+2秒屏+6秒呼 → Level 4 5秒吸+3秒屏+7秒呼 → Level 5 5秒吸+3秒屏+8秒呼",
  "呼吸节奏控制": "Level 3 静态节奏建立 → Level 4 配合步行节奏 → Level 5 配合有氧运动节奏",
  "平地行走训练": "Level 3 慢速平地走 → Level 4 中速+增加距离 → Level 5 快步走/慢跑",
  "步行耐力训练": "Level 4 中速步行20-30min → Level 5 快步走30min+坡度",
  "上肢力量训练": "Level 4 轻物肩关节活动 → Level 5 增加重量+呼吸配合",
}

// ===== 动作关联：呼吸训练与运动训练的关系 =====

var EXERCISE_RELATION_MAP = {
  "腹式呼吸训练": "为所有后续训练奠定呼吸基础",
  "缩唇呼吸训练": "呼吸效率提升后才能安全进行运动训练",
  "深吸气训练": "与呼吸节奏控制互为补充，静态与动态呼吸能力同步提升",
  "呼吸节奏控制": "连接静态呼吸训练和动态行走训练的桥梁",
  "呼吸耐力训练": "呼吸肌耐力是维持长时间运动的前提保障",
  "综合肺功能训练": "融合所有呼吸训练成果，是呼吸训练的终极阶段",
  "呼吸肌力量训练": "力量训练与耐力训练互补，全面提升呼吸肌功能",
  "被动活动训练": "为后续自主活动训练做准备",
  "床边坐立训练": "从被动过渡到自主活动的关键一步",
  "平地行走训练": "需要呼吸训练保障，呼吸不稳时行走会加重气短",
  "步行耐力训练": "建立在平地行走基础之上，需要呼吸耐力支撑",
  "有氧运动训练": "需要呼吸肌力量+耐力双重保障",
  "上肢力量训练": "上肢肌力增强可减轻呼吸负担，与呼吸训练相互促进",
}

// ===== 达成目标：各等级里程碑与身体变化 =====
var LEVEL_GOALS_MAP = {
  1: {
    title: "自主呼吸阶段",
    bodyChanges: [
      "膈肌恢复自主收缩，呼吸不再完全依赖辅助",
      "能维持坐位5-10分钟，直立耐力初步建立",
      "关节活动度保持，防止肌肉萎缩和关节僵硬",
      "血氧饱和度逐步稳定在90%以上",
    ],
    dailyLife: "可自主翻身、短时间坐起，为后续行走训练奠定基础",
    nextGoal: "Level 2：呼吸效率提升，开始短距离自主行走",
  },
  2: {
    title: "呼吸效率提升阶段",
    bodyChanges: [
      "膈肌力量明显增强，呼吸深度和效率提升",
      "缩唇呼吸技巧掌握，呼气时间延长，小气道不再过早塌陷",
      "可自主行走50-100米，不再完全依赖他人辅助",
      "心率波动减小，运动时呼吸不再急剧恶化",
    ],
    dailyLife: "可短距离自主行走，室内日常活动部分自理",
    nextGoal: "Level 3：呼吸节奏稳定，平地行走自如",
  },
  3: {
    title: "日常自理恢复阶段",
    bodyChanges: [
      "呼吸节奏稳定可控，行走时呼吸不紊乱",
      "平地行走10-15分钟不出现明显气短",
      "日常生活自理能力恢复（穿衣、洗漱、室内行走）",
      "运动耐力提升，可逐步增加步行距离和速度",
    ],
    dailyLife: "日常生活基本自理，可独立完成室内活动",
    nextGoal: "Level 4：户外活动能力恢复，开始有氧训练",
  },
  4: {
    title: "户外活动恢复阶段",
    bodyChanges: [
      "呼吸肌耐力显著增强，可持续运动20-30分钟",
      "中等速度步行自如，可应对坡度和较长距离",
      "上肢肌力提升，减轻呼吸负担（辅助呼吸肌不再过度代偿）",
      "心率在运动中可控，有氧运动能力初步建立",
    ],
    dailyLife: "可外出购物、散步30分钟，社交活动逐步恢复",
    nextGoal: "Level 5：全面心肺耐力恢复，回归正常生活",
  },
  5: {
    title: "全面恢复阶段",
    bodyChanges: [
      "综合肺功能达标，呼吸肌力量+耐力+协调性全面提升",
      "可快步走或慢跑30分钟，心肺耐力接近正常水平",
      "运动时血氧稳定，不再出现运动性低氧",
      "呼吸肌力量充足，上肢活动不再加重呼吸负担",
    ],
    dailyLife: "正常参与社会活动、户外运动，生活质量接近健康人群",
    nextGoal: "维持训练，巩固成果，预防功能退化",
  },
}

// 格式化日期标签（近7天）
function formatDayLabel(dateStr) {
  if (!dateStr) return ""
  var date = new Date(dateStr)
  var m = date.getMonth() + 1
  var d = date.getDate()
  return m + "/" + d
}

Page({
  data: {
    patientId: 0,
    contentTopPadding: 0,
    // 方案总览
    rehabLevel: 3,
    rehabLevelName: "",
    rehabLevelColor: "#eab308",
    planTitle: "",
    planSource: "", // "approved" | "ai" | "default"
    planSourceLabel: "",
    totalTargetMinutes: 0,
    todayProgressMinutes: 0,
    todayProgressPercent: 0,
    // 方案解读：各动作分析
    exerciseAnalysis: [],
    expandedMap: {}, // 动作卡片展开状态，key=index, value=true/false
    // 达成目标
    goalData: {},
    milestoneNodes: [],
    // 历史7天训练数据
    recent7Days: [],
    avgDuration: 0,
    completionRate7d: 0,
    targetLineBottom: 0,
    // 最近一次训练结果
    lastTrainingDate: "",
    lastDuration: 0,
    lastSets: 0,
    lastVsTargetPercent: 0,
    // 加载状态
    isLoading: true,
  },

  onLoad: function () {
    // 计算顶部 padding（与首页一致）
    var sysInfo = wx.getWindowInfo() || wx.getSystemInfoSync()
    var menuButton = wx.getMenuButtonBoundingClientRect()
    var statusBarH = sysInfo.statusBarHeight || 20
    var contentTopPadding = (menuButton.top || (statusBarH + 6)) - 4
    if (contentTopPadding < statusBarH) {
      contentTopPadding = statusBarH + 6
    }

    this.setData({
      patientId: auth.getPatientId(),
      contentTopPadding: contentTopPadding,
    })
  },

  onShow: function () {
    this.loadAllData()
  },

  loadAllData: function () {
    var that = this
    this.setData({ isLoading: true })

    // 加载康复等级 → 方案 → 进度 → 最近训练记录
    this.loadRehabLevel(function () {
      that.loadPlan(function () {
        that.loadRecent7Days()
        that.loadLastTrainingResult()
        that.loadTodayProgress()
        // 兜底：确保达成目标数据一定存在（防止 loadRehabLevel 失败后未调用 _buildGoalData）
        if (!that.data.goalData || !that.data.goalData.currentLevelTitle) {
          that._buildGoalData(that.data.rehabLevel || 3)
        }
        that.setData({ isLoading: false })
      })
    })
  },

  // ===== 加载康复等级 =====
  loadRehabLevel: function (callback) {
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
            rehabLevelName: LEVEL_NAMES[d.rehab_level] || "中度恢复",
            rehabLevelColor: LEVEL_COLORS[d.rehab_level] || "#eab308",
          })
          // 构建达成目标数据
          that._buildGoalData(d.rehab_level)
        }
        if (callback) callback()
      },
      fail: function () {
        // API 失败时用默认等级兜底，确保达成目标模块有内容
        that._buildGoalData(that.data.rehabLevel || 3)
        if (callback) callback()
      },
    })
  },

  // ===== 加载训练方案（优先级：医生处方 → 缓存 → AI → 默认） =====
  loadPlan: function (callback) {
    var that = this
    var patientId = this.data.patientId
    var trainDate = formatToday()
    var level = this.data.rehabLevel || 3

    // 优先级1：医生已审核处方
    auth.request({
      url: auth.API_BASE + "/rehab-plans/active",
      method: "GET",
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        if (response.statusCode === 200 && respData && respData.code === 200 && respData.data) {
          var plan = respData.data
          var exercises = plan.exercises || []
          if (exercises.length > 0) {
            that.setData({
              planTitle: plan.title || "医生审核训练方案",
              planSource: "approved",
              planSourceLabel: "医生审核",
            })
            that._buildExerciseAnalysis(exercises, "approved")
            // 写入缓存
            var cacheKey = "prescription_" + patientId + "_" + trainDate
            try { wx.setStorageSync(cacheKey, { title: plan.title, exercises: exercises, source: "approved", cachedAt: Date.now() }) } catch (e) {}
            if (callback) callback()
            return
          }
        }
        that._loadPlanFallback(patientId, level, trainDate, callback)
      },
      fail: function () {
        that._loadPlanFallback(patientId, level, trainDate, callback)
      },
    })
  },

  _loadPlanFallback: function (patientId, level, trainDate, callback) {
    var that = this
    var cacheKey = "prescription_" + patientId + "_" + trainDate

    // 优先级2：今日缓存
    try {
      var cached = wx.getStorageSync(cacheKey)
      if (cached && cached.exercises && cached.exercises.length > 0) {
        that.setData({
          planTitle: cached.title || "训练方案",
          planSource: cached.source || "ai",
          planSourceLabel: cached.source === "ai" ? "AI生成" : "缓存",
        })
        that._buildExerciseAnalysis(cached.exercises, cached.source)
        if (callback) callback()
        return
      }
    } catch (e) {}

    // 优先级3：AI 生成
    auth.request({
      url: auth.API_BASE + "/prescriptions/generate",
      method: "POST",
      header: { "Content-Type": "application/json" },
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        if (response.statusCode === 200 && respData && respData.code === 200 && respData.data) {
          var exercises = respData.data.exercises || []
          if (exercises.length > 0) {
            try { wx.setStorageSync(cacheKey, { title: respData.data.title, exercises: exercises, source: "ai", cachedAt: Date.now() }) } catch (e) {}
            that.setData({
              planTitle: respData.data.title || "AI训练方案",
              planSource: "ai",
              planSourceLabel: "AI生成",
            })
            that._buildExerciseAnalysis(exercises, "ai")
            if (callback) callback()
            return
          }
        }
        // AI 失败 → 降级默认
        that._useDefaultPlan(level, callback)
      },
      fail: function () {
        that._useDefaultPlan(level, callback)
      },
    })
  },

  _useDefaultPlan: function (level, callback) {
    var exercises = LEVEL_DEFAULT_EXERCISES[level] || LEVEL_DEFAULT_EXERCISES[3]
    this.setData({
      planTitle: "Level " + level + " " + (LEVEL_NAMES[level] || "中度恢复") + "训练方案",
      planSource: "default",
      planSourceLabel: "等级默认",
    })
    this._buildExerciseAnalysis(exercises, "default")
    if (callback) callback()
  },

  // ===== 构建各动作分析卡片数据 =====
  _buildExerciseAnalysis: function (exercises, source) {
    var analysis = []
    var totalTarget = 0

    for (var i = 0; i < exercises.length; i++) {
      var ex = exercises[i]
      var targetMin = parseDurationMinutes(ex.duration)
      totalTarget += targetMin

      analysis.push({
        name: ex.name || "训练动作",
        purpose: ex.purpose || "",
        duration: ex.duration || "",
        targetMinutes: targetMin,
        steps: Array.isArray(ex.steps) ? ex.steps : [],
        precautions: Array.isArray(ex.precautions) ? ex.precautions : [],
        // 方案解读新增字段
        reason: EXERCISE_REASON_MAP[ex.name] || "根据当前康复等级和训练目标精选",
        progression: EXERCISE_PROGRESSION_MAP[ex.name] || "随康复等级提升逐步增加强度和时长",
        relation: EXERCISE_RELATION_MAP[ex.name] || "与其他训练动作协同配合",
        index: i,
      })
    }

    this.setData({
      exerciseAnalysis: analysis,
      totalTargetMinutes: totalTarget,
    })
  },

  // ===== 近7天训练数据 =====
  loadRecent7Days: function () {
    var that = this
    var patientId = this.data.patientId

    auth.request({
      url: auth.API_BASE + "/training-logs/progress-30d",
      method: "GET",
      data: { patient_id: patientId },
      success: function (response) {
        var respData = response.data
        var days = []
        if (response.statusCode === 200 && respData && respData.code === 200 && respData.data && Array.isArray(respData.data.days)) {
          days = respData.data.days
        }

        // 取最近7天
        var recent7 = days.slice(0, 7)
        var maxMin = 0
        var totalMin = 0
        var trainedCount = 0
        var bars = []

        for (var i = 0; i < recent7.length; i++) {
          var min = recent7[i].duration_minutes || 0
          if (min > maxMin) maxMin = min
          totalMin += min
          if (min > 0) trainedCount++
          bars.push({
            dateLabel: formatDayLabel(recent7[i].date),
            minutes: min,
            heightPercent: 0, // 后面算
            isToday: i === recent7.length - 1,
          })
        }

        // 算柱高百分比
        var target = that.data.totalTargetMinutes || 20
        for (var i = 0; i < bars.length; i++) {
          bars[i].heightPercent = maxMin > 0 ? Math.max(8, (bars[i].minutes / maxMin) * 100) : 8
        }

        var avgDuration = recent7.length > 0 ? Math.round(totalMin / recent7.length) : 0
        var completionRate = recent7.length > 0 ? Math.round((trainedCount / recent7.length) * 100) : 0

        // 计算目标线位置（柱状图内虚线标注每日目标高度）
        var targetLineBottom = 0
        if (maxMin > 0 && target > 0) {
          var ratio = Math.min(1.2, target / maxMin)
          targetLineBottom = Math.round(48 + ratio * 180)
          targetLineBottom = Math.min(targetLineBottom, 228)
        }

        that.setData({
          recent7Days: bars,
          avgDuration: avgDuration,
          completionRate7d: completionRate,
          targetLineBottom: targetLineBottom,
        })
      },
      fail: function () {
        // 保持空数据
      },
    })
  },

  // ===== 最近一次训练结果 =====
  loadLastTrainingResult: function () {
    var that = this
    var patientId = this.data.patientId

    auth.request({
      url: auth.API_BASE + "/training-logs",
      method: "GET",
      data: {
        patient_id: patientId,
        start_date: formatToday(),
        end_date: formatToday(),
      },
      success: function (response) {
        var respData = response.data
        var logs = []
        if (response.statusCode === 200 && respData && respData.code === 200 && Array.isArray(respData.data)) {
          logs = respData.data
        }

        var lastLog = logs[0] || null
        if (lastLog) {
          var target = that.data.totalTargetMinutes || 20
          var vsPercent = Math.min(100, Math.round((lastLog.duration_minutes / target) * 100))
          that.setData({
            lastTrainingDate: formatDayLabel(lastLog.train_date),
            lastDuration: lastLog.duration_minutes,
            lastSets: lastLog.sets_count,
            lastVsTargetPercent: vsPercent,
          })
        }
      },
      fail: function () {},
    })
  },

  // ===== 今日进度（从本地 Storage + 后端） =====
  loadTodayProgress: function () {
    var localMin = this._calcLocalTrainingMinutes()
    var target = this.data.totalTargetMinutes || 20
    var percent = Math.min(100, Math.round((localMin / target) * 100))
    this.setData({
      todayProgressMinutes: localMin,
      todayProgressPercent: percent,
    })
  },

  _calcLocalTrainingMinutes: function () {
    var savedDate = wx.getStorageSync("exerciseProgressDate") || ""
    if (savedDate !== formatToday()) return 0

    var exerciseProgress = wx.getStorageSync("exerciseProgress") || {}
    var totalMin = 0
    var guideIds = ["breathing", "walking", "cough"]
    for (var i = 0; i < guideIds.length; i++) {
      var prog = exerciseProgress[guideIds[i]]
      if (prog && prog.elapsedSeconds) {
        totalMin += Math.min(Math.round(prog.elapsedSeconds / 60), 45)
      }
    }
    return totalMin
  },

  // ===== 构建达成目标数据 =====
  _buildGoalData: function (level) {
    var currentGoal = LEVEL_GOALS_MAP[level] || LEVEL_GOALS_MAP[3]
    var nextLevel = level + 1
    var nextGoal = LEVEL_GOALS_MAP[nextLevel] || null
    var ultimateGoal = LEVEL_GOALS_MAP[5]
    var progressPercent = Math.min(100, level * 20)
    var levelColor = this.data.rehabLevelColor || "#eab308"

    // 构建里程碑节点（L1→L5 路线图）
    var shortTitles = ["自主呼吸", "效率提升", "日常自理", "户外恢复", "全面恢复"]
    var milestoneNodes = []
    for (var i = 1; i <= 5; i++) {
      var isReached = i <= level
      var isCurrent = i === level
      var dotStyle = "background:" + (isReached ? levelColor : "#E5E7EB") + ";"
      if (isCurrent) {
        dotStyle += "width:32rpx;height:32rpx;box-shadow:0 0 0 8rpx " + levelColor + "33;"
      }
      milestoneNodes.push({
        num: i,
        shortTitle: shortTitles[i - 1],
        isCurrent: isCurrent,
        isReached: isReached,
        dotStyle: dotStyle,
      })
    }

    this.setData({
      goalData: {
        currentLevelTitle: currentGoal.title,
        currentBodyChanges: currentGoal.bodyChanges,
        currentDailyLife: currentGoal.dailyLife,
        nextLevelNum: nextLevel,
        nextLevelTitle: nextGoal ? nextGoal.title : "维持阶段",
        nextGoalText: currentGoal.nextGoal,
        ultimateTitle: ultimateGoal.title,
        ultimateDailyLife: ultimateGoal.dailyLife,
        progressPercent: progressPercent,
      },
      milestoneNodes: milestoneNodes,
    })
  },

  // ===== 展开/折叠动作分析卡片 =====
  handleToggleExercise: function (e) {
    var idx = e.currentTarget.dataset.idx
    var map = this.data.expandedMap
    map[idx] = !map[idx]
    this.setData({ expandedMap: map })
  },

  // ===== 导航 =====
  handleGoPlanDetail: function () {
    wx.navigateTo({ url: "/pages/plan-detail/index" })
  },

  handleBack: function () {
    wx.navigateBack()
  },
})
