/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type RecoveryStage = "early" | "mid" | "stable";

export const RECOVERY_STAGE_LABELS: Record<RecoveryStage, string> = {
  early: "恢复早期",
  mid: "恢复中期",
  stable: "稳定恢复期",
};

export interface Patient {
  id: number;
  name: string;
  is_post_pneumonia: boolean | null;
  discharge_date: string | null;
  recovery_stage: RecoveryStage | null;
  is_long_term_smoker: boolean | null;
  has_chronic_respiratory_disease: boolean | null;
  has_cardiovascular_disease: boolean | null;
  rehab_level: number | null;
  stats: {
    check_in_count_7d: number;
    total_duration_minutes: number;
    last_check_in_at: string | null;
    has_unresolved_warnings: boolean;
  };
}

export interface TrainingLog {
  id: number;
  patient_id: number;
  train_date: string;
  duration_minutes: number;
  sets_count: number;
  note: string | null;
  created_at: string;
}

export interface RehabPlan {
  id: number;
  patient_id: number;
  doctor_id: number;
  title: string;
  content: string;
  status: "draft" | "approved" | "active";
  exercises: ExerciseItem[];
  adjustment_note: string | null;
  created_at: string;
}

export interface AISummary {
  id: number;
  patient_id: number;
  summary_week_start: string;
  summary_week_end: string;
  content: string;
  created_at: string;
}

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

export interface Assessment {
  id: number;
  patient_id: number;
  heart_rate: number | null;
  spo2: number | null;
  dyspnea_score: number | null;
  fatigue_score: number | null;
  notes: string | null;
  created_at: string;
}

export interface RehabLevelResponse {
  patient_id: number;
  rehab_level: number;
  level_label: string;
  level_name: string;
  recommended_training: string;
}

export interface ExerciseItem {
  name: string;
  purpose: string;
  duration: string;
  steps: string[];
  precautions: string[];
}

export interface PrescriptionGenerateResponse {
  patient_id: number;
  rehab_level: number;
  title: string;
  exercises: ExerciseItem[];
  adjustment_note: string | null;
  saved_plan_id: number | null;
}

export type WarningType = "heart_rate_high" | "spo2_low" | "fatigue_high" | "dyspnea_severe";

export const WARNING_TYPE_LABELS: Record<WarningType, { label: string; color: string; bgColor: string; borderColor: string }> = {
  heart_rate_high: { label: "心率异常", color: "#D95C5C", bgColor: "#FDF2F2", borderColor: "#F8D2D2" },
  spo2_low: { label: "血氧异常", color: "#D95C5C", bgColor: "#FDF2F2", borderColor: "#F8D2D2" },
  fatigue_high: { label: "疲劳异常", color: "#D9A441", bgColor: "#FDF8EE", borderColor: "#F8E1C2" },
  dyspnea_severe: { label: "呼吸困难", color: "#D9A441", bgColor: "#FDF8EE", borderColor: "#F8E1C2" },
};

export interface WarningRecord {
  id: number;
  patient_id: number;
  assessment_id: number | null;
  warning_type: WarningType;
  metric_value: number;
  threshold: number;
  message: string;
  is_resolved: boolean;
  created_at: string;
}

export const DYSPNEA_LABELS: Record<number, string> = {
  1: "呼吸完全正常",
  2: "轻微气短",
  3: "活动后明显气短",
  4: "日常活动困难",
  5: "静息状态呼吸困难",
};

export const REHAB_LEVEL_INFO: Record<number, { label: string; name: string; training: string; color: string; bgColor: string; borderColor: string }> = {
  1: { label: "Level 1", name: "重度恢复", training: "腹式呼吸训练", color: "#D95C5C", bgColor: "#FDF2F2", borderColor: "#F8D2D2" },
  2: { label: "Level 2", name: "轻度活动受限", training: "缩唇呼吸训练", color: "#D9A441", bgColor: "#FDF8EE", borderColor: "#F8E1C2" },
  3: { label: "Level 3", name: "中度恢复", training: "深吸气 + 呼吸节奏控制", color: "#2F5D7C", bgColor: "#EEF4FA", borderColor: "#D9E2EC" },
  4: { label: "Level 4", name: "恢复良好", training: "呼吸耐力训练", color: "#5B9B7A", bgColor: "#EEFDF5", borderColor: "#D5F5E3" },
  5: { label: "Level 5", name: "接近完全恢复", training: "综合肺功能训练", color: "#2E7D5B", bgColor: "#E6F9F0", borderColor: "#B8E8D0" },
};