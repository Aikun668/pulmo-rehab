/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * 患者概览三大模块：顶部 Banner、核心评估看板、状态与行动卡片组
 */

import React from "react";
import {
  Activity,
  Calendar,
  ClipboardList,
  FileText,
  Gauge,
  Heart,
  User,
} from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import {
  Assessment,
  Patient,
  RECOVERY_STAGE_LABELS,
  RehabLevelResponse,
  RehabPlan,
  TrainingLog,
} from "../types";

/* ================================================================
   Sparkline — 迷你 SVG 折线趋势图（按患者 ID + 指标类型差异化）
   ================================================================ */

interface SparklineProps {
  color: string;
  seed: number;
  valueRange: [number, number];
}

/** 简单种子随机数生成器 (LCG)，保证同 seed 同结果 */
function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** 根据 seed + valueRange 生成 12 个点的 mock 数据 */
function generateSparklineData(seed: number, [lo, hi]: [number, number]): number[] {
  const rand = seededRandom(seed);
  const range = hi - lo;
  const points: number[] = [];
  // 起点在 range 中间偏随机位置
  let current = lo + range * (0.3 + rand() * 0.4);
  for (let i = 0; i < 12; i++) {
    // 每次波动 ±20% range，但限制在 [lo, hi]
    current += (rand() - 0.5) * range * 0.4;
    current = Math.max(lo, Math.min(hi, current));
    // 量化：整数范围保持整数，小数范围保留 1 位
    points.push(range > 10 ? Math.round(current) : Math.round(current * 10) / 10);
  }
  return points;
}

