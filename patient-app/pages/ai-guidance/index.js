var auth = require("../../utils/auth.js")

Page({
  data: {
    patientId: 0,

    // 康复状态摘要
    rehabLevel: "加载中…",
    recentTrainedDays: 0,
    recentTotalMinutes: 0,
    completionRate: "0%",

    // AI综合指导
    aiGuidance: null,

    // 快捷问题
    quickQuestions: [
      "缩唇呼吸怎么做更有效？",
      "今天可以多走10分钟吗？",
      "爬楼梯气促怎么缓解？",
    ],

    // 对话消息
    messages: [],
    inputText: "",

    // 展开收起状态
    guidanceExpanded: false,

    // 对话loading状态
    chatLoading: false,
  },

  onLoad: function () {
    this.setData({ patientId: auth.getPatientId() })

    // 1. 加载康复统计 + AI指导（并行）
    this.loadRehabStats()
    this.loadAiGuidance()

    // 2. 预置一条Mock问答，让页面进入就有对话内容
    this.setData({
      messages: [
        {
          id: "user_mock_1",
          role: "user",
          content: "缩唇呼吸怎么做更有效？",
          contentLines: ["缩唇呼吸怎么做更有效？"],
        },
        {
          id: "ai_mock_1",
          role: "ai",
          content: "缩唇呼吸是肺康复中最核心的训练方法之一，以下建议可以帮助您做得更有效：\n\n1. 吸气时用鼻子缓慢深吸，约4秒，让空气充分进入肺部底部。\n2. 呼气时将嘴唇缩成吹口哨的形状，缓慢均匀呼出，呼气时间应是吸气时间的2-3倍（约6-8秒）。\n3. 呼气时不要用力，保持自然放松，过大的压力反而会增加气道阻力。\n4. 可以在面前放一张纸，呼气时让纸轻微摆动，说明气流速度合适。\n5. 每次练习10分钟，每日3次，坚持1周后您会明显感觉气促减轻。\n\n训练时如有头晕或不适，请立即停下休息。祝您康复顺利！",
          contentLines: [
            "缩唇呼吸是肺康复中最核心的训练方法之一，以下建议可以帮助您做得更有效：",
            "",
            "1. 吸气时用鼻子缓慢深吸，约4秒，让空气充分进入肺部底部。",
            "2. 呼气时将嘴唇缩成吹口哨的形状，缓慢均匀呼出，呼气时间应是吸气时间的2-3倍（约6-8秒）。",
            "3. 呼气时不要用力，保持自然放松，过大的压力反而会增加气道阻力。",
            "4. 可以在面前放一张纸，呼气时让纸轻微摆动，说明气流速度合适。",
            "5. 每次练习10分钟，每日3次，坚持1周后您会明显感觉气促减轻。",
            "",
            "训练时如有头晕或不适，请立即停下休息。祝您康复顺利！",
          ],
        },
      ],
    })
  },

  // ===== 展开/收起详细指导 =====
  handleToggleGuidance: function () {
    this.setData({
      guidanceExpanded: !this.data.guidanceExpanded,
    })
  },

  // ===== 加载康复统计数据 =====
  loadRehabStats: function () {
    var that = this
    auth.request({
      url: auth.API_BASE + "/training-logs/progress-30d",
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        var respData = response.data
        var days = []
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data &&
          Array.isArray(respData.data.days)
        ) {
          days = respData.data.days
        }
        if (days.length > 0) {
          var recent7 = days.slice(-7)
          var trainedDays = recent7.filter(function (d) { return d.duration_minutes > 0 }).length
          var totalDuration = recent7.reduce(function (sum, d) { return sum + d.duration_minutes }, 0)
          var rate = Math.round((trainedDays / 7) * 100)
          that.setData({
            recentTrainedDays: trainedDays,
            recentTotalMinutes: totalDuration,
            completionRate: rate + "%",
          })
        }
      },
      fail: function () {
        // 保留初始值
      },
    })
  },

  // ===== 加载AI指导内容（调用后端API） =====
  loadAiGuidance: function () {
    var that = this
    var requestUrl = auth.API_BASE + "/ai-guidance/latest"
    console.log("[AI指导] requestUrl =", requestUrl)
    console.log("[AI指导] patientId =", this.data.patientId)
    console.log("[AI指导] token =", auth.getToken())
    auth.request({
      url: requestUrl,
      method: "GET",
      data: { patient_id: this.data.patientId },
      success: function (response) {
        console.log("[AI指导] success, statusCode =", response.statusCode, "data =", response.data)
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data
        ) {
          var d = respData.data
          that.setData({
            aiGuidance: {
              intro: d.intro,
              points: d.points,
              summary: d.summary,
              updatedAt: d.updated_at,
            },
            rehabLevel: d.rehab_level,
            recentTrainedDays: d.trained_days,
            recentTotalMinutes: d.total_minutes,
            completionRate: d.completion_rate,
          })
        } else {
          console.log("[AI指导] 响应格式不匹配，走Mock兜底")
          that._loadMockFallback()
        }
      },
      fail: function (err) {
        console.log("[AI指导] fail, errMsg =", err && err.errMsg)
        // API失败，用Mock兜底
        that._loadMockFallback()
      },
    })
  },

  // ===== Mock兜底数据 =====
  _loadMockFallback: function () {
    this.setData({
      aiGuidance: {
        intro: "基于您近7天的训练数据和医生下发的康复方案，AI为您综合分析并提出以下建议：",
        points: [
          "缩唇呼吸训练完成度良好，建议维持每日3组，每组10分钟的训练强度。",
          "步行训练本周血氧波动较大，建议将时长适当降低，待血氧稳定后再逐步恢复。",
          "注意避免在空气质量差时进行户外步行训练。",
        ],
        summary: "综合来看，您当前康复进展良好，训练完成率持续提升。建议重点关注血氧波动，适当调整步行训练强度，呼吸训练维持当前水平即可。如有不适请及时联系医生。",
        updatedAt: "暂无数据",
      },
      rehabLevel: "中度恢复",
      recentTrainedDays: 5,
      recentTotalMinutes: 120,
      completionRate: "71%",
    })
  },

  // ===== 输入框变化 =====
  handleInputChange: function (e) {
    this.setData({ inputText: e.detail.value })
  },

  // ===== 快捷问题点击 =====
  handleQuickQuestion: function (e) {
    var question = e.currentTarget.dataset.q
    this._sendQuestion(question)
  },

  // ===== 发送消息 =====
  handleSend: function () {
    var text = this.data.inputText.trim()
    if (!text || this.data.chatLoading) return

    this.setData({ inputText: "" })
    this._sendQuestion(text)
  },

  // ===== 内部：发送问题（Mock兜底，API不可用时直接回复） =====
  _sendQuestion: function (question) {
    var that = this

    // 先显示用户消息
    this._addUserMessage(question)

    // 显示AI正在思考
    this.setData({ chatLoading: true })
    this._addAiMessage("正在思考…")

    var chatUrl = auth.API_BASE + "/ai-guidance/chat"
    auth.request({
      url: chatUrl,
      method: "POST",
      data: {
        patient_id: this.data.patientId,
        question: question,
      },
      success: function (response) {
        var respData = response.data
        if (
          response.statusCode === 200 &&
          respData &&
          respData.code === 200 &&
          respData.data &&
          respData.data.reply
        ) {
          that._replaceLastAiMessage(respData.data.reply)
          that.setData({ chatLoading: false })
        } else {
          // API返回但无有效reply → 用Mock回复
          that._mockChatReply(question)
        }
      },
      fail: function () {
        // API失败 → 用Mock回复
        that._mockChatReply(question)
      },
    })
  },

  // ===== Mock对话回复 =====
  _mockChatReply: function (question) {
    var that = this
    var mockReplies = {
      "缩唇呼吸怎么做更有效？": "缩唇呼吸是肺康复中最核心的训练方法之一。\n\n1. 用鼻子缓慢深吸气约4秒。\n2. 缩唇如吹口哨，缓慢呼气6-8秒，呼气时间是吸气的2-3倍。\n3. 不要用力呼气，保持自然放松。\n4. 每次练习10分钟，每日3次。\n\n坚持1周后气促会明显减轻，如有头晕请立即休息。",
      "今天可以多走10分钟吗？": "根据您当前Level 3中度恢复阶段的训练数据：\n\n近7天完成率约71%，步行训练血氧有轻微波动。建议：\n\n1. 今天步行时间可以在原基础上增加5-8分钟，但不建议直接加10分钟。\n2. 步行时随身携带血氧仪，血氧低于93%时立即停下休息。\n3. 如果感觉气促加重，回到原来的时长即可，循序渐进更重要。\n\n下周如果血氧稳定，可以考虑再增加5分钟。",
      "爬楼梯气促怎么缓解？": "爬楼梯时气促是肺康复患者常见的困扰，以下方法可以帮助缓解：\n\n1. 爬楼梯前先做3-5次缩唇呼吸，预热肺部。\n2. 每上1-2层台阶后停下，做2-3次缩唇呼吸调整。\n3. 上楼时吸气，停下时呼气，节奏比速度重要。\n4. 如果气促明显，可以侧身扶墙缓慢上行，减少胸腔压力。\n5. 日常多练习腹式呼吸，增强膈肌力量，爬楼梯能力会逐步提升。\n\n切记：如有严重气促或血氧低于90%，请立即停下并联系医生。",
    }

    // 查找精确匹配的mock回复
    var reply = mockReplies[question]

    // 没有精确匹配则生成通用mock回复
    if (!reply) {
      reply = "感谢您的提问！基于您当前的康复数据（Level 3中度恢复，近7天完成率71%），以下是我的建议：\n\n1. 当前训练节奏良好，建议继续保持每日打卡的习惯。\n2. 如有任何训练中的不适（气促加重、头晕、血氧下降），请立即停下休息。\n3. 可以在下次训练时记录自己的感受，方便我们更精准地调整方案。\n\n如需更详细的个性化建议，建议联系您的康复医生进行面对面评估。祝您早日康复！"
    }

    // 延迟1秒模拟"思考"效果
    setTimeout(function () {
      that._replaceLastAiMessage(reply)
      that.setData({ chatLoading: false })
    }, 1000)
  },

  // ===== 内部：添加用户消息 =====
  _addUserMessage: function (content) {
    var messages = this.data.messages.slice()
    messages.push({
      id: "user_" + Date.now(),
      role: "user",
      content: content,
      contentLines: [content],
    })
    this.setData({ messages: messages })
  },

  // ===== 内部：添加AI消息 =====
  _addAiMessage: function (content) {
    var messages = this.data.messages.slice()
    messages.push({
      id: "ai_" + Date.now(),
      role: "ai",
      content: content,
      contentLines: content.split("\n"),
    })
    this.setData({ messages: messages })
  },

  // ===== 内部：替换最后一条AI消息 =====
  _replaceLastAiMessage: function (content) {
    var messages = this.data.messages.slice()
    // 找最后一条AI消息
    for (var i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "ai") {
        messages[i].content = content
        messages[i].contentLines = content.split("\n")
        break
      }
    }
    this.setData({ messages: messages })
  },
})
