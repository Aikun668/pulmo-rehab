var auth = require("../../utils/auth.js")

// 训练动作配置：带量化目标
var EXERCISE_GUIDES = [
  {
    id: "breathing",
    name: "缩唇腹式呼吸",
    target: "10分钟 · 2组",
    targetMinutes: 10,
    targetSets: 2,
    steps: [
      "坐姿或半卧位，放松肩颈",
      "闭口经鼻缓慢吸气2秒，腹部隆起",
      "缩唇如吹口哨，经嘴缓慢呼气4-6秒",
      "呼气时间是吸气的2-3倍",
      "重复10次为1组，休息30秒后再做第2组",
    ],
    precautions: "不要用力呼气；如有头晕暂停休息；饭后1小时内避免练习",
  },
  {
    id: "walking",
    name: "平地行走",
    target: "20分钟 · 1组",
    targetMinutes: 20,
    targetSets: 1,
    steps: [
      "选择平坦场地，穿舒适鞋子",
      "起步慢走3分钟热身",
      "逐渐加快至轻度气短但仍能说话的速度",
      "维持该速度行走15分钟",
      "最后2分钟放慢速度放松",
      "行走中如有明显气喘，暂停休息",
    ],
    precautions: "避免在空气污染严重时户外行走；随身携带急救药物；穿防滑鞋",
  },
  {
    id: "cough",
    name: "有效咳嗽排痰",
    target: "5分钟 · 2组",
    targetMinutes: 5,
    targetSets: 2,
    steps: [
      "坐直上身，双脚平放",
      "缓慢深吸气至最大限度",
      "屏气2-3秒",
      "腹部用力，连续咳嗽2-3声排痰",
      "缓慢经鼻吸气，避免急促呼吸",
      "重复2-3次为一组，早晚各做一组",
    ],
    precautions: "咳嗽时用手按压伤口部位（术后患者）；不要连续剧烈咳嗽；痰中带血需及时就医",
  },
]

function formatDateTime(value) {
  if (!value) return "暂无更新时间"
  var date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  var y = date.getFullYear()
  var m = String(date.getMonth() + 1).padStart(2, "0")
  var d = String(date.getDate()).padStart(2, "0")
  var h = String(String(date.getHours())).padStart(2, "0")
  var min = String(date.getMinutes()).padStart(2, "0")
  return y + "-" + m + "-" + d + " " + h + ":" + min
}

function fmtTime(seconds) {
  if (!seconds || seconds < 0) return "00:00"
  var m = Math.floor(seconds / 60)
  var s = seconds % 60
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0")
}

function calcProgressPercent(elapsedSeconds, targetMinutes) {
  if (targetMinutes <= 0) return 0
  var pct = elapsedSeconds / (targetMinutes * 60) * 100
  return pct > 100 ? 100 : Math.round(pct)
}