function Sparkline({ color, seed, valueRange }: SparklineProps) {
  const W = 120;
  const H = 30;
  const pad = 2;
  const data = generateSparklineData(seed, valueRange);
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (W - pad * 2);
      const y = H - pad - ((v - min) / range) * (H - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-[30px] w-full"
      preserveAspectRatio="none"
      role="img"
      aria-label="趋势图"
    >
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================================================================
   PatientOverviewModules — 三个模块的组合
   ================================================================ */

interface PatientOverviewModulesProps {
  patient: Patient;
  latestAssessment: Assessment | null;
  assessmentLoading: boolean;
  rehabLevelDetail: RehabLevelResponse | null;
  rehabLevelLoading: boolean;
  followUpLabel: string;
  followUpNote: string;
  followUpActionLabel: string;
  latestLog: TrainingLog | null;
  latestPlan: RehabPlan | null;
  hasPlans: boolean;
  plansLoading: boolean;
  plansError: string;
  onOpenAssessmentModal: () => void;
  onOpenProfileModal: () => void;
  onFollowUpAction: () => void;
  formatDate: (value: string | null) => string;
  formatDateTime: (value: string | null) => string;
}

export default function PatientOverviewModules({
  patient,
  latestAssessment,
  assessmentLoading,
  rehabLevelDetail,
  rehabLevelLoading,
  followUpLabel,
  followUpNote,
  followUpActionLabel,
  latestLog,
  latestPlan,
  hasPlans,
  plansLoading,
  plansError,
  onOpenAssessmentModal,
  onOpenProfileModal,
  onFollowUpAction,
  formatDate,
  formatDateTime,
}: PatientOverviewModulesProps) {
  /* ---- 风险因素列表 ---- */
  const riskFactors = [
    { label: "重症肺炎恢复期", value: patient.is_post_pneumonia },
    { label: "长期吸烟", value: patient.is_long_term_smoker },
    { label: "慢性呼吸疾病", value: patient.has_chronic_respiratory_disease },
    { label: "心血管疾病", value: patient.has_cardiovascular_disease },
  ];

  /* ---- 评估指标状态判定 ---- */
  const getHrStatus = (hr: number) =>
    hr > 120 ? "danger" : hr > 100 ? "warning" : "normal";
  const getSpo2Status = (s: number) =>
    s < 92 ? "danger" : s < 95 ? "warning" : "normal";

  return (
    <div className="pl-5 pr-6 pb-5 space-y-6">
      {/* ================================================================
          模块一：患者概览顶部面板
          ================================================================ */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
        {/* 1.1 左侧：头像 + 标题 */}
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-[#EEF3F7] flex items-center justify-center text-[#2F5D7C] text-sm font-bold shrink-0 select-none">
            {patient.name.charAt(0)}
          </div>
          <div>
            <h4 className="text-[20px] font-semibold text-[#1E293B] leading-tight">
              患者概览
            </h4>
            <p className="text-sm text-[#94A3B8] mt-0.5">
              健康档案 · 康复等级 · 评估 · 状态
            </p>
            <p className="text-sm text-[#475569] mt-0.5">
              出院时间{" "}
              <span className="font-medium text-[#1E293B]">
                {patient.discharge_date
                  ? formatDate(patient.discharge_date)
                  : "未填写"}
              </span>
            </p>
          </div>
        </div>

        {/* 1.2 右侧属性：康复等级 */}
        <div className="flex items-start lg:ml-auto lg:mr-24">
          {/* 康复能力等级 */}
          <div>
            <div className="flex items-center gap-1.5 text-sm text-[#94A3B8]">
              <span>康复能力等级</span>
              {rehabLevelLoading ? (
                <Skeleton className="inline-block h-5 w-16 align-middle" />
              ) : rehabLevelDetail ? (
                <span className="inline-flex items-center rounded-full bg-[#EEF3F7] text-[#2F5D7C] px-2.5 py-0.5 text-sm font-medium">
                  {rehabLevelDetail.level_label}
                </span>
              ) : null}
            </div>
            {rehabLevelLoading ? (
              <Skeleton className="h-6 w-32 mt-1" />
            ) : rehabLevelDetail ? (
              <div className="mt-1">
                <p className="text-base font-semibold text-[#1E293B] mt-1">
                  {rehabLevelDetail.level_name}
                </p>
                <p className="text-sm text-[#475569]">
                  推荐训练：{rehabLevelDetail.recommended_training}
                </p>
              </div>
            ) : (
              <p className="text-sm text-[#94A3B8] mt-1">
                需完成评估后自动生成
              </p>
            )}
          </div>
        </div>
      </div>

      {/* 1.3 双列布局：恢复阶段 + 风险因素 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左列：恢复阶段进度条 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-base font-medium text-[#475569] mb-3">
            恢复阶段
          </p>
          <div className="flex items-center">
            {(["early", "mid", "stable"] as const).map((stage, i) => {
              const isActive = patient.recovery_stage === stage;
              const isPast =
                patient.recovery_stage &&
                ((patient.recovery_stage === "mid" && stage === "early") ||
                  (patient.recovery_stage === "stable" &&
                    (stage === "early" || stage === "mid")));
              const isFuture = !isActive && !isPast;

              const nodeBg = isActive
                ? "bg-[#2F5D7C] text-white border-[#2F5D7C]"
                : isPast
                  ? "bg-[#EEF3F7] text-[#2F5D7C] border-[#2F5D7C]"
                  : "bg-white text-[#94A3B8] border-[#E2E8F0]";

              const lineBg =
                i < 2
                  ? isPast || (isActive && i === 0)
                    ? "bg-[#2F5D7C]"
                    : "bg-[#E2E8F0]"
                  : "";

              return (
                <React.Fragment key={stage}>
                  <div className="flex flex-col items-center gap-1.5 z-10">
                    <div
                      className={`h-8 w-8 rounded-full border-2 flex items-center justify-center text-sm font-bold ${nodeBg}`}
                    >
                      {i + 1}
                    </div>
                    <span
                      className={`text-sm font-medium whitespace-nowrap ${
                        isActive
                          ? "text-[#1E293B] font-semibold"
                          : "text-[#94A3B8]"
                      }`}
                    >
                      {RECOVERY_STAGE_LABELS[stage]}
                    </span>
                  </div>
                  {i < 2 && (
                    <div className={`flex-1 h-0.5 mx-1 mt-[-16px] ${lineBg}`} />
                  )}
                </React.Fragment>
              );
            })}
          </div>
          {!patient.recovery_stage && (
            <p className="mt-3 text-sm text-[#94A3B8]">尚未设定恢复阶段</p>
          )}
        </div>

        {/* 右列：风险因素标签组 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
          <p className="text-base font-medium text-[#475569] mb-3">
            风险因素
          </p>
          <div className="flex flex-wrap gap-2.5">
            {riskFactors.map((item) => {
              const isYes = item.value === true;
              const isUnfilled = item.value === null || item.value === undefined;
              return (
                <span
                  key={item.label}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium border ${
                    isYes
                      ? "bg-[#F5EBEB] border-[#E8CFCF] text-[#B44545]"
                      : isUnfilled
                        ? "bg-transparent border-dashed border-[#E2E8F0] text-[#94A3B8]"
                        : "bg-white border-[#E2E8F0] text-[#475569]"
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      isYes
                        ? "bg-[#B44545]"
                        : isUnfilled
                          ? "border border-dashed border-[#94A3B8]"
                          : "bg-[#CBD5E1]"
                    }`}
                  />
                  {item.label}
                  {isUnfilled && (
                    <span className="text-xs text-[#94A3B8]">未填写</span>
                  )}
                </span>
              );
            })}
          </div>
        </div>
      </div>

      {/* ================================================================
          模块二：核心康复评估看板 — 强注意力数据区
          ================================================================ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-[20px] font-semibold text-[#1E293B]">
              最新康复评估
            </h4>
            {latestAssessment && (
              <p className="text-sm text-[#94A3B8] mt-0.5">
                {formatDateTime(latestAssessment.created_at)}
              </p>
            )}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenAssessmentModal();
            }}
            className="inline-flex items-center gap-1.5 text-sm text-[#2F5D7C] hover:text-[#2B546E] font-medium cursor-pointer"
          >
            + 新增评估
          </button>
        </div>

        {assessmentLoading ? (
          <div className="grid grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-48 rounded-xl" />
            ))}
          </div>
        ) : !latestAssessment ? (
          <div className="rounded-xl border border-dashed border-[#E2E8F0] bg-[#F8FAFC] p-8 text-center text-sm text-[#94A3B8]">
            暂无评估记录，点击上方按钮新增
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* 卡片 1：心率 */}
            <MetricCard
              icon={
                <Heart className="h-5 w-5 text-[#3E7B61]" />
              }
              iconBg="#E8F5EE"
              title="心率"
              value={latestAssessment.heart_rate ?? "--"}
              unit="bpm"
              status={latestAssessment.heart_rate !== null ? (getHrStatus(latestAssessment.heart_rate) === "normal" ? "正常" : getHrStatus(latestAssessment.heart_rate) === "warning" ? "偏高" : "异常") : "--"}
              statusColor="green"
              sparklineColor="#5B9B7A"
              sparklineSeed={patient.id * 10 + 1}
              sparklineRange={[60, 100]}
            />

            {/* 卡片 2：血氧饱和度 */}
            <MetricCard
              icon={
                <Activity className="h-5 w-5 text-[#3E7B61]" />
              }
              iconBg="#E8F5EE"
              title="血氧饱和度"
              value={latestAssessment.spo2 ?? "--"}
              unit="%"
              status={latestAssessment.spo2 !== null ? (getSpo2Status(latestAssessment.spo2) === "normal" ? "正常" : getSpo2Status(latestAssessment.spo2) === "warning" ? "偏低" : "异常") : "--"}
              statusColor="green"
              sparklineColor="#5B9B7A"
              sparklineSeed={patient.id * 10 + 2}
              sparklineRange={[90, 99]}
            />

            {/* 卡片 3：呼吸困难评分 */}
            <MetricCard
              icon={
                <Gauge className="h-5 w-5 text-[#2F5D7C]" />
              }
              iconBg="#EEF3F7"
              title="呼吸困难评分"
              value={latestAssessment.dyspnea_score ?? "--"}
              unit="/5"
              status={latestAssessment.dyspnea_score !== null && latestAssessment.dyspnea_score <= 1 ? "完全正常" : latestAssessment.dyspnea_score !== null && latestAssessment.dyspnea_score <= 3 ? "轻微" : latestAssessment.dyspnea_score !== null ? "明显" : "--"}
              statusColor="blue"
              sparklineColor="#4F7A94"
              sparklineSeed={patient.id * 10 + 3}
              sparklineRange={[1, 5]}
            />

            {/* 卡片 4：疲劳评分 */}
            <MetricCard
              icon={
                <User className="h-5 w-5 text-[#6B5B7B]" />
              }
              iconBg="#EFECF2"
              title="疲劳评分"
              value={latestAssessment.fatigue_score ?? "--"}
              unit="/10"
              status={latestAssessment.fatigue_score !== null && latestAssessment.fatigue_score <= 3 ? "轻度/正常" : latestAssessment.fatigue_score !== null && latestAssessment.fatigue_score <= 6 ? "中度" : latestAssessment.fatigue_score !== null ? "重度" : "--"}
              statusColor="purple"
              sparklineColor="#8B7BA3"
              sparklineSeed={patient.id * 10 + 4}
              sparklineRange={[1, 10]}
            />
          </div>
        )}
      </div>

      {/* ================================================================
          模块三：状态与后续行动卡片组
          ================================================================ */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {/* 卡片 1：当前状态 */}
        <ActionCard
          icon={
            <FileText className="h-5 w-5 text-[#C27A3A]" />
          }
          iconBg="#F5EFE5"
          title="当前状态"
          tagLabel={followUpLabel}
          tagColor="orange"
          description={followUpNote}
        />

        {/* 卡片 2：跟进建议 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#EEF3F7" }}
            >
              <ClipboardList className="h-4 w-4 text-[#2F5D7C]" />
            </div>
            <p className="text-sm text-[#475569] font-medium">跟进建议</p>
          </div>
          <p className="text-base font-semibold text-[#1E293B] mb-4 flex-1">
            {followUpActionLabel}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFollowUpAction();
            }}
            className="inline-flex items-center gap-1 text-sm font-semibold text-[#2F5D7C] hover:underline cursor-pointer w-fit"
          >
            执行 &rarr;
          </button>
        </div>

        {/* 卡片 3：最近训练记录 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#EEF3F7" }}
            >
              <Calendar className="h-4 w-4 text-[#2F5D7C]" />
            </div>
            <p className="text-sm text-[#475569] font-medium">最近训练记录</p>
          </div>
          <p className="text-base font-semibold text-[#1E293B] mb-2">
            {latestLog
              ? formatDateTime(latestLog.created_at)
              : "暂无记录"}
          </p>
          {latestLog && (
            <p className="text-sm text-[#94A3B8] mt-auto">
              呼吸训练 · {latestLog.duration_minutes}分钟
            </p>
          )}
        </div>

        {/* 卡片 4：最新方案 */}
        <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)] p-6 flex flex-col">
          <div className="flex items-center gap-2 mb-3">
            <div
              className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: "#EFECF2" }}
            >
              <FileText className="h-4 w-4 text-[#6B5B7B]" />
            </div>
            <p className="text-sm text-[#475569] font-medium">最新方案</p>
          </div>
          <p className="text-base font-semibold text-[#1E293B] mb-1">
            {latestPlan ? latestPlan.title : "暂无方案"}
          </p>
          {plansLoading ? (
            <Skeleton className="h-4 w-24 mt-1" />
          ) : plansError ? (
            <p className="text-sm text-[#B44545]">加载失败</p>
          ) : !hasPlans ? (
            <p className="text-sm text-[#C27A3A]">无方案</p>
          ) : (
            <button className="inline-flex items-center gap-1 text-sm font-semibold text-[#6B5B7B] hover:underline cursor-pointer w-fit mt-auto">
              查看方案 &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   辅助子组件
   ================================================================ */

interface MetricCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  value: number | string;
  unit: string;
  status: string;
  statusColor: "green" | "blue" | "purple";
  sparklineColor: string;
  sparklineSeed: number;
  sparklineRange: [number, number];
}

function MetricCard({
  icon,
  iconBg,
  title,
  value,
  unit,
  status,
  statusColor,
  sparklineColor,
  sparklineSeed,
  sparklineRange,
}: MetricCardProps) {
  const statusColorMap = {
    green: { text: "#3E7B61", bg: "#E8F5EE" },
    blue: { text: "#2F5D7C", bg: "#EEF3F7" },
    purple: { text: "#6B5B7B", bg: "#EFECF2" },
  };
  const sc = statusColorMap[statusColor];

  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)] p-6 flex flex-col">
      {/* 第一行：图标 + 标题 */}
      <div className="flex items-center gap-3 mb-4">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <p className="text-sm text-[#475569]">{title}</p>
      </div>

      {/* 第二行：大数据 */}
      <div className="mb-3">
        <span className="text-[32px] font-bold text-[#1E293B] leading-none">
          {value}
        </span>
        <span className="text-sm text-[#94A3B8] ml-1">{unit}</span>
      </div>

      {/* 第三行：状态标签 */}
      <div className="mb-4">
        <span
          className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium"
          style={{ color: sc.text, backgroundColor: sc.bg }}
        >
          {status}
        </span>
      </div>

      {/* 第四行：Sparkline */}
      <div className="mt-auto">
        <Sparkline color={sparklineColor} seed={sparklineSeed} valueRange={sparklineRange} />
      </div>
    </div>
  );
}

interface ActionCardProps {
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  tagLabel: string;
  tagColor: "orange";
  description: string;
}

function ActionCard({
  icon,
  iconBg,
  title,
  tagLabel,
  description,
}: ActionCardProps) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white shadow-[0_4px_6px_-1px_rgb(0_0_0_/_0.05)] p-6 flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg }}
        >
          {icon}
        </div>
        <p className="text-sm text-[#475569] font-medium">{title}</p>
      </div>
      <div className="mb-3">
        <span className="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium bg-[#F5EFE5] text-[#C27A3A]">
          {tagLabel}
        </span>
      </div>
      <p className="text-sm text-[#475569] leading-relaxed">{description}</p>
    </div>
  );
}