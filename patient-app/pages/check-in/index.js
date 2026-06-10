const TEST_PATIENT_ID = 1
const API_BASE_URL = "http://127.0.0.1:8000/api"

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
    trainDate: formatToday(),
    durationMinutes: "20",
    setsCount: "3",
    note: "",
    todayStatusLabel: "今天还没有提交训练记录",
    isSubmitting: false,
  },

  onShow() {
    this.loadTodayLog()
  },

  loadTodayLog() {
    const { patientId, trainDate } = this.data

    wx.request({
      url: `${API_BASE_URL}/training-logs`,
      method: "GET",
      data: {
        patient_id: patientId,
        start_date: trainDate,
        end_date: trainDate,
      },
      success: (response) => {
        const { data } = response
        const logs =
          response.statusCode === 200 &&
          data &&
          data.code === 200 &&
          Array.isArray(data.data)
            ? data.data
            : []
        const todayLog = logs[0] || null

        if (!todayLog) {
          this.setData({
            todayStatusLabel: "今天还没有提交训练记录",
          })
          return
        }

        this.setData({
          durationMinutes: String(todayLog.duration_minutes),
          setsCount: String(todayLog.sets_count),
          note: todayLog.note || "",
          todayStatusLabel: `今天已记录 ${todayLog.duration_minutes} 分钟 · ${todayLog.sets_count} 组`,
        })
      },
      fail: () => {
        this.setData({
          todayStatusLabel: "暂时无法读取今天的训练记录",
        })
      },
    })
  },

  handleDurationInput(event) {
    this.setData({
      durationMinutes: event.detail.value,
    })
  },

  handleSetsInput(event) {
    this.setData({
      setsCount: event.detail.value,
    })
  },

  handleNoteInput(event) {
    this.setData({
      note: event.detail.value,
    })
  },

  handleSubmit() {
    const { patientId, trainDate, durationMinutes, setsCount, note, isSubmitting } = this.data
    const duration = Number(durationMinutes)
    const sets = Number(setsCount)
    const trimmedNote = note.trim()

    if (isSubmitting) {
      return
    }

    if (!Number.isInteger(duration) || duration <= 0) {
      wx.showToast({
        title: "请输入有效训练时长",
        icon: "none",
        duration: 1800,
      })
      return
    }

    if (!Number.isInteger(sets) || sets <= 0) {
      wx.showToast({
        title: "请输入有效训练组数",
        icon: "none",
        duration: 1800,
      })
      return
    }

    this.setData({
      isSubmitting: true,
    })

    wx.request({
      url: `${API_BASE_URL}/training-logs`,
      method: "POST",
      header: {
        "Content-Type": "application/json",
      },
      data: {
        patient_id: patientId,
        train_date: trainDate,
        duration_minutes: duration,
        sets_count: sets,
        note: trimmedNote || null,
      },
      success: (response) => {
        const { data } = response
        if (response.statusCode !== 200 || !data || data.code !== 200) {
          wx.showToast({
            title: (data && data.message) || "训练记录提交失败",
            icon: "none",
            duration: 2000,
          })
          return
        }

        const actionText = data.data.action === "updated" ? "已更新今天训练记录" : "已提交今天训练记录"

        this.setData({
          note: trimmedNote,
          todayStatusLabel: `${actionText}，正在返回首页刷新进度`,
        })

        wx.showToast({
          title: actionText,
          icon: "success",
          duration: 1200,
        })

        setTimeout(() => {
          wx.switchTab({
            url: "/pages/home/index",
          })
        }, 900)
      },
      fail: () => {
        wx.showToast({
          title: "无法连接后端服务",
          icon: "none",
          duration: 2000,
        })
      },
      complete: () => {
        this.setData({
          isSubmitting: false,
        })
      },
    })
  },
})
