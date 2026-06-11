import { useMemo } from "react";
import { Activity } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine,
} from "recharts";
import { FLARE_THRESHOLD, sevColor } from "../lib/conditions";
import { computePatterns } from "../lib/patterns";
import type { LogEntry } from "../lib/types";
import { Card, Empty } from "./ui";

export default function PatternsView({ logs }: { logs: LogEntry[] }) {
  const p = useMemo(() => computePatterns(logs), [logs]);

  if (!p)
    return (
      <Empty
        icon={Activity}
        title="Patterns unlock at 5 entries"
        body={`${logs.length} of 5 logged. Correlations need a little history.`}
      />
    );

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">
          Severity · last {p.chart.length} entries
        </p>
        <div style={{ height: 180 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={p.chart} margin={{ top: 5, right: 5, bottom: 0, left: -32 }}>
              <XAxis
                dataKey="d"
                tick={{ fill: "#525252", fontSize: 10 }}
                tickLine={false}
                axisLine={{ stroke: "#262626" }}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 10]} tick={{ fill: "#525252", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip
                contentStyle={{ background: "#171717", border: "1px solid #262626", borderRadius: 12, fontSize: 12 }}
                labelStyle={{ color: "#a3a3a3" }}
              />
              <ReferenceLine y={FLARE_THRESHOLD} stroke="#7f1d1d" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="sev" stroke="#f59e0b" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <p className="text-xs text-neutral-600 mt-2">
          {p.flares} flare day{p.flares === 1 ? "" : "s"} (7+) across {p.n} entries · baseline flare rate{" "}
          {Math.round(p.baseRate * 100)}%
        </p>
      </Card>

      <Card className="p-4">
        <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">Trigger signal</p>
        {p.triggerLifts.length ? (
          <div className="space-y-3">
            {p.triggerLifts.map((t) => (
              <div key={t.trigger} className="flex items-center justify-between">
                <div>
                  <p className="text-sm">{t.trigger}</p>
                  <p className="text-xs text-neutral-600">{t.days} days logged</p>
                </div>
                <span className="text-sm font-semibold text-amber-400">{t.lift.toFixed(1)}× flare risk</span>
              </div>
            ))}
            <p className="text-xs text-neutral-600 pt-1">Observational correlation in your logs — not causation.</p>
          </div>
        ) : (
          <p className="text-sm text-neutral-500">No trigger stands out yet. Keep logging suspected triggers.</p>
        )}
      </Card>

      {p.sleepEffect && (
        <Card className="p-4">
          <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">Sleep effect</p>
          <div className="flex gap-3">
            <div className="flex-1 rounded-xl bg-neutral-950 border border-neutral-800 p-3">
              <p className="text-2xl font-semibold" style={{ color: sevColor(p.sleepEffect.short) }}>
                {p.sleepEffect.short.toFixed(1)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                avg severity after &lt;6h sleep · {p.sleepEffect.nShort} nights
              </p>
            </div>
            <div className="flex-1 rounded-xl bg-neutral-950 border border-neutral-800 p-3">
              <p className="text-2xl font-semibold" style={{ color: sevColor(p.sleepEffect.long) }}>
                {p.sleepEffect.long.toFixed(1)}
              </p>
              <p className="text-xs text-neutral-500 mt-1">
                avg severity after 7h+ sleep · {p.sleepEffect.nLong} nights
              </p>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4">
        <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-3">Most frequent symptoms</p>
        <div className="space-y-2.5">
          {p.topSymptoms.map((s) => (
            <div key={s.symptom}>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-neutral-300">{s.symptom}</span>
                <span className="text-neutral-500">{s.pct}% of days</span>
              </div>
              <div className="h-1.5 rounded-full bg-neutral-800 overflow-hidden">
                <div className="h-full bg-amber-500" style={{ width: `${s.pct}%`, opacity: 0.85 }} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
