/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useMemo, useState } from "react";
import { Patient } from "../types";
import { RECOVERY_STAGE_LABELS, REHAB_LEVEL_INFO } from "../types";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Clock,
  LayoutGrid,
  Search,
  TableProperties,
  Users,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Card, CardContent } from "./ui/card";
import { Skeleton } from "./ui/skeleton";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "./ui/table";

interface PatientsListViewProps {
  patients: Patient[];
  isLoading: boolean;
  errorMessage?: string;
  onSelectPatient: (patientId: number) => void;
  doctorName: string;
}

interface PatientMedicalMetadata {
  riskLevel: "low" | "medium" | "high";
  riskLabel: string;
  badgeClassName: string;
  followUpNote: string;
  actionHint: string;
}

type FollowUpFilter = "all" | "follow-up" | "stable";

type PatientWithMeta = {
  patient: Patient;
  meta: PatientMedicalMetadata;
};

const resolveMedicalMetadata = (count7d: number, lastCheckInAt: string | null): PatientMedicalMetadata => {
  if (lastCheckInAt === null) {
    return {
      riskLevel: "high",
      riskLabel: "需尽快跟进",
      badgeClassName: "bg-[#FDF2F2] text-[#D95C5C] border-[#F8D2D2]",
      followUpNote: "暂未发现训练记录，建议优先核对患者当前训练状态。",
      actionHint: "建议先进入详情页查看训练记录，并尽快补充训练方案。",
    };
  }
  if (count7d >= 4) {
    return {
      riskLevel: "low",
      riskLabel: "训练稳定",
      badgeClassName: "bg-[#EEFDF5] text-[#5B9B7A] border-[#D5F5E3]",
      followUpNote: "近7天训练保持稳定，可继续按当前方案跟进。",
      actionHint: "建议进入详情页复核最新方案，确认当前节奏继续保持。",
    };
  }
  if (count7d >= 2) {
    return {
      riskLevel: "medium",
      riskLabel: "需要关注",
      badgeClassName: "bg-[#FDF8EE] text-[#D9A441] border-[#F8E1C2]",
      followUpNote: "近7天训练频率有波动，建议结合详情页进一步查看。",
      actionHint: "建议先看30天进度，再判断是否需要补充或调整训练方案。",
    };
  }
  return {
    riskLevel: "high",
    riskLabel: "需尽快跟进",
    badgeClassName: "bg-[#FDF2F2] text-[#D95C5C] border-[#F8D2D2]",
    followUpNote: "近7天暂无训练记录，建议优先联系患者确认原因。",
    actionHint: "建议进入详情页优先处理，并根据情况直接下发训练方案。",
  };
};

const formatLastCheckIn = (iso: string | null): string => {
  if (!iso) return "暂无记录";
  try {
    const d = new Date(iso);
    return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  } catch {
    return iso;
  }
};

const calculateEngagementRate = (count7d: number) => `${Math.min(100, Math.round((count7d / 7) * 100))}%`;

