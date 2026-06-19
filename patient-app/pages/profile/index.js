var auth = require("../../utils/auth.js")

Page({
  data: {
    userName: "",
    patientId: 0,
    doctorId: null,
    role: "",
  },

  onShow() {
    this.setData({
      userName: auth.getUserName() || "未设置",
      patientId: auth.getPatientId() || 0,
      doctorId: auth.getDoctorId(),
      role: auth.getRole ? auth.getRole() : "patient",
    })
  },

  handleSettings() {
    wx.showToast({
      title: "设置功能暂未开放",
      icon: "none",
      duration: 1500,
    })
  },

  handleMenuTap(event) {
    var key = event.currentTarget.dataset.key

    if (key === "info") {
      wx.showToast({
        title: "患者ID：" + this.data.patientId,
        icon: "none",
        duration: 2000,
      })
      return
    }

    if (key === "plan") {
      wx.navigateTo({
        url: "/pages/plan-detail/index",
      })
      return
    }

    if (key === "progress") {
      wx.navigateTo({
        url: "/pages/progress/index",
      })
      return
    }

    if (key === "disclaimer") {
      wx.showModal({
        title: "免责声明",
        content:
          "本应用为肺康复辅助训练工具，提供的训练方案、健康建议及 AI 分析仅供参考，不构成医疗诊断或治疗建议。请在专业医生指导下使用。如训练中出现胸闷、头晕、气促等不适，请立即停止并就医。",
        confirmText: "我已知晓",
        showCancel: false,
      })
      return
    }

    if (key === "logout") {
      this.handleLogout()
    }
  },

  handleLogout() {
    var that = this
    wx.showModal({
      title: "确认退出",
      content: "退出后需要重新登录才能使用",
      confirmText: "退出",
      confirmColor: "#e74c3c",
      success: function (res) {
        if (res.confirm) {
          auth.logout()
          // 强制重新执行 dev-login，确保首页有有效 token
          auth.login(1).then(function () {
            wx.reLaunch({ url: "/pages/home/index" })
          }).catch(function () {
            wx.reLaunch({ url: "/pages/home/index" })
          })
        }
      },
    })
  },
})
