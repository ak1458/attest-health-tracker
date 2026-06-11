import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import { CONDITIONS } from "../lib/conditions";
import type { ConditionId, Profile } from "../lib/types";

export default function Onboarding({
  userId,
  onDone,
}: {
  userId: string;
  onDone: (p: Profile, withSample: boolean) => void;
}) {
  const [picked, setPicked] = useState<ConditionId[]>([]);
  const toggle = (id: ConditionId) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const start = (withSample: boolean) =>
    onDone({ id: userId, conditions: picked, meds: [], custom_triggers: [], plan: "free" }, withSample);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col">
      <div className="max-w-md mx-auto w-full px-6 pt-16 pb-10 flex-1">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span className="text-sm tracking-widest uppercase text-neutral-500 font-medium">Attest</span>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight mb-3">What are you managing?</h1>
        <p className="text-neutral-400 mb-8 leading-relaxed text-sm">
          Pick everything that applies — comorbidity is the norm, not the edge case.
        </p>
        <div className="grid grid-cols-2 gap-2 mb-8">
          {(Object.entries(CONDITIONS) as [ConditionId, (typeof CONDITIONS)[ConditionId]][]).map(([id, c]) => (
            <button
              key={id}
              type="button"
              onClick={() => toggle(id)}
              className={`text-left px-4 py-3 rounded-xl border text-sm transition-colors ${
                picked.includes(id)
                  ? "border-amber-500 bg-neutral-900 text-neutral-100"
                  : "border-neutral-800 bg-neutral-900 text-neutral-400 hover:border-neutral-600"
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          disabled={!picked.length}
          onClick={() => start(false)}
          className="w-full py-3.5 rounded-xl bg-amber-500 text-neutral-950 font-semibold disabled:opacity-30 disabled:cursor-not-allowed mb-3"
        >
          Start tracking
        </button>
        <button
          type="button"
          disabled={!picked.length}
          onClick={() => start(true)}
          className="w-full py-3 rounded-xl border border-neutral-800 text-neutral-400 text-sm disabled:opacity-30"
        >
          Start with 35 days of sample data
        </button>
      </div>
      <p className="text-center text-xs text-neutral-600 pb-8 px-6">
        Attest is a documentation tool — not medical advice or diagnosis.
      </p>
    </div>
  );
}
