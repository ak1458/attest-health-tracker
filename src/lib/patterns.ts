import { FLARE_THRESHOLD, fmtDate } from "./conditions";
import type { LogEntry } from "./types";

export interface TriggerLift {
  trigger: string;
  days: number;
  rate: number;
  lift: number;
}

export interface SleepEffect {
  short: number;
  long: number;
  nShort: number;
  nLong: number;
}

export interface SymptomFreq {
  symptom: string;
  count: number;
  pct: number;
}

export interface ChartPoint {
  d: string;
  label: string;
  sev: number;
}

export interface Patterns {
  n: number;
  flares: number;
  baseRate: number;
  triggerLifts: TriggerLift[];
  sleepEffect: SleepEffect | null;
  topSymptoms: SymptomFreq[];
  chart: ChartPoint[];
}

export function computePatterns(logs: LogEntry[]): Patterns | null {
  if (logs.length < 5) return null;
  const sorted = [...logs].sort((a, b) => a.log_date.localeCompare(b.log_date));
  const n = sorted.length;
  const flares = sorted.filter((l) => l.severity >= FLARE_THRESHOLD).length;
  const baseRate = flares / n;

  // trigger lift: P(flare | trigger logged) vs baseline — correlation, not causation
  const trigStats: Record<string, { days: number; flares: number }> = {};
  for (const l of sorted) {
    for (const t of l.triggers ?? []) {
      trigStats[t] ??= { days: 0, flares: 0 };
      trigStats[t].days += 1;
      if (l.severity >= FLARE_THRESHOLD) trigStats[t].flares += 1;
    }
  }
  const triggerLifts: TriggerLift[] = Object.entries(trigStats)
    .filter(([, s]) => s.days >= 3)
    .map(([trigger, s]) => ({
      trigger,
      days: s.days,
      rate: s.flares / s.days,
      lift: baseRate > 0 ? s.flares / s.days / baseRate : s.flares > 0 ? 2 : 0,
    }))
    .filter((x) => x.lift >= 1.25 && x.rate > 0)
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 5);

  // sleep effect
  const shortN = sorted.filter((l) => l.sleep_hours != null && l.sleep_hours < 6);
  const longN = sorted.filter((l) => l.sleep_hours != null && l.sleep_hours >= 7);
  let sleepEffect: SleepEffect | null = null;
  if (shortN.length >= 3 && longN.length >= 3) {
    const avg = (arr: LogEntry[]) => arr.reduce((a, b) => a + b.severity, 0) / arr.length;
    sleepEffect = { short: avg(shortN), long: avg(longN), nShort: shortN.length, nLong: longN.length };
  }

  // symptom frequency
  const sxCount: Record<string, number> = {};
  for (const l of sorted) for (const s of l.symptoms ?? []) sxCount[s] = (sxCount[s] ?? 0) + 1;
  const topSymptoms: SymptomFreq[] = Object.entries(sxCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([symptom, count]) => ({ symptom, count, pct: Math.round((count / n) * 100) }));

  const chart: ChartPoint[] = sorted.slice(-30).map((l) => ({
    d: fmtDate(l.log_date).split(", ")[1] ?? l.log_date,
    label: fmtDate(l.log_date),
    sev: l.severity,
  }));

  return { n, flares, baseRate, triggerLifts, sleepEffect, topSymptoms, chart };
}
