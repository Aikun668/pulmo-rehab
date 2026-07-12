Component({
  data: {
    selected: 0,
    list: [
      {
        pagePath: "/pages/home/index",
        text: "首页",
        iconPath: "/images/tabbar/home.png",
        selectedIconPath: "/images/tabbar/home-active.png",
        badge: 0,
        dot: false,
      },
      {
        pagePath: "/pages/check-in/index",
        text: "打卡",
        iconPath: "/images/tabbar/checkin.png",
        selectedIconPath: "/images/tabbar/checkin-active.png",
        badge: 0,
        dot: false,
      },
      {
        pagePath: "/pages/chat/index",
        text: "消息",
        iconPath: "/images/tabbar/chat.png",
        selectedIconPath: "/images/tabbar/chat-active.png",
        badge: 2,
        dot: false,
      },
      {
        pagePath: "/pages/rehab/index",
        text: "康复",
        iconPath: "/images/tabbar/rehab.png",
        selectedIconPath: "/images/tabbar/rehab-active.png",
        badge: 0,
        dot: false,
      },
      {
        pagePath: "/pages/profile/index",
        text: "我的",
        iconPath: "/images/tabbar/profile.png",
        selectedIconPath: "/images/tabbar/profile-active.png",
        badge: 0,
        dot: false,
      },
    ],
  },

  methods: {
    handleTabTap: function (e) {
      var path = e.currentTarget.dataset.path
      var idx = Number(e.currentTarget.dataset.index)
      this.setData({ selected: idx })
      wx.switchTab({ url: path })
    },
  },
})
