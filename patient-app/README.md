# 肺康复助手 - 患者端小程序

## 项目定位
肺康复管理系统的患者端微信小程序，为需要日常康复训练的患者提供打卡、进度追踪、方案查看和 AI 小结功能。

## 技术栈
- **框架**：微信小程序原生开发
- **渲染引擎**：Skyline（`renderer: "skyline"`）
- **组件框架**：glass-easel
- **语言**：JavaScript + WXML + WXSS
- **appid**：`wx7761ea799e603529`
- **SDK 版本**：3.16.1
- **npm 依赖**：无（纯原生项目）

## 页面结构

### 主页面（底部 tabBar）
| 页面 | 路径 | 职责 |
|------|------|------|
| 首页 | `pages/home/index` | 今日训练概览、进度圆环、AI 小结预览 |
| 打卡 | `pages/check-in/index` | 提交当天训练记录 |
| 康复 | `pages/rehab/index` | 训练方案、30天进度、AI 小结入口 |

### 二级页面
| 页面 | 路径 | 职责 |
|------|------|------|
| 训练方案详情 | `pages/plan-detail/index` | 最新方案 + 历史方案列表 |
| 30天进度 | `pages/progress/index` | 近30天训练趋势柱状图和统计摘要 |
| AI 小结 | `pages/ai-summary/index` | 最新 AI 康复周报 |

## 组件
- `components/navigation-bar/`：自定义导航栏（配合 `navigationStyle: custom`）

## 已接后端接口
| 接口 | 方法 | 用途 |
|------|------|------|
| `/api/training-logs` | GET | 读取当天训练记录（首页进度、打卡页回填） |
| `/api/training-logs` | POST | 提交/更新训练记录 |
| `/api/training-logs/progress-30d` | GET | 读取近30天训练趋势 |
| `/api/rehab-plans` | GET | 读取训练方案列表 |
| `/api/ai-summaries/latest` | GET | 读取最新 AI 康复小结 |

## 当前联调参数
- `patient_id`: `1`
- `doctor_id`: `13`
- `API_BASE_URL`: `http://127.0.0.1:8000/api`
- 首页目标时长：固定 `20` 分钟（后续可结构化）

## 当前阶段状态
- [x] 项目初始化 + 目录结构搭建
- [x] 3 tabBar 页面骨架
- [x] 3 二级页面骨架
- [x] 自定义 tabBar 图标
- [x] 首页布局收敛（单主卡 + 双工具按钮 + AI卡）
- [x] 首页进度环形图真实数据（动态 canvas 绘制）
- [x] 首页 AI 卡真实预览
- [x] 打卡页真实提交（含读取回填、覆盖更新、提交后回首页刷新）
- [x] 30天进度页真实趋势（柱状图 + 统计摘要）
- [x] 康复页真实方案摘要 + 30天摘要 + AI预览
- [x] 训练方案详情页真实历史列表
- [x] AI小结页真实内容（含正确周期字段）
- [ ] 联调收口检查与问题修复
- [ ] 目标时长结构化
- [ ] 真实登录态接入
- [ ] 正式部署

## 开发备注
- 首页进度圆环使用 Canvas 动态绘制，而不是静态图片
- 同一患者同一天打卡走覆盖更新（后端规则）
- 提交成功后自动跳转回首页刷新进度
- 所有页面进入时（`onShow`）重新拉取数据，确保多页面间数据一致
- 参考项目目录：`呼吸康复-Gemini生成参考/`（Android Compose 实现，仅作布局参考）

## 相关文档
- `memory.md`：Agent 交接文档
- `呼吸康复-Gemini生成参考/`：UI/UX 灵感参考项目
