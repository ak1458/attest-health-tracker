import { lazy, Suspense, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  Activity, CalendarDays, FileText, LoaderCircle, LogOut, Plus, Settings, ShieldCheck, X,
} from "lucide-react";
import Auth from "./components/Auth";
import Onboarding from "./components/Onboarding";
import TodayView from "./components/TodayView";
import HistoryView from "./components/HistoryView";
import ReportsView from "./components/ReportsView";

const PatternsView = lazy(() => import("./components/PatternsView"));
import { Card, Chip } from "./components/ui";
import { CONDITIONS } from "./lib/conditions";
import {
  deleteLog, flushOutbox, getProfile, insertSampleLogs, listLogs, upsertLog, upsertProfile,
} from "./lib/store";
import { supabase } from "./lib/supabase";
import type { ConditionId, LogEntry, Profile } from "./lib/types";

type Tab = "today" | "history" | "patterns" | "reports";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [booted, setBooted] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [tab, setTab] = useState<Tab>("today");
  const [toast, setToast] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: any) => {
      setSession(data.session);
      setBooted(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e: any, s: any) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setProfile(null);
      setLogs([]);
      return;
    }
    void (async () => {
      await flushOutbox();
      const [p, l] = await Promise.all([getProfile(session.user.id), listLogs(session.user.id)]);
      setProfile(p);
      setLogs(l);
    })();
  }, [session]);

  const notify = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const saveProfile = (p: Profile) => {
    setProfile(p);
    void upsertProfile(p);
  };

  const handleOnboard = async (p: Profile, withSample: boolean) => {
    saveProfile(p);
    if (withSample) {
      try {
        const sample = await insertSampleLogs(p.id, p.conditions);
        setLogs(sample);
      } catch {
        notify("Sample data failed — you can add it from Settings");
      }
    }
  };

  const handleSaveLog = (entry: LogEntry) => {
    setLogs((ls) => {
      const i = ls.findIndex((l) => l.log_date === entry.log_date);
      return i >= 0 ? ls.map((l, j) => (j === i ? entry : l)) : [...ls, entry];
    });
    void upsertLog(entry);
  };

  const handleDeleteLog = (id: string) => {
    setLogs((ls) => ls.filter((l) => l.id !== id));
    void deleteLog(id);
    notify("Deleted");
  };

  const handleAddMed = (med: string) => {
    if (!profile || profile.meds.includes(med)) return;
    saveProfile({ ...profile, meds: [...profile.meds, med] });
  };

  if (!booted)
    return (
      <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
        <LoaderCircle className="w-6 h-6 text-neutral-600 animate-spin" />
      </div>
    );

  if (!session) return <Auth />;
  if (!profile) return <Onboarding userId={session.user.id} onDone={handleOnboard} />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-20 bg-neutral-950 border-b border-neutral-900">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-amber-500" />
            <span className="text-sm tracking-widest uppercase text-neutral-400 font-medium">Attest</span>
          </div>
          <button type="button" onClick={() => setSettingsOpen(true)} className="text-neutral-500 hover:text-neutral-300">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-28 pt-4">
        {tab === "today" && (
          <TodayView profile={profile} logs={logs} onSave={handleSaveLog} onAddMed={handleAddMed} notify={notify} />
        )}
        {tab === "history" && <HistoryView logs={logs} onDelete={handleDeleteLog} />}
        {tab === "patterns" && (
          <Suspense fallback={<div className="pt-20 text-center text-neutral-600 text-sm">Loading patterns…</div>}>
            <PatternsView logs={logs} />
          </Suspense>
        )}
        {tab === "reports" && <ReportsView profile={profile} logs={logs} notify={notify} />}
      </main>

      <nav className="fixed bottom-0 inset-x-0 z-30 bg-neutral-950 border-t border-neutral-900">
        <div className="max-w-md mx-auto grid grid-cols-4">
          {(
            [
              { id: "today", label: "Today", Icon: Plus },
              { id: "history", label: "History", Icon: CalendarDays },
              { id: "patterns", label: "Patterns", Icon: Activity },
              { id: "reports", label: "Reports", Icon: FileText },
            ] as const
          ).map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`py-3 flex flex-col items-center gap-1 text-xs transition-colors ${
                tab === id ? "text-amber-400" : "text-neutral-600"
              }`}
            >
              <Icon className="w-5 h-5" />
              {label}
            </button>
          ))}
        </div>
      </nav>

      {settingsOpen && (
        <SettingsModal
          profile={profile}
          onProfile={saveProfile}
          onSample={async () => {
            const sample = await insertSampleLogs(profile.id, profile.conditions);
            setLogs(sample);
            notify("Sample data inserted");
          }}
          notify={notify}
          close={() => setSettingsOpen(false)}
        />
      )}

      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-neutral-100 text-neutral-900 text-sm font-medium px-4 py-2 rounded-full shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function SettingsModal({
  profile,
  onProfile,
  onSample,
  notify,
  close,
}: {
  profile: Profile;
  onProfile: (p: Profile) => void;
  onSample: () => Promise<void>;
  notify: (msg: string) => void;
  close: () => void;
}) {
  const toggle = (id: ConditionId) => {
    const next = profile.conditions.includes(id)
      ? profile.conditions.filter((x) => x !== id)
      : [...profile.conditions, id];
    if (!next.length) return;
    onProfile({ ...profile, conditions: next });
  };

  return (
    <div className="fixed inset-0 z-40 bg-neutral-950/90 flex items-end sm:items-center justify-center p-4">
      <Card className="w-full max-w-md p-5">
        <div className="flex justify-between items-center mb-4">
          <p className="font-semibold">Settings</p>
          <button type="button" onClick={close} className="text-neutral-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        <p className="text-xs font-medium tracking-widest text-neutral-500 uppercase mb-2">Conditions</p>
        <div className="flex flex-wrap gap-2 mb-6">
          {(Object.keys(CONDITIONS) as ConditionId[]).map((id) => (
            <Chip key={id} active={profile.conditions.includes(id)} onClick={() => toggle(id)}>
              {CONDITIONS[id].label}
            </Chip>
          ))}
        </div>
        <button
          type="button"
          onClick={() => {
            void onSample().catch(() => notify("Sample insert failed"));
            close();
          }}
          className="w-full py-2.5 rounded-xl border border-neutral-800 text-neutral-400 text-sm mb-3"
        >
          Insert 35 days of sample data (testing)
        </button>
        <button
          type="button"
          onClick={() => void supabase.auth.signOut()}
          className="w-full py-2.5 rounded-xl border border-neutral-800 text-neutral-400 text-sm flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>
        <p className="text-xs text-neutral-600 mt-4 text-center">
          Encrypted, never sold, exportable. Documentation tool — not medical advice.
        </p>
      </Card>
    </div>
  );
}
