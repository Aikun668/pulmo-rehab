// index.js
Page({
  data: {
    patientName: "测试患者",
    todayDateLabel: "今天是你的训练日",
    dailyTargetMinutes: 20,
    todayStatusLabel: "今日尚未打卡",
    todayStatusDescription: "建议先完成今天训练，再补充训练记录。",
    latestPlan: {
      title: "呼吸耐力基础训练",
      description: "以低强度呼吸训练为主，完成后记录训练时长与组数。",
      updatedAt: "最近更新：今天",
    },
    aiSummaryHint:
      "AI 康复小结将在后续接入真实数据后展示，这里先保留页面入口。",
    quickActions: [
      {
        key: "check-in",
        title: "开始训练打卡",
        description: "进入每日训练记录，填写时长、组数与备注。",
        tone: "primary",
      },
      {
        key: "plan",
        title: "查看训练方案",
        description: "查看医生最近下发的训练安排与执行建议。",
        tone: "default",
      },
      {
        key: "progress",
        title: "查看30天进度",
        description: "后续会在这里查看近30天训练趋势与完成情况。",
        tone: "default",
      },
    ],
  },

  handleQuickActionTap(event) {
    const { action } = event.currentTarget.dataset
    const tipsMap = {
      "check-in": "训练打卡页是下一步模块，当前先完成首页框架。",
      plan: "训练方案展示模块待接入。",
      progress: "30天进度模块待接入。",
    }

    wx.showToast({
      title: tipsMap[action] || "功能开发中",
      icon: "none",
      duration: 1800,
    })
  },
})
