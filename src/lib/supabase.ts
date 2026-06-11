import { createClient } from "@supabase/supabase-js";

const isPlaceholder =
  !import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.VITE_SUPABASE_URL.includes("YOUR_PROJECT") ||
  !import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY.includes("YOUR_ANON_KEY");

// ── Mock Supabase Client for local simulation ──────────────────────────
class MockSupabaseClient {
  private authSubscribers: ((event: string, session: any) => void)[] = [];
  private mockSession: any = null;

  constructor() {
    const stored = localStorage.getItem("attest_mock_session");
    if (stored) {
      try {
        this.mockSession = JSON.parse(stored);
      } catch {
        this.mockSession = null;
      }
    }
  }

  private get userId(): string {
    return this.mockSession?.user?.id ?? "mock-user-id";
  }

  auth = {
    getSession: async () => {
      return { data: { session: this.mockSession }, error: null };
    },
    getUser: async (_token?: string) => {
      if (this.mockSession) {
        return { data: { user: this.mockSession.user }, error: null };
      }
      return { data: { user: null }, error: new Error("No user session") };
    },
    onAuthStateChange: (cb: (event: string, session: any) => void) => {
      this.authSubscribers.push(cb);
      // Call immediately with current state
      setTimeout(() => cb("INITIAL_SESSION", this.mockSession), 0);
      return {
        data: {
          subscription: {
            unsubscribe: () => {
              this.authSubscribers = this.authSubscribers.filter((s) => s !== cb);
            },
          },
        },
      };
    },
    signInWithOtp: async ({ email }: { email: string }) => {
      const session = {
        access_token: "mock-access-token",
        token_type: "bearer",
        expires_in: 3600,
        refresh_token: "mock-refresh-token",
        user: {
          id: "mock-user-id",
          email,
          created_at: new Date().toISOString(),
          aud: "authenticated",
          role: "authenticated",
        },
      };
      this.mockSession = session;
      localStorage.setItem("attest_mock_session", JSON.stringify(session));
      this.authSubscribers.forEach((cb) => cb("SIGNED_IN", session));
      return { data: { user: session.user, session }, error: null };
    },
    signOut: async () => {
      this.mockSession = null;
      localStorage.removeItem("attest_mock_session");
      this.authSubscribers.forEach((cb) => cb("SIGNED_OUT", null));
      return { error: null };
    },
  };

  from(table: string) {
    let filters: { field: string; val: any; op: "eq" | "gte" | "in" }[] = [];
    let orderCol: string | null = null;
    let orderAsc = true;

    // Load table data
    const loadData = (): any[] => {
      try {
        return JSON.parse(localStorage.getItem(`attest_mock_${table}`) ?? "[]");
      } catch {
        return [];
      }
    };

    // Save table data
    const saveData = (data: any[]) => {
      localStorage.setItem(`attest_mock_${table}`, JSON.stringify(data));
    };

    const builder = {
      select(_fields?: string, _options?: { count?: string; head?: boolean }) {
        return this;
      },
      eq(field: string, val: any) {
        filters.push({ field, val, op: "eq" });
        return this;
      },
      gte(field: string, val: any) {
        filters.push({ field, val, op: "gte" });
        return this;
      },
      in(field: string, vals: any[]) {
        filters.push({ field, val: vals, op: "in" });
        return this;
      },
      order(col: string, options?: { ascending?: boolean }) {
        orderCol = col;
        orderAsc = options?.ascending ?? true;
        return this;
      },
      async maybeSingle() {
        const res = await this.then();
        return { data: res.data?.[0] ?? null, error: null };
      },
      async single() {
        const res = await this.then();
        if (!res.data || res.data.length === 0) {
          return { data: null, error: new Error("No row found") };
        }
        return { data: res.data[0], error: null };
      },
      // Thenable execution
      async then(onfulfilled?: (value: any) => any) {
        let list = loadData();

        // Apply filters
        for (const f of filters) {
          if (f.op === "eq") {
            list = list.filter((x) => String(x[f.field]) === String(f.val));
          } else if (f.op === "gte") {
            list = list.filter((x) => x[f.field] >= f.val);
          } else if (f.op === "in") {
            list = list.filter((x) => f.val.includes(x[f.field]));
          }
        }

        // Apply ordering
        if (orderCol) {
          list.sort((a, b) => {
            const valA = a[orderCol!];
            const valB = b[orderCol!];
            if (valA == null) return 1;
            if (valB == null) return -1;
            if (typeof valA === "string") {
              return orderAsc ? valA.localeCompare(valB) : valB.localeCompare(valA);
            }
            return orderAsc ? valA - valB : valB - valA;
          });
        }

        const result = { data: list, error: null, count: list.length };
        return onfulfilled ? onfulfilled(result) : result;
      },
      async upsert(payload: any | any[], _options?: { onConflict?: string }) {
        const items = Array.isArray(payload) ? payload : [payload];
        let list = loadData();

        for (const item of items) {
          // Find unique identifier or match user_id + log_date for logs
          let idx = -1;
          if (table === "logs") {
            idx = list.findIndex(
              (x) => x.user_id === item.user_id && x.log_date === item.log_date
            );
          } else if (table === "profiles") {
            idx = list.findIndex((x) => x.id === item.id);
          } else {
            idx = list.findIndex((x) => x.id === item.id);
          }

          if (idx >= 0) {
            list[idx] = { ...list[idx], ...item };
          } else {
            list.push({ id: crypto.randomUUID(), ...item });
          }
        }

        saveData(list);
        return { data: Array.isArray(payload) ? items : items[0], error: null };
      },
      async delete() {
        let list = loadData();
        // Determine items to delete based on eq filters
        const toDelete = filters.filter((f) => f.op === "eq");
        if (toDelete.length > 0) {
          list = list.filter((x) => {
            return !toDelete.every((f) => String(x[f.field]) === String(f.val));
          });
        }
        saveData(list);
        return { data: null, error: null };
      },
      async insert(payload: any) {
        const list = loadData();
        const item = {
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          ...payload,
        };
        list.push(item);
        saveData(list);
        return { data: item, error: null };
      },
    };

    return builder;
  }

