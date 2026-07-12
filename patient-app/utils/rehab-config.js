/**
 * 康复等级公共配置 — 首页、打卡页共享
 * 改一处全局生效，避免重复定义
 */

// ===== 等级名称 =====
var LEVEL_NAMES = {
  1: "重度恢复",
  2: "轻度活动受限",
  3: "中度恢复",
  4: "恢复良好",
  5: "接近完全恢复",
}

// ===== 等级颜色 =====
var LEVEL_COLORS = {
  1: "#ef4444",
  2: "#f97316",
  3: "#eab308",
  4: "#22c55e",
  5: "#3b82f6",
}

// ===== 等级训练建议文案 =====
var LEVEL_ADVICE = {
  1: "当前为重度恢复期，请以腹式呼吸训练为主，动作缓慢柔和，避免剧烈活动。如感头晕请立即停止并休息。",
  2: "当前为轻度活动受限阶段，建议以缩唇呼吸训练为核心，配合床边坐立练习。注意控制活动强度，有头晕时立即坐下。",
  3: "当前为中度恢复阶段，可进行深吸气训练和呼吸节奏控制，配合平地行走。保持呼吸节律稳定，携带血氧仪监测。",
  4: "当前恢复良好，可进行呼吸耐力训练和步行耐力训练。注意运动后充分休息，监测心率不超过安全范围。",
  5: "当前接近完全恢复，可进行综合肺功能训练和有氧运动。坚持每日训练，注意运动后恢复，警惕复发信号。",
}

// ===== 按等级的默认训练方案（AI 处方不可用时的降级方案） =====
var LEVEL_DEFAULT_EXERCISES = {
  1: [
    {
      name: "腹式呼吸训练",
      purpose: "增强膈肌力量，改善呼吸深度",
      duration: "每次5-10分钟",
      steps: ["仰卧或坐位，放松全身", "一手放胸前，一手放腹部", "用鼻缓慢吸气，腹部隆起", "用口缓慢呼气，腹部下陷"],
      precautions: ["动作缓慢柔和", "如感头晕立即停止"],
    },
    {
      name: "被动活动训练",
      purpose: "维持关节活动度，预防僵硬",
      duration: "每次5分钟",
      steps: ["家属协助活动四肢关节", "动作轻柔，避免疼痛"],
      precautions: ["避免剧烈活动"],
    },
  ],
  2: [
    {
      name: "缩唇呼吸训练",
      purpose: "改善呼吸效率，延长呼气时间",
      duration: "每次10分钟，每日3次",
      steps: ["鼻吸气4秒", "缩唇缓慢呼气6秒", "自然停顿2秒"],
      precautions: ["不要用力呼气", "如感头晕请停止"],
    },
    {
      name: "床边坐立训练",
      purpose: "增强体力，提高活动耐力",
      duration: "每次10-15分钟",
      steps: ["床边坐起，双脚着地", "保持坐姿5分钟", "逐步延长坐立时间"],
      precautions: ["如有头晕立即躺下"],
    },
  ],
  3: [
    {
      name: "深吸气训练",
      purpose: "增加肺活量，改善通气功能",
      duration: "每次10分钟",
      steps: ["经鼻深吸气4秒", "屏气2秒", "缩唇缓慢呼气6秒"],
      precautions: ["呼气时间是吸气时间的2-3倍"],
    },
    {
      name: "呼吸节奏控制",
      purpose: "建立良好呼吸模式",
      duration: "每次10分钟",
      steps: ["正常呼吸节奏", "逐步延长呼气时间", "配合步行训练"],
      precautions: ["保持呼吸节律稳定"],
    },
    {
      name: "平地行走训练",
      purpose: "提升运动耐力",
      duration: "每次15-20分钟",
      steps: ["平地慢速行走", "维持轻度气短水平", "逐渐增加距离"],
      precautions: ["携带血氧仪监测"],
    },
  ],
  4: [
    {
      name: "呼吸耐力训练",
      purpose: "提升呼吸肌耐力",
      duration: "每次15分钟",
      steps: ["深吸气5秒", "屏气3秒", "缩唇呼气7秒", "重复10次为一组"],
      precautions: ["训练后充分休息"],
    },
    {
      name: "步行耐力训练",
      purpose: "提高有氧运动能力",
      duration: "每次20-30分钟",
      steps: ["中等速度步行", "可适当增加坡度", "监测心率不超过120"],
      precautions: ["注意运动强度"],
    },
    {
      name: "上肢力量训练",
      purpose: "增强上肢肌力，辅助呼吸",
      duration: "每次10分钟",
      steps: ["持轻物做肩关节活动", "配合呼吸节奏", "逐步增加重量"],
      precautions: ["避免屏气动作"],
    },
  ],
  5: [
    {
      name: "综合肺功能训练",
      purpose: "全面提升呼吸功能",
      duration: "每次20分钟",
      steps: ["深吸气5秒", "屏气3秒", "用力快速呼气", "配合全身运动"],
      precautions: ["如有不适当即停止"],
    },
    {
      name: "有氧运动训练",
      purpose: "提升心肺耐力",
      duration: "每次30分钟",
      steps: ["快步走或慢跑", "心率控制在目标范围", "循序渐进增加强度"],
      precautions: ["注意运动后恢复"],
    },
    {
      name: "呼吸肌力量训练",
      purpose: "增强呼吸肌力量",
      duration: "每次15分钟",
      steps: ["深呼吸练习", "阻抗呼吸训练", "呼吸肌拉伸"],
      precautions: ["避免过度疲劳"],
    },
  ],
}

