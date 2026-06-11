import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-2 rounded-full text-sm border transition-colors ${
        active
          ? "border-amber-500 text-amber-400 bg-neutral-900"
          : "border-neutral-800 text-neutral-400 bg-neutral-900 hover:border-neutral-600"
      }`}
    >
      {children}
    </button>
  );
}

export function Section({ title, hint, children }: { title: string; hint?: string; children: ReactNode }) {
  return (
    <div className="mb-6">
      <div className="flex items-baseline justify-between mb-2">
        <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase">{title}</p>
        {hint && <p className="text-xs text-neutral-600">{hint}</p>}
      </div>
      {children}
    </div>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`bg-neutral-900 border border-neutral-800 rounded-2xl ${className}`}>{children}</div>;
}

export function Empty({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <div className="pt-20 text-center px-8">
      <Icon className="w-8 h-8 text-neutral-700 mx-auto mb-4" />
      <p className="font-semibold mb-1 text-neutral-100">{title}</p>
      <p className="text-sm text-neutral-500">{body}</p>
    </div>
  );
}
