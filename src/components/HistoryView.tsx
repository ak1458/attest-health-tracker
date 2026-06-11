import { useState } from "react";
import { CalendarDays, Trash2 } from "lucide-react";
import { FLARE_THRESHOLD, fmtDate, sevColor } from "../lib/conditions";
import type { LogEntry } from "../lib/types";
import { Card, Empty } from "./ui";

export default function HistoryView({
  logs,
  onDelete,
}: {
  logs: LogEntry[];
  onDelete: (id: string) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const sorted = [...logs].sort((a, b) => b.log_date.localeCompare(a.log_date));

  if (!sorted.length)
    return <Empty icon={CalendarDays} title="No entries yet" body="Your first log takes about 20 seconds." />;

  return (
    <div className="space-y-2">
      {sorted.map((l) => (
        <Card key={l.id} className="px-4 py-3">
          <button type="button" className="w-full text-left" onClick={() => setOpenId(openId === l.id ? null : l.id)}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold text-neutral-950"
                  style={{ backgroundColor: sevColor(l.severity) }}
                >
                  {l.severity}
                </span>
                <div>
                  <p className="text-sm font-medium">{fmtDate(l.log_date)}</p>
                  <p className="text-xs text-neutral-500 truncate max-w-56">
                    {l.symptoms.slice(0, 3).join(" · ") || "No symptoms listed"}
                  </p>
                </div>
              </div>
              {l.severity >= FLARE_THRESHOLD && (
                <span className="text-xs text-red-400 border border-red-900 rounded-full px-2 py-0.5">flare</span>
              )}
            </div>
          </button>
          {openId === l.id && (
            <div className="mt-3 pt-3 border-t border-neutral-800 text-sm text-neutral-400 space-y-1">
              {l.symptoms.length > 0 && <p>Symptoms: {l.symptoms.join(", ")}</p>}
              {l.sleep_hours != null && <p>Sleep: {l.sleep_hours}h</p>}
              {l.triggers.length > 0 && <p>Triggers: {l.triggers.join(", ")}</p>}
              {l.meds_taken.length > 0 && <p>Meds: {l.meds_taken.join(", ")}</p>}
              {l.cycle_day != null && <p>Cycle day: {l.cycle_day}</p>}
              {l.notes && <p>Note: {l.notes}</p>}
              <button
                type="button"
                onClick={() => onDelete(l.id)}
                className="flex items-center gap-1.5 text-red-400 pt-2 text-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete entry
              </button>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
