// Attest — generate-report edge function (Deno)
// Deploy: supabase functions deploy generate-report
// Secrets: supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//
// Design: deterministic stats are computed HERE and passed to the model
// as ground truth. The model narrates verified numbers — it never
// computes them. This is the hallucination kill-switch (spec §4.3).

import { createClient } from "npm:@supabase/supabase-js@2";

const MODEL = Deno.env.get("ANTHROPIC_MODEL") ?? "claude-sonnet-4-6";
const FLARE = 7;
const DAILY_LIMIT = 10;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Log {
  log_date: string;
  severity: number;
  symptoms: string[];
  sleep_hours: number | null;
  triggers: string[];
  meds_taken: string[];
  cycle_day: number | null;
  notes: string;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

function computeStats(logs: Log[]) {
  const n = logs.length;
  const flareDays = logs.filter((l) => l.severity >= FLARE);
  const baseRate = flareDays.length / n;

  const sevs = logs.map((l) => l.severity).sort((a, b) => a - b);
  const median = sevs[Math.floor(n / 2)];

  const sxCount: Record<string, number> = {};
  for (const l of logs) for (const s of l.symptoms) sxCount[s] = (sxCount[s] ?? 0) + 1;
  const topSymptoms = Object.entries(sxCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([s, c]) => `${s}: ${c}/${n} days (${Math.round((c / n) * 100)}%)`);

  const trigStats: Record<string, { days: number; flares: number }> = {};
  for (const l of logs) {
    for (const t of l.triggers) {
      trigStats[t] ??= { days: 0, flares: 0 };
      trigStats[t].days += 1;
      if (l.severity >= FLARE) trigStats[t].flares += 1;
    }
  }
  const triggerLifts = Object.entries(trigStats)
    .filter(([, s]) => s.days >= 3 && baseRate > 0)
    .map(([t, s]) => ({ t, lift: s.flares / s.days / baseRate, days: s.days }))
    .filter((x) => x.lift >= 1.25)
    .sort((a, b) => b.lift - a.lift)
    .slice(0, 4)
    .map((x) => `${x.t}: ${x.lift.toFixed(1)}x baseline flare rate (${x.days} days logged)`);

  const withMeds = logs.filter((l) => l.meds_taken.length > 0).length;

  const short = logs.filter((l) => l.sleep_hours != null && l.sleep_hours < 6);
  const long = logs.filter((l) => l.sleep_hours != null && l.sleep_hours >= 7);
  const avg = (arr: Log[]) =>
    arr.length ? (arr.reduce((a, b) => a + b.severity, 0) / arr.length).toFixed(1) : null;
  const sleepLine =
    short.length >= 3 && long.length >= 3
      ? `Mean severity after <6h sleep: ${avg(short)} (${short.length} nights) vs after 7h+: ${avg(long)} (${long.length} nights)`
      : "Insufficient sleep data for comparison";

  return [
    `Days logged: ${n} (${logs[0].log_date} to ${logs[n - 1].log_date})`,
    `Flare days (severity ${FLARE}+): ${flareDays.length} of ${n} (${Math.round(baseRate * 100)}%)`,
    `Median severity: ${median}/10; range ${sevs[0]}-${sevs[n - 1]}`,
    `Symptom frequency: ${topSymptoms.join("; ")}`,
    `Trigger correlations (observational): ${triggerLifts.length ? triggerLifts.join("; ") : "none meeting threshold"}`,
    `Medication taken on ${withMeds} of ${n} days (${Math.round((withMeds / n) * 100)}% adherence)`,
    sleepLine,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userErr || !userData.user) return json({ error: "unauthorized" }, 401);
    const userId = userData.user.id;

    const { kind } = (await req.json()) as { kind: "doctor" | "evidence" };
    if (kind !== "doctor" && kind !== "evidence") return json({ error: "bad_kind" }, 400);

    // profile + gates
    const { data: profile } = await supabase
      .from("profiles")
      .select("conditions, plan")
      .eq("id", userId)
      .single();
    if (!profile) return json({ error: "no_profile" }, 400);

    const { count: totalReports } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (profile.plan === "free" && (totalReports ?? 0) >= 1) {
      // Free tier gets ONE sample report — the conversion moment.
      return json({ error: "payment_required" }, 402);
    }

    const today = new Date().toISOString().slice(0, 10);
    const { count: todayCount } = await supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", `${today}T00:00:00Z`);
    if ((todayCount ?? 0) >= DAILY_LIMIT) return json({ error: "rate_limited" }, 429);

    // logs (last 90 days)
    const since = new Date(Date.now() - 90 * 86400_000).toISOString().slice(0, 10);
    const { data: logs } = await supabase
      .from("logs")
      .select("log_date, severity, symptoms, sleep_hours, triggers, meds_taken, cycle_day, notes")
      .eq("user_id", userId)
      .gte("log_date", since)
      .order("log_date", { ascending: true });
    if (!logs || logs.length < 3) return json({ error: "not_enough_logs" }, 400);

    // condition hints
    const { data: modules } = await supabase
      .from("condition_modules")
      .select("id, config")
      .in("id", profile.conditions);
    const labels = (modules ?? []).map((m) => m.config.label).join(", ");
    const hints = (modules ?? []).map((m) => m.config.report_hints).filter(Boolean).join(" ");

    const stats = computeStats(logs as Log[]);
    const compact = (logs as Log[]).map((l) => ({
      d: l.log_date,
      sev: l.severity,
      sx: l.symptoms.length ? l.symptoms : undefined,
      sl: l.sleep_hours ?? undefined,
      tr: l.triggers.length ? l.triggers : undefined,
      md: l.meds_taken.length ? l.meds_taken : undefined,
      cy: l.cycle_day ?? undefined,
      nt: l.notes ? l.notes.slice(0, 100) : undefined,
    }));

    const shared = `You are a clinical documentation assistant. The patient self-tracks: ${labels}.

VERIFIED STATISTICS (computed deterministically — use these numbers EXACTLY, never compute your own):
${stats}

Condition-specific emphasis: ${hints || "none"}

RAW DAILY RECORDS (d=date, sev=severity 0-10, sx=symptoms, sl=sleep hours, tr=suspected triggers, md=medications taken, cy=cycle day, nt=patient note):
${JSON.stringify(compact)}

Hard rules: strictly observational and neutral. NO diagnosis. NO treatment recommendations. Every number you state must come from VERIFIED STATISTICS above. Describe correlations only as "patterns observed in self-tracked data". Plain text only — no markdown symbols. UPPERCASE section headers. Maximum 400 words.`;

    const prompt =
      kind === "doctor"
        ? `${shared}\n\nWrite a doctor-visit summary the patient can hand to a clinician. Sections:\nOVERVIEW\nSYMPTOM FREQUENCY & SEVERITY\nPATTERNS OBSERVED\nMEDICATION LOG\nFUNCTIONAL IMPACT\nSUGGESTED DISCUSSION POINTS (questions, not advice)`
        : `${shared}\n\nWrite an evidence packet supporting an insurance prior-authorization or appeal. It documents patient-logged data only. Sections:\nDOCUMENTATION PERIOD\nTRACKED CONDITIONS\nSYMPTOM DOCUMENTATION\nSEVERITY RECORD\nFUNCTIONAL LIMITATIONS\nTREATMENT ADHERENCE\nCONSISTENCY OF RECORD\nEnd with one line: "Patient-reported documentation generated from contemporaneous daily logs."`;

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": Deno.env.get("ANTHROPIC_API_KEY")!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });
    if (!aiRes.ok) {
      console.error("anthropic error", aiRes.status, await aiRes.text());
      return json({ error: "generation_failed" }, 502);
    }
    const ai = await aiRes.json();
    const body = (ai.content ?? [])
      .filter((b: { type: string }) => b.type === "text")
      .map((b: { text: string }) => b.text)
      .join("\n")
      .trim();

    const { data: report, error: insErr } = await supabase
      .from("reports")
      .insert({
        user_id: userId,
        kind,
        body,
        log_count: logs.length,
        period_start: logs[0].log_date,
        period_end: logs[logs.length - 1].log_date,
      })
      .select("id, kind, body, log_count, created_at")
      .single();
    if (insErr) return json({ error: "store_failed" }, 500);

    return json(report);
  } catch (e) {
    console.error(e);
    return json({ error: "internal" }, 500);
  }
});
