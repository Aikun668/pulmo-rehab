/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  Brain,
  Calendar,
  Clock,
  Edit3,
  FileText,
  Flame,
  Gauge,
  Heart,
  Mail,
  Plus,
  User,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "./ui/dialog";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "./ui/collapsible";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import { AISummary, ApiResponse, Assessment, DYSPNEA_LABELS, ExerciseItem, Patient, PrescriptionGenerateResponse, RECOVERY_STAGE_LABELS, RecoveryStage, REHAB_LEVEL_INFO, RehabLevelResponse, RehabPlan, TrainingLog, WarningRecord, WARNING_TYPE_LABELS, WarningType } from "../types";
import ChatPanel from "./ChatPanel";
import PatientOverviewModules from "./PatientOverviewModules";

interface PatientDetailViewProps {
  patient: Patient;
  doctorId: number;
  onBackToList: () => void;
  chatPanelOpen?: boolean;
  onChatPanelOpened?: () => void;
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

  if (checkInCount7d >= 4) {
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

  if (checkInCount7d >= 2) {
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
  chatPanelOpen,
  onChatPanelOpened,
}: PatientDetailViewProps) {
  const requestVersionRef = useRef(0);
  const [rightPanelWidth, setRightPanelWidth] = useState(() => {
    const saved = localStorage.getItem("chart-sidebar-width");
    return saved ? parseInt(saved, 10) : 220;
  });
  const rightDragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const startRightDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    rightDragRef.current = { startX: e.clientX, startWidth: rightPanelWidth };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent) => {
      if (!rightDragRef.current) return;
      const newWidth = Math.min(400, Math.max(160, rightDragRef.current.startWidth + (e.clientX - rightDragRef.current.startX)));
      setRightPanelWidth(newWidth);
      localStorage.setItem("chart-sidebar-width", String(newWidth));
    };
    const handleUp = () => {
      if (rightDragRef.current) {
        rightDragRef.current = null;
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

  const [logs, setLogs] = useState<TrainingLog[]>([]);
  const [plans, setPlans] = useState<RehabPlan[]>([]);
  const [progress30d, setProgress30d] = useState<ProgressDay[]>([]);
  const [aiSummary, setAiSummary] = useState<AISummary | null>(null);
  const [doctorInput, setDoctorInput] = useState<string>("");
  const [isAiSummaryGenerating, setIsAiSummaryGenerating] = useState(false);
  const [isDispatching, setIsDispatching] = useState(false);
  const [aiSummaryGenerateError, setAiSummaryGenerateError] = useState("");

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

  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [profileForm, setProfileForm] = useState<{
    is_post_pneumonia: boolean | null;
    discharge_date: string;
    recovery_stage: RecoveryStage | "";
    is_long_term_smoker: boolean | null;
    has_chronic_respiratory_disease: boolean | null;
    has_cardiovascular_disease: boolean | null;
  }>({
    is_post_pneumonia: null,
    discharge_date: "",
    recovery_stage: "",
    is_long_term_smoker: null,
    has_chronic_respiratory_disease: null,
    has_cardiovascular_disease: null,
  });
  const [profileFormError, setProfileFormError] = useState("");
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  const [latestAssessment, setLatestAssessment] = useState<Assessment | null>(null);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [assessmentLoading, setAssessmentLoading] = useState(true);
  const [assessmentError, setAssessmentError] = useState("");
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [assessmentForm, setAssessmentForm] = useState({
    heart_rate: "",
    spo2: "",
    dyspnea_score: "",
    fatigue_score: "",
    notes: "",
  });
  const [assessmentFormError, setAssessmentFormError] = useState("");
  const [isSubmittingAssessment, setIsSubmittingAssessment] = useState(false);

  const [rehabLevelDetail, setRehabLevelDetail] = useState<RehabLevelResponse | null>(null);
  const [rehabLevelLoading, setRehabLevelLoading] = useState(true);

  // AI 处方生成工作流
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [prescriptionDoctorInput, setPrescriptionDoctorInput] = useState("");
  const [aiPrescription, setAiPrescription] = useState<PrescriptionGenerateResponse | null>(null);
  const [aiGenerateError, setAiGenerateError] = useState("");
  const [editableTitle, setEditableTitle] = useState("");
  const [editableExercises, setEditableExercises] = useState<ExerciseItem[]>([]);

  // 预警
  const [warnings, setWarnings] = useState<WarningRecord[]>([]);
  const [warningsLoading, setWarningsLoading] = useState(true);
  const [resolvingWarningId, setResolvingWarningId] = useState<number | null>(null);

  // 训练记录弹窗
  const [isLogsModalOpen, setIsLogsModalOpen] = useState(false);
  const [logsModalExpanded, setLogsModalExpanded] = useState(false);
  const LOGS_PREVIEW_COUNT = 5;

  const [isHeatmapModalOpen, setIsHeatmapModalOpen] = useState(false);
  const [isDurationModalOpen, setIsDurationModalOpen] = useState(false);
  const [isThirtyDayHeatmapOpen, setIsThirtyDayHeatmapOpen] = useState(false);
  const [isDurationBarChartOpen, setIsDurationBarChartOpen] = useState(false);
  const [isSetsBarChartOpen, setIsSetsBarChartOpen] = useState(false);
  const [hoveredDurationDay, setHoveredDurationDay] = useState<string | null>(null);
  const [hoveredSetsDay, setHoveredSetsDay] = useState<string | null>(null);
  const [showAvgLine, setShowAvgLine] = useState(false);
  const [showStreakBand, setShowStreakBand] = useState(false);
  const [showChat, setShowChat] = useState(false);

  // 从未读消息入口进入时自动打开 ChatPanel
  useEffect(() => {
    if (chatPanelOpen) {
      setShowChat(true);
      onChatPanelOpened?.();
    }
  }, [chatPanelOpen, onChatPanelOpened]);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    overview: true,
    aiSummary: false,
    warnings: false,
    planHistory: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

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
    setAiPrescription(null);
    setAiGenerateError("");
    setEditableTitle("");
    setEditableExercises([]);

    void fetchLogs(currentRequestVersion);
    void fetchPlans(currentRequestVersion);
    void fetchProgress(currentRequestVersion);
    void fetchAiSummary(currentRequestVersion);
    void fetchAssessments(currentRequestVersion);
    void fetchRehabLevel(currentRequestVersion);
    void fetchWarnings(currentRequestVersion);
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
          exercises: aiPrescription ? editableExercises : undefined,
          adjustment_note: aiPrescription?.adjustment_note || undefined,
        }),
      });

      const json: ApiResponse<RehabPlan> = await response.json();
      if (!response.ok || json.code !== 200) {
        setFormError(json.message || "训练方案下发失败，请稍后重试。");
        return;
      }

      setNewPlanTitle("");
      setNewPlanContent("");
      setAiPrescription(null);
      setIsPlanModalOpen(false);

      // 自动将新建方案设为 active（医生下发即生效）
      if (json.data?.id) {
        try {
          await fetch(`/api/rehab-plans/${json.data.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" }),
          });
        } catch { /* ignore */ }
      }

      await fetchPlans(requestVersionRef.current);
      setPlanSuccessMessage("已完成最新方案下发，患者端将自动更新训练内容。");
    } catch (error) {
      console.error("Failed to create rehab plan:", error);
      setFormError("无法连接后端服务，训练方案下发失败。");
    } finally {
      setIsSubmittingPlan(false);
    }
  };

  const fetchAssessments = async (requestVersion: number) => {
    try {
      setAssessmentLoading(true);
      setAssessmentError("");

      const response = await fetch(`/api/assessments?patient_id=${patient.id}`);
      const json: ApiResponse<Assessment[]> = await response.json();

      if (!isLatestRequest(requestVersion)) return;

      if (!response.ok || json.code !== 200) {
        setAssessments([]);
        setLatestAssessment(null);
        setAssessmentError(json.message || "评估记录加载失败");
        return;
      }

      const data = json.data ?? [];
      setAssessments(data);
      setLatestAssessment(data[0] ?? null);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) return;
      console.error("Failed to load assessments:", error);
      setAssessments([]);
      setLatestAssessment(null);
      setAssessmentError("无法连接后端服务，评估记录暂时不可用。");
    } finally {
      if (isLatestRequest(requestVersion)) setAssessmentLoading(false);
    }
  };

  const fetchRehabLevel = async (requestVersion: number) => {
    try {
      setRehabLevelLoading(true);
      const response = await fetch(`/api/patients/${patient.id}/rehab-level`);
      const json: ApiResponse<RehabLevelResponse> = await response.json();

      if (!isLatestRequest(requestVersion)) return;

      if (!response.ok || json.code !== 200) {
        setRehabLevelDetail(null);
        return;
      }

      setRehabLevelDetail(json.data);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) return;
      console.error("Failed to load rehab level:", error);
      setRehabLevelDetail(null);
    } finally {
      if (isLatestRequest(requestVersion)) setRehabLevelLoading(false);
    }
  };

  const fetchWarnings = async (requestVersion: number) => {
    try {
      setWarningsLoading(true);
      const response = await fetch(`/api/warnings?patient_id=${patient.id}`);
      const json: ApiResponse<WarningRecord[]> = await response.json();

      if (!isLatestRequest(requestVersion)) return;

      if (!response.ok || json.code !== 200) {
        setWarnings([]);
        return;
      }

      setWarnings(json.data ?? []);
    } catch (error) {
      if (!isLatestRequest(requestVersion)) return;
      console.error("Failed to load warnings:", error);
      setWarnings([]);
    } finally {
      if (isLatestRequest(requestVersion)) setWarningsLoading(false);
    }
  };

  const handleResolveWarning = async (warningId: number) => {
    setResolvingWarningId(warningId);
    try {
      const response = await fetch(`/api/warnings/${warningId}/resolve`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: true }),
      });
      if (response.ok) {
        await fetchWarnings(requestVersionRef.current);
      }
    } catch (error) {
      console.error("Failed to resolve warning:", error);
    } finally {
      setResolvingWarningId(null);
    }
  };

  const handleOpenAssessmentModal = () => {
    setAssessmentForm({ heart_rate: "", spo2: "", dyspnea_score: "", fatigue_score: "", notes: "" });
    setAssessmentFormError("");
    setIsAssessmentModalOpen(true);
  };

  const handleAssessmentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssessmentFormError("");

    const payload: Record<string, unknown> = { patient_id: patient.id };
    if (assessmentForm.heart_rate) payload.heart_rate = Number(assessmentForm.heart_rate);
    if (assessmentForm.spo2) payload.spo2 = Number(assessmentForm.spo2);
    if (assessmentForm.dyspnea_score) payload.dyspnea_score = Number(assessmentForm.dyspnea_score);
    if (assessmentForm.fatigue_score) payload.fatigue_score = Number(assessmentForm.fatigue_score);
    if (assessmentForm.notes.trim()) payload.notes = assessmentForm.notes.trim();

    if (Object.keys(payload).length <= 1) {
      setAssessmentFormError("请至少填写一项评估指标。");
      return;
    }

    try {
      setIsSubmittingAssessment(true);
      const response = await fetch("/api/assessments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || json.code !== 200) {
        setAssessmentFormError(json.message || "评估提交失败，请稍后重试。");
        return;
      }

      setIsAssessmentModalOpen(false);
      await fetchAssessments(requestVersionRef.current);
      await fetchRehabLevel(requestVersionRef.current);
      await fetchWarnings(requestVersionRef.current);
    } catch (error) {
      console.error("Failed to submit assessment:", error);
      setAssessmentFormError("无法连接后端服务，评估提交失败。");
    } finally {
      setIsSubmittingAssessment(false);
    }
  };

  const handleOpenProfileModal = () => {
    setProfileForm({
      is_post_pneumonia: patient.is_post_pneumonia,
      discharge_date: patient.discharge_date ?? "",
      recovery_stage: patient.recovery_stage ?? "",
      is_long_term_smoker: patient.is_long_term_smoker,
      has_chronic_respiratory_disease: patient.has_chronic_respiratory_disease,
      has_cardiovascular_disease: patient.has_cardiovascular_disease,
    });
    setProfileFormError("");
    setIsProfileModalOpen(true);
  };

  const handleProfileSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setProfileFormError("");

    const payload: Record<string, unknown> = {};
    if (profileForm.is_post_pneumonia !== null) payload.is_post_pneumonia = profileForm.is_post_pneumonia;
    if (profileForm.discharge_date) payload.discharge_date = profileForm.discharge_date;
    if (profileForm.recovery_stage) payload.recovery_stage = profileForm.recovery_stage;
    if (profileForm.is_long_term_smoker !== null) payload.is_long_term_smoker = profileForm.is_long_term_smoker;
    if (profileForm.has_chronic_respiratory_disease !== null) payload.has_chronic_respiratory_disease = profileForm.has_chronic_respiratory_disease;
    if (profileForm.has_cardiovascular_disease !== null) payload.has_cardiovascular_disease = profileForm.has_cardiovascular_disease;

    try {
      setIsSubmittingProfile(true);
      const response = await fetch(`/api/patients/${patient.id}/profile`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await response.json();

      if (!response.ok || json.code !== 200) {
        setProfileFormError(json.message || "档案更新失败，请稍后重试。");
        return;
      }

      setIsProfileModalOpen(false);
      // patient prop 由父组件管理，档案更新后需整页刷新以反映变更
      window.location.reload();
    } catch (error) {
      console.error("Failed to update patient profile:", error);
      setProfileFormError("无法连接后端服务，档案更新失败。");
    } finally {
      setIsSubmittingProfile(false);
    }
  };

  const handleGenerateAiSummary = async () => {
    if (doctorInput.trim().length < 10) return;
    setIsAiSummaryGenerating(true);
    setAiSummaryGenerateError("");
    try {
      const response = await fetch("/api/ai-summaries/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.id, doctor_input: doctorInput.trim() }),
      });
      const json = await response.json();
      if (!response.ok || json.code !== 200) {
        setAiSummaryGenerateError(json.message || "AI 小结生成失败，请稍后重试。");
        return;
      }
      setAiSummary(json.data);
    } catch {
      setAiSummaryGenerateError("无法连接后端服务，AI 小结生成失败。");
    } finally {
      setIsAiSummaryGenerating(false);
    }
  };

  const handleDispatchSummary = async () => {
    if (!aiSummary) return;
    setIsDispatching(true);
    try {
      const response = await fetch(`/api/ai-summaries/dispatch?summary_id=${aiSummary.id}`, {
        method: "POST",
      });
      const json = await response.json();
      if (!response.ok || json.code !== 200) {
        return;
      }
      setAiSummary(json.data);
    } catch {
      // 静默失败，按钮保持可重试
    } finally {
      setIsDispatching(false);
    }
  };

  const handleAiGeneratePrescription = async () => {
    if (prescriptionDoctorInput.trim().length < 10) return;
    setIsAiGenerating(true);
    setAiGenerateError("");
    setAiPrescription(null);

    try {
      const response = await fetch("/api/prescriptions/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.id, doctor_input: prescriptionDoctorInput.trim() }),
      });
      const json: ApiResponse<PrescriptionGenerateResponse> = await response.json();

      if (!response.ok || json.code !== 200) {
        setAiGenerateError(json.message || "AI 处方生成失败，请稍后重试。");
        return;
      }

      const data = json.data;
      setAiPrescription(data);
      setEditableTitle(data.title);
      setEditableExercises([...data.exercises]);
      // 同步填充传统表单字段（用于最终提交）
      const contentLines = data.exercises.map((ex: ExerciseItem) => {
        let line = `【${ex.name}】`;
        if (ex.purpose) line += `\n目的：${ex.purpose}`;
        if (ex.duration) line += `\n时长：${ex.duration}`;
        if (ex.steps.length > 0) line += `\n步骤：${ex.steps.join(" → ")}`;
        if (ex.precautions.length > 0) line += `\n⚠ 注意：${ex.precautions.join("；")}`;
        return line;
      });
      setNewPlanTitle(data.title);
      setNewPlanContent(contentLines.join("\n\n"));
    } catch (error) {
      console.error("Failed to generate AI prescription:", error);
      setAiGenerateError("无法连接后端服务，AI 处方生成失败。");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const progressMax = useMemo(() => Math.max(30, ...progress30d.map((item) => item.duration_minutes)), [progress30d]);

  const progressSummary = useMemo(() => {
    const trainedDays = progress30d.filter((item) => item.duration_minutes > 0);
    const totalDuration = progress30d.reduce((sum, item) => sum + item.duration_minutes, 0);
    const totalSets = progress30d.reduce((sum, item) => sum + item.sets_count, 0);
    const dailyAvgMinutes = trainedDays.length > 0 ? Math.round(totalDuration / trainedDays.length) : 0;
    let maxConsecutiveDays = 0;
    let currentStreak = 0;
    let streakStart = 0;
    let maxStreakStart = 0;
    let maxStreakEnd = 0;
    for (let i = 0; i < progress30d.length; i++) {
      if (progress30d[i].duration_minutes > 0) {
        if (currentStreak === 0) streakStart = i;
        currentStreak++;
        if (currentStreak > maxConsecutiveDays) {
          maxConsecutiveDays = currentStreak;
          maxStreakStart = streakStart;
          maxStreakEnd = i;
        }
      } else {
        currentStreak = 0;
      }
    }
    return {
      trainedDays: trainedDays.length,
      totalDuration,
      totalSets,
      dailyAvgMinutes,
      maxConsecutiveDays,
      maxStreakStart,
      maxStreakEnd,
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

  const heatmap7d = useMemo(() => {
    const today = new Date();
    const days: { date: string; weekday: string; duration_minutes: number; sets_count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const match = progress30d.find((item) => item.date === dateStr);
      const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
      days.push({
        date: dateStr,
        weekday: weekdays[d.getDay()],
        duration_minutes: match ? match.duration_minutes : 0,
        sets_count: match ? match.sets_count : 0,
      });
    }
    return days;
  }, [progress30d]);

  const heatmapColor = (duration: number): string => {
    if (duration === 0) return "#F1F5F9";
    if (duration <= 10) return "#C6E4D6";
    if (duration <= 20) return "#7BC0A4";
    if (duration <= 40) return "#3D9A73";
    return "#1A6B4C";
  };

  const durationMilestones = useMemo(() => {
    const total = patient.stats.total_duration_minutes;
    const milestones = [100, 500, 1000, 5000, 15000, 50000];
    let currentMax = milestones[0];
    let prevMax = 0;
    for (const m of milestones) {
      if (total >= m) {
        prevMax = m;
        continue;
      }
      currentMax = m;
      break;
    }
    const percentage = Math.min(100, Math.round(((total - prevMax) / (currentMax - prevMax)) * 100));
    const nextMilestone = currentMax;
    const progressInSegment = total - prevMax;
    const segmentSize = currentMax - prevMax;
    return { total, prevMax, currentMax: nextMilestone, percentage, progressInSegment, segmentSize, milestones };
  }, [patient.stats.total_duration_minutes]);

  const heatmap30dGrid = useMemo(() => {
    const today = new Date();
    const weeks: { date: string; weekday: string; duration_minutes: number; sets_count: number }[][] = [];
    let currentWeek: typeof weeks[0] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const match = progress30d.find((item) => item.date === dateStr);
      const weekdays = ["日", "一", "二", "三", "四", "五", "六"];
      currentWeek.push({
        date: dateStr,
        weekday: weekdays[d.getDay()],
        duration_minutes: match ? match.duration_minutes : 0,
        sets_count: match ? match.sets_count : 0,
      });
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.unshift({ date: "", weekday: "", duration_minutes: -1, sets_count: -1 });
      }
      weeks.push(currentWeek);
    }
    return weeks;
  }, [progress30d]);

  const heatmap30dColor = (duration: number): string => {
    if (duration < 0) return "transparent";
    if (duration === 0) return "#F1F5F9";
    if (duration <= 10) return "#C6E4D6";
    if (duration <= 20) return "#7BC0A4";
    if (duration <= 40) return "#3D9A73";
    return "#1A6B4C";
  };

  const barChart30d = useMemo(() => {
    const durationMax = Math.max(1, ...progress30d.map((d) => d.duration_minutes));
    const setsMax = Math.max(1, ...progress30d.map((d) => d.sets_count));
    return { durationMax, setsMax };
  }, [progress30d]);

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
      logs: "",
      plans: "patient-plans-section",
    };

    if (followUpState.actionTarget === "logs") {
      setLogsModalExpanded(false);
      setIsLogsModalOpen(true);
      return;
    }

    if (followUpState.actionTarget === "plans" && followUpState.riskLevel === "high" && plans.length === 0) {
      setIsPlanModalOpen(true);
      return;
    }

    const targetId = targetMap[followUpState.actionTarget];
    const element = document.getElementById(targetId);
    element?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <>
      <div className="space-y-4 text-slate-800">
      {/* 顶部信息栏 + 提示行 */}
      <div className="rounded-lg bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
        <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button
            onClick={onBackToList}
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded border-[#D9E2EC] bg-white text-[#5B6B7A] hover:bg-[#F4F7FA] shrink-0"
            title="返回患者列表"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h2 className="text-base font-bold text-[#111827]">{patient.name}</h2>
          <Badge variant="outline" className="text-xs text-[#6B7280] bg-[#F3F4F6] border-[#D1D5DB]">
            ID {patient.id}
          </Badge>
          <div className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-bold ${followUpState.riskLevel==="low"?"bg-[#EEFDF5] text-[#5B9B7A] border-[#D5F5E3] border-l-[4px] border-l-[#5B9B7A]":followUpState.riskLevel==="medium"?"bg-[#FDF8EE] text-[#D9A441] border-[#F8E1C2] border-l-[4px] border-l-[#D9A441]":"bg-[#FDF2F2] text-[#D95C5C] border-[#F8D2D2] border-l-[4px] border-l-[#D95C5C]"}`}>
            {followUpState.label}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 min-w-[176px] justify-end">
          <Button
            onClick={onBackToList}
            variant="outline"
            className="rounded-lg border-[#D9E2EC] text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
          >
            返回列表
          </Button>
          <Button
            onClick={() => setIsPlanModalOpen(true)}
            className="flex items-center gap-2 rounded-lg bg-[#2B7A78] text-sm font-medium text-white hover:bg-[#236B69]"
          >
            <Plus className="h-4 w-4" />
            下发方案
          </Button>
        </div>
      </div>

        {/* 提示行 */}
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-sm text-[#6B7280] min-w-0">
            最近训练：{formatDate(patient.stats.last_check_in_at)} · {followUpState.note}
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <span className="invisible rounded-lg px-1 py-2 text-sm font-medium">返回列表</span>
            <button
              onClick={() => setShowChat(true)}
              className="flex items-center gap-1.5 text-sm text-[#2B7A78] hover:underline cursor-pointer"
            >
              <Mail className="h-4 w-4" />
              联系患者
            </button>
          </div>
        </div>
      </div>

      {/* 四模块指标卡 */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div
          onClick={() => setIsHeatmapModalOpen(true)}
          className="rounded-lg bg-white p-4 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB] transition-colors h-24 flex flex-col justify-center"
          title="点击查看详情"
        >
          <p className="text-xs text-[#6B7280]">近7天打卡</p>
          <p className="mt-1 text-2xl font-bold text-[#111827] leading-none">
            {patient.stats.check_in_count_7d}<span className="text-sm font-normal text-[#6B7280] ml-1">次</span>
          </p>
          <p className="mt-1.5 text-xs">
            {patient.stats.check_in_count_7d >= 5 ? (
              <span className="text-[#10B981]">目标：5次 ✅</span>
            ) : patient.stats.check_in_count_7d >= 3 ? (
              <span className="text-[#F59E0B]">目标：5次 ⚠️</span>
            ) : (
              <span className="text-[#FE5F55]">目标：5次 ❌</span>
            )}
          </p>
        </div>
        <div
          onClick={() => setIsDurationModalOpen(true)}
          className="rounded-lg bg-white p-4 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB] transition-colors h-24 flex flex-col justify-center"
          title="点击查看详情"
        >
          <p className="text-xs text-[#6B7280]">累计训练时长</p>
          <p className="mt-1 text-2xl font-bold text-[#111827] leading-none">
            {patient.stats.total_duration_minutes}<span className="text-sm font-normal text-[#6B7280] ml-1">分钟</span>
          </p>
          <p className="mt-1.5 text-xs">
            {patient.stats.total_duration_minutes >= 300 ? (
              <span className="text-[#10B981]">目标：300分钟 ✅</span>
            ) : patient.stats.total_duration_minutes >= 150 ? (
              <span className="text-[#F59E0B]">目标：300分钟 ⚠️</span>
            ) : (
              <span className="text-[#FE5F55]">目标：300分钟 ❌</span>
            )}
          </p>
        </div>
        <div
          onClick={() => { setLogsModalExpanded(false); setIsLogsModalOpen(true); }}
          className="rounded-lg bg-white p-4 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB] transition-colors h-24 flex flex-col justify-center"
          title="点击查看详情"
        >
          <p className="text-xs text-[#6B7280]">训练记录</p>
          <p className="mt-1 text-2xl font-bold text-[#111827] leading-none">{logs.length}</p>
          <p className="mt-1.5 text-xs text-[#6B7280]">
            上次：{formatDate(patient.stats.last_check_in_at)}
          </p>
        </div>
        <div
          onClick={() => {
            const el = document.getElementById("patient-plans-section");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
          }}
          className="rounded-lg bg-white p-4 cursor-pointer shadow-[0_1px_3px_rgba(0,0,0,0.08)] hover:bg-[#F9FAFB] transition-colors h-24 flex flex-col justify-center"
          title="点击查看详情"
        >
          <p className="text-xs text-[#6B7280]">历史方案</p>
          <p className="mt-1 text-2xl font-bold text-[#111827] leading-none">{plans.length}</p>
          <p className="mt-1.5 text-xs text-[#6B7280]">
            最近：{latestPlan ? formatDate(latestPlan.created_at) : "暂无"}
          </p>
        </div>
      </div>

      <div className="h-px" />

      {/* 近30天训练进度 */}
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
              <Skeleton className="h-48 rounded-xl" />
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
              <div className="flex gap-0 items-stretch">
                {progressChart ? (
                  <div className="flex-1 min-w-0 rounded-xl border border-[#D9E2EC] bg-[linear-gradient(180deg,#ffffff_0%,#f8fafc_100%)] p-4">
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

                        {showStreakBand && progressSummary.maxConsecutiveDays > 0 && progressChart.points[progressSummary.maxStreakStart] && progressChart.points[progressSummary.maxStreakEnd] && (() => {
                          const innerH = progressChart.chartHeight - progressChart.padding.top - progressChart.padding.bottom;
                          const startPt = progressChart.points[progressSummary.maxStreakStart];
                          const endPt = progressChart.points[progressSummary.maxStreakEnd];
                          const bandX = startPt.x - 10;
                          const bandW = endPt.x - startPt.x + 20;
                          return (
                            <>
                              <rect
                                x={bandX}
                                y={progressChart.padding.top}
                                width={bandW}
                                height={innerH}
                                fill="#2F5D7C"
                                fillOpacity="0.08"
                                rx="4"
                              />
                              <rect
                                x={bandX + 4}
                                y={progressChart.padding.top + 4}
                                width={bandW - 8}
                                height={innerH - 8}
                                fill="none"
                                stroke="#2F5D7C"
                                strokeWidth="1"
                                strokeDasharray="4 2"
                                rx="2"
                              />
                              <rect
                                x={bandX + bandW / 2 - 52}
                                y={progressChart.padding.top + 2}
                                width="104"
                                height="18"
                                rx="4"
                                fill="#2F5D7C"
                              />
                              <text
                                x={bandX + bandW / 2}
                                y={progressChart.padding.top + 14}
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize="11"
                                fontWeight="500"
                              >
                                最长连续 {progressSummary.maxConsecutiveDays}天
                              </text>
                            </>
                          );
                        })()}

                        {showAvgLine && progressSummary.dailyAvgMinutes > 0 && (() => {
                          const innerH = progressChart.chartHeight - progressChart.padding.top - progressChart.padding.bottom;
                          const avgY = progressChart.padding.top + innerH - (progressSummary.dailyAvgMinutes / Math.max(1, progressMax)) * innerH;
                          return (
                            <>
                              <line
                                x1={progressChart.padding.left}
                                y1={avgY}
                                x2={progressChart.chartWidth - progressChart.padding.right}
                                y2={avgY}
                                stroke="#2F5D7C"
                                strokeWidth="1.5"
                                strokeDasharray="6 3"
                              />
                              <rect
                                x={progressChart.chartWidth - progressChart.padding.right - 88}
                                y={avgY - 10}
                                width="88"
                                height="20"
                                rx="4"
                                fill="#2F5D7C"
                              />
                              <text
                                x={progressChart.chartWidth - progressChart.padding.right - 44}
                                y={avgY + 4}
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize="11"
                                fontWeight="500"
                              >
                                日均 {progressSummary.dailyAvgMinutes}分钟
                              </text>
                            </>
                          );
                        })()}

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
                ) : (
                  <div className="flex-1 rounded-xl border border-dashed border-[#D9E2EC] p-8 text-center text-sm text-[#5B6B7A]">暂无图表数据</div>
                )}
                <div
                  onMouseDown={startRightDrag}
                  className="w-1 shrink-0 bg-transparent hover:bg-[#2F5D7C]/30 active:bg-[#2F5D7C]/50 cursor-col-resize transition-colors"
                />
                <div className="shrink-0 flex flex-col divide-y divide-[#E7EDF3] rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] overflow-hidden" style={{ width: rightPanelWidth }}>
                  <div onClick={() => setIsThirtyDayHeatmapOpen(true)} className="flex-1 flex items-center gap-2 px-4 cursor-pointer hover:bg-white transition-colors">
                    <Calendar className="h-5 w-5 text-[#8A97A6] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A97A6]">有训练的天数</p>
                      <p className="text-base font-bold text-[#243447]">{progressSummary.trainedDays} 天</p>
                    </div>
                  </div>
                  <div onClick={() => setIsDurationBarChartOpen(true)} className="flex-1 flex items-center gap-2 px-4 cursor-pointer hover:bg-white transition-colors">
                    <Clock className="h-5 w-5 text-[#8A97A6] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A97A6]">30天总时长</p>
                      <p className="text-base font-bold text-[#243447]">{progressSummary.totalDuration} 分钟</p>
                    </div>
                  </div>
                  <div onClick={() => setIsSetsBarChartOpen(true)} className="flex-1 flex items-center gap-2 px-4 cursor-pointer hover:bg-white transition-colors">
                    <BarChart3 className="h-5 w-5 text-[#8A97A6] shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A97A6]">30天总组数</p>
                      <p className="text-base font-bold text-[#243447]">{progressSummary.totalSets} 组</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-2 px-4 cursor-pointer hover:bg-white transition-colors" onClick={() => setShowAvgLine(!showAvgLine)}>
                    <Gauge className={`h-5 w-5 shrink-0 ${showAvgLine ? "text-[#2F5D7C]" : "text-[#8A97A6]"}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A97A6]">日均时长</p>
                      <p className="text-base font-bold text-[#243447]">{progressSummary.dailyAvgMinutes} 分钟</p>
                    </div>
                  </div>
                  <div className="flex-1 flex items-center gap-2 px-4 cursor-pointer hover:bg-white transition-colors" onClick={() => setShowStreakBand(!showStreakBand)}>
                    <Flame className={`h-5 w-5 shrink-0 ${showStreakBand ? "text-[#E87800]" : "text-[#8A97A6]"}`} />
                    <div className="min-w-0">
                      <p className="text-xs text-[#8A97A6]">最长连续</p>
                      <p className="text-base font-bold text-[#243447]">{progressSummary.maxConsecutiveDays} 天</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

      {/* 拖拽分隔线 */}
      <div
        onMouseDown={startRightDrag}
        className="w-1 shrink-0 bg-transparent hover:bg-[#2F5D7C]/30 active:bg-[#2F5D7C]/50 cursor-col-resize transition-colors z-30 hidden"
      />

      <div className="space-y-5">
        <Collapsible open={expandedSections.overview} onOpenChange={() => toggleSection("overview")}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-[#4F7A94]" />
                <h3 className="text-base font-semibold text-[#243447]">患者概览</h3>
                <span className="text-xs text-[#8A97A6]">健康档案 · 康复等级 · 评估 · 状态</span>
              </div>
              {expandedSections.overview ? (
                <ChevronUp className="h-4 w-4 text-[#8A97A6]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#8A97A6]" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <PatientOverviewModules
              patient={patient}
              latestAssessment={latestAssessment}
              assessmentLoading={assessmentLoading}
              rehabLevelDetail={rehabLevelDetail}
              rehabLevelLoading={rehabLevelLoading}
              followUpLabel={followUpState.label}
              followUpNote={followUpState.note}
              followUpActionLabel={followUpState.actionLabel}
              latestLog={latestLog}
              latestPlan={latestPlan}
              hasPlans={hasPlans}
              plansLoading={plansLoading}
              plansError={plansError}
              onOpenAssessmentModal={handleOpenAssessmentModal}
              onOpenProfileModal={handleOpenProfileModal}
              onFollowUpAction={handleFollowUpAction}
              formatDate={formatDate}
              formatDateTime={formatDateTime}
            />
          </CollapsibleContent>
        </Card>
        </Collapsible>

        <Collapsible open={expandedSections.aiSummary} onOpenChange={() => toggleSection("aiSummary")}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Brain className="h-4 w-4 text-[#4F7A94]" />
                <h3 className="text-base font-semibold text-[#243447]">最新 AI 小结</h3>
                {aiSummary ? (
                  <Badge variant="success" className="text-[10px]">已完成</Badge>
                ) : aiLoading ? null : doctorInput.trim().length >= 10 ? (
                  <Badge variant="default" className="bg-[#5C8FD9] text-white border-0 text-[10px]">待生成</Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px]">待输入</Badge>
                )}
                {aiSummary && (
                  <span className="text-[10px] text-[#8A97A6]">
                    {aiSummary.summary_week_start} ~ {aiSummary.summary_week_end}
                  </span>
                )}
              </div>
              {expandedSections.aiSummary ? (
                <ChevronUp className="h-4 w-4 text-[#8A97A6]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#8A97A6]" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-4">
              {aiLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-32 rounded-xl" />
                </div>
              ) : aiError ? (
                <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{aiError}</span>
                </div>
              ) : (
                <>
                  {/* ── 第一步：医生关键建议（必填） ── */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-[#2F5D7C] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                        <span className="text-sm font-semibold text-[#243447]">医生关键建议</span>
                        <span className="text-[10px] text-[#D95C5C] font-medium">必填</span>
                      </div>
                      {aiSummary && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => { setDoctorInput(aiSummary.doctor_input || ""); }}
                          className="h-6 px-2 text-[10px] text-[#2F5D7C] hover:bg-[#EEF3F7] cursor-pointer"
                        >
                          恢复已有输入
                        </Button>
                      )}
                    </div>
                    <textarea
                      value={doctorInput}
                      onChange={(e) => { setDoctorInput(e.target.value); setAiSummaryGenerateError(""); }}
                      placeholder="请输入您对本周康复情况的关键判断和建议，例如：本周重点关注血氧波动，患者反映爬楼后气促加重，需评估是否调整训练强度...（最少 10 字）"
                      rows={3}
                      className="w-full rounded-lg border border-[#D9E2EC] bg-[#F4F7FA] px-3 py-2.5 text-sm text-[#243447] outline-none transition-all placeholder:text-[#8A97A6] focus:border-[#2F5D7C] focus:bg-white focus:ring-1 focus:ring-[#2F5D7C]/20 resize-none"
                    />
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${doctorInput.trim().length >= 10 ? "text-[#5B9B7A]" : "text-[#8A97A6]"}`}>
                        {doctorInput.trim().length >= 10 ? "✓ 已满足最低要求" : `还需输入 ${10 - doctorInput.trim().length} 字`}
                      </span>
                      <Button
                        onClick={handleGenerateAiSummary}
                        disabled={doctorInput.trim().length < 10 || isAiSummaryGenerating}
                        className="bg-[#2F5D7C] text-white hover:bg-[#4F7A94] disabled:opacity-50 text-xs cursor-pointer"
                      >
                        {isAiSummaryGenerating ? (
                          <>
                            <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            AI 生成中...
                          </>
                        ) : aiSummary ? "重新生成" : "生成综合建议"}
                      </Button>
                    </div>
                    {aiSummaryGenerateError && (
                      <div className="flex items-start gap-2 rounded-lg border border-[#F8D2D2] bg-[#FDF2F2] p-3 text-xs text-[#D95C5C]">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        <span>{aiSummaryGenerateError}</span>
                      </div>
                    )}
                  </div>

                  {/* ── 综合建议（生成后展示） ── */}
                  {aiSummary && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="h-5 w-5 rounded-full bg-[#2F5D7C] text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</div>
                        <span className="text-sm font-semibold text-[#243447]">综合建议</span>
                        <span className="text-[10px] text-[#8A97A6]">生成时间：{formatDateTime(aiSummary.created_at)}</span>
                      </div>

                      <Card className="bg-[#F8FAFC] border-[#D9E2EC]">
                        <CardContent className="p-4">
                          <div className="whitespace-pre-line text-sm leading-7 text-[#243447]">
                            {aiSummary.content.split('\n\n').map((paragraph, i) => (
                              <p key={i} className={i > 0 ? 'mt-3' : ''}>{paragraph}</p>
                            ))}
                          </div>
                          <div className="mt-3 pt-3 border-t border-[#E7EDF3]">
                            <p className="text-[10px] text-[#8A97A6]">
                              基于医生判断生成
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      {/* ── 一键下发 ── */}
                      <div className="flex items-center justify-end">
                        {aiSummary.dispatched_at ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-[#5B9B7A] font-medium">
                            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                            已下发 · {formatDateTime(aiSummary.dispatched_at)}
                          </span>
                        ) : (
                          <Button
                            onClick={handleDispatchSummary}
                            disabled={isDispatching}
                            className="bg-[#5B9B7A] text-white hover:bg-[#3E7B61] disabled:opacity-50 text-xs cursor-pointer"
                          >
                            {isDispatching ? (
                              <>
                                <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                                下发中...
                              </>
                            ) : (
                              "一键下发至患者"
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </CollapsibleContent>
        </Card>
        </Collapsible>

        <Collapsible open={expandedSections.warnings} onOpenChange={() => toggleSection("warnings")}>
        <Card className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[#D9A441]" />
                <h3 className="text-base font-semibold text-[#243447]">安全预警</h3>
                {warnings.length > 0 && (
                  <Badge variant="destructive" className="text-[10px]">
                    {warnings.filter((w) => !w.is_resolved).length} 未处理
                  </Badge>
                )}
              </div>
              {expandedSections.warnings ? (
                <ChevronUp className="h-4 w-4 text-[#8A97A6]" />
              ) : (
                <ChevronDown className="h-4 w-4 text-[#8A97A6]" />
              )}
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5">
              {warningsLoading ? (
                <Skeleton className="h-12 rounded-xl" />
              ) : warnings.length === 0 ? (
                <div className="rounded-xl border border-dashed border-[#D9E2EC] p-4 text-center text-sm text-[#5B6B7A]">
                  暂无预警记录
                </div>
              ) : (
                <div className="space-y-2">
                  {warnings.map((w) => {
                    const typeInfo = WARNING_TYPE_LABELS[w.warning_type as WarningType];
                    return (
                      <Card
                        key={w.id}
                        className={`border-l-4 ${w.is_resolved ? "border-l-[#D9E2EC] opacity-60" : "border-l-[#D95C5C]"}`}
                      >
                        <div className="flex items-start justify-between gap-3 p-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span
                                className="rounded-md border px-2 py-0.5 text-[11px] font-medium"
                                style={{
                                  color: typeInfo?.color || "#D95C5C",
                                  backgroundColor: typeInfo?.bgColor || "#FDF2F2",
                                  borderColor: typeInfo?.borderColor || "#F8D2D2",
                                }}
                              >
                                {typeInfo?.label || w.warning_type}
                              </span>
                              {w.is_resolved && (
                                <Badge variant="success" className="text-[10px]">已处理</Badge>
                              )}
                            </div>
                            <p className="text-sm text-[#243447]">{w.message}</p>
                            <p className="text-[11px] text-[#8A97A6]">{formatDateTime(w.created_at)}</p>
                          </div>
                          {!w.is_resolved && (
                            <Button
                              onClick={() => handleResolveWarning(w.id)}
                              disabled={resolvingWarningId === w.id}
                              variant="outline"
                              size="sm"
                              className="shrink-0 border-[#D9E2EC] text-xs font-medium text-[#5B6B7A] hover:bg-[#F4F7FA] disabled:opacity-60 cursor-pointer"
                            >
                              {resolvingWarningId === w.id ? "处理中..." : "标记已处理"}
                            </Button>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
        </Collapsible>

        <Collapsible open={expandedSections.planHistory} onOpenChange={() => toggleSection("planHistory")}>
        <Card id="patient-plans-section" className="overflow-hidden">
          <CollapsibleTrigger asChild>
            <button className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F8FAFC] transition-colors cursor-pointer">
              <div className="flex items-center gap-2">
                <Heart className="h-4 w-4 text-[#4F7A94]" />
                <h3 className="text-base font-semibold text-[#243447]">训练方案历史</h3>
                <Badge variant="outline" className="text-[10px]">{plans.length} 个方案</Badge>
                {plans.length > 0 && (
                  <Badge variant="success" className="text-[10px]">方案正常</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={(e) => { e.stopPropagation(); setIsPlanModalOpen(true); }}
                  variant="outline"
                  size="sm"
                  className="border-[#D9E2EC] text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA] cursor-pointer"
                >
                  新增方案
                </Button>
                {expandedSections.planHistory ? (
                  <ChevronUp className="h-4 w-4 text-[#8A97A6]" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-[#8A97A6]" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="px-5 pb-5 space-y-3">
              {planSuccessMessage && (
                <div className="rounded-xl border border-[#D5F5E3] bg-[#EEFDF5] px-4 py-3 text-sm text-[#3E7B61]">
                  {planSuccessMessage}
                </div>
              )}

              {plansLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-20 rounded-xl" />
                  <Skeleton className="h-20 rounded-xl" />
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
                    <Card key={plan.id} className={index === 0 ? "border-l-4 border-l-[#2F5D7C]" : ""}>
                      <CardHeader className="flex flex-row items-start justify-between py-3 px-4 border-b border-med-divider">
                        <div>
                          <CardTitle className="text-sm font-semibold text-[#243447]">{plan.title}</CardTitle>
                          <CardDescription className="mt-0.5 text-[11px] text-[#8A97A6]">
                            医生 {plan.doctor_id} · {formatDateTime(plan.created_at)}
                          </CardDescription>
                        </div>
                        {index === 0 && (
                          <Badge className="bg-[#2F5D7C] text-white border-0 text-[10px]">最新</Badge>
                        )}
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="whitespace-pre-line text-sm leading-6 text-[#5B6B7A]">
                          {plan.content}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </CollapsibleContent>
        </Card>
        </Collapsible>
        </div>

      {isPlanModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4 sticky top-0 bg-white z-10">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">下发训练方案</h4>
                <p className="text-sm text-[#5B6B7A]">
                  当前患者：{patient.name}（ID {patient.id}）
                  {patient.rehab_level && (
                    <span className="ml-2 font-medium" style={{ color: REHAB_LEVEL_INFO[patient.rehab_level]?.color }}>
                      L{patient.rehab_level} {REHAB_LEVEL_INFO[patient.rehab_level]?.name}
                    </span>
                  )}
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

              {/* ── 第一步：医生关键处方判断（必填）── */}
              {!aiPrescription && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-[#2F5D7C] text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</div>
                      <span className="text-sm font-semibold text-[#243447]">医生关键处方判断</span>
                      <span className="text-[10px] text-[#D95C5C] font-medium">必填</span>
                    </div>
                    <textarea
                      value={prescriptionDoctorInput}
                      onChange={(e) => { setPrescriptionDoctorInput(e.target.value); setAiGenerateError(""); }}
                      placeholder="请输入您对该患者的训练处方关键判断，例如：应在腹式呼吸基础上增加上肢力量训练，注意控制心率不超过110bpm...（最少 10 字）"
                      rows={3}
                      className="w-full rounded-lg border border-[#D9E2EC] bg-[#F4F7FA] px-3 py-2.5 text-sm text-[#243447] outline-none transition-all placeholder:text-[#8A97A6] focus:border-[#2F5D7C] focus:bg-white focus:ring-1 focus:ring-[#2F5D7C]/20 resize-none"
                    />
                  </div>

                  <div className="rounded-xl border-2 border-dashed border-[#2F5D7C] bg-[#F4F7FA] p-5 text-center space-y-3">
                    <Brain className="mx-auto h-7 w-7 text-[#2F5D7C]" />
                    <p className="text-sm font-medium text-[#243447]">AI 智能生成训练处方</p>
                    <p className="text-xs text-[#5B6B7A]">
                      基于您的关键判断，结合患者康复等级、健康档案和最新评估数据，AI 将补充完整个性化训练方案
                    </p>
                    <div className="flex items-center justify-between">
                      <span className={`text-[10px] ${prescriptionDoctorInput.trim().length >= 10 ? "text-[#5B9B7A]" : "text-[#8A97A6]"}`}>
                        {prescriptionDoctorInput.trim().length >= 10 ? "✓ 已满足最低要求" : `还需输入 ${10 - prescriptionDoctorInput.trim().length} 字`}
                      </span>
                      <Button
                        type="button"
                        onClick={handleAiGeneratePrescription}
                        disabled={prescriptionDoctorInput.trim().length < 10 || isAiGenerating}
                        className="inline-flex items-center gap-2 rounded-lg bg-[#2F5D7C] text-sm font-medium text-white hover:bg-[#4F7A94] disabled:opacity-60"
                      >
                        {isAiGenerating ? (
                          <>
                            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            AI 生成中...
                          </>
                        ) : (
                          <>
                            <Brain className="h-4 w-4" />
                            AI 生成处方
                          </>
                        )}
                      </Button>
                    </div>
                    {aiGenerateError && (
                      <p className="text-sm text-[#D95C5C]">{aiGenerateError}</p>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#D9E2EC]" /></div>
                    <div className="relative flex justify-center text-xs"><span className="bg-white px-3 text-[#8A97A6]">或手动填写方案</span></div>
                  </div>
                </div>
              )}

              {/* AI 生成的处方预览 + 可编辑 */}
              {aiPrescription && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-[#2F5D7C]" />
                    <span className="text-sm font-medium text-[#2F5D7C]">AI 已生成处方</span>
                    <span className="rounded-md bg-[#EDE9FE] px-2 py-0.5 text-xs font-medium text-[#7C3AED]">趋势感知</span>
                    <span className="text-xs text-[#8A97A6]">— 医生可审核修改后下发</span>
                  </div>

                  {/* 动态调整说明 */}
                  {aiPrescription.adjustment_note && (
                    <div className="rounded-lg border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-xs text-[#15803D]">
                      💡 {aiPrescription.adjustment_note}
                    </div>
                  )}

                  {/* 方案标题 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#243447]">方案标题</label>
                    <input
                      type="text"
                      value={newPlanTitle}
                      onChange={(e) => setNewPlanTitle(e.target.value)}
                      className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                    />
                  </div>

                  {/* 训练动作列表 */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-[#243447]">训练动作</p>
                    {editableExercises.map((ex, idx) => (
                      <div key={idx} className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="rounded-md bg-[#2F5D7C] px-2 py-0.5 text-xs font-medium text-white">
                            动作 {idx + 1}
                          </span>
                          <span className="text-sm font-semibold text-[#243447]">{ex.name}</span>
                        </div>
                        {ex.purpose && <p className="text-xs text-[#5B6B7A]">目的：{ex.purpose}</p>}
                        {ex.duration && <p className="text-xs text-[#5B6B7A]">时长：{ex.duration}</p>}
                        {ex.steps.length > 0 && (
                          <div className="text-xs text-[#5B6B7A]">
                            <span>步骤：</span>
                            <ol className="ml-4 list-decimal">
                              {ex.steps.map((step, si) => <li key={si}>{step}</li>)}
                            </ol>
                          </div>
                        )}
                        {ex.precautions.length > 0 && (
                          <div className="rounded-lg border border-[#F8E1C2] bg-[#FDF8EE] px-3 py-2 text-xs text-[#D9A441]">
                            ⚠ {ex.precautions.join("；")}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* 完整内容编辑 */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-[#243447]">方案内容（可直接编辑）</label>
                    <textarea
                      rows={6}
                      value={newPlanContent}
                      onChange={(e) => setNewPlanContent(e.target.value)}
                      className="w-full resize-none rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                    />
                  </div>

                  {/* 重新生成 */}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleAiGeneratePrescription}
                    disabled={isAiGenerating}
                    className="inline-flex items-center gap-1.5 rounded-lg border-[#D9E2EC] text-xs font-medium text-[#2F5D7C] hover:bg-[#F4F7FA] disabled:opacity-60"
                  >
                    {isAiGenerating ? "重新生成中..." : "重新生成"}
                  </Button>
                </div>
              )}

              {/* 手动填写模式（无 AI 生成时显示） */}
              {!aiPrescription && (
                <>
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
                      rows={6}
                      value={newPlanContent}
                      onChange={(event) => setNewPlanContent(event.target.value)}
                      placeholder={"例如：\n1. 每日缩唇呼吸 2 次，每次 15 分钟。\n2. 每次训练完成后记录组数和体感。"}
                      className="w-full resize-none rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                    />
                  </div>
                </>
              )}

              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-3 text-sm text-[#5B6B7A]">
                提交后将写入 `patient_id={patient.id}`、`doctor_id={doctorId}`，并保留历史方案。
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsPlanModalOpen(false)}
                  className="rounded-lg border-[#D9E2EC] text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
                  disabled={isSubmittingPlan}
                >
                  取消
                </Button>
                <Button
                  type="submit"
                  className="rounded-lg bg-[#2F5D7C] text-sm font-medium text-white hover:bg-[#4F7A94] disabled:opacity-60"
                  disabled={isSubmittingPlan || (!newPlanTitle.trim() || !newPlanContent.trim())}
                >
                  {isSubmittingPlan ? "提交中..." : "审核通过并下发"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 档案编辑弹窗 */}
      {isProfileModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">编辑健康档案</h4>
                <p className="text-sm text-[#5B6B7A]">
                  当前患者：{patient.name}（ID {patient.id}）
                </p>
              </div>
              <button
                onClick={() => setIsProfileModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]"
                aria-label="关闭弹窗"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4 p-5">
              {profileFormError && (
                <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{profileFormError}</span>
                </div>
              )}

              {/* 是否重症肺炎恢复期 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">是否重症肺炎恢复期患者</label>
                <select
                  value={profileForm.is_post_pneumonia === null ? "" : profileForm.is_post_pneumonia ? "true" : "false"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm((prev) => ({
                      ...prev,
                      is_post_pneumonia: val === "" ? null : val === "true",
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                >
                  <option value="">未填写</option>
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>

              {/* 出院时间 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">出院时间</label>
                <input
                  type="date"
                  value={profileForm.discharge_date}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, discharge_date: e.target.value }))}
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                />
              </div>

              {/* 恢复阶段 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">当前恢复阶段</label>
                <select
                  value={profileForm.recovery_stage}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, recovery_stage: e.target.value as RecoveryStage | "" }))}
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                >
                  <option value="">未填写</option>
                  <option value="early">恢复早期（1-2周）</option>
                  <option value="mid">恢复中期（2-6周）</option>
                  <option value="stable">稳定恢复期</option>
                </select>
              </div>

              {/* 是否长期吸烟 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">是否长期吸烟</label>
                <select
                  value={profileForm.is_long_term_smoker === null ? "" : profileForm.is_long_term_smoker ? "true" : "false"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm((prev) => ({
                      ...prev,
                      is_long_term_smoker: val === "" ? null : val === "true",
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                >
                  <option value="">未填写</option>
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>

              {/* 慢性呼吸疾病 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">是否存在慢性呼吸疾病</label>
                <select
                  value={profileForm.has_chronic_respiratory_disease === null ? "" : profileForm.has_chronic_respiratory_disease ? "true" : "false"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm((prev) => ({
                      ...prev,
                      has_chronic_respiratory_disease: val === "" ? null : val === "true",
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                >
                  <option value="">未填写</option>
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>

              {/* 心血管疾病 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">是否存在心血管疾病</label>
                <select
                  value={profileForm.has_cardiovascular_disease === null ? "" : profileForm.has_cardiovascular_disease ? "true" : "false"}
                  onChange={(e) => {
                    const val = e.target.value;
                    setProfileForm((prev) => ({
                      ...prev,
                      has_cardiovascular_disease: val === "" ? null : val === "true",
                    }));
                  }}
                  className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                >
                  <option value="">未填写</option>
                  <option value="true">是</option>
                  <option value="false">否</option>
                </select>
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-3 text-sm text-[#5B6B7A]">
                档案信息将用于 AI 处方生成和五级康复分级判定，请尽量填写完整。
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsProfileModalOpen(false)}
                  className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
                  disabled={isSubmittingProfile}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2F5D7C] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F7A94] disabled:opacity-60"
                  disabled={isSubmittingProfile}
                >
                  {isSubmittingProfile ? "保存中..." : "保存档案"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 训练记录弹窗 */}
      {isLogsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4 shrink-0">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">训练记录</h4>
                <p className="text-sm text-[#5B6B7A]">
                  当前患者：{patient.name}（ID {patient.id}）· 共 {logs.length} 条
                </p>
              </div>
              <button
                onClick={() => setIsLogsModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]"
                aria-label="关闭弹窗"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <div className="overflow-y-auto p-5 space-y-3">
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
                <>
                  {(logsModalExpanded ? logs : logs.slice(0, LOGS_PREVIEW_COUNT)).map((log) => (
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
                  {logs.length > LOGS_PREVIEW_COUNT && (
                    <button
                      onClick={() => setLogsModalExpanded(!logsModalExpanded)}
                      className="w-full flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-[#5B6B7A] hover:text-[#243447] hover:bg-[#F4F7FA] rounded-lg transition-colors"
                    >
                      {logsModalExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          <span>收起</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          <span>展开全部（共 {logs.length} 条，还有 {logs.length - LOGS_PREVIEW_COUNT} 条）</span>
                        </>
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 30天训练热力图弹窗 */}
      {isThirtyDayHeatmapOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-6 py-4">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">近30天训练热力图</h4>
                <p className="text-sm text-[#5B6B7A]">{patient.name} · 共 {progressSummary.trainedDays} 天有训练</p>
              </div>
              <button onClick={() => setIsThirtyDayHeatmapOpen(false)} className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]" aria-label="关闭弹窗">
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex justify-center overflow-x-auto">
                <svg width="420" height="260" viewBox="0 0 420 260" role="img" aria-label="近30天训练热力图">
                  <g transform="translate(42, 16)">
                    {["日", "一", "二", "三", "四", "五", "六"].map((wd, ri) => (
                      <text key={wd} x={-12} y={ri * 32 + 24} textAnchor="end" fill="#8A97A6" fontSize="11">{wd}</text>
                    ))}
                  </g>
                  {heatmap30dGrid.map((week, wi) => (
                    <g key={wi} transform={`translate(${48 + wi * 38}, 16)`}>
                      {week.map((day, di) => {
                        const hasData = day.duration_minutes >= 0;
                        return hasData ? (
                          <g key={di}>
                            <title>{day.date ? `${day.date} 周${day.weekday}: ${day.duration_minutes}分钟 · ${day.sets_count}组` : ""}</title>
                            <rect
                              x={0}
                              y={di * 32}
                              width={28}
                              height={28}
                              rx={5}
                              fill={heatmap30dColor(day.duration_minutes)}
                              stroke={day.duration_minutes > 0 ? "#A0C8B4" : "#D9E2EC"}
                              strokeWidth="1"
                            />
                          </g>
                        ) : null;
                      })}
                    </g>
                  ))}
                  <g transform="translate(48, 250)">
                    {heatmap30dGrid.map((week, wi) => {
                      const firstDay = week.find((d) => d.duration_minutes >= 0);
                      if (!firstDay) return null;
                      const label = `${parseInt(firstDay.date.slice(5, 7), 10)}/${parseInt(firstDay.date.slice(8, 10), 10)}`;
                      return (
                        <text key={wi} x={wi * 38 + 14} y={0} textAnchor="middle" fill="#8A97A6" fontSize="10">
                          {label}
                        </text>
                      );
                    })}
                  </g>
                </svg>
              </div>
              <div className="flex items-center justify-center gap-2 text-[11px] text-[#8A97A6]">
                <span>少</span>
                {["#F1F5F9", "#C6E4D6", "#7BC0A4", "#3D9A73", "#1A6B4C"].map((c) => (
                  <div key={c} className="h-3.5 w-3.5 rounded-sm" style={{ backgroundColor: c, border: c === "#F1F5F9" ? "1px solid #D9E2EC" : "none" }} />
                ))}
                <span>多（分钟）</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 30天训练时长条形统计图弹窗 */}
      {isDurationBarChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4 shrink-0">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">近30天每日训练时长</h4>
                <p className="text-sm text-[#5B6B7A]">{patient.name} · 合计 {progressSummary.totalDuration} 分钟</p>
              </div>
              <button onClick={() => setIsDurationBarChartOpen(false)} className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]" aria-label="关闭弹窗">
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="space-y-1">
                {progress30d.map((day) => {
                  const barWidth = Math.max(2, (day.duration_minutes / barChart30d.durationMax) * 100);
                  const hasTraining = day.duration_minutes > 0;
                  const isHovered = hoveredDurationDay === day.date;
                  return (
                    <div key={day.date} className="flex items-center gap-2">
                      <span className="w-12 text-right text-[10px] text-[#8A97A6] shrink-0">
                        {`${parseInt(day.date.slice(5, 7), 10)}/${parseInt(day.date.slice(8, 10), 10)}`}
                      </span>
                      <div
                        className="flex-1 h-5 bg-[#F4F7FA] rounded relative cursor-pointer"
                        onMouseEnter={() => setHoveredDurationDay(day.date)}
                        onMouseLeave={() => setHoveredDurationDay(null)}
                      >
                        <div
                          className={`h-full rounded transition-all duration-300 ${hasTraining ? "bg-[#2F5D7C]" : "bg-transparent"} ${isHovered ? "!bg-[#1A3F52]" : ""}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        {isHovered && (
                          <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-[#243447] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                            {day.date} · {day.duration_minutes} 分钟 · {day.sets_count} 组
                          </div>
                        )}
                      </div>
                      <span className={`w-10 text-right text-[10px] shrink-0 ${hasTraining ? "text-[#243447] font-medium" : "text-[#C9D4DF]"}`}>
                        {day.duration_minutes > 0 ? `${day.duration_minutes}分` : "0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 30天训练组数条形统计图弹窗 */}
      {isSetsBarChartOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4 shrink-0">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">近30天每日训练组数</h4>
                <p className="text-sm text-[#5B6B7A]">{patient.name} · 合计 {progressSummary.totalSets} 组</p>
              </div>
              <button onClick={() => setIsSetsBarChartOpen(false)} className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]" aria-label="关闭弹窗">
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>
            <div className="overflow-y-auto p-5">
              <div className="space-y-1">
                {progress30d.map((day) => {
                  const barWidth = Math.max(2, (day.sets_count / barChart30d.setsMax) * 100);
                  const hasTraining = day.sets_count > 0;
                  const isHovered = hoveredSetsDay === day.date;
                  return (
                    <div key={day.date} className="flex items-center gap-2">
                      <span className="w-12 text-right text-[10px] text-[#8A97A6] shrink-0">
                        {`${parseInt(day.date.slice(5, 7), 10)}/${parseInt(day.date.slice(8, 10), 10)}`}
                      </span>
                      <div
                        className="flex-1 h-5 bg-[#F4F7FA] rounded relative cursor-pointer"
                        onMouseEnter={() => setHoveredSetsDay(day.date)}
                        onMouseLeave={() => setHoveredSetsDay(null)}
                      >
                        <div
                          className={`h-full rounded transition-all duration-300 ${hasTraining ? "bg-[#4F7A94]" : "bg-transparent"} ${isHovered ? "!bg-[#2D4F63]" : ""}`}
                          style={{ width: `${barWidth}%` }}
                        />
                        {isHovered && (
                          <div className="absolute left-1/2 -translate-x-1/2 -top-8 bg-[#243447] text-white text-[10px] px-2 py-1 rounded whitespace-nowrap z-10 shadow-lg">
                            {day.date} · {day.sets_count} 组 · {day.duration_minutes} 分钟
                          </div>
                        )}
                      </div>
                      <span className={`w-8 text-right text-[10px] shrink-0 ${hasTraining ? "text-[#243447] font-medium" : "text-[#C9D4DF]"}`}>
                        {day.sets_count > 0 ? `${day.sets_count}组` : "0"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 累计训练时长环形进度弹窗 */}
      {isDurationModalOpen && (() => {
        const { total, prevMax, currentMax, percentage, progressInSegment, segmentSize, milestones } = durationMilestones;
        const radius = 72;
        const strokeWidth = 10;
        const center = 100;
        const circumference = 2 * Math.PI * radius;
        const filledLength = (percentage / 100) * circumference;
        const unfilledLength = circumference - filledLength;
        const ringColor = percentage >= 80 ? "#1A6B4C" : percentage >= 50 ? "#3D9A73" : percentage >= 25 ? "#7BC0A4" : "#2F5D7C";

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border border-[#D9E2EC] bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4">
                <div>
                  <h4 className="text-base font-semibold text-[#243447]">累计训练时长</h4>
                  <p className="text-sm text-[#5B6B7A]">
                    {patient.name}（ID {patient.id}）
                  </p>
                </div>
                <button
                  onClick={() => setIsDurationModalOpen(false)}
                  className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]"
                  aria-label="关闭弹窗"
                >
                  <X className="mx-auto h-4 w-4" />
                </button>
              </div>

              <div className="p-5 space-y-5">
                <div className="flex justify-center">
                  <div className="relative">
                    <svg width="200" height="200" viewBox="0 0 200 200" role="img" aria-label="累计训练时长环形进度">
                      <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke="#E7EDF3"
                        strokeWidth={strokeWidth}
                      />
                      <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        fill="none"
                        stroke={ringColor}
                        strokeWidth={strokeWidth}
                        strokeLinecap="round"
                        strokeDasharray={`${filledLength} ${unfilledLength}`}
                        strokeDashoffset={circumference * 0.25}
                        transform={`rotate(-90 ${center} ${center})`}
                        style={{ transition: "stroke-dasharray 0.6s ease" }}
                      />
                      <text x={center} y={center - 8} textAnchor="middle" fill="#243447" fontSize="28" fontWeight="700">
                        {total}
                      </text>
                      <text x={center} y={center + 16} textAnchor="middle" fill="#5B6B7A" fontSize="13">
                        分钟
                      </text>
                    </svg>
                  </div>
                </div>

                <div className="rounded-xl border border-[#E7EDF3] bg-[#FBFCFD] p-4 text-center">
                  <p className="text-sm font-medium text-[#243447]">
                    当前目标：{currentMax} 分钟
                  </p>
                  <p className="mt-1 text-xs text-[#5B6B7A]">
                    已完成 {progressInSegment}/{segmentSize} 分钟（{percentage}%）
                  </p>
                  <div className="mt-2 h-2 w-full rounded-full bg-[#E7EDF3]">
                    <div
                      className="h-2 rounded-full transition-all duration-500"
                      style={{ width: `${percentage}%`, backgroundColor: ringColor }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-xs font-medium text-[#5B6B7A]">里程碑</p>
                  <div className="space-y-1.5">
                    {milestones.map((m) => {
                      const achieved = total >= m;
                      const isCurrent = m === currentMax;
                      return (
                        <div
                          key={m}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs ${
                            achieved
                              ? "bg-[#EEFDF5] border border-[#D5F5E3]"
                              : isCurrent
                                ? "bg-[#F4F7FA] border border-[#2F5D7C]/30"
                                : "bg-[#F8FAFC] border border-[#D9E2EC]"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-2.5 w-2.5 rounded-full ${
                                achieved ? "bg-[#3D9A73]" : isCurrent ? "bg-[#2F5D7C]" : "bg-[#D9E2EC]"
                              }`}
                            />
                            <span className={achieved ? "text-[#3E7B61] font-medium" : isCurrent ? "text-[#243447] font-semibold" : "text-[#8A97A6]"}>
                              {m} 分钟
                            </span>
                          </div>
                          {achieved && (
                            <span className="text-[10px] text-[#5B9B7A] font-medium">✓ 已达成</span>
                          )}
                          {isCurrent && !achieved && (
                            <span className="text-[10px] text-[#2F5D7C] font-medium">进行中</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 近7天打卡热力图弹窗 */}
      {isHeatmapModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-[#D9E2EC] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">近7天训练热力图</h4>
                <p className="text-sm text-[#5B6B7A]">
                  {patient.name}（ID {patient.id}）· 共 {patient.stats.check_in_count_7d} 天打卡
                </p>
              </div>
              <button
                onClick={() => setIsHeatmapModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]"
                aria-label="关闭弹窗"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex justify-center">
                <svg width="364" height="120" viewBox="0 0 364 120" role="img" aria-label="近7天打卡热力图">
                  {heatmap7d.map((day, index) => {
                    const cellX = 24 + index * 48;
                    const cellY = 24;
                    const cellSize = 32;
                    const cornerRadius = 6;
                    const color = heatmapColor(day.duration_minutes);
                    const hasTraining = day.duration_minutes > 0;

                    return (
                      <g key={day.date}>
                        <rect
                          x={cellX}
                          y={cellY}
                          width={cellSize}
                          height={cellSize}
                          rx={cornerRadius}
                          fill={color}
                          stroke={hasTraining ? "#A0C8B4" : "#D9E2EC"}
                          strokeWidth="1"
                        />
                        <text
                          x={cellX + cellSize / 2}
                          y={cellY + cellSize / 2 + 1}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fill={hasTraining ? "#FFFFFF" : "#8A97A6"}
                          fontSize="13"
                          fontWeight="600"
                        >
                          {day.duration_minutes > 0 ? day.duration_minutes : "0"}
                        </text>
                        <text
                          x={cellX + cellSize / 2}
                          y={cellY + cellSize + 16}
                          textAnchor="middle"
                          fill="#8A97A6"
                          fontSize="10"
                        >
                          {`${(parseInt(day.date.slice(5, 7), 10))}/${(parseInt(day.date.slice(8, 10), 10))}`}
                        </text>
                        <text
                          x={cellX + cellSize / 2}
                          y={cellY + cellSize + 28}
                          textAnchor="middle"
                          fill={hasTraining ? "#3D9A73" : "#8A97A6"}
                          fontSize="11"
                          fontWeight={hasTraining ? "600" : "normal"}
                        >
                          周{day.weekday}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="rounded-xl border border-[#E7EDF3] bg-[#FBFCFD] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-[#5B6B7A]">图例：训练时长（分钟）</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-[#8A97A6]">0</span>
                  {[
                    { color: "#F1F5F9", label: "0", border: true },
                    { color: "#C6E4D6", label: "1-10" },
                    { color: "#7BC0A4", label: "11-20" },
                    { color: "#3D9A73", label: "21-40" },
                    { color: "#1A6B4C", label: "40+" },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1.5">
                      <div
                        className={`h-4 w-4 rounded ${item.border ? "border border-[#D9E2EC]" : ""}`}
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-[10px] text-[#8A97A6]">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {heatmap7d.map((day) => (
                  <div
                    key={day.date}
                    className="rounded-lg border border-[#D9E2EC] bg-[#F8FAFC] p-3 flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-medium text-[#243447]">
                        {parseInt(day.date.slice(5, 7), 10)}/{parseInt(day.date.slice(8, 10), 10)} 周{day.weekday}
                      </p>
                      <p className="text-xs text-[#8A97A6]">
                        {day.duration_minutes > 0 ? `${day.duration_minutes} 分钟 · ${day.sets_count} 组` : "未训练"}
                      </p>
                    </div>
                    <div
                      className="h-6 w-6 rounded-md"
                      style={{ backgroundColor: heatmapColor(day.duration_minutes), border: day.duration_minutes === 0 ? "1px solid #D9E2EC" : "none" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 评估录入弹窗 */}
      {isAssessmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-2xl border border-[#D9E2EC] bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-[#D9E2EC] px-5 py-4">
              <div>
                <h4 className="text-base font-semibold text-[#243447]">新增康复评估</h4>
                <p className="text-sm text-[#5B6B7A]">
                  当前患者：{patient.name}（ID {patient.id}）
                </p>
              </div>
              <button
                onClick={() => setIsAssessmentModalOpen(false)}
                className="h-9 w-9 rounded-lg border border-[#D9E2EC] text-[#5B6B7A] hover:bg-[#F4F7FA]"
                aria-label="关闭弹窗"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleAssessmentSubmit} className="space-y-4 p-5">
              {assessmentFormError && (
                <div className="flex items-start gap-2 rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4 text-sm text-[#D95C5C]">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{assessmentFormError}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {/* 心率 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#243447]">心率（bpm）</label>
                  <input
                    type="number"
                    min="40"
                    max="200"
                    value={assessmentForm.heart_rate}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, heart_rate: e.target.value }))}
                    placeholder="如：78"
                    className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                  />
                </div>
                {/* 血氧 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#243447]">血氧（%）</label>
                  <input
                    type="number"
                    min="70"
                    max="100"
                    value={assessmentForm.spo2}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, spo2: e.target.value }))}
                    placeholder="如：96"
                    className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* 呼吸困难评分 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#243447]">呼吸困难评分（1-5）</label>
                  <select
                    value={assessmentForm.dyspnea_score}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, dyspnea_score: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                  >
                    <option value="">请选择</option>
                    <option value="1">1 - 呼吸完全正常</option>
                    <option value="2">2 - 轻微气短</option>
                    <option value="3">3 - 活动后明显气短</option>
                    <option value="4">4 - 日常活动困难</option>
                    <option value="5">5 - 静息状态呼吸困难</option>
                  </select>
                </div>
                {/* 疲劳评分 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-[#243447]">疲劳评分（1-10）</label>
                  <select
                    value={assessmentForm.fatigue_score}
                    onChange={(e) => setAssessmentForm((prev) => ({ ...prev, fatigue_score: e.target.value }))}
                    className="w-full rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                  >
                    <option value="">请选择</option>
                    <option value="1">1 - 完全不疲劳</option>
                    <option value="2">2</option>
                    <option value="3">3</option>
                    <option value="4">4 - 轻度疲劳</option>
                    <option value="5">5</option>
                    <option value="6">6</option>
                    <option value="7">7 - 明显疲劳</option>
                    <option value="8">8</option>
                    <option value="9">9</option>
                    <option value="10">10 - 极度疲劳</option>
                  </select>
                </div>
              </div>

              {/* 备注 */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-[#243447]">评估备注（可选）</label>
                <textarea
                  rows={3}
                  value={assessmentForm.notes}
                  onChange={(e) => setAssessmentForm((prev) => ({ ...prev, notes: e.target.value }))}
                  placeholder="如：活动后轻微气短，整体状态尚可"
                  className="w-full resize-none rounded-lg border border-[#D9E2EC] px-3 py-2 text-sm outline-none focus:border-[#2F5D7C]"
                />
              </div>

              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-3 text-sm text-[#5B6B7A]">
                评估数据将用于五级康复分级判定和 AI 处方生成，请如实填写。
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAssessmentModalOpen(false)}
                  className="rounded-lg border border-[#D9E2EC] px-4 py-2 text-sm font-medium text-[#5B6B7A] hover:bg-[#F4F7FA]"
                  disabled={isSubmittingAssessment}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-[#2F5D7C] px-4 py-2 text-sm font-medium text-white hover:bg-[#4F7A94] disabled:opacity-60"
                  disabled={isSubmittingAssessment}
                >
                  {isSubmittingAssessment ? "提交中..." : "提交评估"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    <ChatPanel patientName={patient.name} patientId={patient.id} open={showChat} onOpenChange={setShowChat} />
    </>
  );
}
