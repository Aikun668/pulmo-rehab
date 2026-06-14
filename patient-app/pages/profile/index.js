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

  handleLogout() {
    wx.showModal({
      title: "确认退出",
      content: "退出后需要重新登录才能使用",
      confirmText: "退出",
      confirmColor: "#e74c3c",
      success: function (res) {
        if (res.confirm) {
          auth.logout()
          wx.reLaunch({
            url: "/pages/home/index",
          })
        }
      },
    })
  },
})
