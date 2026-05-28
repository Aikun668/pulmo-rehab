/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Activity, UserCheck, ShieldAlert, Lock } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (doctorId: number, doctorName: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [doctorId, setDoctorId] = useState<string>("13");
  const [doctorName, setDoctorName] = useState<string>("Doctor Stats Temp");
  const [password, setPassword] = useState<string>("••••••••");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId.trim()) {
      setErrorMessage("请输入或保留固定医生 ID");
      return;
    }
    if (!doctorName.trim()) {
      setErrorMessage("请输入医生姓名（开发期显示用）");
      return;
    }

    const numericDocId = parseInt(doctorId.trim(), 10);
    if (isNaN(numericDocId) || numericDocId <= 0) {
      setErrorMessage("医生 ID 必须是正整数");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    // Simulate minor network delay for loading effect
    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(numericDocId, doctorName);
    }, 450);
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center md:justify-end p-6 bg-[#F4F7FA] md:pr-16 lg:pr-32 overflow-hidden">
      {/* Premium Warm Rehabilitation Suite Background underlay */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/src/assets/images/asian_respiratory_rehab_login_bg_1779609633415.png"
          alt="肺部疾病科研与综合肺康复临床协作图景"
          className="w-full h-full object-cover filter brightness-[0.96]"
          referrerPolicy="no-referrer"
        />
        {/* Soft elegant gradient overlay to guarantee right-side text contrast and keep characters on the left highly vibrant */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F7FA]/10 via-[#F4F7FA]/40 to-[#F4F7FA]/80 md:to-[#F4F7FA]/95" />
      </div>

      {/* Structured Single-Panel Desk Card (Rounded-xl = Dynamic 12px precisely as requested) */}
      <div className="relative z-10 w-full max-w-[460px] bg-white border border-[#D9E2EC] rounded-xl p-8 shadow-[0_12px_40px_-8px_rgba(36,52,71,0.12)] flex flex-col gap-6">
        
        {/* Top Header Section */}
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <span className="text-[10px] font-bold text-[#2F5D7C] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded-md font-mono uppercase tracking-wider">
              CLINICIAN CERTIFIED PORTAL
            </span>
            <span className="text-[10px] font-bold text-[#5B6B7A] bg-[#F4F7FA] border border-[#D9E2EC] px-2 py-0.5 rounded-md font-sans">
              科研随访终端说明
            </span>
          </div>

          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-[#F4F7FA] border border-[#D9E2EC] rounded-xl flex items-center justify-center text-[#2F5D7C] shrink-0">
              <Activity className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-0.5">
              <h1 className="text-sm font-bold text-[#243447] tracking-tight leading-snug">
                肺部疾病综合康复科学管理系统
              </h1>
              <p className="text-[9px] text-[#8A97A6] font-mono tracking-wider">
                LUNG REHABILITATION SUITE · CLINICIAN NODE
              </p>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-[#E7EDF3]" />

        {/* Credentials Form Section */}
        <div className="space-y-4">
          <div className="space-y-1">
            <h2 className="text-xs font-bold text-[#243447]">随诊医师执业鉴权登录</h2>
            <p className="text-[11px] text-[#5B6B7A]">
              请输入有效医生 ID 或保留当前开发联调用测试账号，进入患者随访工作台。
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8D2D2] text-[#D95C5C] rounded-lg text-xs font-medium">
                {errorMessage}
              </div>
            )}

            {/* Doctor ID Field */}
            <div className="space-y-1.5">
              <label htmlFor="doctor-id" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
                教职工编号 ID
              </label>
              <div className="relative">
                <input
                  id="doctor-id"
                  type="text"
                  value={doctorId}
                  aria-label="Doctor ID"
                  onChange={(e) => setDoctorId(e.target.value)}
                  placeholder="请输入医生 ID..."
                  className="w-full bg-[#F4F7FA] border border-[#D9E2EC] text-[#243447] text-xs py-2 px-3 pl-8.5 rounded-lg outline-none transition-all placeholder:text-[#8A97A6] focus:border-[#2F5D7C] focus:bg-white font-mono"
                />
                <UserCheck className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
              </div>
            </div>

            {/* Doctor Name Simulation Field */}
            <div className="space-y-1.5">
              <label htmlFor="doctor-name" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
                随诊医师姓名 (测试用)
              </label>
              <div className="relative">
                <input
                  id="doctor-name"
                  type="text"
                  value={doctorName}
                  aria-label="Doctor Name"
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="请输入医师姓名..."
                  className="w-full bg-[#F4F7FA] border border-[#D9E2EC] text-[#243447] text-xs py-2 px-3 pl-8.5 rounded-lg outline-none transition-all placeholder:text-[#8A97A6] focus:border-[#2F5D7C] focus:bg-white"
                />
                <Activity className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
                系统授权密码
              </label>
              <div className="relative">
                <input
                  id="password"
                  type="password"
                  value={password}
                  aria-label="Password"
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#F4F7FA] border border-[#D9E2EC] text-[#243447] text-xs py-2 px-3 pl-8.5 rounded-lg outline-none transition-all placeholder:text-[#8A97A6] focus:border-[#2F5D7C] focus:bg-white font-mono"
                />
                <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 bg-[#2F5D7C] hover:bg-[#1F3E54] text-white font-semibold py-2.5 rounded-lg text-xs transition-colors shadow-sm cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                    <span>验证身份并进入患者列表</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer / Standard System Notes (低干扰, exactly standard metadata look) */}
        <div className="bg-[#F4F7FA] border border-[#D9E2EC] rounded-xl p-3.5 text-[10px] text-[#5B6B7A] space-y-1.5">
          <p className="font-bold text-[#243447] flex items-center gap-1.5">
            <ShieldAlert className="h-3.5 w-3.5 text-[#4F7A94]" />
            <span>数据衔接安全规范声明</span>
          </p>
          <p className="leading-relaxed">
            当前使用 Local Storage 作为随访阶段会话寄存。所有动作在院内系统拦截器校验。后期可无缝切换为 OAuth2 规范之 SSO 统一认证。
          </p>
          <p className="leading-relaxed text-[#4F7A94]">
            当前开发联调医生示例：ID `13`。若输入非医生 ID，将无法加载患者列表。
          </p>
        </div>

      </div>
    </div>
  );
}
