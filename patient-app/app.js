// app.js
var auth = require("./utils/auth.js")

App({
  globalData: {
    token: "",
    patientId: 0,
    role: "",
    userName: "",
    doctorId: null,
    showDisclaimer: false,
  },

  onLaunch: function () {
    // 检查免责声明是否已接受
    try {
      var accepted = wx.getStorageSync("disclaimer_accepted")
      if (!accepted) {
        this.globalData.showDisclaimer = true
      }
    } catch (e) {
      this.globalData.showDisclaimer = true
    }

    // 先尝试从本地缓存恢复登录态
    if (auth.checkLogin()) {
      return
    }
    // 未登录 — 开发阶段自动用 patient_id=17（赵六）登录，与后端seed数据对齐
    auth.login(17).catch(function (err) {
      console.error("自动登录失败:", err)
    })
  },
})
