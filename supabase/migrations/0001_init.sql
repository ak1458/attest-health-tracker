-- Attest — initial schema
-- Run via: supabase db push  (or paste into the SQL editor)

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  conditions text[] not null default '{}',
  meds text[] not null default '{}',
  custom_triggers text[] not null default '{}',
  plan text not null default 'free' check (plan in ('free', 'plus')),
  stripe_customer_id text,
  created_at timestamptz not null default now()
);

create table if not exists condition_modules (
  id text primary key,
  config jsonb not null,
  active boolean not null default true
);

create table if not exists logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  log_date date not null,
  severity smallint not null check (severity between 0 and 10),
  symptoms text[] not null default '{}',
  sleep_hours numeric(3,1),
  triggers text[] not null default '{}',
  meds_taken text[] not null default '{}',
  cycle_day smallint check (cycle_day between 1 and 45),
  notes text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, log_date)
);

create index if not exists logs_user_date_idx on logs (user_id, log_date desc);

create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users on delete cascade,
  kind text not null check (kind in ('doctor', 'evidence')),
  body text not null,
  log_count int not null,
  period_start date,
  period_end date,
  created_at timestamptz not null default now()
);

create index if not exists reports_user_idx on reports (user_id, created_at desc);

-- ── Row Level Security ──────────────────────────────────────────
alter table profiles enable row level security;
alter table logs enable row level security;
alter table reports enable row level security;
alter table condition_modules enable row level security;

create policy "own profile select" on profiles for select using (auth.uid() = id);
create policy "own profile insert" on profiles for insert with check (auth.uid() = id);
create policy "own profile update" on profiles for update using (auth.uid() = id);

create policy "own logs select" on logs for select using (auth.uid() = user_id);
create policy "own logs insert" on logs for insert with check (auth.uid() = user_id);
create policy "own logs update" on logs for update using (auth.uid() = user_id);
create policy "own logs delete" on logs for delete using (auth.uid() = user_id);

-- reports: clients read their own; ONLY the edge function (service role,
-- bypasses RLS) may insert — no client insert policy on purpose.
create policy "own reports select" on reports for select using (auth.uid() = user_id);

create policy "modules public read" on condition_modules for select using (true);

-- ── Condition module seed ───────────────────────────────────────
-- report_hints is injected into the generation prompt so each
-- condition's summary emphasizes what its clinicians look for.
insert into condition_modules (id, config) values
  ('pcos', '{"label":"PCOS","cycle_aware":true,"flare_threshold":7,"report_hints":"Cycle regularity and metabolic symptoms (cravings, fatigue) are clinically salient; quantify bleeding irregularity if logged."}'),
  ('endo', '{"label":"Endometriosis","cycle_aware":true,"flare_threshold":7,"report_hints":"Cycle-phase pain correlation is clinically salient; quantify pain severity vs cycle day and note bowel/bladder involvement."}'),
  ('fibro', '{"label":"Fibromyalgia","cycle_aware":false,"flare_threshold":7,"report_hints":"Sleep quality vs widespread pain correlation and post-exertion patterns are clinically salient."}'),
  ('longcovid', '{"label":"Long COVID","cycle_aware":false,"flare_threshold":7,"report_hints":"Post-exertional malaise (symptoms 24-48h after exertion triggers) is the clinically critical pattern; check lag effects."}'),
  ('adhd', '{"label":"ADHD","cycle_aware":false,"flare_threshold":7,"report_hints":"Medication adherence vs function correlation and sleep effects are clinically salient; frame severity as functional impairment."}'),
  ('autoimmune', '{"label":"Autoimmune (general)","cycle_aware":false,"flare_threshold":7,"report_hints":"Flare frequency, duration and systemic symptoms (fever, rash, joint swelling) are clinically salient for disease-activity assessment."}')
on conflict (id) do update set config = excluded.config;
