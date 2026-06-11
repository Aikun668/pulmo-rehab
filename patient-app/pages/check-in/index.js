const TEST_PATIENT_ID = 1
const API_BASE_URL = "http://127.0.0.1:8000/api"

const DEFAULT_TASKS = [
  {
    id: "breathing",
    name: "缩唇腹式呼吸",
    description: "吸气2秒，缩唇呼气4-6秒",
    targetMinutes: 10,
    targetSets: 2,
  },
  {
    id: "walking",
    name: "平地行走",
    description: "维持轻度气短水平行走",
    targetMinutes: 20,
    targetSets: 1,
  },
  {
    id: "cough",
    name: "有效咳嗽排痰",
    description: "早晚各1次，配合深呼吸",
    targetMinutes: 5,
    targetSets: 2,
  },
]

const formatToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

Page({
  data: {
    patientId: TEST_PATIENT_ID,
    trainDate: "",
    tasks: [],
    allChecked: false,
    hasSubmittedToday: false,
    todaySummaryText: "正在加载...",
    isSubmitting: false,
    showSuccessFeedback: false,
  },

  onLoad() {
    this.setData({
      trainDate: formatToday(),
      tasks: DEFAULT_TASKS.map(function (task) {
        return {
          id: task.id,
          name: task.name,
          description: task.description,
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

  onShow() {
    this.loadTodayLog()
  },

  updateCheckState() {
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

  loadTodayLog() {
    var that = this
    var patientId = this.data.patientId
    var trainDate = this.data.trainDate

    if (!trainDate) return

    wx.request({
      url: `${API_BASE_URL}/training-logs`,
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
          todaySummaryText: "今天已记录 " + todayLog.duration_minutes + " 分钟 · " + todayLog.sets_count + " 项",
        })
      },
      fail: function () {
        that.setData({
          todaySummaryText: "暂时无法读取今天的训练记录",
        })
      },
    })
  },

  handleTaskCheck(event) {
    var idx = event.currentTarget.dataset.index
    var tasks = this.data.tasks
    var task = tasks[idx]
    var newChecked = !task.checked

    tasks[idx] = {
      id: task.id,
      name: task.name,
      description: task.description,
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

  handleDurationInput(event) {
    var idx = event.currentTarget.dataset.index
    var tasks = this.data.tasks
    var newTasks = []
    for (var i = 0; i < tasks.length; i++) {
      if (i === idx) {
        newTasks.push({
          id: tasks[i].id,
          name: tasks[i].name,
          description: tasks[i].description,
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

  handleSubmit() {
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

    var completedCount = tasks.filter(function (t) { return t.checked }).length
    var autoNote = "完成: " + noteParts.join(" / ")

    this.setData({ isSubmitting: true })

    wx.request({
      url: `${API_BASE_URL}/training-logs`,
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      data: {
        patient_id: patientId,
        train_date: trainDate,
        duration_minutes: totalDuration,
        sets_count: completedCount,
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
          todaySummaryText: "今天已记录 " + totalDuration + " 分钟 · " + completedCount + " 项",
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
