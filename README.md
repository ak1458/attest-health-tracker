# Attest: Clinical Symptom Tracking & Documentation Suite

[![React 18](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Edge%20Functions%20%2B%20RLS-3FCF8E?logo=supabase)](https://supabase.com)
[![Vite](https://img.shields.io/badge/Vite-PWA-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)


Attest is a high-fidelity, secure clinical documentation and symptom-tracking platform designed for managing complex, under-served chronic conditions (such as PCOS, endometriosis, fibromyalgia, long COVID, ADHD, and autoimmune diseases).

The platform allows users to log multi-dimensional health metrics in under 20 seconds. It then processes this historical data to compile professional, hand-off ready clinical consultation summaries and structured insurance-appeal evidence packets.

---

## Key Product Capabilities

### 1. Dual Narrative Compilation Engines
*   **Clinical Consultation Summaries**: Compiles patient history into a concise, high-density clinical brief formatted specifically for medical practitioners, highlighting symptom frequencies, observed correlations, and medication adherence.
*   **Insurance Appeal Evidence Packets**: Generates timeline-compliant documentation to support prior-authorization requests or claim appeals, proving contemporaneous tracking and functional limitations.

### 2. Deterministic Telemetry & Verification
*   To ensure absolute narrative accuracy and compliance, all statistical computations (symptom frequencies, trigger lifts, and sleep correlations) are calculated deterministically on the server side before the report narrative is constructed. This verification layer guarantees that the final compiled documents report exact historical data with zero synthetic interpolation.

### 3. Offline-Resilient Architecture
*   Designed for low-connectivity environments. If a network write fails, logs are safely queued in an offline local database outbox and automatically synchronized when connectivity is restored, ensuring patients can record metrics without interruption.

### 4. Dynamic Data Schema
*   Condition-specific metrics are defined entirely through data configurations. Adding a new condition module requires zero database migrations or structural code alterations; new conditions are dynamically registered via seed records.

---

## Technical Stack & Architecture

*   **Frontend**: React 18, Vite, TypeScript, Tailwind CSS, Progressive Web App (PWA) framework.
*   **Backend & Orchestration**: Supabase (Postgres Database, Row-Level Security, Secure Auth, Edge Functions).
*   **Synthesis Integration**: Secure edge-processed text generation via Deno.

```
src/
  App.tsx                    Session orchestration, dashboard navigation, configuration
  components/
    Auth.tsx                 Secure magic-link (email OTP) authentication portal
    Onboarding.tsx           Dynamic condition selection and user profiling
    TodayView.tsx            Symptom telemetry logging (severity, symptoms, sleep, triggers, cycle)
    HistoryView.tsx          Contemporaneous log registry, detailed entries, and deletion
    PatternsView.tsx         Telemetry analysis engine (trigger correlation, sleep-effect indices)
    ReportsView.tsx          Document compilation interface with billing & rate-limiting states
  lib/
    conditions.ts            Condition-specific module schemas and metadata configurations
    patterns.ts              Client-side telemetry analysis and pattern engine
    store.ts                 Data access layer with offline queue and write synchronization
    supabase.ts              Database client initialization with mock simulation fallback
supabase/
  migrations/0001_init.sql   Postgres database schema, RLS policies, and core condition seeds
  functions/generate-report/ Secure narrative synthesis service (edge processing)
```

---

## Local Setup & Configuration

### 1. Database Setup (Supabase)
Install the database CLI and initialize the database connection:
```bash
# Install CLI
npm i -g supabase

# Log in and link the workspace
supabase login
supabase init
supabase link --project-ref YOUR_PROJECT_REF

# Apply schemas, Row-Level Security (RLS) policies, and base seeds
supabase db push
```
Alternatively, apply the SQL schema in `supabase/migrations/0001_init.sql` directly inside your database dashboard.

Ensure that **Email Auth** is enabled under the Authentication providers. Add your development and production domain paths to the Auth redirect configuration.

### 2. Narrative Synthesis Engine Credentials
Configure the secure API credentials for the Edge Function:
```bash
# Set secure generation credentials
supabase secrets set ANTHROPIC_API_KEY=your_secure_credential_here

# Optional: Specify target compilation model (defaults to stable 4.6 release)
supabase secrets set ANTHROPIC_MODEL=claude-sonnet-4-6

# Deploy the compilation edge function
supabase functions deploy generate-report
```

### 3. Frontend Client
Create the local environment file:
```bash
cp .env.example .env
```
Fill in `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

Install dependencies and start the development server:
```bash
npm install
npm run dev
```

---

## Mock Telemetry & Client-Side Simulation
For testing, demonstration, or showcasing to stakeholders:
1. When no environment variables are defined in `.env` (or if they remain default placeholders), the client automatically switches to a fully featured **Local Mock Mode**.
2. During user onboarding or inside the Settings menu, you can click **"Insert 35 days of sample data"**.
3. This fills the local simulated database with realistic tracking history including pre-seeded correlations (e.g., poor sleep quality correlating with elevated severity scores) to demonstrate telemetry analyses and report compilation instantly without manual data entry.

---

## Secure Privacy Posture
*   **Row-Level Security (RLS)**: Enforced on all tables. Records can only be read or modified by the authenticated user who owns them.
*   **HIPAA & Privacy Isolation**: General health logging remains entirely client-side or scoped within direct database records. Narrative generation is handled in temporary edge-memory buffers, ensuring data is never permanently retained by third-party processors.
*   **Data Portability**: Features built-in structural exports and complete account deletion routines in compliance with data privacy regulations.
