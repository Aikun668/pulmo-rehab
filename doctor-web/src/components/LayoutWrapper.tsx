/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { 
  Users, 
  Activity, 
  LogOut, 
  MapPin, 
  Clock,
  CalendarCheck,
  UserPlus,
  Bell,
  ChevronRight
} from "lucide-react";
import { RecentPatient } from "../types";

interface LayoutWrapperProps {
  children: React.ReactNode;
  doctorName: string;
  doctorId: number;
  onLogout: () => void;
  currentRoute: string;
  activePatientName?: string;
  onNavigateToList: () => void;
  recentPatients: RecentPatient[];
  onSelectRecentPatient: (patientId: number) => void;
}

export default function LayoutWrapper({
  children,
  doctorName,
  doctorId,
  onLogout,
  currentRoute,
  activePatientName,
  onNavigateToList,
  recentPatients,
  onSelectRecentPatient,
}: LayoutWrapperProps) {
  const [timeStr, setTimeStr] = useState<string>("");
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    const saved = localStorage.getItem("sidebar-width");
    return saved ? parseInt(saved, 10) : 256;
  });
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startDrag = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: sidebarWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, [sidebarWidth]);

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!dragRef.current) return;
      const newWidth = Math.max(180, dragRef.current.startWidth + (e.clientX - dragRef.current.startX));
      setSidebarWidth(newWidth);
      localStorage.setItem("sidebar-width", String(newWidth));
    };
    const handleUp = () => {
      if (dragRef.current) {
        dragRef.current = null;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, []);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeStr(now.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="h-screen overflow-hidden bg-med-bg flex font-sans text-med-text-primary">
      {/* Clinically Clean Modern Side Navigation Bar */}
      <aside 
        className="bg-white border-r border-med-border flex flex-col justify-between shrink-0 z-20"
        style={{ width: sidebarWidth }}
      >
        <div>
          {/* Institution Header Design */}
          <div className="p-5 border-b border-med-divider flex items-center gap-3">
            <div className="h-9 w-9 bg-[#F4F7FA] border border-med-border rounded flex items-center justify-center shrink-0">
              <Activity className="h-5 w-5 text-med-primary" />
            </div>
            <div>
              <h1 className="text-xs font-bold tracking-tight text-med-text-primary">肺康复临床协作平台</h1>
              <span className="text-[9px] font-mono text-med-text-secondary bg-[#F4F7FA] border border-med-border px-1.5 py-0.5 rounded font-medium block mt-0.5 w-max">
                多中心研究医生端
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            <button
              onClick={onNavigateToList}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded text-xs font-medium transition-all ${
                currentRoute === "patients" || currentRoute === "patient-detail"
                  ? "bg-[#F4F7FA] text-med-primary font-semibold cursor-default border border-med-border"
                  : "text-med-text-secondary hover:bg-[#F4F7FA] hover:text-med-text-primary cursor-pointer border border-transparent"
              }`}
            >
              <Users className={`h-4 w-4 shrink-0 ${currentRoute === "patients" || currentRoute === "patient-detail" ? "text-med-primary" : "text-med-text-meta"}`} />
              <span>门诊患者康复随访</span>
            </button>

            {/* 快捷统计 */}
            <div className="mt-4 px-3">
              <div className="text-[9px] font-bold text-med-text-meta uppercase tracking-wider mb-2">
                今日工作概览
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-[#F4F7FA] border border-med-border rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <CalendarCheck className="h-3 w-3 text-med-primary" />
                    <span className="text-[10px] text-med-text-secondary">待随访</span>
                  </div>
                  <span className="text-lg font-bold text-med-text-primary">12</span>
                </div>
                <div className="bg-[#F4F7FA] border border-med-border rounded-lg p-2.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <UserPlus className="h-3 w-3 text-emerald-500" />
                    <span className="text-[10px] text-med-text-secondary">本周新增</span>
                  </div>
                  <span className="text-lg font-bold text-med-text-primary">5</span>
                </div>
              </div>
            </div>

            {/* 系统提醒 */}
            <div className="mt-4 px-3">
              <div className="text-[9px] font-bold text-med-text-meta uppercase tracking-wider mb-2">
                系统提醒
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                <div className="flex items-start gap-1.5">
                  <Bell className="h-3 w-3 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] text-amber-700 leading-relaxed">
                      下周有 <span className="font-bold">2</span> 例随访到期
                    </p>
                    <p className="text-[9px] text-amber-500 mt-0.5">建议提前联系患者</p>
                  </div>
                </div>
              </div>
            </div>

            {/* 最近访问 */}
            <div className="mt-4 px-3">
              <div className="text-[9px] font-bold text-med-text-meta uppercase tracking-wider mb-2">
                最近访问
              </div>
              {recentPatients.length > 0 ? (
                <div className="space-y-1">
                  {recentPatients.map((patient) => (
                    <button
                      key={patient.id}
                      onClick={() => onSelectRecentPatient(patient.id)}
                      className="w-full flex items-center justify-between px-2.5 py-2 rounded-md bg-white border border-med-border hover:bg-[#F4F7FA] transition-all group cursor-pointer"
                    >
                      <span className="text-[11px] text-med-text-primary font-medium">{patient.name}</span>
                      <ChevronRight className="h-3 w-3 text-med-text-meta group-hover:text-med-primary transition-colors" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="px-2.5 py-3 rounded-md bg-[#F4F7FA] border border-med-border text-[11px] text-med-text-secondary text-center">
                  暂无最近访问记录
                </div>
              )}
            </div>
          </nav>
        </div>

        {/* Doctor Identity Block - Highly Credible */}
        <div className="p-3 border-t border-med-divider bg-[#F4F7FA]/50 space-y-2">
          <div className="bg-white p-3 rounded-lg border border-med-border shadow-sm">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-[#EEF3F7] text-med-primary rounded-md flex items-center justify-center font-bold shrink-0 text-xs text-center border border-med-border">
                医师
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-bold text-med-text-primary truncate">{doctorName}</p>
                <p className="text-[10px] font-mono text-med-text-meta truncate mt-0.5">教工 ID: {doctorId}</p>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-med-text-secondary bg-[#F4F7FA] border border-med-divider py-1.5 px-2 rounded-md flex items-center gap-1.5">
              <MapPin className="h-3 w-3 text-med-text-meta shrink-0" />
              <span className="truncate">呼吸内科及康复中心</span>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-med-border hover:bg-[#F4F7FA] text-med-text-secondary hover:text-med-text-primary rounded-lg text-xs font-medium transition-all bg-white shadow-sm cursor-pointer"
          >
            <LogOut className="h-3.5 w-3.5 shrink-0 text-med-text-meta" />
            <span>注销当前登录</span>
          </button>
        </div>
      </aside>

      {/* 拖拽分隔线 */}
      <div
        onMouseDown={startDrag}
        className="w-1 shrink-0 bg-transparent hover:bg-[#2F5D7C]/30 active:bg-[#2F5D7C]/50 cursor-col-resize transition-colors z-30"
      />

      {/* Main Content Workspace Layout */}
      <section className="flex-1 flex flex-col min-w-0 bg-med-bg">
        {/* Top Minimalist Header Grid */}
        <header className="h-14 bg-white border-b border-med-border px-6 flex items-center justify-between sticky top-0 z-10">
          {/* Conservative Breadcrumbs */}
          <div className="flex items-center gap-2 text-xs select-none">
            {currentRoute === "patient-detail" && activePatientName ? (
              <>
                <span className="text-slate-400 hover:text-slate-650 cursor-pointer" onClick={onNavigateToList}>
                  门诊随访清单
                </span>
                <span className="text-slate-350">/</span>
                <span className="text-med-primary font-bold bg-[#EEF3F7] px-2 py-0.5 rounded border border-med-border">
                  病案: {activePatientName}
                </span>
              </>
            ) : currentRoute === "patients" ? (
              <span className="text-med-primary font-bold">患者随访看板</span>
            ) : (
              <span className="text-slate-500 italic">临床登录入口</span>
            )}
          </div>

          {/* Clinically Reliable Header Controls */}
          <div className="flex items-center gap-3">
            {/* Safe Online Grid Indicator */}
            <div className="flex items-center gap-1.5 bg-[#F4F7FA] border border-med-border px-2.5 py-1 rounded-lg text-[10px] font-semibold text-[#5B6B7A]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
              <span className="font-mono">API SECURE CORE · {doctorId}</span>
            </div>
            
            <div className="h-4 w-px bg-med-divider"></div>

            <div className="text-xs text-[#5B6B7A] font-mono bg-white px-3 py-1 rounded-lg border border-med-border">
              <span className="font-semibold text-med-text-primary">{timeStr || "16:22:58"}</span>
            </div>
          </div>
        </header>

        {/* Dynamic Sandbox Main Content */}
        <main className="flex-1 p-6 overflow-y-auto max-w-[1500px] w-full mx-auto">
          {children}
        </main>
      </section>
    </div>
  );
}