export default function PatientsListView({
  patients,
  isLoading,
  errorMessage,
  onSelectPatient,
  doctorName
}: PatientsListViewProps) {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewType, setViewType] = useState<"card" | "table">("table");
  const [followUpFilter, setFollowUpFilter] = useState<FollowUpFilter>("all");

  const patientsWithMeta: PatientWithMeta[] = useMemo(
    () =>
      patients.map((patient) => ({
        patient,
        meta: resolveMedicalMetadata(
          patient.stats.check_in_count_7d,
          patient.stats.last_check_in_at,
        ),
      })),
    [patients],
  );

  const filteredPatients = useMemo(() => {
    return patientsWithMeta.filter(({ patient, meta }) => {
      const matchesSearch =
        patient.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(patient.id).includes(searchTerm);

      if (!matchesSearch) {
        return false;
      }

      if (followUpFilter === "follow-up") {
        return meta.riskLevel === "high" || meta.riskLevel === "medium";
      }

      if (followUpFilter === "stable") {
        return meta.riskLevel === "low";
      }

      return true;
    });
  }, [followUpFilter, patientsWithMeta, searchTerm]);

  const summary = useMemo(() => {
    const activePatients = patientsWithMeta.filter(
      ({ patient }) => patient.stats.last_check_in_at !== null,
    ).length;
    const followUpPatients = patientsWithMeta.filter(
      ({ meta }) => meta.riskLevel === "high" || meta.riskLevel === "medium",
    ).length;
    const totalDuration = patientsWithMeta.reduce(
      (sum, { patient }) => sum + patient.stats.total_duration_minutes,
      0,
    );
    const stablePatients = patientsWithMeta.filter(({ meta }) => meta.riskLevel === "low").length;

    return {
      totalPatients: patientsWithMeta.length,
      activePatients,
      followUpPatients,
      totalDuration,
      stablePatients,
    };
  }, [patientsWithMeta]);

  const filterLabel =
    followUpFilter === "all"
      ? "全部患者"
      : followUpFilter === "follow-up"
        ? "待跟进"
        : "训练稳定";

  const groupedPatients = useMemo(() => {
    const initialGroups: Record<PatientMedicalMetadata["riskLevel"], PatientWithMeta[]> = {
      high: [],
      medium: [],
      low: [],
    };

    filteredPatients.forEach((item) => {
      initialGroups[item.meta.riskLevel].push(item);
    });

    const visibleGroupOrder: PatientMedicalMetadata["riskLevel"][] =
      followUpFilter === "follow-up"
        ? ["high", "medium"]
        : followUpFilter === "stable"
          ? ["low"]
          : ["high", "medium", "low"];

    const groupMeta: Record<
      PatientMedicalMetadata["riskLevel"],
      { title: string; description: string; badgeClassName: string }
    > = {
      high: {
        title: "需尽快跟进",
        description: "优先处理近7天无训练记录或当前状态异常的患者。",
        badgeClassName: "bg-[#FDF2F2] text-[#D95C5C] border-[#F8D2D2]",
      },
      medium: {
        title: "需要关注",
        description: "训练频率存在波动，建议结合详情页进一步判断。",
        badgeClassName: "bg-[#FDF8EE] text-[#D9A441] border-[#F8E1C2]",
      },
      low: {
        title: "训练稳定",
        description: "训练节奏较稳定，可继续按当前方案跟进。",
        badgeClassName: "bg-[#EEFDF5] text-[#5B9B7A] border-[#D5F5E3]",
      },
    };

    return visibleGroupOrder
      .map((riskLevel) => ({
        riskLevel,
        ...groupMeta[riskLevel],
        items: initialGroups[riskLevel],
      }))
      .filter((group) => group.items.length > 0);
  }, [filteredPatients, followUpFilter]);

  return (
    <div className="space-y-5">
      <div className="sticky top-[-24px] z-20 -mx-6 -mt-6 mb-2 px-6 pt-6 pb-5 bg-med-bg">
        <section className="rounded-xl border border-[#D9E2EC] bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-[11px] text-[#5B6B7A]">
                <Users className="h-3.5 w-3.5 text-[#4F7A94]" />
                <span>患者管理工作台</span>
              </div>
              <h2 className="text-lg font-semibold text-[#243447]">患者列表</h2>
            </div>

            <div className="grid grid-cols-2 gap-3 md:grid-cols-4 mt-5">
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] px-4 py-3">
                <p className="text-[11px] text-[#8A97A6]">患者总数</p>
                <p className="mt-1 text-xl font-bold text-[#243447]">{summary.totalPatients}</p>
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] px-4 py-3">
                <p className="text-[11px] text-[#8A97A6]">有训练记录</p>
                <p className="mt-1 text-xl font-bold text-[#243447]">{summary.activePatients}</p>
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] px-4 py-3">
                <p className="text-[11px] text-[#8A97A6]">待优先跟进</p>
                <p className="mt-1 text-xl font-bold text-[#243447]">{summary.followUpPatients}</p>
              </div>
              <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] px-4 py-3">
                <p className="text-[11px] text-[#8A97A6]">训练稳定</p>
                <p className="mt-1 text-xl font-bold text-[#243447]">{summary.stablePatients}</p>
              </div>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:max-w-md">
            <div className="relative">
              <Input
                type="text"
                placeholder="按患者姓名或 ID 搜索"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-lg border-[#D9E2EC] bg-[#F4F7FA] py-2.5 pl-9 pr-4 text-sm text-[#243447] placeholder:text-[#8A97A6] focus-visible:border-[#2F5D7C] focus-visible:bg-white focus-visible:ring-1 focus-visible:ring-[#2F5D7C]/20 h-10"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-[#8A97A6]" />
            </div>

            <div className="flex items-center rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-1">
              <button
                onClick={() => setFollowUpFilter("all")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  followUpFilter === "all"
                    ? "bg-white text-[#243447]"
                    : "text-[#5B6B7A] hover:text-[#243447]"
                }`}
              >
                全部患者
              </button>
              <button
                onClick={() => setFollowUpFilter("follow-up")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  followUpFilter === "follow-up"
                    ? "bg-white text-[#243447]"
                    : "text-[#5B6B7A] hover:text-[#243447]"
                }`}
              >
                待跟进
              </button>
              <button
                onClick={() => setFollowUpFilter("stable")}
                className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
                  followUpFilter === "stable"
                    ? "bg-white text-[#243447]"
                    : "text-[#5B6B7A] hover:text-[#243447]"
                }`}
              >
                训练稳定
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] px-3 py-2">
              <div className="text-xs text-[#5B6B7A]">
                {searchTerm
                  ? `当前在${filterLabel}中检索到 ${filteredPatients.length} 位患者`
                  : `当前显示：${filterLabel}（${filteredPatients.length}）`}
              </div>
              <div className="flex items-center rounded-lg border border-[#D9E2EC] bg-white p-0.5">
                <button
                  onClick={() => setViewType("card")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    viewType === "card"
                      ? "bg-[#F4F7FA] text-[#243447]"
                      : "text-[#5B6B7A] hover:text-[#243447]"
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  <span>卡片</span>
                </button>
                <button
                  onClick={() => setViewType("table")}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    viewType === "table"
                      ? "bg-[#F4F7FA] text-[#243447]"
                      : "text-[#5B6B7A] hover:text-[#243447]"
                  }`}
                >
                  <TableProperties className="h-3.5 w-3.5" />
                  <span>列表</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
      </div>

      {errorMessage && (
        <section className="rounded-xl border border-[#F8D2D2] bg-[#FDF2F2] p-4">
          <p className="text-sm font-semibold text-[#D95C5C]">患者列表加载失败</p>
          <p className="mt-1 text-sm text-[#B44545]">{errorMessage}</p>
        </section>
      )}

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((n) => (
            <Card key={n} className="p-5 space-y-4">
              <Skeleton className="h-4 w-1/3" />
              <Skeleton className="h-12 rounded-xl" />
              <div className="grid grid-cols-3 gap-2">
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
                <Skeleton className="h-14 rounded-xl" />
              </div>
              <Skeleton className="h-10 rounded-xl" />
            </Card>
          ))}
        </div>
      ) : filteredPatients.length === 0 ? (
        <section className="rounded-xl border border-[#D9E2EC] bg-white p-12 text-center">
          <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full border border-[#D9E2EC] bg-[#F4F7FA] text-[#8A97A6]">
            <AlertCircle className="h-5 w-5" />
          </div>
          <div className="mt-4 space-y-1">
            <p className="text-sm font-semibold text-[#243447]">未找到符合条件的患者</p>
            <p className="mx-auto max-w-md text-sm leading-6 text-[#5B6B7A]">
              {searchTerm
                ? `没有在${filterLabel}中找到匹配“${searchTerm}”的患者，请调整搜索条件后重试。`
                : followUpFilter === "follow-up"
                  ? "当前没有需要优先跟进的患者，可以继续查看全部患者。"
                  : followUpFilter === "stable"
                    ? "当前没有训练稳定的患者，请先查看全部患者或待跟进患者。"
                    : "当前医生名下暂无患者数据，请先确认测试账号或后端数据是否已准备完成。"}
            </p>
          </div>
        </section>
      ) : viewType === "card" ? (
        <div className="space-y-5">
          {groupedPatients.map((group) => (
            <section
              key={group.riskLevel}
              className="rounded-xl border border-[#D9E2EC] bg-white p-4 md:p-5"
            >
              <div className="flex flex-col gap-2 border-b border-[#E7EDF3] pb-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-[#243447]">{group.title}</h3>
                    <span
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${group.badgeClassName}`}
                    >
                      {group.items.length} 人
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-[#5B6B7A]">{group.description}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {group.items.map(({ patient, meta }) => {
                  const engagementRate = calculateEngagementRate(patient.stats.check_in_count_7d);
                  const leftBorderClassName =
                    meta.riskLevel === "high"
                      ? "border-l-[#D95C5C]"
                      : meta.riskLevel === "medium"
                        ? "border-l-[#D9A441]"
                        : "border-l-[#5B9B7A]";

                  return (
                    <div
                      key={patient.id}
                      className={`flex flex-col justify-between rounded-xl border border-[#D9E2EC] border-l-4 bg-white transition-colors hover:bg-[#FBFCFD] ${leftBorderClassName}`}
                    >
                      <div className="space-y-4 p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-[#243447]">{patient.name}</p>
                              {patient.rehab_level && REHAB_LEVEL_INFO[patient.rehab_level] && (
                                <span
                                  className="rounded-md border px-1.5 py-0.5 text-[10px] font-semibold"
                                  style={{
                                    color: REHAB_LEVEL_INFO[patient.rehab_level].color,
                                    backgroundColor: REHAB_LEVEL_INFO[patient.rehab_level].bgColor,
                                    borderColor: REHAB_LEVEL_INFO[patient.rehab_level].borderColor,
                                  }}
                                >
                                  L{patient.rehab_level}
                                </span>
                              )}
                              {patient.recovery_stage && (
                                <span className="rounded-md border border-[#D1D5DB] bg-[#F3F4F6] px-1.5 py-0.5 text-[10px] font-medium text-[#6B7280]">
                                  {RECOVERY_STAGE_LABELS[patient.recovery_stage]}
                                </span>
                              )}
                              {patient.stats.has_unresolved_warnings && (
                                <span className="inline-flex items-center gap-0.5 rounded-md border border-[#F8D2D2] bg-[#FDF2F2] px-1.5 py-0.5 text-[10px] font-medium text-[#D95C5C]">
                                  <AlertTriangle className="h-3 w-3" />
                                  预警
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs text-[#8A97A6]">患者 ID：{patient.id}</p>
                          </div>
                          <span className={`rounded-md border px-2 py-1 text-[11px] font-medium ${meta.badgeClassName}`}>
                            {meta.riskLabel}
                          </span>
                        </div>

                        <div className="rounded-xl border border-[#D9E2EC] bg-[#F8FAFC] p-4">
                          <p className="text-[11px] text-[#8A97A6]">主指标：近7天训练打卡</p>
                          <div className="mt-2 flex items-end justify-between gap-3">
                            <div>
                              <p className="text-3xl font-semibold leading-none text-[#243447]">
                                {patient.stats.check_in_count_7d}
                                <span className="ml-1 text-sm font-medium text-[#5B6B7A]">次</span>
                              </p>
                              <p className="mt-2 text-xs text-[#5B6B7A]">
                                近7天活跃度 {engagementRate}
                              </p>
                            </div>
                            <div className="rounded-lg border border-[#D9E2EC] bg-white px-3 py-2 text-right">
                              <p className="text-[11px] text-[#8A97A6]">最近训练</p>
                              <p className="mt-1 text-xs font-medium text-[#243447]">
                                {formatLastCheckIn(patient.stats.last_check_in_at)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="rounded-lg border border-[#D9E2EC] bg-white px-4 py-3">
                            <p className="text-[11px] text-[#8A97A6]">累计训练时长</p>
                            <p className="mt-1 text-sm font-semibold text-[#243447]">
                              {patient.stats.total_duration_minutes} 分钟
                            </p>
                          </div>
                          <div className="rounded-lg border border-[#D9E2EC] bg-white px-4 py-3">
                            <p className="text-[11px] text-[#8A97A6]">患者状态</p>
                            <p className="mt-1 text-sm font-semibold text-[#243447]">{meta.riskLabel}</p>
                          </div>
                        </div>

                        <div className="rounded-lg border border-[#E7EDF3] bg-[#FBFCFD] px-4 py-3">
                          <p className="text-[11px] text-[#8A97A6]">跟进提示</p>
                          <p className="mt-1 text-sm leading-6 text-[#5B6B7A]">{meta.followUpNote}</p>
                          <p className="mt-2 text-sm font-medium text-[#243447]">{meta.actionHint}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#E7EDF3] bg-[#F8FAFC] px-5 py-3">
                        <div className="flex items-center gap-1.5 text-xs text-[#5B6B7A]">
                          <Clock className="h-3.5 w-3.5 text-[#8A97A6]" />
                          <span>最近训练：{formatLastCheckIn(patient.stats.last_check_in_at)}</span>
                        </div>
                        <Button
                          onClick={() => onSelectPatient(patient.id)}
                          size="sm"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F5D7C] text-white hover:bg-[#4F7A94]"
                        >
                          <span>查看详情</span>
                          <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC] hover:bg-[#F8FAFC]">
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold pl-6 pr-4">患者</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold text-center pl-6 pr-4">恢复阶段</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold text-center pl-6 pr-4">康复等级</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold text-center pl-6 pr-4">近7天打卡</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold text-center pl-6 pr-4">累计时长</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold text-center pl-6 pr-4">最近训练</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold pl-6 pr-4">跟进状态</TableHead>
                <TableHead className="bg-[#F8FAFC] text-[11px] uppercase tracking-wide text-[#5B6B7A] font-semibold text-right pl-6 pr-4">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="text-sm text-[#243447]">
                {filteredPatients.map(({ patient, meta }) => {
                  return (
                    <TableRow key={patient.id}>
                      <TableCell className="pl-6 pr-4 py-4">
                        <p className="font-semibold text-[#243447]">{patient.name}</p>
                        <p className="mt-1 text-xs text-[#8A97A6]">患者 ID：{patient.id}</p>
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4 text-center">
                        {patient.recovery_stage ? (
                          <Badge variant="outline">
                            {RECOVERY_STAGE_LABELS[patient.recovery_stage]}
                          </Badge>
                        ) : (
                          <span className="text-xs text-[#8A97A6]">未填写</span>
                        )}
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4 text-center">
                        {patient.rehab_level && REHAB_LEVEL_INFO[patient.rehab_level] ? (
                          <span
                            className="inline-flex rounded-md border px-2 py-0.5 text-[11px] font-semibold"
                            style={{
                              color: REHAB_LEVEL_INFO[patient.rehab_level].color,
                              backgroundColor: REHAB_LEVEL_INFO[patient.rehab_level].bgColor,
                              borderColor: REHAB_LEVEL_INFO[patient.rehab_level].borderColor,
                            }}
                          >
                            L{patient.rehab_level} {REHAB_LEVEL_INFO[patient.rehab_level].name}
                          </span>
                        ) : (
                          <span className="text-xs text-[#8A97A6]">未评估</span>
                        )}
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4 text-center font-semibold text-[#243447]">
                        {patient.stats.check_in_count_7d} 次
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4 text-center text-[#5B6B7A]">
                        {patient.stats.total_duration_minutes} 分钟
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4 text-center text-[#5B6B7A]">
                        {formatLastCheckIn(patient.stats.last_check_in_at)}
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4">
                        <span className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${meta.badgeClassName}`}>
                          {meta.riskLabel}
                        </span>
                        <p className="mt-2 max-w-sm text-xs leading-5 text-[#5B6B7A]">{meta.followUpNote}</p>
                        <p className="mt-2 max-w-sm text-xs font-medium leading-5 text-[#243447]">{meta.actionHint}</p>
                      </TableCell>
                      <TableCell className="pl-6 pr-4 py-4 text-right">
                        <Button
                          onClick={() => onSelectPatient(patient.id)}
                          size="sm"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-[#2F5D7C] text-white hover:bg-[#4F7A94]"
                        >
                          <span>查看详情</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
