/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Patient } from "../types";
import { 
  Search, 
  LayoutGrid, 
  TableProperties, 
  Calendar, 
  Clock, 
  ArrowRight, 
  ChevronRight, 
  FileText, 
  ShieldAlert, 
  AlertCircle,
  TrendingUp,
  Info
} from "lucide-react";

interface PatientsListViewProps {
  patients: Patient[];
  isLoading: boolean;
  errorMessage?: string;
  onSelectPatient: (patientId: number) => void;
  doctorName: string;
}

// Medical Registry status resolver for high-credibility triage view
interface PatientMedicalMetadata {
  riskLevel: "low" | "medium" | "high" | "unregistered";
  riskLabel: string;
  complianceRate: string;
  complianceBgColor: string;
  complianceTextColor: string;
  complianceBorderColor: string;
  attentionNote: string;
  actionRequired: string;
}

const resolveMedicalMetadata = (count7d: number, lastCheckInAt: string | null): PatientMedicalMetadata => {
  if (lastCheckInAt === null) {
    return {
      riskLevel: "high",
      riskLabel: "高危 · 脱落预警",
      complianceRate: "0%",
      complianceBgColor: "bg-[#FDF2F2]",
      complianceTextColor: "text-[#D95C5C]",
      complianceBorderColor: "border-[#F8D2D2]",
      attentionNote: "方案拟定7天内未激活，无打卡脉搏接收",
      actionRequired: "需立刻电话远程调配干预"
    };
  }
  if (count7d >= 5) {
    return {
      riskLevel: "low",
      riskLabel: "低危 · 康复稳健",
      complianceRate: `${Math.min(100, Math.round((count7d / 7) * 100))}%`,
      complianceBgColor: "bg-[#EEFDF5]",
      complianceTextColor: "text-[#5B9B7A]",
      complianceBorderColor: "border-[#D5F5E3]",
      attentionNote: "打卡频率良好，继续保持",
      actionRequired: "方案正常跟进"
    };
  }
  if (count7d >= 1) {
    return {
      riskLevel: "medium",
      riskLabel: "中危 · 依从波动",
      complianceRate: `${Math.min(100, Math.round((count7d / 7) * 100))}%`,
      complianceBgColor: "bg-[#FDF8EE]",
      complianceTextColor: "text-[#D9A441]",
      complianceBorderColor: "border-[#F8E1C2]",
      attentionNote: "打卡频次偏低，关注患者体感",
      actionRequired: "建议电话随访，排查阻力不耐受"
    };
  }
  return {
    riskLevel: "high",
    riskLabel: "高危 · 脱落预警",
    complianceRate: "0%",
    complianceBgColor: "bg-[#FDF2F2]",
    complianceTextColor: "text-[#D95C5C]",
    complianceBorderColor: "border-[#F8D2D2]",
    attentionNote: "近7天无打卡记录",
    actionRequired: "需立刻电话远程调配干预"
  };
};

