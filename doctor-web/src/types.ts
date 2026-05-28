/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Patient {
  id: number;
  name: string;
  stats: {
    check_in_count_7d: number;
    total_duration_minutes: number;
    last_check_in_at: string | null;
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