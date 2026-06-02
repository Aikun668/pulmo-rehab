const formatToday = () => {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

Page({
  data: {
    trainDate: formatToday(),
    durationMinutes: "20",
    setsCount: "3",
    note: "",
    todayStatusLabel: "今天还没有提交训练记录",
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
    wx.showToast({
      title: "打卡接口下一步接入",
      icon: "none",
      duration: 1800,
    })
  },
})
