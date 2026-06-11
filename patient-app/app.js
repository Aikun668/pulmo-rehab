// app.js
var auth = require("./utils/auth.js")

App({
  globalData: {
    token: "",
    patientId: 0,
    role: "",
    userName: "",
    doctorId: null,
  },

  onLaunch: function () {
    // 先尝试从本地缓存恢复登录态
    if (auth.checkLogin()) {
      return
    }
    // 未登录 — 开发阶段自动用 patient_id=1 登录
    auth.login(1).catch(function (err) {
      console.error("自动登录失败:", err)
    })
  },
})
