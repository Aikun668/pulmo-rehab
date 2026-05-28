/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  Building, 
  Users, 
  Percent, 
  TrendingUp, 
  Award, 
  ArrowRight,
  ChevronRight, 
  Activity, 
  Layers, 
  FileCheck,
  ShieldAlert,
  Calendar,
  Sparkles,
  Search
} from "lucide-react";

interface CenterData {
  id: string;
  name: string;
  pi: string;
  recruited: number;
  target: number;
  active: number;
  compliance: number;
  alerts: number;
  status: "active" | "completed" | "paused";
}

interface DirectorDashboardProps {
  doctorName: string;
  onNavigateToPatients: () => void;
}

export default function DirectorDashboard({
  doctorName,
  onNavigateToPatients
}: DirectorDashboardProps) {
  const [searchTerm, setSearchTerm] = useState("");

  // Professional multi-center clinical study statistics
  const centers: CenterData[] = [
    {
      id: "cnt_001",
      name: "华东多中心呼吸协作组 (上海交通大学医学院附属瑞金医院)",
      pi: "陆明雅 教授",
      recruited: 156,
      target: 200,
      active: 62,
      compliance: 84.5,
      alerts: 3,
      status: "active"
    },
    {
      id: "cnt_002",
      name: "本院呼吸康复组 (第一门诊随访组 - 本中心)",
      pi: doctorName,
      recruited: 84,
      target: 100,
      active: 41,
      compliance: 82.5,
      alerts: 1, // Zhao Dekuan is high risk alert
      status: "active"
    },
    {
      id: "cnt_003",
      name: "北京协和医院 呼吸与危重症医学协同中心",
      pi: "张海华 教授",
      recruited: 182,
      target: 200,
      active: 74,
      compliance: 87.1,
      alerts: 2,
      status: "active"
    },
    {
      id: "cnt_004",
      name: "西部肺功能康复示范区 (四川大学华西医院)",
      pi: "王瑞波 主任医师",
      recruited: 160,
      target: 150,
      active: 31,
      compliance: 78.2,
      alerts: 5,
      status: "active"
    },
    {
      id: "cnt_005",
      name: "南部多中心中药熏蒸肺复张中心 (广州医科大学附属第一医院)",
      pi: "钟其洪 院士团队",
      recruited: 240,
      target: 250,
      active: 110,
      compliance: 89.4,
      alerts: 1,
      status: "active"
    }
  ];

  const totalRecruited = centers.reduce((sum, c) => sum + c.recruited, 0);
  const totalTarget = centers.reduce((sum, c) => sum + c.target, 0);
  const totalActive = centers.reduce((sum, c) => sum + c.active, 0);
  const avgCompliance = parseFloat((centers.reduce((sum, c) => sum + c.compliance, 0) / centers.length).toFixed(1));
  const totalAlerts = centers.reduce((sum, c) => sum + c.alerts, 0);

  const filteredCenters = centers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.pi.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 font-sans text-[#243447]">
      
      {/* 顶部标题区 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-[#2F5D7C] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded-md uppercase tracking-wider font-mono">
              DIRECTOR CONTROL CONSOLE
            </span>
            <span className="text-[10px] font-bold text-[#5B6B7A] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded-md font-mono">
              国自然重大专项（COPD随访研究B3组）
            </span>
          </div>
          <h2 className="text-lg font-bold text-[#243447] tracking-tight flex items-center gap-2">
            <span>多中心科研主任协同大盘系统</span>
          </h2>
          <p className="text-xs text-[#5B6B7A]">
            学术主导：<span className="font-semibold text-[#2F5D7C]">多中心联合项目办</span> · 覆盖全球标准慢阻肺肺活量调节阀队列研究
          </p>
        </div>

        {/* 顶部科研核心简报日期 */}
        <div className="flex items-center gap-2.5 bg-white border border-[#D9E2EC] p-2.5 px-3.5 rounded-xl text-xs text-[#5B6B7A]">
          <Calendar className="h-4 w-4 text-[#8A97A6] shrink-0" />
          <span>随访数据锁定倒计时: </span>
          <span className="font-bold text-[#243447] font-mono">42天 (2026-07-04 阶段结题)</span>
        </div>
      </div>

      {/* 无后端支撑提示 */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2 text-xs text-amber-800">
        <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold">演示数据页面（无后端接口支撑）</p>
          <p className="text-amber-700/80">当前展示内容为前端静态占位数据，未接入真实后端。如需管理真实患者，请切换至「门诊患者康复随访」。</p>
        </div>
      </div>

      {/* 核心医学指标卡片 (Triage Macro Cards) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* 指标1：累计入组病案 */}
        <div className="bg-white rounded-xl p-4 border border-[#D9E2EC] space-y-1">
          <div className="flex items-center justify-between text-[#8A97A6] text-xs font-semibold">
            <span>总入群随访队列</span>
            <Users className="h-4 w-4 text-[#2F5D7C]" />
          </div>
          <div className="flex items-baseline gap-2 pt-1.5">
            <span className="text-2xl font-bold text-[#243447] font-mono">{totalRecruited}</span>
            <span className="text-[10px] text-[#5B6B7A]">例已录入</span>
          </div>
          <div className="w-full bg-[#F4F7FA] h-1.5 rounded-full overflow-hidden mt-1 bg-slate-100/70 border border-[#D9E2EC]/20">
            <div className="bg-[#2F5D7C] h-full rounded-full" style={{ width: `${(totalRecruited / totalTarget) * 100}%` }}></div>
          </div>
          <p className="text-[10px] text-[#8A97A6] pt-1 flex justify-between">
            <span>总科研目标: {totalTarget} 例</span>
            <span>已达成: {((totalRecruited / totalTarget) * 100).toFixed(1)}%</span>
          </p>
        </div>

        {/* 指标2：活跃监控中病例 */}
        <div className="bg-white rounded-xl p-4 border border-[#D9E2EC] space-y-1">
          <div className="flex items-center justify-between text-[#8A97A6] text-xs font-semibold">
            <span>实时活跃监控病例</span>
            <Activity className="h-4 w-4 text-[#5B9B7A]" />
          </div>
          <div className="flex items-baseline gap-2 pt-1.5">
            <span className="text-2xl font-bold text-[#5B9B7A] font-mono">{totalActive}</span>
            <span className="text-[10px] text-[#5B6B7A]">例（指氧握持阀通信中）</span>
          </div>
          <div className="text-[10px] text-[#8A97A6] pt-2 flex items-center gap-1">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#5B9B7A] animate-pulse"></span>
            <span>硬件传感器平均 12.4小时 通讯一次</span>
          </div>
        </div>

        {/* 指标3：平均处方依从率 */}
        <div className="bg-white rounded-xl p-4 border border-[#D9E2EC] space-y-1">
          <div className="flex items-center justify-between text-[#8A97A6] text-xs font-semibold">
            <span>多中心平均依从率</span>
            <Percent className="h-4 w-4 text-[#2F5D7C]" />
          </div>
          <div className="flex items-baseline gap-2 pt-1.5">
            <span className="text-2xl font-bold text-[#243447] font-mono">{avgCompliance}%</span>
            <span className="text-[10px] text-[#5B6B7A]">临床标准 (限值80%)</span>
          </div>
          <div className="w-full bg-[#F4F7FA] h-1.5 rounded-full overflow-hidden mt-1">
            <div className="bg-[#2F5D7C] h-full rounded-full" style={{ width: `${avgCompliance}%` }}></div>
          </div>
          <p className="text-[10px] text-[#8A97A6] pt-1">
            本周较上篇考核节点提振 <span className="text-[#5B9B7A] font-mono font-bold">+1.4%</span>
          </p>
        </div>

        {/* 指标4：联合预警待核查 */}
        <div className="bg-white rounded-xl p-4 border border-[#D9E2EC] space-y-1">
          <div className="flex items-center justify-between text-[#8A97A6] text-xs font-semibold">
            <span>高危流失及脱附预警</span>
            <ShieldAlert className="h-4 w-4 text-[#D95C5C]" />
          </div>
          <div className="flex items-baseline gap-2 pt-1.5">
            <span className="text-2xl font-bold text-[#D95C5C] font-mono">{totalAlerts}</span>
            <span className="text-[10px] text-[#5B6B7A]">例临床脱附标记</span>
          </div>
          <div className="text-[10px] text-[#8A97A6] pt-2 flex items-center gap-1">
            <span className="text-[#D95C5C] font-semibold font-mono bg-[#FDF2F2] px-1 py-0.2 border border-[#F8D2D2] rounded">本中心 1 例</span>
            <span>呼吁随访医师协助核查</span>
          </div>
        </div>

      </div>

      {/* 中部：科学大数据中心 & 招募队列图解 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* 左、中：SVG高品质多中心近7月招募趋势曲线 */}
        <div className="bg-white rounded-xl p-5 border border-[#D9E2EC] lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E7EDF3] pb-3">
            <div className="space-y-0.5">
              <span className="text-[9px] font-bold text-[#8A97A6] uppercase tracking-wider block font-mono">EPIDEMIOLOGY ENROLLMENT CHART</span>
              <h4 className="text-sm font-bold text-[#243447] flex items-center gap-1.5">
                <TrendingUp className="h-4 w-4 text-[#2F5D7C]" />
                <span>各省协同单位历月队列规模递增图</span>
              </h4>
            </div>
            {/* Legend indicators */}
            <div className="flex items-center gap-3.5 text-[10px] font-bold text-[#5B6B7A] mr-1.5">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#2F5D7C]"></span>
                <span>联合招募入组趋势</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-[#5B9B7A]"></span>
                <span>核心活跃依从</span>
              </div>
            </div>
          </div>

          {/* SVG Line / Area Graph */}
          <div className="pt-2">
            <div className="relative h-44 w-full bg-[#F4F7FA]/50 rounded-lg border border-[#D9E2EC] p-2 flex flex-col justify-between">
              
              {/* Backing structural gridlines */}
              <div className="absolute inset-x-0 top-6 border-t border-dashed border-[#D9E2EC]/60"></div>
              <div className="absolute inset-x-0 top-16 border-t border-dashed border-[#D9E2EC]/60"></div>
              <div className="absolute inset-x-0 top-26 border-t border-dashed border-[#D9E2EC]/60"></div>
              <div className="absolute inset-x-0 top-36 border-t border-dashed border-[#D9E2EC]/60"></div>

              {/* Pure SVG path mapping */}
              <svg className="absolute inset-0 h-full w-full" viewBox="0 0 600 176" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="primaryGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#2f5d7c" stopOpacity="0.12" />
                    <stop offset="100%" stopColor="#2f5d7c" stopOpacity="0.00" />
                  </linearGradient>
                  <linearGradient id="complyGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#5b9b7a" stopOpacity="0.08" />
                    <stop offset="100%" stopColor="#5b9b7a" stopOpacity="0.00" />
                  </linearGradient>
                </defs>

                {/* 1. Joint Recruit Gradient Area */}
                <path 
                  d="M 50 140 C 120 120, 200 110, 280 80 C 360 70, 440 50, 550 30 L 550 160 L 50 160 Z" 
                  fill="url(#primaryGrad)"
                />

                {/* 2. Active Compliance Gradient Area */}
                <path 
                  d="M 50 150 C 120 135, 200 120, 280 95 C 360 85, 440 68, 550 50 L 550 160 L 50 160 Z" 
                  fill="url(#complyGrad)"
                />

                {/* 3. Joint Recruit Line */}
                <path 
                  d="M 50 140 C 120 120, 200 110, 280 80 C 360 70, 440 50, 550 30" 
                  fill="none" 
                  stroke="#2f5d7c" 
                  strokeWidth="2.5" 
                  strokeLinecap="round"
                />

                {/* 4. Active Compliance Line */}
                <path 
                  d="M 50 150 C 120 135, 200 120, 280 95 C 360 85, 440 68, 550 50" 
                  fill="none" 
                  stroke="#5b9b7a" 
                  strokeWidth="2" 
                  strokeLinecap="round"
                  strokeDasharray="4 2"
                />

                {/* Bullet nodes for highlight */}
                <circle cx="50" cy="140" r="3.5" fill="#2f5d7c" />
                <circle cx="280" cy="80" r="3.5" fill="#2f5d7c" />
                <circle cx="550" cy="30" r="4" fill="#2f5d7c" />

                <circle cx="50" cy="150" r="3" fill="#5b9b7a" />
                <circle cx="280" cy="95" r="3" fill="#5b9b7a" />
                <circle cx="550" cy="50" r="3.5" fill="#5b9b7a" />
              </svg>

              {/* Simulated Y axis scale helper values inside graph boundaries */}
              <div className="absolute left-1.5 top-1.5 text-[9px] font-mono font-bold text-[#8A97A6]">800 例</div>
              <div className="absolute left-1.5 top-12 text-[9px] font-mono font-bold text-[#8A97A6]">400 例</div>
              <div className="absolute left-1.5 top-24 text-[9px] font-mono font-bold text-[#8A97A6]">200 例</div>
              <div className="absolute left-1.5 top-36 text-[9px] font-mono font-bold text-[#8A97A6]">0 例</div>

              {/* Floating data highlights */}
              <div className="absolute right-3.5 top-3.5 bg-white border border-[#D9E2EC] p-1.5 rounded-md text-[9px] shadow-xs text-right space-y-0.5">
                <span className="block text-[#8A97A6]">最新录入 550 例</span>
                <span className="block font-bold text-[#2F5D7C]">累计增幅达 346%</span>
              </div>

              {/* X Axis elements */}
              <div className="mt-auto flex justify-between px-10 text-[9px] font-bold text-[#8A97A6] font-mono border-t border-[#D9E2EC] pt-1.5 bg-[#F4F7FA]/30">
                <span>11月 (启动)</span>
                <span>12月</span>
                <span>2026-01月</span>
                <span>02月</span>
                <span>03月</span>
                <span>04月</span>
                <span>05月 (最新)</span>
              </div>
            </div>
          </div>
        </div>

        {/* 右1：科研分流引导和协作状态 */}
        <div className="bg-white rounded-xl p-5 border border-[#D9E2EC] flex flex-col justify-between">
          <div className="space-y-3.5">
            <div className="space-y-0.5 border-b border-[#E7EDF3] pb-2.5">
              <span className="text-[9px] font-bold text-[#8A97A6] uppercase tracking-wider block font-mono">CORE MISSION DIRECTIVE</span>
              <h4 className="text-sm font-bold text-[#243447] flex items-center gap-1.5">
                <Layers className="h-4 w-4 text-[#8A97A6]" />
                <span>科研协作中心流</span>
              </h4>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-start gap-2.5">
                <div className="h-5 w-5 bg-[#F4F7FA] border border-[#D9E2EC] text-[#2F5D7C] rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  1
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#243447]">确保门诊数据高质上传</p>
                  <p className="text-[10px] text-[#5B6B7A]">本中心临床医生（{doctorName}）负责 84 例患者的第一线随访跟进，请确保患者每日依从达标。</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-5 w-5 bg-[#FDF8EE] border border-[#F8E1C2] text-[#D9A441] rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  2
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#243447]">及时处置高危流失异常</p>
                  <p className="text-[10px] text-[#5B6B7A]">本中心的 <strong>赵德宽</strong> 目前属于随访逾期不活跃状态，建议优先处置。</p>
                </div>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="h-5 w-5 bg-[#F4F7FA] border border-[#D9E2EC] text-[#5B6B7A] rounded-md flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                  3
                </div>
                <div>
                  <p className="text-xs font-semibold text-[#243447]">伦理审计与结题支持</p>
                  <p className="text-[10px] text-[#5B6B7A]">本平台所有动作均由多中心加密通道上传，符合 HIPAA 与 C-CFR46 临床随访安全标准。</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E7EDF3] mt-4">
            <button
              onClick={onNavigateToPatients}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-[#2F5D7C] hover:bg-[#4F7A94] text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              <span>转去管理本中心随访患者</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* 底部：各省市多中心协作科研单位网格清单 (No redundant borders, clean respiratory look) */}
      <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
        <div className="p-4 border-b border-[#E7EDF3] bg-[#F4F7FA]/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-[#2F5D7C] uppercase tracking-wider font-mono">
              COOPERATIVE MEDICAL INSTITUTIONS REGISTRY
            </h4>
            <p className="text-[11px] text-[#5B6B7A]">目前共 5 家三级及协作基地参与当前的国自然重大专项（COPD随访研究B3组）队列</p>
          </div>

          <div className="relative">
            <input 
              type="text" 
              placeholder="搜索单位/主要研究者(PI)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-4 py-1.5 bg-white border border-[#D9E2EC] outline-none focus:border-[#2F5D7C] focus:bg-white rounded-lg transition-all placeholder:text-[#8A97A6] w-52 text-[#243447]"
            />
            <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F4F7FA]/30 border-b border-[#E7EDF3] text-[#5B6B7A] text-[10px] uppercase font-bold tracking-wider">
                <th className="py-2.5 px-4">协作研究单位</th>
                <th className="py-2.5 px-4">主要研究者 (PI)</th>
                <th className="py-2.5 px-4 text-center">招募进度 / 目标(例)</th>
                <th className="py-2.5 px-4 text-center">当前活跃随访数</th>
                <th className="py-2.5 px-4 text-center">随访执行依从率</th>
                <th className="py-2.5 px-4 text-center">患者异常脱附告警</th>
                <th className="py-2.5 px-4 text-right">专项操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E7EDF3] text-xs text-[#243447]">
              {filteredCenters.map((center) => {
                const isLocal = center.id === "cnt_002";
                const completionRate = parseFloat(((center.recruited / center.target) * 100).toFixed(0));

                return (
                  <tr 
                    key={center.id} 
                    className={`hover:bg-[#F4F7FA]/40 transition-colors ${
                      isLocal ? "bg-[#F4F7FA]/65" : ""
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <Building className={`h-4 w-4 shrink-0 ${isLocal ? "text-[#2F5D7C]" : "text-[#8A97A6]"}`} />
                        <div>
                          <p className="font-bold text-[#243447] flex items-center gap-1.5">
                            <span>{center.name}</span>
                            {isLocal && (
                              <span className="text-[9px] font-bold text-[#2F5D7C] bg-[#F4F7FA] border border-[#D9E2EC] px-1 py-0.1 rounded">
                                本中心
                              </span>
                            )}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-[#5B6B7A]">
                      {center.pi}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-2">
                        <span className="font-bold font-mono text-[#243447]">{center.recruited} </span>
                        <span className="text-[#8A97A6]">/</span>
                        <span className="text-[#5B6B7A] font-mono">{center.target}</span>
                        <span className={`text-[9px] px-1 font-mono rounded ${
                          completionRate >= 100 
                            ? "bg-[#E6F4EA] text-[#137333]" 
                            : completionRate >= 80 
                            ? "bg-[#F4F7FA] text-[#2F5D7C]" 
                            : "bg-[#FEF7E0] text-[#B06000]"
                        }`}>
                          {completionRate}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold font-mono text-[#243447]">
                      {center.active} 例
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`font-mono font-bold px-1.5 py-0.5 rounded ${
                        center.compliance >= 85 
                          ? "text-[#137333] bg-[#E6F4EA]" 
                          : center.compliance >= 80 
                          ? "text-[#2F5D7C] bg-[#F4F7FA]" 
                          : "text-[#B06000] bg-[#FEF7E0]"
                      }`}>
                        {center.compliance}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {center.alerts > 0 ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D95C5C] bg-[#FDF2F2] border border-[#F8D2D2] px-2 py-0.5 rounded-full">
                          <span className="h-1 w-1 bg-[#D95C5C] rounded-full"></span>
                          <span>{center.alerts} 例待查</span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#5B9B7A] font-medium bg-[#F4F9F6] border border-[#D2E8DD] px-2 py-0.5 rounded-full">
                          正常受控
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {isLocal ? (
                        <button
                          onClick={onNavigateToPatients}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#2F5D7C] hover:bg-[#4F7A94] text-white font-bold rounded-lg transition-all text-[11px] shadow-sm cursor-pointer"
                        >
                          <span>接管本院随访</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      ) : (
                        <span className="text-[10px] text-[#8A97A6] italic pr-2 select-none">无跨院接口权限</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