// Helper: format ISO 8601 datetime to readable string
const formatLastCheckIn = (iso: string | null): string => {
  if (!iso) return "未登记打卡";
  try {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
};

export default function PatientsListView({
  patients,
  isLoading,
  errorMessage,
  onSelectPatient,
  doctorName
}: PatientsListViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewType, setViewType] = useState<"card" | "table">("card");

  // Localized clinical sorting: unregistered and emergency high-risk patient files triage first
  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    String(p.id).includes(searchTerm)
  );

  return (
    <div className="space-y-4">
      
      {/* Clinically Clean Header & Search Controls */}
      <div className="bg-white border border-[#D9E2EC] p-5 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-[#243447] tracking-tight flex items-center gap-2">
            <span>门诊患者康复跟进档案库</span>
            <span className="text-[10px] font-normal text-[#5B6B7A] font-mono bg-[#F4F7FA] border border-[#D9E2EC] px-1.5 py-0.5 rounded-md">
              Total: {patients.length} 病案
            </span>
          </h2>
          <p className="text-xs text-[#5B6B7A]">
            接诊科室：<span className="font-semibold text-[#2F5D7C]">第一门诊随访组 ({doctorName})</span> · 呼吸康复标准化工作台
          </p>
        </div>

        {/* Triage Search Component */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="智能过滤患者病案名/ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-4 py-2 bg-[#F4F7FA] border border-[#D9E2EC] outline-none focus:border-[#2F5D7C] focus:bg-white rounded-lg transition-all placeholder:text-[#8A97A6] w-60 text-[#243447]"
            />
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>

          {/* Micro density layout switcher */}
          <div className="bg-[#E7EDF3] p-0.5 rounded-lg border border-[#D9E2EC] flex items-center">
            <button
              onClick={() => setViewType("card")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === "card"
                  ? "bg-white text-[#243447] shadow-xs border border-[#D9E2EC]"
                  : "text-[#5B6B7A] hover:text-[#243447]"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5 inline mr-1" />
              <span>卡片看板</span>
            </button>
            <button
              onClick={() => setViewType("table")}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                viewType === "table"
                  ? "bg-white text-[#243447] shadow-xs border border-[#D9E2EC]"
                  : "text-[#5B6B7A] hover:text-[#243447]"
              }`}
            >
              <TableProperties className="h-3.5 w-3.5 inline mr-1" />
              <span>密集列表</span>
            </button>
          </div>
        </div>
      </div>

      {/* Corporate Technical Design Note Widget */}
      <div className="bg-[#F4F7FA] border border-[#D9E2EC] p-4 rounded-xl text-xs text-[#5B6B7A] space-y-1">
        <div className="flex items-center gap-1.5 font-bold text-[#243447]">
          <Info className="h-4 w-4 text-[#4F7A94]" />
          <span>慢阻肺 (COPD) 随访筛查平台</span>
        </div>
        <p className="leading-relaxed">
          符合多中心临床实践指南。本看板通过<strong>计划依从率指标、动态通气标签与高风险阻力阻遏天数</strong>对患者进行实时分流定位，弱化了表单式记录感，大幅提升扫读及干预策略下发速率。
        </p>
      </div>

      {errorMessage && (
        <div className="bg-[#FDF2F2] border border-[#F8D2D2] p-4 rounded-xl text-xs text-[#D95C5C] space-y-1">
          <p className="font-bold">患者列表加载失败</p>
          <p>{errorMessage}</p>
        </div>
      )}

      {/* Loader Skeleton Container */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((n) => (
            <div key={n} className="bg-white border border-[#D9E2EC] p-4 rounded-xl space-y-3 animate-pulse">
              <div className="h-4 bg-[#F4F7FA] rounded w-1/3 p-1"></div>
              <div className="h-8 bg-[#F4F7FA] rounded"></div>
              <div className="h-10 bg-[#F4F7FA] rounded"></div>
            </div>
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        /* Empty Case view */
        <div className="bg-white border border-[#D9E2EC] rounded-xl p-12 text-center space-y-3">
          <div className="h-10 w-10 bg-[#F4F7FA] border border-[#D9E2EC] rounded-full flex items-center justify-center text-[#8A97A6] mx-auto">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-[#243447]">未检索到任何符合条件的患者档案</p>
            <p className="text-[11px] text-[#5B6B7A] leading-relaxed max-w-sm mx-auto">
              此医师组下无匹配 “{searchTerm}” 的活动患者。请重新调整输入或进入测试医生 ID 沙盒进行其他匹配。
            </p>
          </div>
        </div>
      ) : viewType === "card" ? (
        /* ======================================================= */
        /* Redesigned Clinician Card - Razor Clean, High Density */
        /* ======================================================= */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredPatients.map((patient) => {
            const meta = resolveMedicalMetadata(patient.stats.check_in_count_7d, patient.stats.last_check_in_at);
            const isUnregistered = patient.stats.last_check_in_at === null;

            return (
              <div
                key={patient.id}
                className={`bg-white rounded-xl transition-all duration-200 border flex flex-col justify-between hover:bg-[#EEF3F7]/35 relative overflow-hidden group ${
                  meta.riskLevel === "high" 
                    ? "border-[#F8D2D2]" 
                    : meta.riskLevel === "medium"
                    ? "border-[#F8E1C2]"
                    : "border-[#D9E2EC]"
                }`}
              >
                {/* Clean left status triage bar */}
                <div className={`absolute top-0 bottom-0 left-0 w-1 ${
                  meta.riskLevel === "high" 
                    ? "bg-[#D95C5C]" 
                    : meta.riskLevel === "medium"
                    ? "bg-[#D9A441]"
                    : "bg-[#5B9B7A]"
                }`} />

                {/* Upper Status Panel */}
                <div className="p-4 pl-5 space-y-3">
                  
                  {/* Header Row: Title & Action Triage */}
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-bold text-[#243447] group-hover:text-[#2F5D7C] transition-colors">{patient.name}</span>
                      </div>
                      <p className="text-[10px] text-[#8A97A6] font-mono mt-0.5">患者 ID: {patient.id}</p>
                    </div>

                    {/* Alert Triage Badge */}
                    <div className="text-right">
                      {meta.riskLevel === "high" && (
                        <span className="text-[9px] font-bold text-[#D95C5C] bg-[#FDF2F2] border border-[#F8D2D2] px-1.5 py-0.5 rounded uppercase">
                          高危预警
                        </span>
                      )}
                      {meta.riskLevel === "medium" && (
                        <span className="text-[9px] font-bold text-[#D9A441] bg-[#FDF8EE] border border-[#F8E1C2] px-1.5 py-0.5 rounded">
                          中危预警
                        </span>
                      )}
                      {meta.riskLevel === "low" && (
                        <span className="text-[9px] font-bold text-[#5B9B7A] bg-[#EEFDF5] border border-[#D5F5E3] px-1.5 py-0.5 rounded">
                          稳健
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Risk level tag (downgraded: no diagnosis from backend) */}
                  <div className="space-y-1 bg-[#F4F7FA] p-2 rounded-lg border border-[#D9E2EC]">
                    <span className="text-[9px] font-bold text-[#8A97A6] block font-mono">FOLLOW-UP STATUS</span>
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border ${meta.complianceBgColor} ${meta.complianceTextColor} ${meta.complianceBorderColor}`}>
                        {meta.riskLabel}
                      </span>
                    </div>
                  </div>

                  {/* Core 3 KPIs comparison */}
                  <div className="grid grid-cols-3 gap-2 border-t border-[#E7EDF3] pt-3">
                    {/* compliance */}
                    <div className="space-y-0.5 text-center bg-[#F4F7FA] p-1 px-1.5 rounded-lg border border-[#D9E2EC]">
                      <span className="text-[9px] text-[#8A97A6] block font-semibold text-center">随访依从率</span>
                      <span className={`text-[10px] font-bold font-mono inline-block px-1.5 py-0.5 rounded border ${meta.complianceBgColor} ${meta.complianceTextColor} ${meta.complianceBorderColor}`}>
                        {meta.complianceRate}
                      </span>
                    </div>

                    {/* check ins */}
                    <div className="space-y-0.5 text-center bg-[#F4F7FA] p-1 px-1.5 rounded-lg border border-[#D9E2EC]">
                      <span className="text-[9px] text-[#8A97A6] block font-semibold text-center">近7日打卡</span>
                      <span className="text-xs font-bold font-mono text-[#243447]">
                        {patient.stats.check_in_count_7d}次
                      </span>
                    </div>

                    {/* total logs duration */}
                    <div className="space-y-0.5 text-center bg-[#F4F7FA] p-1 px-1.5 rounded-lg border border-[#D9E2EC]">
                      <span className="text-[9px] text-[#8A97A6] block font-semibold text-center">累计时长</span>
                      <span className="text-xs font-bold font-mono text-[#243447]">
                        {patient.stats.total_duration_minutes}分
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Alert Message & Actions Triage Advice */}
                  <div className="space-y-1 pt-0.5 text-[10px]">
                    <div className="flex items-start gap-1">
                      <span className="font-bold text-[#5B6B7A] shrink-0">主诉反馈:</span>
                      <span className="text-[#243447] truncate" title={meta.attentionNote}>{meta.attentionNote}</span>
                    </div>
                    <div className="flex items-start gap-1">
                      <span className="font-bold text-[#5B6B7A] shrink-0">临床策略:</span>
                      <span className="text-[#243447] truncate" title={meta.actionRequired}>{meta.actionRequired}</span>
                    </div>
                  </div>
                </div>

                {/* Patient Triage footer */}
                <div className="bg-[#F4F7FA] border-t border-[#E7EDF3] p-3 pl-5 shrink-0 flex items-center justify-between">
                  <div className="text-[10px] text-[#5B6B7A] flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-[#8A97A6] shrink-0" />
                    <span>
                      {isUnregistered ? "未登记打卡" : `最近活跃: ${formatLastCheckIn(patient.stats.last_check_in_at)}`}
                    </span>
                  </div>

                  <button
                    onClick={() => onSelectPatient(patient.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 bg-[#2F5D7C] hover:bg-[#4F7A94] active:bg-[#2F5D7C] text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  >
                    <span>详情与下发</span>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ======================================================= */
        /* Structured Matrix Table - Enterprise Medical SaaS Look */
        /* ======================================================= */
        <div className="bg-white border border-[#D9E2EC] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F4F7FA] border-b border-[#D9E2EC] text-[#5B6B7A] text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-4 font-bold">患者姓名</th>
                  <th className="py-2.5 px-4 text-center font-bold">近7天打卡(次)</th>
                  <th className="py-2.5 px-4 text-center font-bold">累计训练时长</th>
                  <th className="py-2.5 px-4 text-center font-bold">计划依从率</th>
                  <th className="py-2.5 px-4 font-bold">医生关注及辅导预警</th>
                  <th className="py-2.5 px-4 text-right font-bold">医疗策略窗口</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7EDF3] text-xs text-[#243447]">
                {filteredPatients.map((patient) => {
                  const meta = resolveMedicalMetadata(patient.stats.check_in_count_7d, patient.stats.last_check_in_at);

                  return (
                    <tr key={patient.id} className="hover:bg-[#EEF3F7]/50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-[#243447]">{patient.name}</p>
                        </div>
                        <p className="text-[9px] font-mono text-[#8A97A6] mt-0.5">ID: {patient.id}</p>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-bold text-[#243447]">
                          {patient.stats.check_in_count_7d} 次
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono font-semibold text-[#5B6B7A]">
                          {patient.stats.total_duration_minutes} 分钟
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded border ${meta.complianceBgColor} ${meta.complianceTextColor} ${meta.complianceBorderColor}`}>
                          {meta.complianceRate}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <p className="text-[11px] text-[#5B6B7A] font-medium truncate max-w-xs" title={`${meta.attentionNote} -> ${meta.actionRequired}`}>
                          {meta.attentionNote} · <span className="text-[#8A97A6] font-normal">{meta.actionRequired}</span>
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => onSelectPatient(patient.id)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#2F5D7C] hover:bg-[#4F7A94] text-white font-semibold rounded-lg transition-all text-[11px] cursor-pointer"
                        >
                          <span>调配分析</span>
                          <ChevronRight className="h-3 w-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
