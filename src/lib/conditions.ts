import type { ConditionId } from "./types";

export interface ConditionModule {
  label: string;
  cycle: boolean;
  symptoms: string[];
  triggers: string[];
  sampleMeds: string[];
}

export const FLARE_THRESHOLD = 7;

export const CONDITIONS: Record<ConditionId, ConditionModule> = {
  pcos: {
    label: "PCOS",
    cycle: true,
    symptoms: ["Pelvic pain", "Irregular bleeding", "Fatigue", "Acne flare", "Hair shedding", "Bloating", "Mood swings", "Sugar cravings", "Headache", "Insomnia"],
    triggers: ["Poor sleep", "High stress", "Sugar-heavy day", "Dairy", "Skipped meal", "Missed medication", "No exercise", "Intense exercise"],
    sampleMeds: ["Metformin", "Inositol"],
  },
  endo: {
    label: "Endometriosis",
    cycle: true,
    symptoms: ["Pelvic pain", "Cramping", "Pain during/after sex", "Painful bowel movements", "Bladder pain", "Endo belly (bloating)", "Fatigue", "Nausea", "Lower back pain", "Leg pain"],
    triggers: ["Poor sleep", "High stress", "Caffeine", "Alcohol", "Inflammatory food", "Missed medication", "Long sitting", "Intense exercise"],
    sampleMeds: ["Naproxen", "Hormonal pill"],
  },
  fibro: {
    label: "Fibromyalgia",
    cycle: false,
    symptoms: ["Widespread pain", "Morning stiffness", "Brain fog", "Fatigue", "Tender points", "Headache", "Numbness / tingling", "Unrefreshing sleep", "IBS symptoms", "Sensory sensitivity"],
    triggers: ["Poor sleep", "High stress", "Weather change", "Overexertion", "Cold exposure", "Missed medication", "Long screen time", "Travel"],
    sampleMeds: ["Duloxetine", "Magnesium"],
  },
  longcovid: {
    label: "Long COVID",
    cycle: false,
    symptoms: ["Fatigue", "Post-exertional crash (PEM)", "Brain fog", "Shortness of breath", "Heart palpitations", "Dizziness on standing", "Headache", "Joint pain", "Smell / taste changes", "Sore throat"],
    triggers: ["Physical exertion", "Mental exertion", "Poor sleep", "High stress", "Heat", "Alcohol", "Skipped pacing", "Crowded place"],
    sampleMeds: ["LDN", "Electrolytes"],
  },
  adhd: {
    label: "ADHD",
    cycle: false,
    symptoms: ["Focus difficulty", "Task paralysis", "Forgetfulness", "Restlessness", "Emotional flooding", "Time blindness", "Hyperfocus crash", "Rejection sensitivity", "Disorganized day", "Impulsive spending"],
    triggers: ["Poor sleep", "Missed medication", "High stress", "No exercise", "Screen overload", "Late caffeine", "Skipped meal", "Schedule change"],
    sampleMeds: ["Methylphenidate"],
  },
  autoimmune: {
    label: "Autoimmune (general)",
    cycle: false,
    symptoms: ["Joint pain", "Joint swelling", "Fatigue", "Skin rash", "Low-grade fever", "Brain fog", "Muscle weakness", "GI distress", "Dry eyes / mouth", "Hair loss"],
    triggers: ["High stress", "Poor sleep", "Sun exposure", "Infection", "Inflammatory food", "Missed medication", "Overexertion", "Weather change"],
    sampleMeds: ["Hydroxychloroquine", "Vitamin D"],
  },
};

export function unionFor(ids: ConditionId[], field: "symptoms" | "triggers"): string[] {
  const out: string[] = [];
  for (const id of ids) {
    for (const s of CONDITIONS[id]?.[field] ?? []) {
      if (!out.includes(s)) out.push(s);
    }
  }
  return out;
}

export function hasCycle(ids: ConditionId[]): boolean {
  return ids.some((id) => CONDITIONS[id]?.cycle);
}

/* ── date helpers ── */

export const todayStr = (): string => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const shiftDate = (str: string, days: number): string => {
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d + days);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;
};

export const fmtDate = (str: string): string => {
  const [y, m, d] = str.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
};

export const sevColor = (n: number | null): string =>
  n == null ? "#3f3f46" : n <= 3 ? "#34d399" : n <= 6 ? "#f59e0b" : "#f87171";