// ===== 按等级的呼吸计时器节拍配置 =====
var LEVEL_BREATH_CONFIG = {
  1: {
    phases: [
      { key: "inhale", label: "吸气", duration: 3 },
      { key: "hold", label: "屏气", duration: 1 },
      { key: "exhale", label: "呼气", duration: 5 },
    ],
    rounds: 5,
  },
  2: {
    phases: [
      { key: "inhale", label: "吸气", duration: 4 },
      { key: "hold", label: "屏气", duration: 2 },
      { key: "exhale", label: "呼气", duration: 6 },
    ],
    rounds: 5,
  },
  3: {
    phases: [
      { key: "inhale", label: "吸气", duration: 4 },
      { key: "hold", label: "屏气", duration: 2 },
      { key: "exhale", label: "呼气", duration: 6 },
    ],
    rounds: 8,
  },
  4: {
    phases: [
      { key: "inhale", label: "吸气", duration: 5 },
      { key: "hold", label: "屏气", duration: 3 },
      { key: "exhale", label: "呼气", duration: 7 },
    ],
    rounds: 8,
  },
  5: {
    phases: [
      { key: "inhale", label: "吸气", duration: 5 },
      { key: "hold", label: "屏气", duration: 3 },
      { key: "exhale", label: "呼气", duration: 8 },
    ],
    rounds: 10,
  },
}

var DEFAULT_BREATH_CONFIG = LEVEL_BREATH_CONFIG[3]

// ===== 公共工具函数 =====

function formatToday() {
  var date = new Date()
  var year = date.getFullYear()
  var month = String(date.getMonth() + 1).padStart(2, "0")
  var day = String(date.getDate()).padStart(2, "0")
  return year + "-" + month + "-" + day
}

// 从时长描述中解析目标分钟数
function parseDurationMinutes(durationStr) {
  if (!durationStr) return 10
  var match = durationStr.match(/(\d+)/)
  if (match) return parseInt(match[1], 10)
  return 10
}

module.exports = {
  LEVEL_NAMES: LEVEL_NAMES,
  LEVEL_COLORS: LEVEL_COLORS,
  LEVEL_ADVICE: LEVEL_ADVICE,
  LEVEL_DEFAULT_EXERCISES: LEVEL_DEFAULT_EXERCISES,
  LEVEL_BREATH_CONFIG: LEVEL_BREATH_CONFIG,
  DEFAULT_BREATH_CONFIG: DEFAULT_BREATH_CONFIG,
  formatToday: formatToday,
  parseDurationMinutes: parseDurationMinutes,
}