Page({
  data: {
    patientId: 0,
    doctorId: null,
    isLoading: true,
    latestPlan: null,
    historyPlans: [],
    exerciseGuides: [],
  },

  // ===== 计时器私有状态（不在 data 中） =====
  _timerId: null,
  _runningId: "",
  _runningIdx: -1,
  _elapsed: {},
  _completedSets: {},
  _pendingSetData: null,  // 待合并的 setData，防闪烁

  // 格式化今天日期，用于 Storage 跨天重置
  _formatToday: function () {
    var date = new Date()
    var y = date.getFullYear()
    var m = String(date.getMonth() + 1).padStart(2, "0")
    var d = String(date.getDate()).padStart(2, "0")
    return y + "-" + m + "-" + d
  },

  onLoad: function () {
    var saved = wx.getStorageSync("exerciseProgress") || {}
    var savedDate = wx.getStorageSync("exerciseProgressDate") || ""
    var todayStr = this._formatToday()

    // 如果存储的不是今天的进度，重置为0（防跨天累积导致训练时长天文数字）
    if (savedDate !== todayStr) {
      saved = {}
      wx.setStorageSync("exerciseProgress", {})
      wx.setStorageSync("exerciseProgressDate", todayStr)
      wx.setStorageSync("planTrainingMinutes", 0)
      wx.setStorageSync("planCompletedSets", 0)
    }
    var guides = EXERCISE_GUIDES.map(function (g) {
      var prev = saved[g.id] || {}
      var elapsed = prev.elapsedSeconds || 0
      var sets = prev.completedSets || 0
      return {
        id: g.id,
        name: g.name,
        target: g.target,
        targetMinutes: g.targetMinutes,
        targetSets: g.targetSets,
        steps: g.steps,
        precautions: g.precautions,
        expanded: false,
        elapsedDisplay: fmtTime(elapsed),
        elapsedSeconds: elapsed,
        progressPercent: calcProgressPercent(elapsed, g.targetMinutes),
        completedSets: sets,
        isTimerRunning: false,
        isCompleted: sets >= g.targetSets,
        exceededSets: Math.max(0, sets - g.targetSets),
      }
    })
    for (var i = 0; i < guides.length; i++) {
      this._elapsed[guides[i].id] = guides[i].elapsedSeconds
      this._completedSets[guides[i].id] = guides[i].completedSets
    }
    this.setData({ exerciseGuides: guides })
  },

  onShow: function () {
    this.setData({ patientId: auth.getPatientId(), doctorId: auth.getDoctorId() })
    this.loadPlans()
  },

  onHide: function () {
    this._saveAndPause()
  },

  onUnload: function () {
    this._saveAndPause()
  },

  _saveAndPause: function () {
    this._pauseTimerInternal()
    this._saveToStorage()
  },

  // ===== 训练方案接口 =====

  loadPlans: function () {
    var that = this
    this.setData({ isLoading: true })
    auth.request({
      url: auth.API_BASE + "/rehab-plans",
      method: "GET",
      data: { patient_id: this.data.patientId, doctor_id: this.data.doctorId },
      success: function (res) {
        var d = res.data
        var plans = res.statusCode === 200 && d && d.code === 200 && Array.isArray(d.data) ? d.data : []
        var norm = plans.map(function (p) {
          return { id: p.id, title: p.title, content: p.content, createdAt: formatDateTime(p.created_at) }
        })
        that.setData({ latestPlan: norm[0] || null, historyPlans: norm.slice(1), isLoading: false })
      },
      fail: function () {
        that.setData({ isLoading: false, latestPlan: null, historyPlans: [] })
      },
    })
  },

  // ===== 展开/收起 =====

  handleToggleGuide: function (e) {
    var idx = e.currentTarget.dataset.index
    var key = "exerciseGuides[" + idx + "].expanded"
    this.setData({ [key]: !this.data.exerciseGuides[idx].expanded })
  },

  // ===== 计时/暂停切换（单一按钮，避免 hidden 切换导致布局重排闪烁） =====

  handleTimerToggle: function (e) {
    var idx = e.currentTarget.dataset.index
    var guide = this.data.exerciseGuides[idx]
    if (guide.isTimerRunning) {
      this._doPause(idx)
    } else {
      this._doStart(idx)
    }
  },

  // ===== 计时器（单例模式，全局只运行一个） =====

  // 内部辅助：只清计时器和运行状态，不做 setData
  _clearTimerState: function () {
    if (this._timerId) {
      clearInterval(this._timerId)
      this._timerId = null
    }
    this._runningId = ""
    this._runningIdx = -1
  },

  _doStart: function (idx) {
    var guide = this.data.exerciseGuides[idx]
    var guides = this.data.exerciseGuides

    // 先清计时器状态（纯逻辑，不触发渲染）
    this._clearTimerState()

    if (typeof this._elapsed[guide.id] !== "number") {
      this._elapsed[guide.id] = 0
    }

    var id = guide.id
    this._runningId = id
    this._runningIdx = idx

    // 一次 setData：旧 running→false + 当前→true
    var updates = {}
    for (var i = 0; i < guides.length; i++) {
      if (guides[i].isTimerRunning) {
        updates["exerciseGuides[" + i + "].isTimerRunning"] = false
      }
    }
    updates["exerciseGuides[" + idx + "].isTimerRunning"] = true
    this.setData(updates)

    var that = this
    this._timerId = setInterval(function () {
      if (that._runningId !== id) {
        clearInterval(that._timerId)
        that._timerId = null
        return
      }

      that._elapsed[id] += 1
      var seconds = that._elapsed[id]

      that.setData({
        ["exerciseGuides[" + idx + "].elapsedSeconds"]: seconds,
        ["exerciseGuides[" + idx + "].elapsedDisplay"]: fmtTime(seconds),
        ["exerciseGuides[" + idx + "].progressPercent"]: calcProgressPercent(seconds, guide.targetMinutes),
      })

      if (seconds % 10 === 0) {
        that._saveToStorage()
      }
    }, 1000)
  },

  _doPause: function (idx) {
    this._pauseTimerInternal()
    this._saveToStorage()
  },

  _pauseTimerInternal: function () {
    // 清计时器状态（纯逻辑）
    this._clearTimerState()

    // 一次性 batch setData：把所有 isTimerRunning 项都设 false
    var guides = this.data.exerciseGuides
    var updates = {}
    for (var i = 0; i < guides.length; i++) {
      if (guides[i].isTimerRunning) {
        updates["exerciseGuides[" + i + "].isTimerRunning"] = false
      }
    }
    if (Object.keys(updates).length > 0) {
      this.setData(updates)
    }
  },

  // ===== 完成1组（支持超额） =====

  handleCompleteSet: function (e) {
    var idx = e.currentTarget.dataset.index
    var guide = this.data.exerciseGuides[idx]

    var id = guide.id
    if (typeof this._completedSets[id] !== "number") {
      this._completedSets[id] = 0
    }
    this._completedSets[id] += 1
    var newSets = this._completedSets[id]
    var done = newSets >= guide.targetSets
    var exceeded = newSets > guide.targetSets ? newSets - guide.targetSets : 0

    // 首次达标时自动停计时器
    if (done && !guide.isCompleted) {
      this._pauseTimerInternal()
    }

    // 一次性 setData（合并所有字段变更）
    var updates = {
      ["exerciseGuides[" + idx + "].completedSets"]: newSets,
      ["exerciseGuides[" + idx + "].isCompleted"]: done,
      ["exerciseGuides[" + idx + "].exceededSets"]: exceeded,
    }
    // 如果正在计时，一并停掉（合并到同一个 setData，防闪烁）
    if (guide.isTimerRunning) {
      updates["exerciseGuides[" + idx + "].isTimerRunning"] = false
    }
    this.setData(updates)

    this._saveToStorage()

    if (!done && !exceeded) {
      wx.showToast({ title: "完成第 " + newSets + " 组", icon: "none", duration: 1200 })
    } else if (done && !exceeded) {
      wx.showToast({ title: guide.name + " 已完成！", icon: "success", duration: 1500 })
    } else {
      wx.showToast({ title: "超额 +" + exceeded + " 组！太棒了", icon: "success", duration: 1500 })
    }
  },

  // ===== 重置（带确认弹窗） =====

  handleResetExercise: function (e) {
    var idx = e.currentTarget.dataset.index
    var guide = this.data.exerciseGuides[idx]
    var that = this

    wx.showModal({
      title: "重置训练记录",
      content: "确定要清除「" + guide.name + "」的时长和组数吗？此操作不可撤销。",
      confirmText: "确定重置",
      confirmColor: "#ef4444",
      cancelText: "取消",
      success: function (res) {
        if (!res.confirm) return

        var id = guide.id

        if (that._runningId === id) {
          that._pauseTimerInternal()
        }

        that._elapsed[id] = 0
        that._completedSets[id] = 0

        // 一次性 setData（合并所有字段，防闪烁）
        that.setData({
          ["exerciseGuides[" + idx + "].elapsedSeconds"]: 0,
          ["exerciseGuides[" + idx + "].elapsedDisplay"]: "00:00",
          ["exerciseGuides[" + idx + "].progressPercent"]: 0,
          ["exerciseGuides[" + idx + "].completedSets"]: 0,
          ["exerciseGuides[" + idx + "].isTimerRunning"]: false,
          ["exerciseGuides[" + idx + "].isCompleted"]: false,
          ["exerciseGuides[" + idx + "].exceededSets"]: 0,
        })

        that._saveToStorage()
        wx.showToast({ title: "已重置", icon: "none", duration: 1000 })
      },
    })
  },

  // ===== 存储到 Storage =====

  _saveToStorage: function () {
    var progress = {}
    var totalMin = 0
    var totalSets = 0

    for (var i = 0; i < EXERCISE_GUIDES.length; i++) {
      var g = EXERCISE_GUIDES[i]
      progress[g.id] = {
        elapsedSeconds: this._elapsed[g.id] || 0,
        completedSets: this._completedSets[g.id] || 0,
      }
      totalMin += Math.round((this._elapsed[g.id] || 0) / 60)
      totalSets += (this._completedSets[g.id] || 0)
    }

    wx.setStorageSync("exerciseProgress", progress)
    wx.setStorageSync("planTrainingMinutes", totalMin)
    wx.setStorageSync("planCompletedSets", totalSets)
    wx.setStorageSync("exerciseProgressDate", this._formatToday())
  },
})
