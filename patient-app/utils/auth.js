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
 * 401 自动重登机制：接口返回 401 时自动调用 dev-login 并重试原请求
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

  // 保存原始回调
  var originalSuccess = opts.success || null
  var originalFail = opts.fail || null
  var originalComplete = opts.complete || null
  var hasRetried = opts._hasRetried || false

  opts.success = function (res) {
    if (res.statusCode === 401 && !hasRetried) {
      // token 过期，自动重登后重试
      _retryAfterReLogin(opts, originalSuccess, originalFail, originalComplete)
      return
    }
    if (originalSuccess) {
      originalSuccess(res)
    }
  }

  opts.fail = function (err) {
    if (originalFail) {
      originalFail(err)
    }
  }

  opts.complete = function (res) {
    if (res.statusCode !== 401 || hasRetried) {
      if (originalComplete) {
        originalComplete(res)
      }
    }
  }

  wx.request(opts)
}

/**
 * 401 后自动重登，然后重试原请求（仅重试一次）
 */
function _retryAfterReLogin(originalOpts, originalSuccess, originalFail, originalComplete) {
  var patientId = getPatientId() || 17

  login(patientId).then(function () {
    // 重登成功，用新 token 重新发起原请求
    var newOpts = {}
    for (var key in originalOpts) {
      if (key !== "success" && key !== "fail" && key !== "complete" && key !== "_hasRetried") {
        newOpts[key] = originalOpts[key]
      }
    }
    newOpts._hasRetried = true
    newOpts.success = originalSuccess
    newOpts.fail = originalFail
    newOpts.complete = originalComplete

    // 注入新 token
    var newToken = getToken()
    newOpts.header = newOpts.header || {}
    if (newToken) {
      newOpts.header["Authorization"] = "Bearer " + newToken
    }

    wx.request(newOpts)
  }).catch(function () {
    // 重登失败，走原始 fail 回调
    if (originalFail) {
      originalFail({ errMsg: "auto re-login failed after 401" })
    }
    if (originalComplete) {
      originalComplete({ statusCode: 401 })
    }
  })
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
