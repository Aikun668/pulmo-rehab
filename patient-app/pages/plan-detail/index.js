var auth = require("../../utils/auth.js")

var EXERCISE_GUIDES = [
  {
    id: "breathing",
    name: "缩唇腹式呼吸",
    target: "10分钟 · 2组",
    steps: [
      "坐姿或半卧位，放松肩颈",
      "闭口经鼻缓慢吸气2秒，腹部隆起",
      "缩唇如吹口哨，经嘴缓慢呼气4-6秒",
      "呼气时间是吸气的2-3倍",
      "重复10次为1组，休息30秒后再做第2组",
    ],
    precautions: "不要用力呼气；如有头晕暂停休息；饭后1小时内避免练习",
    expanded: true,
  },
  {
    id: "walking",
    name: "平地行走",
    target: "20分钟 · 1组",
    steps: [
      "选择平坦场地，穿舒适鞋子",
      "起步慢走3分钟热身",
      "逐渐加快至轻度气短但仍能说话的速度",
      "维持该速度行走15分钟",
      "最后2分钟放慢速度放松",
      "行走中如有明显气喘，暂停休息",
    ],
    precautions: "避免在空气污染严重时户外行走；随身携带急救药物；穿防滑鞋",
    expanded: true,
  },
  {
    id: "cough",
    name: "有效咳嗽排痰",
    target: "5分钟 · 2组",
    steps: [
      "坐直上身，双脚平放",
      "缓慢深吸气至最大限度",
      "屏气2-3秒",
      "腹部用力，连续咳嗽2-3声排痰",
      "缓慢经鼻吸气，避免急促呼吸",
      "重复2-3次为一组，早晚各做一组",
    ],
    precautions: "咳嗽时用手按压伤口部位（术后患者）；不要连续剧烈咳嗽；痰中带血需及时就医",
    expanded: true,
  },
]

function formatDateTime(value) {
  if (!value) {
    return "暂无更新时间"
  }

  var date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  var hours = String(date.getHours()).padStart(2, "0")
  var minutes = String(date.getMinutes()).padStart(2, "0")
  return year + "-" + month + "-" + day + " " + hours + ":" + minutes
}

Page({
  data: {
    patientId: 0,
    doctorId: null,
    isLoading: true,
    errorMessage: "",
    latestPlan: null,
    historyPlans: [],
    exerciseGuides: [],
  },

  onLoad: function () {
    this.setData({
      exerciseGuides: EXERCISE_GUIDES.map(function (guide) {
        return {
          id: guide.id,
          name: guide.name,
          target: guide.target,
          steps: guide.steps,
          precautions: guide.precautions,
          expanded: guide.expanded,
        }
      }),
    })
  },

  onShow: function () {
    this.setData({ patientId: auth.getPatientId(), doctorId: auth.getDoctorId() })
    this.loadPlans()
  },

  loadPlans: function () {
    var that = this
    var patientId = this.data.patientId
    var doctorId = this.data.doctorId

    this.setData({
      isLoading: true,
      errorMessage: "",
    })

    auth.request({
      url: auth.API_BASE + "/rehab-plans",
      method: "GET",
      data: {
        patient_id: patientId,
        doctor_id: doctorId,
      },
      success: function (response) {
        var respData = response.data
        var plans =
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          Array.isArray(respData.data)
            ? respData.data
            : []

        var normalizedPlans = plans.map(function (item) {
          return {
            id: item.id,
            title: item.title,
            content: item.content,
            createdAt: formatDateTime(item.created_at),
          }
        })

        that.setData({
          latestPlan: normalizedPlans[0] || null,
          historyPlans: normalizedPlans.slice(1),
          isLoading: false,
        })
      },
      fail: function () {
        that.setData({
          isLoading: false,
          errorMessage: "暂时无法读取训练方案，请稍后重试。",
          latestPlan: null,
          historyPlans: [],
        })
      },
    })
  },

  handleToggleGuide: function (event) {
    var idx = event.currentTarget.dataset.index
    var guides = this.data.exerciseGuides
    var newGuides = []
    for (var i = 0; i < guides.length; i++) {
      if (i === idx) {
        newGuides.push({
          id: guides[i].id,
          name: guides[i].name,
          target: guides[i].target,
          steps: guides[i].steps,
          precautions: guides[i].precautions,
          expanded: !guides[i].expanded,
        })
      } else {
        newGuides.push(guides[i])
      }
    }
    this.setData({ exerciseGuides: newGuides })
  },
})
