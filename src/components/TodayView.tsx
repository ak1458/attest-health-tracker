import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { hasCycle, sevColor, shiftDate, todayStr, fmtDate, unionFor } from "../lib/conditions";
import type { LogEntry, Profile } from "../lib/types";
import { Chip, Section } from "./ui";

interface FormState {
  severity: number | null;
  symptoms: string[];
  sleep_hours: number | null;
  triggers: string[];
  meds_taken: string[];
  cycle_day: number | null;
  notes: string;
}

const blank: FormState = {
  severity: null,
  symptoms: [],
  sleep_hours: null,
  triggers: [],
  meds_taken: [],
  cycle_day: null,
  notes: "",
};

export default function TodayView({
  profile,
  logs,
  onSave,
  onAddMed,
  notify,
}: {
  profile: Profile;
  logs: LogEntry[];
  onSave: (entry: LogEntry) => void;
  onAddMed: (med: string) => void;
  notify: (msg: string) => void;
}) {
  const [date, setDate] = useState(todayStr());
  const existing = logs.find((l) => l.log_date === date);
  const [form, setForm] = useState<FormState>(existing ?? blank);
  const [newMed, setNewMed] = useState("");

  useEffect(() => {
    const e = logs.find((l) => l.log_date === date);
    setForm(e ? { ...e } : { ...blank });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const symptomList = unionFor(profile.conditions, "symptoms");
  const triggerList = [...unionFor(profile.conditions, "triggers"), ...profile.custom_triggers];
  const cycle = hasCycle(profile.conditions);

  const toggleIn = (field: "symptoms" | "triggers" | "meds_taken", val: string) =>
    setForm((f) => ({
      ...f,
      [field]: f[field].includes(val) ? f[field].filter((x) => x !== val) : [...f[field], val],
    }));

  const addMed = () => {
    const m = newMed.trim();
    if (!m) return;
    onAddMed(m);
    setForm((f) => ({ ...f, meds_taken: f.meds_taken.includes(m) ? f.meds_taken : [...f.meds_taken, m] }));
    setNewMed("");
  };

  const save = () => {
    if (form.severity == null) {
      notify("Set a severity first");
      return;
    }
    onSave({
      ...form,
      severity: form.severity,
      id: existing?.id ?? crypto.randomUUID(),
      user_id: profile.id,
      log_date: date,
    });
    notify(existing ? "Updated" : "Logged");
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <button type="button" onClick={() => setDate(shiftDate(date, -1))} className="p-2 text-neutral-500">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <p className="font-semibold">{date === todayStr() ? "Today" : fmtDate(date)}</p>
        <button
          type="button"
          onClick={() => setDate(shiftDate(date, 1))}
          disabled={date === todayStr()}
          className="p-2 text-neutral-500 disabled:opacity-20"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <Section title="Overall severity" hint="0 = fine · 10 = worst">
        <div className="grid grid-cols-11 gap-1">
          {Array.from({ length: 11 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setForm((f) => ({ ...f, severity: i }))}
              className={`h-11 rounded-lg text-sm font-medium border transition-all ${
                form.severity === i ? "border-neutral-100 text-neutral-950" : "border-neutral-800 text-neutral-500"
              }`}
              style={{ backgroundColor: form.severity === i ? sevColor(i) : "#171717" }}
            >
              {i}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Symptoms">
        <div className="flex flex-wrap gap-2">
          {symptomList.map((s) => (
            <Chip key={s} active={form.symptoms.includes(s)} onClick={() => toggleIn("symptoms", s)}>
              {s}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Sleep last night">
        <div className="flex flex-wrap gap-2">
          {[4, 5, 6, 7, 8, 9].map((h) => (
            <Chip
              key={h}
              active={form.sleep_hours === h}
              onClick={() => setForm((f) => ({ ...f, sleep_hours: f.sleep_hours === h ? null : h }))}
            >
              {h === 4 ? "≤4h" : h === 9 ? "9h+" : `${h}h`}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Suspected triggers">
        <div className="flex flex-wrap gap-2">
          {triggerList.map((t) => (
            <Chip key={t} active={form.triggers.includes(t)} onClick={() => toggleIn("triggers", t)}>
              {t}
            </Chip>
          ))}
        </div>
      </Section>

      <Section title="Medications taken">
        <div className="flex flex-wrap gap-2 mb-2">
          {profile.meds.map((m) => (
            <Chip key={m} active={form.meds_taken.includes(m)} onClick={() => toggleIn("meds_taken", m)}>
              {m}
            </Chip>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            value={newMed}
            onChange={(e) => setNewMed(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addMed()}
            placeholder="Add medication"
            className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm placeholder-neutral-600 outline-none focus:border-neutral-600"
          />
          <button type="button" onClick={addMed} className="px-3 rounded-xl border border-neutral-800 text-neutral-400">
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </Section>

      {cycle && (
        <Section title="Cycle day" hint="optional">
          <input
            type="number"
            min={1}
            max={45}
            value={form.cycle_day ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, cycle_day: e.target.value ? Number(e.target.value) : null }))}
            placeholder="e.g. 14"
            className="w-28 bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm placeholder-neutral-600 outline-none focus:border-neutral-600"
          />
        </Section>
      )}

      <Section title="Note" hint="your own words">
        <textarea
          value={form.notes}
          onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
          rows={2}
          placeholder="Anything that mattered today"
          className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-3 py-2 text-sm placeholder-neutral-600 outline-none focus:border-neutral-600 resize-none"
        />
      </Section>

      <button type="button" onClick={save} className="w-full py-3.5 rounded-xl bg-amber-500 text-neutral-950 font-semibold">
        {existing ? "Update entry" : "Save entry"}
      </button>
    </div>
  );
}
