var auth = require("../../utils/auth.js")

Page({
  data: {
    userName: "赵六",
    patientId: 0,
    doctorId: null,
    role: "",
    avatarSurname: "赵",
    greetingText: "赵先生",
  },

  onShow() {
    // 自定义 tabBar：设置选中状态（我的tab = index 4）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 4 })
    }

    var userName = auth.getUserName()
    // 与首页保持一致的兜底逻辑：无真实用户名时用"赵六"
    if (!userName || userName === "用户") {
      userName = "赵六"
    }
    var surname = userName.charAt(0) || "赵"

    this.setData({
      userName: userName,
      patientId: auth.getPatientId() || 0,
      doctorId: auth.getDoctorId(),
      role: auth.getRole ? auth.getRole() : "patient",
      avatarSurname: surname,
      greetingText: surname + "先生",
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

    if (key === "settings") {
      wx.showToast({
        title: "设置功能开发中",
        icon: "none",
        duration: 1500,
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
          auth.login(17).then(function () {
            wx.reLaunch({ url: "/pages/home/index" })
          }).catch(function () {
            wx.reLaunch({ url: "/pages/home/index" })
          })
        }
      },
    })
  },
})
