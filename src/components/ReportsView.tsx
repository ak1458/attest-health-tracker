import { useEffect, useState } from "react";
import { Check, Copy, FileText, LoaderCircle, NotebookPen } from "lucide-react";
import { fmtDate } from "../lib/conditions";
import { supabase } from "../lib/supabase";
import type { LogEntry, Profile, Report } from "../lib/types";
import { Card } from "./ui";

export default function ReportsView({
  profile,
  logs,
  notify,
}: {
  profile: Profile;
  logs: LogEntry[];
  notify: (msg: string) => void;
}) {
  const [reports, setReports] = useState<Record<string, Report | undefined>>({});
  const enough = logs.length >= 3;

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("reports")
        .select("id, kind, body, log_count, created_at")
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false });
      const latest: Record<string, Report> = {};
      for (const r of (data as Report[] | null) ?? []) {
        if (!latest[r.kind]) latest[r.kind] = r;
      }
      setReports(latest);
    })();
  }, [profile.id]);

  return (
    <div className="space-y-4">
      <ReportCard
        kind="doctor"
        title="Doctor-visit summary"
        body="A neutral, quantified one-pager to hand to your clinician — frequencies, patterns, meds, discussion points."
        icon="pen"
        report={reports.doctor}
        onGenerated={(r) => setReports((s) => ({ ...s, doctor: r }))}
        enough={enough}
        logCount={logs.length}
        notify={notify}
      />
      <ReportCard
        kind="evidence"
        title="Appeal evidence packet"
        body="Structured documentation for prior-authorization or insurance appeals, built from your contemporaneous logs."
        icon="file"
        report={reports.evidence}
        onGenerated={(r) => setReports((s) => ({ ...s, evidence: r }))}
        enough={enough}
        logCount={logs.length}
        notify={notify}
      />
      <p className="text-xs text-neutral-600 text-center px-4 pt-2">
        Reports describe your logged data only. Attest is a documentation tool — not medical advice, diagnosis, or
        treatment guidance.
      </p>
    </div>
  );
}

function ReportCard({
  kind,
  title,
  body,
  icon,
  report,
  onGenerated,
  enough,
  logCount,
  notify,
}: {
  kind: "doctor" | "evidence";
  title: string;
  body: string;
  icon: "pen" | "file";
  report?: Report;
  onGenerated: (r: Report) => void;
  enough: boolean;
  logCount: number;
  notify: (msg: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [paywalled, setPaywalled] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    setBusy(true);
    setErr(null);
    setPaywalled(false);
    const { data, error } = await supabase.functions.invoke("generate-report", { body: { kind } });
    setBusy(false);
    if (error) {
      // Supabase wraps non-2xx in FunctionsHttpError; payment gate returns 402
      const status = (error as { context?: { status?: number } }).context?.status;
      if (status === 402) setPaywalled(true);
      else if (status === 429) setErr("Daily report limit reached — try again tomorrow.");
      else setErr("Generation failed — try again.");
      return;
    }
    onGenerated(data as Report);
  };

  const copy = async () => {
    if (!report) return;
    try {
      await navigator.clipboard.writeText(report.body);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      notify("Select and copy manually");
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className="w-9 h-9 rounded-xl bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
          {icon === "pen" ? (
            <NotebookPen className="w-4 h-4 text-amber-500" />
          ) : (
            <FileText className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-sm text-neutral-500 leading-relaxed">{body}</p>
        </div>
      </div>

      {report && (
        <div className="mb-3 rounded-xl bg-neutral-950 border border-neutral-800 p-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs text-neutral-600">
              Generated {fmtDate(report.created_at.slice(0, 10))} · {report.log_count} entries
            </p>
            <button type="button" onClick={copy} className="flex items-center gap-1 text-xs text-amber-400">
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-sm text-neutral-300 leading-relaxed font-sans max-h-80 overflow-y-auto">
            {report.body}
          </pre>
        </div>
      )}

      {paywalled && (
        <div className="mb-3 rounded-xl border border-amber-500 bg-neutral-950 p-4 text-sm">
          <p className="font-medium text-amber-400 mb-1">Your free sample report is used.</p>
          <p className="text-neutral-400">
            Attest Evidence ($12/mo) unlocks unlimited summaries and appeal packets.
            {/* TODO: Stripe checkout — see README §Billing */}
          </p>
        </div>
      )}
      {err && <p className="text-sm text-red-400 mb-2">{err}</p>}

      <button
        type="button"
        onClick={run}
        disabled={busy || !enough}
        className="w-full py-3 rounded-xl bg-amber-500 text-neutral-950 font-semibold disabled:opacity-30 flex items-center justify-center gap-2"
      >
        {busy ? (
          <>
            <LoaderCircle className="w-4 h-4 animate-spin" /> Synthesizing {logCount} entries…
          </>
        ) : (
          <>
            <FileText className="w-4 h-4" /> {report ? "Regenerate" : "Generate"}
          </>
        )}
      </button>
      {!enough && (
        <p className="text-xs text-neutral-600 mt-2 text-center">
          Needs at least 3 entries — more history, stronger evidence.
        </p>
      )}
    </Card>
  );
}
