/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Activity, Lock, UserCheck, Heart, Stethoscope, Wind, Shield, Brain, Calendar, TrendingUp, Users } from "lucide-react";

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
    <div className="relative min-h-screen w-full flex items-center justify-center pl-44 pr-6 bg-[#F4F7FA] overflow-hidden">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <img
          src="/src/assets/images/asian_respiratory_rehab_login_bg_1779609633415.png"
          alt="肺部疾病科研与综合肺康复临床协作图景"
          className="w-full h-full object-cover filter brightness-[1.05] saturate-[1.15]"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#F4F7FA]/5 via-[#F4F7FA]/30 to-[#F4F7FA]/70 md:to-[#F4F7FA]/90" />
      </div>

      {/* 右侧装饰性元素 - 肺康复主题图标散落分布 */}
      <div className="absolute inset-0 z-0 hidden lg:block pointer-events-none">
        {/* 右上 - 心肺监测 */}
        {/* 右上偏中 - 呼吸康复 */}
        <div className="absolute right-[18%] top-[14%] opacity-30">
          <Heart className="w-12 h-12 text-[#2F5D7C]" />
        </div>
        {/* 右上偏中 - 呼吸康复 */}
        <div className="absolute right-[38%] top-[22%] opacity-25">
          <Wind className="w-16 h-16 text-[#2F5D7C]" />
        </div>
        {/* 右侧中上 - 智能诊疗/AI */}
        <div className="absolute right-[22%] top-[32%] opacity-28">
          <Brain className="w-11 h-11 text-[#2F5D7C]" />
        </div>
        {/* 右侧中部 - 肺部活动 */}
        <div className="absolute right-[42%] top-[40%] opacity-22">
          <Activity className="w-14 h-14 text-[#2F5D7C]" />
        </div>
        {/* 右侧中偏下 - 康复计划 */}
        <div className="absolute right-[16%] top-[48%] opacity-30">
          <Calendar className="w-10 h-10 text-[#2F5D7C]" />
        </div>
        {/* 右侧中下部 - 听诊器 */}
        <div className="absolute right-[35%] top-[56%] opacity-25">
          <Stethoscope className="w-12 h-12 text-[#2F5D7C]" />
        </div>
        {/* 右侧偏下 - 数据趋势 */}
        <div className="absolute right-[20%] top-[66%] opacity-28">
          <TrendingUp className="w-12 h-12 text-[#2F5D7C]" />
        </div>
        {/* 右下 - 患者管理 */}
        <div className="absolute right-[40%] top-[74%] opacity-22">
          <Users className="w-14 h-14 text-[#2F5D7C]" />
        </div>
        {/* 右下偏下 - 安全守护 */}
        <div className="absolute right-[24%] top-[84%] opacity-25">
          <Shield className="w-10 h-10 text-[#2F5D7C]" />
        </div>
      </div>

      <div className="relative z-10 w-full max-w-[460px] bg-white border border-[#D9E2EC] rounded-xl p-8 shadow-[0_12px_40px_-8px_rgba(36,52,71,0.12)] flex flex-col gap-6">
        <div className="space-y-3">
          <div className="text-left">
            <h1 className="text-lg font-semibold text-[#243447] tracking-tight">医生端登录</h1>
            <p className="text-sm text-[#5B6B7A]">
              输入医生信息后进入患者管理工作台。
            </p>
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
