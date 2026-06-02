Page({
  data: {
    patientName: "测试患者",
    welcomeLabel: "肺康复助手",
    todayStatusLabel: "今日尚未打卡",
    progressPercent: 33,
    completedTaskCount: 1,
    totalTaskCount: 3,
    currentTaskTitle: "平地行走 (II 期)",
    currentTaskMeta: "预计 20 分钟 · 待开始",
    aiTip:
      "您的肺活量近30天提升了8.2%。近期呼吸频率稳定，建议继续保持当前的II期扩胸运动强度。",
    aiTipUpdatedAt: "更新于 10:30",
    quickActions: [
      {
        key: "progress",
        title: "30 天进度",
      },
      {
        key: "ai-summary",
        title: "AI 康复小结",
      },
    ],
  },

  handleGoCheckIn() {
    wx.switchTab({
      url: "/pages/check-in/index",
    })
  },

  handleQuickActionTap(event) {
    const { key } = event.currentTarget.dataset

    if (key === "progress") {
      wx.navigateTo({
        url: "/pages/progress/index",
      })
      return
    }

    wx.navigateTo({
      url: "/pages/ai-summary/index",
    })
  },
})
