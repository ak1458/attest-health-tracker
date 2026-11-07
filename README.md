# Attest

A symptom-tracking application with daily logs, history, pattern views, and generated consultation-summary workflows.

[![React: UI](https://img.shields.io/badge/React-UI-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript: Typed](https://img.shields.io/badge/TypeScript-Typed-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Supabase: Backend](https://img.shields.io/badge/Supabase-Backend-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-64748B?style=flat-square)](LICENSE)

[Public preview](https://ak1458.github.io/attest-health-tracker/) · [Schema](supabase/migrations/0001_init.sql) · [Report function](supabase/functions/generate-report/index.ts)

## What is here

- Daily symptom and lifestyle logging with configurable condition fields.
- History and pattern views, plus offline write-queue handling.
- Supabase authentication, schema, and row-level policy definitions.
- A report-generation Edge Function using a server-side model provider.

## Run locally

```bash
git clone https://github.com/ak1458/attest-health-tracker.git
cd attest-health-tracker
npm ci
cp .env.example .env.local
npm run dev
```

Set the Supabase URL and public client key in the environment template. Connected operation requires the [database migration](supabase/migrations/0001_init.sql), authentication settings, and deployed report function. Without configured Supabase, the client includes a demonstration fallback.

The report function expects provider credentials in server-side secrets. See [the function source](supabase/functions/generate-report/index.ts); never place provider keys in `VITE_*` variables.

## Engineering notes

Views live in `src/components/`; data access and patterns live in `src/lib/`; service code lives in `supabase/`. `npm run build` type-checks and bundles the frontend.

The public preview and simulated data are for demonstration. Generated reports need human review. This repository does not establish medical validation, HIPAA certification, or an insurance outcome.

## License

Copyright © 2026 Ashraf Kamal. Reuse is restricted by [LICENSE](LICENSE).
