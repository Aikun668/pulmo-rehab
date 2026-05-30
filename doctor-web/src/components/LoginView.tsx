/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Activity, Lock, UserCheck } from "lucide-react";

interface LoginViewProps {
  onLoginSuccess: (doctorId: number, doctorName: string) => void;
}

export default function LoginView({ onLoginSuccess }: LoginViewProps) {
  const [doctorId, setDoctorId] = useState<string>("13");
  const [doctorName, setDoctorName] = useState<string>("测试医生");
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
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/src/assets/images/asian_respiratory_rehab_login_bg_1779609633415.png"
          alt="肺部疾病科研与综合肺康复临床协作图景"
          className="w-full h-full object-cover filter brightness-[0.96]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F7FA]/10 via-[#F4F7FA]/40 to-[#F4F7FA]/80 md:to-[#F4F7FA]/95" />
      </div>

      <div className="relative z-10 w-full max-w-[460px] bg-white border border-[#D9E2EC] rounded-xl p-8 shadow-[0_12px_40px_-8px_rgba(36,52,71,0.12)] flex flex-col gap-6">
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 bg-[#F4F7FA] border border-[#D9E2EC] rounded-xl flex items-center justify-center text-[#2F5D7C] shrink-0">
              <Activity className="h-5.5 w-5.5" />
            </div>
            <div className="space-y-1">
              <h1 className="text-lg font-semibold text-[#243447] tracking-tight">医生端登录</h1>
              <p className="text-sm text-[#5B6B7A]">
                输入医生信息后进入患者管理工作台。
              </p>
            </div>
          </div>
        </div>

        <div className="h-[1px] bg-[#E7EDF3]" />

        <div className="space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMessage && (
              <div className="p-3 bg-[#FDF2F2] border border-[#F8D2D2] text-[#D95C5C] rounded-lg text-xs font-medium">
                {errorMessage}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="doctor-id" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
                医生 ID
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

            <div className="space-y-1.5">
              <label htmlFor="doctor-name" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
                医生姓名
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

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
                密码
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

        <div className="bg-[#F8FAFC] border border-[#D9E2EC] rounded-xl px-4 py-3 text-xs text-[#5B6B7A]">
          <p>
            开发联调示例医生 ID：<span className="font-semibold text-[#2F5D7C]">13</span>。若输入非医生 ID，将无法加载患者列表。
          </p>
        </div>
      </div>
    </div>
  );
}
