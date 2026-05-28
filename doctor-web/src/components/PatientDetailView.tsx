/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useState } from "react";
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

export default function PatientDetailView({
  patient,
  doctorId,
  onBackToList,
}: PatientDetailViewProps) {
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
  const [isSubmittingPlan, setIsSubmittingPlan] = useState(false);

  useEffect(() => {
    setLogs([]);
    setPlans([]);
    setProgress30d([]);
    setAiSummary(null);
    setNewPlanTitle("");
    setNewPlanContent("");
    setFormError("");
    setIsPlanModalOpen(false);

    void fetchLogs();
    void fetchPlans();
    void fetchProgress();
    void fetchAiSummary();
  }, [patient.id]);

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      setLogsError("");

      const response = await fetch(`/api/training-logs?patient_id=${patient.id}`);
      const json: ApiResponse<TrainingLog[]> = await response.json();

      if (!response.ok || json.code !== 200) {
        setLogs([]);
        setLogsError(json.message || "训练记录加载失败");
        return;
      }

      setLogs(json.data ?? []);
    } catch (error) {
      console.error("Failed to load training logs:", error);
      setLogs([]);
      setLogsError("无法连接后端服务，训练记录暂时不可用。");
    } finally {
      setLogsLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      setPlansLoading(true);
      setPlansError("");

      const response = await fetch(`/api/rehab-plans?patient_id=${patient.id}`);
      const json: ApiResponse<RehabPlan[]> = await response.json();

      if (!response.ok || json.code !== 200) {
        setPlans([]);
        setPlansError(json.message || "训练方案加载失败");
        return;
      }

      setPlans(json.data ?? []);
    } catch (error) {
      console.error("Failed to load rehab plans:", error);
      setPlans([]);
      setPlansError("无法连接后端服务，训练方案暂时不可用。");
    } finally {
      setPlansLoading(false);
    }
  };

  const fetchProgress = async () => {
    try {
      setProgressLoading(true);
      setProgressError("");

      const response = await fetch(`/api/training-logs/progress-30d?patient_id=${patient.id}`);
      const json: ApiResponse<{ patient_id: number; days: ProgressDay[] }> = await response.json();

      if (!response.ok || json.code !== 200) {
        setProgress30d([]);
        setProgressError(json.message || "30天进度加载失败");
        return;
      }

      setProgress30d(json.data?.days ?? []);
    } catch (error) {
      console.error("Failed to load progress data:", error);
      setProgress30d([]);
      setProgressError("无法连接后端服务，30天进度暂时不可用。");
    } finally {
      setProgressLoading(false);
    }
  };

  const fetchAiSummary = async () => {
    try {
      setAiLoading(true);
      setAiError("");

      const response = await fetch(`/api/ai-summaries/latest?patient_id=${patient.id}`);
      const json: ApiResponse<AISummary | null> = await response.json();

      if (!response.ok || json.code !== 200) {
        setAiSummary(null);
        setAiError(json.message || "AI小结加载失败");
        return;
      }

      setAiSummary(json.data);
    } catch (error) {
      console.error("Failed to load AI summary:", error);
      setAiSummary(null);
      setAiError("无法连接后端服务，AI小结暂时不可用。");
    } finally {
      setAiLoading(false);
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
      await fetchPlans();
    } catch (error) {
      console.error("Failed to create rehab plan:", error);
      setFormError("无法连接后端服务，训练方案下发失败。");
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const progressMax = useMemo(() => {
    return Math.max(30, ...progress30d.map((item) => item.duration_minutes));
  }, [progress30d]);

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

  return (
    <div className="space-y-5 text-slate-800">
      <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <button
              onClick={onBackToList}
              className="h-9 w-9 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
              title="返回患者列表"
            >
              <ArrowLeft className="h-4 w-4 mx-auto" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900">{patient.name}</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  患者 ID {patient.id}
                </span>
              </div>
              <p className="text-sm text-slate-500">
                最近打卡时间：{formatDateTime(patient.stats.last_check_in_at)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onBackToList}
              className="px-3 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              返回列表
            </button>
            <button
              onClick={() => setIsPlanModalOpen(true)}
              className="px-3 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              下发方案
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Calendar className="h-4 w-4" />
              <span>近7天打卡</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {patient.stats.check_in_count_7d}
              <span className="ml-1 text-sm font-medium text-slate-500">次</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Clock className="h-4 w-4" />
              <span>累计训练时长</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">
              {patient.stats.total_duration_minutes}
              <span className="ml-1 text-sm font-medium text-slate-500">分钟</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <User className="h-4 w-4" />
              <span>当前医生</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900">{doctorId}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <div className="xl:col-span-2 space-y-5">
          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  近30天训练进度
                </h3>
                <p className="text-sm text-slate-500">展示每日训练时长和组数，空日期按 0 返回。</p>
              </div>
            </div>

            {progressLoading ? (
              <div className="h-48 rounded-xl bg-slate-50 animate-pulse" />
            ) : progressError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{progressError}</span>
              </div>
            ) : progress30d.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                暂无近30天训练数据。
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">有训练的天数</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{progressSummary.trainedDays} 天</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">30天总时长</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{progressSummary.totalDuration} 分钟</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-500">30天总组数</p>
                    <p className="mt-1 text-xl font-bold text-slate-900">{progressSummary.totalSets} 组</p>
                  </div>
                </div>

                {progressChart && (
                  <div className="rounded-xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div>
                        <p className="text-sm font-medium text-slate-700">近30天训练时长趋势</p>
                        <p className="text-xs text-slate-500">折线展示每日训练时长，组数放在悬浮提示中查看。</p>
                      </div>
                      <div className="text-xs text-slate-500 text-right">
                        <p>纵轴：分钟</p>
                        <p>横轴：日期</p>
                      </div>
                    </div>

                    <div className="relative">
                      <svg
                        viewBox={`0 0 ${progressChart.chartWidth} ${progressChart.chartHeight}`}
                        className="w-full h-auto"
                        role="img"
                        aria-label="近30天训练时长折线图"
                      >
                        <defs>
                          <linearGradient id="progressAreaFill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1e293b" stopOpacity="0.18" />
                            <stop offset="100%" stopColor="#1e293b" stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {progressChart.yAxisTicks.map((tick) => (
                          <g key={`${tick.value}-${tick.y}`}>
                            <line
                              x1={progressChart.padding.left}
                              y1={tick.y}
                              x2={progressChart.chartWidth - progressChart.padding.right}
                              y2={tick.y}
                              stroke="#e2e8f0"
                              strokeWidth="1"
                              strokeDasharray="4 4"
                            />
                            <text
                              x={progressChart.padding.left - 10}
                              y={tick.y + 4}
                              textAnchor="end"
                              fill="#64748b"
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
                          stroke="#1e293b"
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
                                  stroke="#94a3b8"
                                  strokeWidth="1"
                                  strokeDasharray="4 4"
                                />
                              )}

                              <circle
                                cx={point.x}
                                cy={point.y}
                                r={isHovered ? 5 : hasTraining ? 3.5 : 2.5}
                                fill={hasTraining ? "#1e293b" : "#cbd5e1"}
                                stroke="#ffffff"
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
                          stroke="#cbd5e1"
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
                                fill="#64748b"
                                fontSize="11"
                              >
                                {point.date.slice(5)}
                              </text>
                            </g>
                          );
                        })}
                      </svg>

                      {hoveredProgressIndex !== null && progressChart.points[hoveredProgressIndex] && (
                        <div className="absolute right-3 top-3 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 shadow-sm">
                          <p className="text-xs font-medium text-slate-700">
                            {formatDate(progressChart.points[hoveredProgressIndex].date)}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            训练时长：{progressChart.points[hoveredProgressIndex].duration_minutes} 分钟
                          </p>
                          <p className="text-xs text-slate-500">
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

          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4" />
                训练记录列表
              </h3>
              <span className="text-xs text-slate-500">共 {logs.length} 条</span>
            </div>

            {logsLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="h-16 rounded-xl bg-slate-50 animate-pulse" />
                ))}
              </div>
            ) : logsError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{logsError}</span>
              </div>
            ) : logs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                当前患者暂无训练记录。
              </div>
            ) : (
              <div className="space-y-3">
                {logs.map((log) => (
                  <div key={log.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">{log.train_date}</span>
                          <span className="text-xs rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-500">
                            {log.duration_minutes} 分钟
                          </span>
                          <span className="text-xs rounded-full bg-white border border-slate-200 px-2 py-0.5 text-slate-500">
                            {log.sets_count} 组
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          {log.note?.trim() ? log.note : "本次训练未填写备注。"}
                        </p>
                      </div>
                      <span className="text-xs text-slate-500">{formatDateTime(log.created_at)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-slate-900 text-slate-100 rounded-xl p-5 space-y-4">
            <div>
              <h3 className="text-base font-semibold flex items-center gap-2">
                <Brain className="h-4 w-4" />
                最新 AI 小结
              </h3>
              <p className="text-sm text-slate-400 mt-1">默认展示当前患者最新一条 AI 周报。</p>
            </div>

            {aiLoading ? (
              <div className="space-y-2">
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
                <div className="h-4 rounded bg-slate-800 animate-pulse" />
              </div>
            ) : aiError ? (
              <div className="rounded-xl border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{aiError}</span>
              </div>
            ) : !aiSummary ? (
              <div className="rounded-xl border border-slate-700 bg-slate-800/60 p-4 text-sm text-slate-300">
                当前暂无 AI 周报，后续生成后会展示在这里。
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-xs text-slate-400">
                  周期：{aiSummary.summary_week_start} - {aiSummary.summary_week_end}
                </div>
                <div className="text-xs text-slate-400">
                  生成时间：{formatDateTime(aiSummary.created_at)}
                </div>
                <div className="rounded-xl bg-slate-800/70 border border-slate-700 p-4 whitespace-pre-line text-sm leading-6 text-slate-100">
                  {aiSummary.content}
                </div>
              </div>
            )}
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                  <Heart className="h-4 w-4" />
                  训练方案历史
                </h3>
                <p className="text-sm text-slate-500">保留全部历史方案，最新方案排在最前。</p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(true)}
                className="px-3 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50"
              >
                新增方案
              </button>
            </div>

            {plansLoading ? (
              <div className="space-y-2">
                <div className="h-20 rounded-xl bg-slate-50 animate-pulse" />
                <div className="h-20 rounded-xl bg-slate-50 animate-pulse" />
              </div>
            ) : plansError ? (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{plansError}</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
                当前还没有下发过训练方案。
              </div>
            ) : (
              <div className="space-y-3">
                {plans.map((plan, index) => (
                  <div key={plan.id} className="rounded-xl border border-slate-200 p-4 bg-slate-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{plan.title}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          医生 {plan.doctor_id} · {formatDateTime(plan.created_at)}
                        </p>
                      </div>
                      {index === 0 && (
                        <span className="text-xs rounded-full bg-slate-900 text-white px-2 py-0.5">最新</span>
                      )}
                    </div>
                    <div className="mt-3 whitespace-pre-line text-sm leading-6 text-slate-700">
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
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl rounded-2xl bg-white border border-slate-200 shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
              <div>
                <h4 className="text-base font-semibold text-slate-900">下发训练方案</h4>
                <p className="text-sm text-slate-500">
                  当前患者：{patient.name}（ID {patient.id}）
                </p>
              </div>
              <button
                onClick={() => setIsPlanModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="关闭弹窗"
              >
                <X className="h-4 w-4 mx-auto" />
              </button>
            </div>

            <form onSubmit={handleCreatePlanSubmit} className="p-5 space-y-4">
              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">方案标题</label>
                <input
                  type="text"
                  value={newPlanTitle}
                  onChange={(event) => setNewPlanTitle(event.target.value)}
                  placeholder="例如：居家呼吸训练第1周方案"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-900"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">方案内容</label>
                <textarea
                  rows={8}
                  value={newPlanContent}
                  onChange={(event) => setNewPlanContent(event.target.value)}
                  placeholder={"例如：\n1. 每日缩唇呼吸 2 次，每次 15 分钟。\n2. 每次训练完成后记录组数和体感。"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none resize-none focus:border-slate-900"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm text-slate-600">
                提交后将写入 `patient_id={patient.id}`、`doctor_id={doctorId}`，并保留历史方案。
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50"
                  disabled={isSubmittingPlan}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-60"
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
