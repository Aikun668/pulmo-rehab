/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Brain,
  Calendar,
  Clock,
  FileText,
  Heart,
  Plus,
  User,
  X,
} from "lucide-react";
import { AISummary, ApiResponse, Patient, RehabPlan, TrainingLog } from "../types";

interface PatientDetailViewProps {
  patient: Patient;
  doctorId: number;
  onBackToList: () => void;
}

type ProgressDay = {
  date: string;
  duration_minutes: number;
  sets_count: number;
};

type FollowUpState = {
  riskLevel: "low" | "medium" | "high";
  label: string;
  badgeClassName: string;
  note: string;
  actionLabel: string;
  actionTarget: "progress" | "logs" | "plans";
  actionDescription: string;
};

const formatDate = (value: string | null) => {
  if (!value) {
    return "暂无";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleDateString("zh-CN");
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "暂无";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return parsed.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const resolveFollowUpState = (
  checkInCount7d: number,
  lastCheckInAt: string | null,
): FollowUpState => {
  if (lastCheckInAt === null) {
    return {
      riskLevel: "high",
      label: "需尽快跟进",
      badgeClassName: "bg-[#FDF2F2] text-[#D95C5C] border-[#F8D2D2]",
      note: "暂未发现训练记录，建议优先核对患者当前训练状态。",
      actionLabel: "查看训练记录",
      actionTarget: "logs",
      actionDescription: "先核对近期是否中断训练，再决定是否补充新方案。",
    };
  }

  if (checkInCount7d >= 5) {
    return {
      riskLevel: "low",
      label: "训练稳定",
      badgeClassName: "bg-[#EEFDF5] text-[#5B9B7A] border-[#D5F5E3]",
      note: "近7天训练保持稳定，可继续按照当前方案跟进。",
      actionLabel: "查看最新方案",
      actionTarget: "plans",
      actionDescription: "当前以保持节奏为主，重点确认方案是否仍适用。",
    };
  }

  if (checkInCount7d >= 3) {
    return {
      riskLevel: "medium",
      label: "需要关注",
      badgeClassName: "bg-[#FDF8EE] text-[#D9A441] border-[#F8E1C2]",
      note: "近7天训练频率有波动，建议结合详情页进一步查看。",
      actionLabel: "查看30天进度",
      actionTarget: "progress",
      actionDescription: "优先对照趋势波动，再结合记录判断是否需要调整方案。",
    };
  }

  return {
    riskLevel: "high",
    label: "需尽快跟进",
    badgeClassName: "bg-[#FDF2F2] text-[#D95C5C] border-[#F8D2D2]",
    note: "近7天暂无训练记录，建议优先联系患者确认原因。",
    actionLabel: "下发训练方案",
    actionTarget: "plans",
    actionDescription: "确认中断原因后，可直接补充或更新当前训练方案。",
  };
};

export default function PatientDetailView({
  patient,
  doctorId,
  onBackToList,
}: PatientDetailViewProps) {
  const requestVersionRef = useRef(0);
  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [plans, setPlans] = useState<RehabPlan[]>([]);
  const [progress30d, setProgress30d] = useState<ProgressDay[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);

  const [logsLoading, setLogsLoading] = useState(true);
  const [plansLoading, setPlansLoading] = useState(true);
  const [progressLoading, setProgressLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);

  const [logsError, setLogsError] = useState("");
  const [plansError, setPlansError] = useState("");
  const [progressError, setProgressError] = useState("");
  const [aiError, setAiError] = useState("");
  const [hoveredProgressIndex, setHoveredProgressIndex] = useState<number | null>(null);

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [newPlanTitle, setNewPlanTitle] = useState("");
  const [newPlanContent, setNewPlanContent] = useState("");
  const [formError, setFormError] = useState("");
  const [planSuccessMessage, setPlanSuccessMessage] = useState("");
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  const isLatestRequest = (requestVersion: number) => requestVersionRef.current === requestVersion;

  useEffect(() => {
    requestVersionRef.current += 1;
    const currentRequestVersion = requestVersionRef.current;

    setLogs([]);
    setPlans([]);
    setProgress30d([]);
    setAiSummary(null);
    setNewPlanTitle("");
    setNewPlanContent("");
    setFormError("");
    setPlanSuccessMessage("");
    setIsPlanModalOpen(false);

    void fetchLogs(currentRequestVersion);
    void fetchPlans(currentRequestVersion);
    void fetchProgress(currentRequestVersion);
    void fetchAiSummary(currentRequestVersion);
  }, [patient.id]);

  const fetchLogs = async (requestVersion: number) => {
    try {
      setLogsLoading(true);
      setLogsError("");

      const response = await fetch(`/api/training-logs?patient_id=${patient.id}`);
      const json: ApiResponse<TrainingLog[]> = await response.json();

      if (!isLatestRequest(requestVersion)) {
        return;
      }

      if (!response.ok || json.code !== 200) {
        setLogs([]);
        setLogsError(json.message || "训练记录加载失败");
        return;
      }

      setLogs(json.data ?? []);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) {
        return;
      }

      console.error("Failed to load training logs:", error);
      setLogs([]);
      setLogsError("无法连接后端服务，训练记录暂时不可用。");
    } finally {
      if (isLatestRequest(requestVersion)) {
        setLogsLoading(false);
      }
    }
  };

  const fetchPlans = async (requestVersion: number) => {
    try {
      setPlansLoading(true);
      setPlansError("");

      const response = await fetch(
        `/api/rehab-plans?patient_id=${patient.id}&doctor_id=${doctorId}`,
      );
      const json: ApiResponse<RehabPlan[]> = await response.json();

      if (!isLatestRequest(requestVersion)) {
        return;
      }

      if (!response.ok || json.code !== 200) {
        setPlans([]);
        setPlansError(json.message || "训练方案加载失败");
        return;
      }

      setPlans(json.data ?? []);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) {
        return;
      }

      console.error("Failed to load rehab plans:", error);
      setPlans([]);
      setPlansError("无法连接后端服务，训练方案暂时不可用。");
    } finally {
      if (isLatestRequest(requestVersion)) {
        setPlansLoading(false);
      }
    }
  };

  const fetchProgress = async (requestVersion: number) => {
    try {
      setProgressLoading(true);
      setProgressError("");

      const response = await fetch(`/api/training-logs/progress-30d?patient_id=${patient.id}`);
      const json: ApiResponse<{ patient_id: number; days: ProgressDay[] }> = await response.json();

      if (!isLatestRequest(requestVersion)) {
        return;
      }

      if (!response.ok || json.code !== 200) {
        setProgress30d([]);
        setProgressError(json.message || "30天进度加载失败");
        return;
      }

      setProgress30d(json.data?.days ?? []);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) {
        return;
      }

      console.error("Failed to load progress data:", error);
      setProgress30d([]);
      setProgressError("无法连接后端服务，30天进度暂时不可用。");
    } finally {
      if (isLatestRequest(requestVersion)) {
        setProgressLoading(false);
      }
    }
  };

  const fetchAiSummary = async (requestVersion: number) => {
    try {
      setAiLoading(true);
      setAiError("");

      const response = await fetch(`/api/ai-summaries/latest?patient_id=${patient.id}`);
      const json: ApiResponse<AISummary | null> = await response.json();

      if (!isLatestRequest(requestVersion)) {
        return;
      }

      if (!response.ok || json.code !== 200) {
        setAiSummary(null);
        setAiError(json.message || "AI小结加载失败");
        return;
      }

      setAiSummary(json.data);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) {
        return;
      }

      console.error("Failed to load AI summary:", error);
      setAiSummary(null);
      setAiError("无法连接后端服务，AI小结暂时不可用。");
    } finally {
      if (isLatestRequest(requestVersion)) {
        setAiLoading(false);
      }
    }
  };

  const handleCreatePlanSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!newPlanTitle.trim() || !newPlanContent.trim()) {
      setFormError("标题和方案内容不能为空。");
      return;
    }

    try {
      setIsSubmittingPlan(true);
      setFormError("");
      setPlanSuccessMessage("");

      const response = await fetch("/api/rehab-plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          patient_id: patient.id,
          doctor_id: doctorId,
          title: newPlanTitle.trim(),
          content: newPlanContent.trim(),
        }),
      });

      const json: ApiResponse<RehabPlan> = await response.json();
      if (!response.ok || json.code !== 200) {
        setFormError(json.message || "训练方案下发失败，请稍后重试。");
        return;
      }

      setNewPlanTitle("");
      setNewPlanContent("");
      setIsPlanModalOpen(false);
      await fetchPlans(requestVersionRef.current);
      setPlanSuccessMessage("已完成最新方案下发，可继续查看训练记录与30天进度。");
    } catch (error) {
      console.error("Failed to create rehab plan:", error);
      setFormError("无法连接后端服务，训练方案下发失败。");
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const progressMax = useMemo(() => Math.max(30, ...progress30d.map((item) => item.duration_minutes)), [progress30d]);

  const progressSummary = useMemo(() => {
    const trainedDays = progress30d.filter((item) => item.duration_minutes > 0);
    const totalDuration = progress30d.reduce((sum, item) => sum + item.duration_minutes, 0);
    const totalSets = progress30d.reduce((sum, item) => sum + item.sets_count, 0);

    return {
      trainedDays: trainedDays.length,
      totalDuration,
      totalSets,
    };
  }, [progress30d]);

  const progressChart = useMemo(() => {
    if (progress30d.length === 0) {
      return null;
    }

    const chartWidth = 720;
    const chartHeight = 240;
    const padding = {
      top: 20,
      right: 20,
      bottom: 32,
      left: 40,
    };

    const innerWidth = chartWidth - padding.left - padding.right;
    const innerHeight = chartHeight - padding.top - padding.bottom;
    const stepX = progress30d.length > 1 ? innerWidth / (progress30d.length - 1) : innerWidth;

    const points = progress30d.map((item, index) => {
      const x = padding.left + index * stepX;
      const ratio = progressMax === 0 ? 0 : item.duration_minutes / progressMax;
      const y = padding.top + innerHeight - ratio * innerHeight;
      return {
        ...item,
        x,
        y,
      };
    });

    const linePath = points
      .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
      .join(" ");

    const areaPath = `${linePath} L ${points[points.length - 1].x} ${padding.top + innerHeight} L ${points[0].x} ${padding.top + innerHeight} Z`;
    const yAxisTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
      value: Math.round(progressMax * ratio),
      y: padding.top + innerHeight - ratio * innerHeight,
    }));

    return {
      chartWidth,
      chartHeight,
      padding,
      points,
      linePath,
      areaPath,
      yAxisTicks,
      xAxisLabelIndexes: [0, 7, 14, 21, 29].filter((index) => index < progress30d.length),
    };
  }, [progress30d, progressMax]);

  const followUpState = useMemo(
    () => resolveFollowUpState(patient.stats.check_in_count_7d, patient.stats.last_check_in_at),
    [patient.stats.check_in_count_7d, patient.stats.last_check_in_at],
  );

  const latestLog = logs[0] ?? null;
  const latestPlan = plans[0] ?? null;
  const hasPlans = plans.length > 0;
  const planStatusSummary = useMemo(() => {
    if (plansLoading) {
      return {
        title: "正在同步方案状态",
        description: "正在读取当前患者的历史方案，请稍候。",
        toneClassName: "border-[#D9E2EC] bg-[#F8FAFC] text-[#5B6B7A]",
        actionLabel: "请稍候",
      };
    }

    if (plansError) {
      return {
        title: "方案状态暂不可用",
        description: "当前无法确认方案历史，请先恢复后端连接后再继续判断。",
        toneClassName: "border-[#F8D2D2] bg-[#FDF2F2] text-[#D95C5C]",
        actionLabel: "稍后重试",
      };
    }

    if (!hasPlans) {
      return {
        title: "当前暂无训练方案",
        description:
          followUpState.riskLevel === "high"
            ? "患者当前处于优先跟进状态，建议先完成训练方案下发，再继续观察训练执行情况。"
            : "当前患者还没有训练方案，建议结合训练进度与记录补充第一版方案。",
        toneClassName:
          followUpState.riskLevel === "high"
            ? "border-[#F8D2D2] bg-[#FDF2F2] text-[#B44545]"
            : "border-[#E7EDF3] bg-[#FBFCFD] text-[#5B6B7A]",
        actionLabel: "建议先下发方案",
      };
    }

    return {
      title: "当前已有训练方案",
      description:
        followUpState.riskLevel === "high"
          ? "建议先核对最新方案是否仍适用，再结合训练记录判断是否需要补充更新。"
          : "可先复核最新方案内容，再结合当前训练趋势决定是否继续沿用。",
      toneClassName: "border-[#D5F5E3] bg-[#EEFDF5] text-[#3E7B61]",
      actionLabel: "建议复核最新方案",
    };
  }, [followUpState.riskLevel, hasPlans, plansError, plansLoading]);

  const handleFollowUpAction = () => {
    const targetMap: Record<FollowUpState["actionTarget"], string> = {
      progress: "patient-progress-section",
      logs: "patient-logs-section",
      plans: "patient-plans-section",
    };

    if (followUpState.actionTarget === "plans" && followUpState.riskLevel === "high" && plans.length === 0) {
      setIsPlanModalOpen(true);
      return;
    }

    const targetId = targetMap[followUpState.actionTarget];
    const element = document.getElementById(targetId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="space-y-5 text-slate-800">
      <section className="rounded-xl border border-[#D9E2EC] bg-white p-5">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <button
                onClick={onBackToList}
                className="h-9 w-9 rounded-lg border border-[#D9E2EC] bg-white text-[#5B6B7A] hover:bg-[#F4F7FA]"
                title="返回患者列表"
              >
                <ArrowLeft className="mx-auto h-4 w-4" />
              </button>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-[11px] text-[#5B6B7A]">
                  <User className="h-3.5 w-3.5 text-[#4F7A94]" />
                  <span>患者详情工作台</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold text-[#243447]">{patient.name}</h2>
                  <span className="rounded-md border border-[#D9E2EC] bg-[#F4F7FA] px-2 py-0.5 text-[11px] text-[#5B6B7A]">
                    患者 ID {patient.id}
                  </span>
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${followUpState.badgeClassName}`}>
                    {followUpState.label}
                  </span>
                </div>
                <p className="text-sm text-[#5B6B7A]">最近训练日期：{formatDate(patient.stats.last_check_in_at)}</p>
                <p className="text-sm leading-6 text-[#5B6B7A]">{followUpState.note}</p>
                <p className="text-sm text-[#243447]">
                  当前建议：<span className="font-medium">{followUpState.actionDescription}</span>
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#5B6B7A]">
                  <Calendar className="h-4 w-4" />
                  <span>近7天打卡</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#243447]">
                  {patient.stats.check_in_count_7d}
                  <span className="ml-1 text-sm font-medium text-[#5B6B7A]">次</span>
                </p>
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#5B6B7A]">
                  <Clock className="h-4 w-4" />
                  <span>累计训练时长</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#243447]">
                  {patient.stats.total_duration_minutes}
                  <span className="ml-1 text-sm font-medium text-[#5B6B7A]">分钟</span>
                </p>
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#5B6B7A]">
                  <FileText className="h-4 w-4" />
                  <span>训练记录</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#243447]">{logs.length}</p>
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <div className="flex items-center gap-2 text-sm text-[#5B6B7A]">
                  <Heart className="h-4 w-4" />
                  <span>历史方案</span>
                </div>
                <p className="mt-2 text-2xl font-semibold text-[#243447]">{plans.length}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToList}
              className="rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
            >
              返回列表
            </button>
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="flex items-center gap-2 rounded-lg bg-[#2F5D7C] px-3 py-2 text-sm font-medium text-white hover:bg-[#4F7A94]"
            >
              <Plus className="h-4 w-4" />
              下发方案
            </button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <section
            id="patient-progress-section"
            className="rounded-xl border border-[#D9E2EC] bg-white p-5 space-y-4"
          >
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[#243447]">
                <Activity className="h-4 w-4 text-[#4F7A94]" />
                近30天训练进度
              </h3>
              <p className="text-sm text-[#5B6B7A]">主图区优先展示训练趋势，帮助快速判断训练是否连续。</p>
            </div>

            {progressLoading ? (
              <div className="h-48 rounded-xl bg-[#F4F7FA] animate-pulse" />
            ) : progressError ? (
              <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{progressError}</span>
              </div>
            ) : progress30d.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D9E2EC] p-8 text-center text-sm text-[#5B6B7A]">
                暂无近30天训练数据。
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#8A97A6]">有训练的天数</p>
                    <p className="mt-1 text-xl font-semibold text-[#243447]">{progressSummary.trainedDays} 天</p>
                  </div>
                  <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#8A97A6]">30天总时长</p>
                    <p className="mt-1 text-xl font-semibold text-[#243447]">{progressSummary.totalDuration} 分钟</p>
                  </div>
                  <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3">
                    <p className="text-xs text-[#8A97A6]">30天总组数</p>
                    <p className="mt-1 text-xl font-semibold text-[#243447]">{progressSummary.totalSets} 组</p>
                  </div>
                </div>

                {progressChart && (
                  <div className="rounded-xl border border-[#D9E2EC] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-[#243447]">近30天训练时长趋势</p>
                        <p className="text-xs text-[#5B6B7A]">折线展示每日训练时长，组数通过悬浮提示查看。</p>
                      </div>
                      <div className="text-right text-xs text-[#8A97A6]">
                        <p>纵轴：分钟</p>
                        <p>横轴：日期</p>
                      </div>
                    </div>

                    <div className="relative">
                      <svg
                        viewBox={`0 0 ${progressChart.chartWidth} ${progressChart.chartHeight}`}
                        className="h-auto w-full"
                        role="img"
                        aria-label="近30天训练时长折线图"
                      >
                        <defs>
                          <linearGradient id="progressAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#2F5D7C" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#2F5D7C" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {progressChart.yAxisTicks.map((tick) => (
                          <g key={`${tick.value}-${tick.y}`}>
                            <line
                              x1={progressChart.padding.left}
                              y1={tick.y}
                              x2={progressChart.chartWidth - progressChart.padding.right}
                              y2={tick.y}
                              stroke="#E7EDF3"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={progressChart.padding.left - 10}
                              y={tick.y + 4}
                              textAnchor="end"
                              fill="#8A97A6"
                              fontSize="11"
                            >
                              {tick.value}
                            </text>
                          </g>
                        ))}

                        <path d={progressChart.areaPath} fill="url(#progressAreaFill)" />
                        <path
                          d={progressChart.linePath}
                          fill="none"
                          stroke="#2F5D7C"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {progressChart.points.map((point, index) => {
                          const isHovered = hoveredProgressIndex === index;
                          const hasTraining = point.duration_minutes > 0;

                          return (
                            <g key={point.date}>
                              <rect
                                x={point.x - 10}
                                y={progressChart.padding.top}
                                width="20"
                                height={progressChart.chartHeight - progressChart.padding.top - progressChart.padding.bottom}
                                fill="transparent"
                                onMouseEnter={() => setHoveredProgressIndex(index)}
                                onMouseLeave={() => setHoveredProgressIndex(null)}
                              />

                              {isHovered && (
                                <line
                                  x1={point.x}
                                  y1={progressChart.padding.top}
                                  x2={point.x}
                                  y2={progressChart.chartHeight - progressChart.padding.bottom}
                                  stroke="#8A97A6"
                                  strokeWidth="1"
                                  strokeDasharray="4 4"
                                />
                              )}

                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isHovered ? 5 : hasTraining ? 3.5 : 2.5}
                                fill={hasTraining ? "#2F5D7C" : "#C9D4DF"}
                                stroke="#FFFFFF"
                                strokeWidth="2"
                              />
                            </g>
                          );
                        })}

                        <line
                          x1={progressChart.padding.left}
                          y1={progressChart.chartHeight - progressChart.padding.bottom}
                          x2={progressChart.chartWidth - progressChart.padding.right}
                          y2={progressChart.chartHeight - progressChart.padding.bottom}
                          stroke="#D9E2EC"
                          strokeWidth="1"
                        />

                        {progressChart.xAxisLabelIndexes.map((index) => {
                          const point = progressChart.points[index];
                          return (
                            <g key={point.date}>
                              <text
                                x={point.x}
                                y={progressChart.chartHeight - 8}
                                textAnchor="middle"
                                fill="#8A97A6"
                                fontSize="11"
                              >
                                {point.date.slice(5)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {hoveredProgressIndex !== null && progressChart.points[hoveredProgressIndex] && (
                        <div className="absolute right-3 top-3 rounded-lg border border-[#D9E2EC] bg-white/95 px-3 py-2 shadow-sm">
                          <p className="text-xs font-medium text-[#243447]">
                            {formatDate(progressChart.points[hoveredProgressIndex].date)}
                          </p>
                          <p className="mt-1 text-xs text-[#5B6B7A]">
                            训练时长：{progressChart.points[hoveredProgressIndex].duration_minutes} 分钟
                          </p>
                          <p className="text-xs text-[#5B6B7A]">
                            完成组数：{progressChart.points[hoveredProgressIndex].sets_count} 组
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </section>

          <section
            id="patient-logs-section"
            className="rounded-xl border border-[#D9E2EC] bg-white p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-base font-semibold text-[#243447]">
                <FileText className="h-4 w-4 text-[#4F7A94]" />
                训练记录列表
              </h3>
              <span className="text-xs text-[#8A97A6]">共 {logs.length} 条</span>
            </div>

            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-xl bg-[#F4F7FA] animate-pulse" />
                ))}
              </div>
            ) : logsError ? (
              <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{logsError}</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D9E2EC] p-8 text-center text-sm text-[#5B6B7A]">
                当前患者暂无训练记录。
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-[#D9E2EC] bg-[#FBFCFD] p-4">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-[#243447]">{log.train_date}</span>
                          <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-0.5 text-xs text-[#5B6B7A]">
                            {log.duration_minutes} 分钟
                          </span>
                          <span className="rounded-full border border-[#D9E2EC] bg-white px-2 py-0.5 text-xs text-[#5B6B7A]">
                            {log.sets_count} 组
                          </span>
                        </div>
                        <p className="text-sm text-[#5B6B7A]">{log.note?.trim() ? log.note : "本次训练未填写备注。"}</p>
                      </div>
                      <span className="text-xs text-[#8A97A6]">{formatDateTime(log.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="rounded-xl border border-[#D9E2EC] bg-white p-5 space-y-4">
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[#243447]">
                <User className="h-4 w-4 text-[#4F7A94]" />
                患者概览
              </h3>
              <p className="mt-1 text-sm text-[#5B6B7A]">右侧优先展示患者当前状态与最近一次关键动作。</p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-[#8A97A6]">当前状态</p>
                    <p className="mt-2 text-sm font-semibold text-[#243447]">{followUpState.label}</p>
                  </div>
                  <span className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${followUpState.badgeClassName}`}>
                    {followUpState.label}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-[#5B6B7A]">{followUpState.note}</p>
              </div>
              <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <p className="text-[11px] text-[#8A97A6]">跟进建议</p>
                <p className="mt-2 text-sm font-semibold text-[#243447]">{followUpState.actionLabel}</p>
                <p className="mt-2 text-sm leading-6 text-[#5B6B7A]">{followUpState.actionDescription}</p>
                {!hasPlans && !plansLoading && !plansError && (
                  <div className="mt-3 rounded-lg border border-[#F8D2D2] bg-[#FDF2F2] px-3 py-2 text-sm text-[#B44545]">
                    当前患者暂无训练方案，建议优先完成方案下发。
                  </div>
                )}
                <button
                  onClick={handleFollowUpAction}
                  className="mt-3 inline-flex items-center rounded-lg bg-[#2F5D7C] px-3 py-2 text-sm font-medium text-white hover:bg-[#4F7A94]"
                >
                  {followUpState.actionLabel}
                </button>
              </div>
              <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <p className="text-[11px] text-[#8A97A6]">当前医生</p>
                <p className="mt-1 text-sm font-semibold text-[#243447]">医生 ID {doctorId}</p>
              </div>
              <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <p className="text-[11px] text-[#8A97A6]">最近训练记录</p>
                <p className="mt-1 text-sm font-semibold text-[#243447]">
                  {latestLog ? formatDateTime(latestLog.created_at) : "暂无记录"}
                </p>
              </div>
              <div className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                <p className="text-[11px] text-[#8A97A6]">最新方案</p>
                <p className="mt-1 text-sm font-semibold text-[#243447]">
                  {latestPlan ? latestPlan.title : "暂无方案"}
                </p>
              </div>
            </div>
          </section>

          <section
            id="patient-plans-section"
            className="rounded-xl border border-[#D9E2EC] bg-white p-5 space-y-4"
          >
            <div>
              <h3 className="flex items-center gap-2 text-base font-semibold text-[#243447]">
                <Brain className="h-4 w-4 text-[#4F7A94]" />
                最新 AI 小结
              </h3>
              <p className="mt-1 text-sm text-[#5B6B7A]">默认展示当前患者最新一条 AI 周报。</p>
            </div>

            {aiLoading ? (
              <div className="space-y-2">
                <div className="h-4 rounded bg-[#F4F7FA] animate-pulse" />
                <div className="h-4 rounded bg-[#F4F7FA] animate-pulse" />
                <div className="h-4 rounded bg-[#F4F7FA] animate-pulse" />
              </div>
            ) : aiError ? (
              <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{aiError}</span>
              </div>
            ) : !aiSummary ? (
              <div className="rounded-xl border border-dashed border-[#D9E2EC] p-4 text-sm text-[#5B6B7A]">
                当前暂无 AI 周报，后续生成后会展示在这里。
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-[#8A97A6]">
                  周期：{aiSummary.summary_week_start} - {aiSummary.summary_week_end}
                </div>
                <div className="text-xs text-[#8A97A6]">生成时间：{formatDateTime(aiSummary.created_at)}</div>
                <div className="whitespace-pre-line rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 text-sm leading-6 text-[#243447]">
                  {aiSummary.content}
                </div>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-[#D9E2EC] bg-white p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="flex items-center gap-2 text-base font-semibold text-[#243447]">
                  <Heart className="h-4 w-4 text-[#4F7A94]" />
                  训练方案历史
                </h3>
                <p className="text-sm text-[#5B6B7A]">保留全部历史方案，最新方案排在最前。</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
              >
                新增方案
              </button>
            </div>

            <div className={`rounded-xl border px-4 py-3 ${planStatusSummary.toneClassName}`}>
              <p className="text-[11px] opacity-80">方案状态</p>
              <p className="mt-1 text-sm font-semibold">{planStatusSummary.title}</p>
              <p className="mt-2 text-sm leading-6">{planStatusSummary.description}</p>
              <p className="mt-2 text-xs font-medium">{planStatusSummary.actionLabel}</p>
            </div>

            {planSuccessMessage && (
              <div className="rounded-xl border border-[#D5F5E3] bg-[#EEFDF5] px-4 py-3 text-sm text-[#3E7B61]">
                {planSuccessMessage}
              </div>
            )}

            {plansLoading ? (
              <div className="space-y-2">
                <div className="h-20 rounded-xl bg-[#F4F7FA] animate-pulse" />
                <div className="h-20 rounded-xl bg-[#F4F7FA] animate-pulse" />
              </div>
            ) : plansError ? (
              <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{plansError}</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#D9E2EC] p-8 text-center text-sm text-[#5B6B7A]">
                当前还没有下发过训练方案。
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan, index) => (
                  <div key={plan.id} className="rounded-xl border border-[#D9E2EC] bg-[#FBFCFD] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#243447]">{plan.title}</p>
                        <p className="mt-1 text-xs text-[#8A97A6]">
                          医生 {plan.doctor_id} · {formatDateTime(plan.created_at)}
                        </p>
                      </div>
                      {index === 0 && (
                        <span className="rounded-full bg-[#2F5D7C] px-2 py-0.5 text-xs text-white">最新</span>
                      )}
                    </div>
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-[#5B6B7A]">
                      {plan.content}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">下发训练方案</h4>
                <p className="text-sm text-[#5B6B7A]">
                  当前患者：{patient.name}（ID {patient.id}）
                </p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]"
                aria-label="关闭弹窗"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="space-y-4 p-5">
              {formError && (
                <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">方案标题</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(event) => setNewPlanTitle(event.target.value)}
                  placeholder="例如：居家呼吸训练第1周方案"
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">方案内容</label>
                <textarea
                  rows={8}
                  value={newPlanContent}
                  onChange={(event) => setNewPlanContent(event.target.value)}
                  placeholder={"例如：\n1. 每日缩唇呼吸 2 次，每次 15 分钟。\n2. 每次训练完成后记录组数和体感。"}
                  className="w-full resize-none rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                />
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-3 text-sm text-[#5B6B7A]">
                提交后将写入 `patient_id={patient.id}`、`doctor_id={doctorId}`，并保留历史方案。
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
                  disabled={isSubmittingPlan}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2F5D7C] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F7A94] disabled:opacity-60"
                  disabled={isSubmittingPlan}
                >
                  {isSubmittingPlan ? "提交中..." : "确认下发"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
