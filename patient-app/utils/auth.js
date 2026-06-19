var API_BASE = "http://127.0.0.1:8000/api"

// 生产环境部署时，取消下面一行注释并填入真实 API 地址：
// var API_BASE = "https://your-api-domain.com/api"

function getApiBase() {
  var app = getApp()
  if (app && app.globalData && app.globalData.apiBase) {
    return app.globalData.apiBase
  }
  return API_BASE
}

/**
 * 封装 wx.request，自动带 Authorization header 和动态 API_BASE
 * 用法和 wx.request 一样，额外自动注入 token
 */
function request(opts) {
  var token = getToken()
  var header = opts.header || {}
  if (token) {
    header["Authorization"] = "Bearer " + token
  }
  opts.header = header
  if (!opts.url.startsWith("http")) {
    opts.url = getApiBase() + opts.url
  }
  wx.request(opts)
}

function login(patientId) {
  var app = getApp()
  return new Promise(function (resolve, reject) {
    wx.request({
      url: getApiBase() + "/auth/dev-login",
      method: "POST",
      data: { patient_id: patientId },
      success: function (res) {
        if (res.data && res.data.code === 200 && res.data.data) {
          var d = res.data.data
          app.globalData.token = d.token
          app.globalData.patientId = d.user_id
          app.globalData.role = d.role
          app.globalData.userName = d.name
          app.globalData.doctorId = d.doctor_id
          // 持久化到本地
          wx.setStorageSync("token", d.token)
          wx.setStorageSync("patientId", d.user_id)
          wx.setStorageSync("userName", d.name)
          wx.setStorageSync("doctorId", d.doctor_id)
          wx.setStorageSync("role", d.role)
          resolve(d)
        } else {
          reject(res.data)
        }
      },
      fail: function (err) {
        reject(err)
      },
    })
  })
}

function checkLogin() {
  var app = getApp()
  var token = wx.getStorageSync("token")
  var patientId = wx.getStorageSync("patientId")
  if (token && patientId) {
    app.globalData.token = token
    app.globalData.patientId = patientId
    app.globalData.userName = wx.getStorageSync("userName") || ""
    app.globalData.doctorId = wx.getStorageSync("doctorId") || null
    app.globalData.role = wx.getStorageSync("role") || ""
    return true
  }
  return false
}

function getToken() {
  var app = getApp()
  return app.globalData.token || wx.getStorageSync("token") || ""
}

function getPatientId() {
  var app = getApp()
  return app.globalData.patientId || wx.getStorageSync("patientId") || 0
}

function getDoctorId() {
  var app = getApp()
  return app.globalData.doctorId || wx.getStorageSync("doctorId") || null
}

function getUserName() {
  var app = getApp()
  return app.globalData.userName || wx.getStorageSync("userName") || ""
}

function getRole() {
  var app = getApp()
  return app.globalData.role || wx.getStorageSync("role") || ""
}

function logout() {
  var app = getApp()
  app.globalData.token = ""
  app.globalData.patientId = 0
  app.globalData.userName = ""
  app.globalData.doctorId = null
  app.globalData.role = ""
  wx.removeStorageSync("token")
  wx.removeStorageSync("patientId")
  wx.removeStorageSync("userName")
  wx.removeStorageSync("doctorId")
  wx.removeStorageSync("role")
}

module.exports = {
  API_BASE: API_BASE,
  login: login,
  checkLogin: checkLogin,
  getToken: getToken,
  getPatientId: getPatientId,
  getDoctorId: getDoctorId,
  getUserName: getUserName,
  getRole: getRole,
  logout: logout,
  request: request,
  getApiBase: getApiBase,
}
