import { useState } from "react";
import { ShieldCheck, LoaderCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    setBusy(false);
    if (error) setErr(error.message);
    else setSent(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <ShieldCheck className="w-5 h-5 text-amber-500" />
          <span className="text-sm tracking-widest uppercase text-neutral-500 font-medium">Attest</span>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight mb-2">Evidence-grade symptom documentation.</h1>
        <p className="text-neutral-400 mb-8 text-sm leading-relaxed">
          Sign in with a magic link — no password to remember on a bad day.
        </p>
        {sent ? (
          <div className="rounded-xl border border-amber-500 bg-neutral-900 p-4 text-sm">
            Check <span className="text-amber-400">{email}</span> for your sign-in link.
          </div>
        ) : (
          <form onSubmit={send} className="space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@email.com"
              className="w-full bg-neutral-900 border border-neutral-800 rounded-xl px-4 py-3 text-sm placeholder-neutral-600 outline-none focus:border-amber-500"
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-xl bg-amber-500 text-neutral-950 font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {busy && <LoaderCircle className="w-4 h-4 animate-spin" />} Send magic link
            </button>
            {err && <p className="text-sm text-red-400">{err}</p>}
          </form>
        )}
        <p className="text-xs text-neutral-600 mt-10 text-center">
          Attest is a documentation tool — not medical advice or diagnosis.
        </p>
      </div>
    </div>
  );
}
