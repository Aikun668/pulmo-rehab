/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState } from "react";
import {
  Activity, Lock, UserCheck, ArrowLeft, Phone, Mail, KeyRound,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "./ui/card";

interface LoginViewProps {
  onLoginSuccess: (doctorId: number, doctorName: string) => void;
  /** "fullscreen"（默认）用于独立登录页；"modal" 用于弹窗模式，不渲染全屏背景 */
  variant?: "fullscreen" | "modal";
}

type AuthView = "login" | "register" | "forgot-password";

// ============================================================================
// Context：让 AuthCard / LoginForm 等子组件感知当前 variant
// ============================================================================

const LoginVariantCtx = createContext<"fullscreen" | "modal">("fullscreen");
const useVariant = () => useContext(LoginVariantCtx);

/* ================================================================
   共享卡片外壳
   ================================================================ */

function AuthCard({
  title,
  subtitle,
  onBack,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const isModal = useVariant() === "modal";

  return (
    <div
      className={`relative z-10 w-full bg-white border border-[#D9E2EC] rounded-xl shadow-[0_12px_40px_-8px_rgba(36,52,71,0.12)] flex flex-col gap-5 ${
        isModal ? "max-w-[440px] p-10" : "max-w-[460px] p-8"
      }`}
    >
      {/* 标题区 */}
      <div className="flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-[#D9E2EC] bg-white text-[#5B6B7A] hover:text-[#2F5D7C] hover:border-[#2F5D7C] transition-colors cursor-pointer shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex-1 text-center pr-[40px]">
          {" "}
          {/* pr 补偿返回按钮宽度以居中 */}
          <h1
            className={`font-bold text-[#243447] tracking-tight ${
              isModal ? "text-2xl" : "text-xl"
            }`}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-0.5 text-xs text-[#8A97A6]">{subtitle}</p>}
        </div>
      </div>

      <div className="h-[1px] bg-[#E7EDF3]" />

      <div className="space-y-4">{children}</div>

      {footer && (
        <>
          <div className="h-[1px] bg-[#E7EDF3]" />
          {footer}
        </>
      )}
    </div>
  );
}

/* ================================================================
   登录表单
   ================================================================ */

function LoginForm({ onLoginSuccess }: LoginViewProps) {
  const isModal = useVariant() === "modal";
  const [doctorId, setDoctorId] = useState<string>("13");
  const [doctorName, setDoctorName] = useState<string>("测试医生");
  const [password, setPassword] = useState<string>("••••••••");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [switchView, setSwitchView] = useState<AuthView | null>(null);

  if (switchView === "register") {
    return <RegisterForm onBack={() => setSwitchView(null)} onLoginSuccess={onLoginSuccess} />;
  }
  if (switchView === "forgot-password") {
    return <ForgotPasswordForm onBack={() => setSwitchView(null)} />;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!doctorId.trim()) {
      setErrorMessage("请输入医生 ID");
      return;
    }
    if (!doctorName.trim()) {
      setErrorMessage("请输入医生姓名");
      return;
    }

    const numericDocId = parseInt(doctorId.trim(), 10);
    if (isNaN(numericDocId) || numericDocId <= 0) {
      setErrorMessage("医生 ID 必须是正整数");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    setTimeout(() => {
      setIsSubmitting(false);
      onLoginSuccess(numericDocId, doctorName);
    }, 450);
  };

  return (
    <Card className={`w-full ${isModal ? "max-w-[440px]" : "max-w-[460px]"}`}>
      <CardHeader>
        <CardTitle>医生端登录</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-7">
        {errorMessage && (
          <div className="p-3 bg-[#FDF2F2] border border-[#F8D2D2] text-[#D95C5C] rounded-lg text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="doctor-id" className={`font-bold text-[#5B6B7A] uppercase tracking-wider block ${isModal ? "text-xs" : "text-[10px]"}`}>
            医生 ID
          </Label>
          <div className="relative">
            <Input
              id="doctor-id"
              type="text"
              value={doctorId}
              aria-label="Doctor ID"
              onChange={(e) => setDoctorId(e.target.value)}
              placeholder="请输入医生 ID..."
              className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
            />
            <UserCheck className={`absolute left-2.5 top-2.5 text-[#8A97A6] ${isModal ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="doctor-name" className={`font-bold text-[#5B6B7A] uppercase tracking-wider block ${isModal ? "text-xs" : "text-[10px]"}`}>
            医生姓名
          </Label>
          <div className="relative">
            <Input
              id="doctor-name"
              type="text"
              value={doctorName}
              aria-label="Doctor Name"
              onChange={(e) => setDoctorName(e.target.value)}
              placeholder="请输入医师姓名..."
              className="w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] text-xs py-2 px-3 pl-8.5 rounded-lg focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20"
            />
            <Activity className={`absolute left-2.5 top-2.5 text-[#8A97A6] ${isModal ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password" className={`font-bold text-[#5B6B7A] uppercase tracking-wider block ${isModal ? "text-xs" : "text-[10px]"}`}>
            密码
          </Label>
          <div className="relative">
            <Input
              id="password"
              type="password"
              value={password}
              aria-label="Password"
              onChange={(e) => setPassword(e.target.value)}
              className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
            />
            <Lock className={`absolute left-2.5 top-2.5 text-[#8A97A6] ${isModal ? "h-4 w-4" : "h-3.5 w-3.5"}`} />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting}
          variant="default"
          size={isModal ? "lg" : "default"}
          className="w-full"
        >
          {isSubmitting ? (
            <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>验证身份并进入患者列表</span>
          )}
        </Button>
      </form>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <Button type="button" variant="link" size="sm" onClick={() => setSwitchView("register")}>
          创建账号
        </Button>
        <Button type="button" variant="link" size="sm" onClick={() => setSwitchView("forgot-password")}>
          忘记密码
        </Button>
      </CardFooter>
    </Card>
  );
}

/* ================================================================
   注册表单
   ================================================================ */

function RegisterForm({
  onBack,
  onLoginSuccess,
}: {
  onBack: () => void;
  onLoginSuccess: (doctorId: number, doctorName: string) => void;
}) {
  const isModal = useVariant() === "modal";
  const [name, setName] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!name.trim()) {
      setErrorMessage("请输入姓名");
      return;
    }
    if (!employeeId.trim()) {
      setErrorMessage("请输入医生工号");
      return;
    }
    if (!phone.trim()) {
      setErrorMessage("请输入手机号");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setErrorMessage("请输入有效的手机号");
      return;
    }
    if (!password) {
      setErrorMessage("请设置密码");
      return;
    }
    if (password.length < 6) {
      setErrorMessage("密码长度不能少于 6 位");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage("两次输入的密码不一致");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage("账号创建成功，正在为您登录...");

      setTimeout(() => {
        const numericId = parseInt(employeeId.trim(), 10) || 0;
        onLoginSuccess(numericId, name);
      }, 800);
    }, 600);
  };

  return (
    <AuthCard
      title="创建账号"
      subtitle="注册后由管理员审核开通"
      onBack={onBack}
      footer={
        <p className="text-center text-xs text-[#5B6B7A]">
          已有账号？
          <button
            type="button"
            onClick={onBack}
            className="ml-1 text-[#2F5D7C] font-medium hover:underline cursor-pointer"
          >
            返回登录
          </button>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-[#FDF2F2] border border-[#F8D2D2] text-[#D95C5C] rounded-lg text-xs font-medium">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="p-3 bg-[#EEFDF5] border border-[#D5F5E3] text-[#5B9B7A] rounded-lg text-xs font-medium">
            {successMessage}
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="reg-name" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
            姓名
          </Label>
          <div className="relative">
            <Input
              id="reg-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入真实姓名"
              className="w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] text-xs py-2 px-3 pl-8.5 rounded-lg focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20"
            />
            <UserCheck className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-employee-id" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
            医生工号
          </Label>
          <div className="relative">
            <Input
              id="reg-employee-id"
              type="text"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              placeholder="医院分配的工号"
              className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
            />
            <KeyRound className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-phone" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
            手机号
          </Label>
          <div className="relative">
            <Input
              id="reg-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="用于接收通知和找回密码"
              className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
            />
            <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-password" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
            设置密码
          </Label>
          <div className="relative">
            <Input
              id="reg-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="至少 6 位"
              className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
            />
            <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-confirm" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
            确认密码
          </Label>
          <div className="relative">
            <Input
              id="reg-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入密码"
              className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
            />
            <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
          </div>
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || !!successMessage}
          className={`w-full mt-2 bg-[#2F5D7C] hover:bg-[#1F3E54] text-white font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 h-auto ${isModal ? "py-3.5 text-sm" : "py-2.5 text-xs"}`}
        >
          {isSubmitting ? (
            <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>创建账号并登录</span>
          )}
        </Button>
      </form>
    </AuthCard>
  );
}

/* ================================================================
   忘记密码表单
   ================================================================ */

function ForgotPasswordForm({ onBack }: { onBack: () => void }) {
  const isModal = useVariant() === "modal";
  const [step, setStep] = useState<"phone" | "verify" | "reset">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleSendCode = () => {
    if (!phone.trim()) {
      setErrorMessage("请先输入手机号");
      return;
    }
    if (!/^1[3-9]\d{9}$/.test(phone.trim())) {
      setErrorMessage("请输入有效的手机号");
      return;
    }

    setErrorMessage("");
    setIsSendingCode(true);

    setTimeout(() => {
      setIsSendingCode(false);
      setStep("verify");
      setCountdown(60);

      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }, 800);
  };

  const handleVerifyCode = () => {
    if (!code.trim()) {
      setErrorMessage("请输入验证码");
      return;
    }

    setErrorMessage("");
    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setStep("reset");
    }, 500);
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!newPassword) {
      setErrorMessage("请输入新密码");
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage("密码长度不能少于 6 位");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("两次输入的密码不一致");
      return;
    }

    setIsSubmitting(true);

    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage("密码重置成功！");

      setTimeout(() => {
        onBack();
      }, 1200);
    }, 600);
  };

  const titles: Record<typeof step, string> = {
    phone: "忘记密码",
    verify: "验证身份",
    reset: "设置新密码",
  };
  const subtitles: Record<typeof step, string> = {
    phone: "输入注册时使用的手机号",
    verify: `验证码已发送至 ${phone}`,
    reset: "请设置新的登录密码",
  };

  return (
    <AuthCard
      title={titles[step]}
      subtitle={subtitles[step]}
      onBack={step === "phone" ? onBack : () => setStep(step === "verify" ? "phone" : "verify")}
      footer={
        <p className="text-center text-xs text-[#5B6B7A]">
          记起密码了？
          <button
            type="button"
            onClick={onBack}
            className="ml-1 text-[#2F5D7C] font-medium hover:underline cursor-pointer"
          >
            返回登录
          </button>
        </p>
      }
    >
      {errorMessage && (
        <div className="p-3 bg-[#FDF2F2] border border-[#F8D2D2] text-[#D95C5C] rounded-lg text-xs font-medium">
          {errorMessage}
        </div>
      )}
      {successMessage && (
        <div className="p-3 bg-[#EEFDF5] border border-[#D5F5E3] text-[#5B9B7A] rounded-lg text-xs font-medium">
          {successMessage}
        </div>
      )}

      {/* Step 1: 输入手机号 */}
      {step === "phone" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-phone" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
              手机号
            </Label>
            <div className="relative">
              <Input
                id="fp-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="请输入注册手机号"
                className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
              />
              <Phone className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
            </div>
          </div>

          <Button
            type="button"
            disabled={isSendingCode}
            onClick={handleSendCode}
            className={`w-full bg-[#2F5D7C] hover:bg-[#1F3E54] text-white font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 h-auto ${isModal ? "py-3.5 text-sm" : "py-2.5 text-xs"}`}
          >
            {isSendingCode ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>获取验证码</span>
            )}
          </Button>
        </div>
      )}

      {/* Step 2: 输入验证码 */}
      {step === "verify" && (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-code" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
              验证码
            </Label>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Input
                  id="fp-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="请输入 6 位验证码"
                  maxLength={6}
                  className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
                />
                <Mail className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
              </div>
              <button
                type="button"
                disabled={countdown > 0}
                onClick={handleSendCode}
                className="shrink-0 px-3 py-2 rounded-lg border border-[#D9E2EC] bg-[#F4F7FA] text-xs text-[#5B6B7A] hover:text-[#2F5D7C] hover:border-[#2F5D7C] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {countdown > 0 ? `${countdown}s` : "重新发送"}
              </button>
            </div>
          </div>

          <Button
            type="button"
            disabled={isSubmitting}
            onClick={handleVerifyCode}
            className={`w-full bg-[#2F5D7C] hover:bg-[#1F3E54] text-white font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 h-auto ${isModal ? "py-3.5 text-sm" : "py-2.5 text-xs"}`}
          >
            {isSubmitting ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>验证并继续</span>
            )}
          </Button>
        </div>
      )}

      {/* Step 3: 设置新密码 */}
      {step === "reset" && (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="fp-new-pw" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
              新密码
            </Label>
            <div className="relative">
              <Input
                id="fp-new-pw"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少 6 位"
                className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
              />
              <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fp-confirm" className="text-[10px] font-bold text-[#5B6B7A] uppercase tracking-wider block">
              确认新密码
            </Label>
            <div className="relative">
              <Input
                id="fp-confirm"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="再次输入新密码"
                className={`w-full bg-[#F4F7FA] border-[#D9E2EC] text-[#243447] px-3 pl-8.5 rounded-lg font-mono focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 ${isModal ? "text-sm py-3" : "text-xs py-2"}`}
              />
              <Lock className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#8A97A6]" />
            </div>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || !!successMessage}
            className={`w-full mt-2 bg-[#2F5D7C] hover:bg-[#1F3E54] text-white font-semibold rounded-lg shadow-sm cursor-pointer disabled:opacity-50 h-auto ${isModal ? "py-3.5 text-sm" : "py-2.5 text-xs"}`}
          >
            {isSubmitting ? (
              <div className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <span>重置密码</span>
            )}
          </Button>
        </form>
      )}
    </AuthCard>
  );
}

/* ================================================================
   LoginView 主入口
   ================================================================ */

export default function LoginView({ onLoginSuccess, variant = "fullscreen" }: LoginViewProps) {
  // modal 模式：纯卡片，无背景
  if (variant === "modal") {
    return (
      <LoginVariantCtx.Provider value={variant}>
        <div className="relative flex items-center justify-center p-6">
          <LoginForm onLoginSuccess={onLoginSuccess} />
        </div>
      </LoginVariantCtx.Provider>
    );
  }

  // fullscreen 模式：全屏独立登录页（原有行为）
  return (
    <LoginVariantCtx.Provider value={variant}>
      <div className="relative min-h-screen w-full flex items-center justify-center pl-44 pr-6 bg-[#F4F7FA] overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <img
            src="/src/assets/images/login_bg.png"
            alt="肺康复临床协作图景"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>

        <div className="translate-x-[75px]">
          <LoginForm onLoginSuccess={onLoginSuccess} />
        </div>
      </div>
    </LoginVariantCtx.Provider>
  );
}