Page({
  data: {
    latestPlanTitle: "呼吸耐力基础训练",
    latestPlanDescription: "当前先按低强度训练节奏执行，每次训练后完成打卡。",
    progressSummary: "过去30天已训练 12 天，累计 260 分钟。",
    aiSummaryPreview: "最近一周训练节奏基本稳定，建议继续按当前方案坚持训练。",
  },

  handleOpenPlanDetail() {
    wx.navigateTo({
      url: "/pages/plan-detail/index",
    })
  },

  handleOpenProgress() {
    wx.navigateTo({
      url: "/pages/progress/index",
    })
  },

  handleOpenAiSummary() {
    wx.navigateTo({
      url: "/pages/ai-summary/index",
    })
  },
})
