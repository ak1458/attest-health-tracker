export type ConditionId = "pcos" | "endo" | "fibro" | "longcovid" | "adhd" | "autoimmune";

export interface Profile {
  id: string;
  conditions: ConditionId[];
  meds: string[];
  custom_triggers: string[];
  plan: "free" | "plus";
}

export interface LogEntry {
  id: string;
  user_id: string;
  log_date: string; // YYYY-MM-DD
  severity: number;
  symptoms: string[];
  sleep_hours: number | null;
  triggers: string[];
  meds_taken: string[];
  cycle_day: number | null;
  notes: string;
}

export interface Report {
  id: string;
  kind: "doctor" | "evidence";
  body: string;
  log_count: number;
  created_at: string;
}
