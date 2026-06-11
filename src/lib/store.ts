import { supabase } from "./supabase";
import { CONDITIONS, hasCycle, shiftDate, todayStr, unionFor } from "./conditions";
import type { ConditionId, LogEntry, Profile } from "./types";

/* ──────────────────────────────────────────────────────────────
   Offline outbox: mutations that fail (no network) are queued in
   localStorage and replayed on reconnect / next app load.
   Logging must never fail — sick users log in bed with bad signal.
   ────────────────────────────────────────────────────────────── */

type OutboxOp =
  | { op: "upsert_log"; payload: LogEntry }
  | { op: "delete_log"; payload: { id: string } };

const OUTBOX_KEY = "attest_outbox_v1";

function readOutbox(): OutboxOp[] {
  try {
    return JSON.parse(localStorage.getItem(OUTBOX_KEY) ?? "[]") as OutboxOp[];
  } catch {
    return [];
  }
}

function writeOutbox(ops: OutboxOp[]) {
  localStorage.setItem(OUTBOX_KEY, JSON.stringify(ops));
}

function enqueue(op: OutboxOp) {
  writeOutbox([...readOutbox(), op]);
}

export async function flushOutbox(): Promise<void> {
  const ops = readOutbox();
  if (!ops.length) return;
  const remaining: OutboxOp[] = [];
  for (const op of ops) {
    try {
      if (op.op === "upsert_log") {
        const { error } = await supabase
          .from("logs")
          .upsert(op.payload, { onConflict: "user_id,log_date" });
        if (error) throw error;
      } else {
        const { error } = await supabase.from("logs").delete().eq("id", op.payload.id);
        if (error) throw error;
      }
    } catch {
      remaining.push(op);
    }
  }
  writeOutbox(remaining);
}

if (typeof window !== "undefined") {
  window.addEventListener("online", () => void flushOutbox());
}

/* ── profile ── */

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, conditions, meds, custom_triggers, plan")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw error;
  return (data as Profile | null) ?? null;
}

export async function upsertProfile(p: Profile): Promise<void> {
  const { error } = await supabase.from("profiles").upsert(p);
  if (error) throw error;
}

/* ── logs ── */

export async function listLogs(userId: string): Promise<LogEntry[]> {
  const { data, error } = await supabase
    .from("logs")
    .select("id, user_id, log_date, severity, symptoms, sleep_hours, triggers, meds_taken, cycle_day, notes")
    .eq("user_id", userId)
    .order("log_date", { ascending: true });
  if (error) throw error;
  return (data as LogEntry[]) ?? [];
}

/** Optimistic: returns immediately; queues to outbox on network failure. */
export async function upsertLog(entry: LogEntry): Promise<void> {
  try {
    const { error } = await supabase
      .from("logs")
      .upsert(entry, { onConflict: "user_id,log_date" });
    if (error) throw error;
  } catch {
    enqueue({ op: "upsert_log", payload: entry });
  }
}

export async function deleteLog(id: string): Promise<void> {
  try {
    const { error } = await supabase.from("logs").delete().eq("id", id);
    if (error) throw error;
  } catch {
    enqueue({ op: "delete_log", payload: { id } });
  }
}

/* ── sample data (testing / demo) ── */

export function makeSampleLogs(userId: string, ids: ConditionId[]): LogEntry[] {
  const sx = unionFor(ids, "symptoms");
  const trig = unionFor(ids, "triggers");
  const meds = CONDITIONS[ids[0]]?.sampleMeds ?? ["Medication A"];
  const cycle = hasCycle(ids);
  const logs: LogEntry[] = [];
  for (let i = 34; i >= 0; i--) {
    const log_date = shiftDate(todayStr(), -i);
    const poorSleep = Math.random() < 0.3;
    const stress = Math.random() < 0.35;
    const sleep_hours = poorSleep ? 4 + Math.round(Math.random()) : 6 + Math.round(Math.random() * 3);
    let sev = 2 + Math.random() * 3;
    if (poorSleep) sev += 2;
    if (stress) sev += 1.5;
    let cycle_day: number | null = null;
    if (cycle) {
      cycle_day = ((35 - i) % 28) + 1;
      if (cycle_day <= 4) sev += 2;
    }
    const severity = Math.min(10, Math.max(0, Math.round(sev)));
    const triggers: string[] = [];
    if (poorSleep && trig.includes("Poor sleep")) triggers.push("Poor sleep");
    if (stress && trig.includes("High stress")) triggers.push("High stress");
    if (Math.random() < 0.2 && trig[2]) triggers.push(trig[2]);
    const symptoms = [...sx]
      .sort(() => Math.random() - 0.5)
      .slice(0, severity >= 7 ? 4 : severity >= 4 ? 3 : Math.random() < 0.7 ? 2 : 1);
    logs.push({
      id: crypto.randomUUID(),
      user_id: userId,
      log_date,
      severity,
      symptoms,
      sleep_hours,
      triggers,
      meds_taken: Math.random() < 0.85 ? meds : [],
      cycle_day,
      notes: severity >= 8 ? "Bad day, mostly in bed." : "",
    });
  }
  return logs;
}

export async function insertSampleLogs(userId: string, ids: ConditionId[]): Promise<LogEntry[]> {
  const logs = makeSampleLogs(userId, ids);
  const { error } = await supabase.from("logs").upsert(logs, { onConflict: "user_id,log_date" });
  if (error) throw error;
  return logs;
}
