var auth = require("../../utils/auth.js")

var STORAGE_KEY_PREFIX = "chat_messages_"

// 首次使用时的初始种子消息
var SEED_MESSAGES = [
  { id: 1, sender: "doctor", text: "您好，今天训练感觉怎么样？", time: "09:15" },
  { id: 2, sender: "patient", text: "早上做了腹式呼吸训练，感觉还行，稍微有点累。", time: "09:18" },
  { id: 3, sender: "doctor", text: "适度的疲劳是正常的，注意训练后充分休息，明天可以尝试增加5分钟。", time: "09:20" },
  { id: 4, sender: "patient", text: "好的，谢谢李医师！", time: "09:22" },
]

function getStorageKey() {
  return STORAGE_KEY_PREFIX + (auth.getPatientId() || 0)
}

function loadMessages() {
  try {
    var stored = wx.getStorageSync(getStorageKey())
    if (stored && Array.isArray(stored) && stored.length > 0) {
      return stored
    }
  } catch (e) { /* ignore */ }
  // 无历史记录时用种子数据，并写入本地
  wx.setStorageSync(getStorageKey(), SEED_MESSAGES)
  return SEED_MESSAGES
}

function saveMessages(messages) {
  try {
    wx.setStorageSync(getStorageKey(), messages)
  } catch (e) { /* ignore */ }
}

Page({
  data: {
    doctorName: "李医师",
    doctorTitle: "康复科主治医师",
    patientSurname: "张",
    chatDateTip: "今天",
    inputText: "",
    scrollToId: "",
    messages: [],
  },

  onLoad: function () {
    // 初始化加载持久化消息
    this.setData({ messages: loadMessages() })
  },

  onShow: function () {
    // 自定义 tabBar：设置选中状态（消息tab = index 2）
    if (typeof this.getTabBar === 'function' && this.getTabBar()) {
      this.getTabBar().setData({ selected: 2 })
    }

    // 每次显示时重新加载消息（可能在其他页面被操作过）
    this.setData({ messages: loadMessages() })

    // 同步患者姓氏（与我的页面/首页一致）
    var userName = auth.getUserName()
    if (!userName || userName === "用户") {
      userName = "张三"
    }
    this.setData({ patientSurname: userName.charAt(0) || "张" })

    var that = this
    // 加载医师信息
    auth.request({
      url: auth.API_BASE + "/patients/" + auth.getPatientId() + "/doctor",
      method: "GET",
      success: function (response) {
        var data = response.data
        if (response.statusCode === 200 && data && data.code === 200 && data.data) {
          var d = data.data
          var surname = (d.name || "李").charAt(0)
          that.setData({
            doctorName: surname + "医师",
            doctorTitle: d.title || "康复科主治医师",
          })
        }
      },
      fail: function () {
        // 使用默认 mock 数据
      },
    })
    this.scrollToBottom()
  },

  handleInputChange: function (e) {
    this.setData({ inputText: e.detail.value })
  },

  handleSend: function () {
    var text = this.data.inputText.trim()
    if (!text) return

    var newMsg = {
      id: Date.now(),
      sender: "patient",
      text: text,
      time: this._formatTime(new Date()),
    }

    var messages = this.data.messages.concat([newMsg])
    this.setData({
      messages: messages,
      inputText: "",
    })
    // 持久化保存
    saveMessages(messages)
    this.scrollToBottom()
  },

  scrollToBottom: function () {
    var msgs = this.data.messages
    if (msgs.length > 0) {
      this.setData({ scrollToId: "msg-" + msgs[msgs.length - 1].id })
    }
  },

  _formatTime: function (date) {
    var h = String(date.getHours()).padStart(2, "0")
    var m = String(date.getMinutes()).padStart(2, "0")
    return h + ":" + m
  },
})