  functions = {
    invoke: async (name: string, options?: { body?: any }) => {
      if (name === "generate-report") {
        const kind = options?.body?.kind || "doctor";
        
        // Fetch mock logs to generate actual report statistics
        const logs = JSON.parse(localStorage.getItem("attest_mock_logs") ?? "[]")
          .filter((l: any) => l.user_id === this.userId)
          .sort((a: any, b: any) => a.log_date.localeCompare(b.log_date));
          
        if (logs.length < 3) {
          return { data: null, error: { context: { status: 400 } } };
        }

        // Check plan and report count
        const profiles = JSON.parse(localStorage.getItem("attest_mock_profiles") ?? "[]");
        const profile = profiles.find((p: any) => p.id === this.userId) || { plan: "free" };
        const reports = JSON.parse(localStorage.getItem("attest_mock_reports") ?? "[]")
          .filter((r: any) => r.user_id === this.userId);
          
        if (profile.plan === "free" && reports.length >= 1) {
          return { data: null, error: { context: { status: 402 } } };
        }

        // Generate detailed mock report narrative
        const flareDays = logs.filter((l: any) => l.severity >= 7).length;
        const totalDays = logs.length;
        const baseRatePct = Math.round((flareDays / totalDays) * 100);
        
        const reportBody = kind === "doctor" 
          ? `OVERVIEW
Patient-reported symptom tracking summary for the period ${logs[0].log_date} to ${logs[logs.length-1].log_date}. The patient is currently managing symptoms related to self-tracked conditions.

SYMPTOM FREQUENCY & SEVERITY
- Total logged days: ${totalDays}
- Flare days (severity 7+): ${flareDays} days (${baseRatePct}% of tracked days)
- Average severity: ${(logs.reduce((acc: number, l: any) => acc + l.severity, 0) / totalDays).toFixed(1)}/10
- Primary symptoms reported: ${Array.from(new Set(logs.flatMap((l: any) => l.symptoms))).slice(0, 3).join(", ") || "None"}

PATTERNS OBSERVED
- High severity correlations identified on days following poor sleep quality (<6 hours).
- Increased symptom intensity corresponding to periods of elevated mental or physical stress.

MEDICATION LOG
- Medication adherence rate: 85% based on daily entry records.

FUNCTIONAL IMPACT
- Patient notes indicate severe functional impairment on flare days, resulting in extended periods of bed rest and inability to perform activities of daily living.

SUGGESTED DISCUSSION POINTS
- What is the clinical significance of the observed flare patterns?
- Can medication timings be adjusted to mitigate post-exertional fatigue crashes?
- How should sleep disturbance be managed relative to systemic pain triggers?`
          : `DOCUMENTATION PERIOD
Start Date: ${logs[0].log_date}
End Date: ${logs[logs.length-1].log_date}
Total Tracked Days: ${totalDays}

TRACKED CONDITIONS
- Self-tracked chronic conditions with documentation of active symptom management.

SYMPTOM DOCUMENTATION
- Persistent presentation of: ${Array.from(new Set(logs.flatMap((l: any) => l.symptoms))).join(", ")}
- Tracked triggers: ${Array.from(new Set(logs.flatMap((l: any) => l.triggers))).join(", ")}

SEVERITY RECORD
- Severity distribution range: 0 - 10
- High-severity flare days (threshold 7+): ${flareDays} occurrences (${baseRatePct}% of period)

FUNCTIONAL LIMITATIONS
- Recurrent post-exertional fatigue and widespread pain resulting in documented restriction of mobility and functional capacity on multiple tracking days.

TREATMENT ADHERENCE
- Patient reports regular consumption of self-reported therapeutic medications.

CONSISTENCY OF RECORD
- Daily logs recorded contemporaneously by patient with zero gaps in tracking period.

Patient-reported documentation generated from contemporaneous daily logs.`;

        const newReport = {
          id: crypto.randomUUID(),
          user_id: this.userId,
          kind,
          body: reportBody,
          log_count: totalDays,
          period_start: logs[0].log_date,
          period_end: logs[logs.length - 1].log_date,
          created_at: new Date().toISOString(),
        };

        // Save report
        const allReports = JSON.parse(localStorage.getItem("attest_mock_reports") ?? "[]");
        allReports.push(newReport);
        localStorage.setItem("attest_mock_reports", JSON.stringify(allReports));

        return { data: newReport, error: null };
      }
      return { data: null, error: new Error("Not implemented") };
    },
  };
}

export const supabase = isPlaceholder
  ? (new MockSupabaseClient() as any)
  : createClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );
