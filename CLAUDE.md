# Closure — Claude Code instructions

## What this is

Recruiter tool for generating evidenced rejection emails. Recruiter adds a role + job description, adds candidates with CVs, triggers an AI evaluation, reviews/edits the draft, and sends the email. Hard-delete purge after 90 days.

## Stack

- **Next.js 16.2.4** — App Router, Turbopack, TypeScript, Tailwind CSS v4
- **Supabase** — Postgres (roles, candidates, evaluations, audit_log) + Storage bucket `candidate-files`
- **Anthropic** — `claude-sonnet-4-5`, evaluation agent in `lib/agent.ts`
- **Resend** — email delivery fallback, send-only key, `lib/email.ts`
- **Gmail MCP** — primary email delivery path when `settings.email_provider = 'gmail-mcp'`. Connector at `https://gmailmcp.googleapis.com/mcp/v1` (JSON-RPC 2.0). Requires `settings.gmail_oauth_token`. Falls back to Resend automatically on auth failure.
- **pdf-parse v2** — CV/transcript text extraction, `lib/pdf.ts`. Uses `PDFParse` class: `new PDFParse({ data: buffer })` then `.getText()`. Do not use the default import pattern or `new PDFParse()` with no arguments.

## Architecture

```
app/
  page.tsx                         Dashboard — list roles
  roles/
    new/page.tsx                   Create role (client form)
    [id]/page.tsx                  Role detail + candidate list
  candidates/
    new/page.tsx                   Add candidate + file uploads
    [id]/page.tsx                  Candidate detail + evaluation display
    [id]/CloseButton.tsx           Triggers evaluation generation
    [id]/review/page.tsx           Review page — shows eval + draft
    [id]/review/ReviewForm.tsx     Edit draft + confirm send
  api/
    roles/route.ts                 POST: create role
    candidates/route.ts            POST: create candidate
    candidates/[id]/close/route.ts POST: run agent, store eval, mark closed
    candidates/[id]/send/route.ts  POST: send email, stamp sent_at
    upload/route.ts                POST: upload file to candidate-files bucket
    cron/purge/route.ts            GET: hard-delete candidates older than 90 days

lib/
  supabase.ts   getServiceClient()
  auth.ts       requireAdmin() — checks x-admin-secret header
  client.ts     apiFetch() — injects admin_secret from localStorage
  agent.ts      runEvaluationAgent() — Claude API, returns evaluation/evidence/draft
  email.ts      sendEmail(EmailInput) → EmailResult — Gmail MCP primary, Resend fallback
  upload.ts     uploadFile / downloadFile / deleteFile — Supabase Storage
  pdf.ts        extractText() — pdf-parse (PDF) or utf-8 (plain text)
```

## Database schema

```sql
roles        (id, title, job_description, greenhouse_job_id[bigint,unique], created_at)
candidates   (id, role_id, name, email,
              cv_path, cv_text,
              transcript_path, transcript_text,
              recruiter_notes,
              status[active|pending-review|closed-pending|closed-sent],
              greenhouse_candidate_id[bigint], greenhouse_application_id[bigint,unique],
              created_at)
evaluations  (id, candidate_id, evaluation_text, evidence_statement,
              draft_message, final_message, approved_at, sent_at, created_at)
audit_log    (id, candidate_id, event, detail, created_at)
settings     (id, key[unique], value, updated_at)
```

Key `settings` rows:
- `email_provider` — `'resend'` (default) or `'gmail-mcp'`
- `gmail_oauth_token` — required when `email_provider = 'gmail-mcp'`

Storage bucket: `candidate-files` (private, service role only)

## Auth model

Flat shared secret. `ADMIN_SECRET` env var is injected as `x-admin-secret` header by `apiFetch()` in `lib/client.ts`, which reads it from `localStorage` key `admin_secret`. `/login` presents a password field; on submit it probes `POST /api/roles` with an empty body — a `400` response confirms the secret is valid (auth passed, validation failed as expected), a `401` means wrong secret. On success the secret is written to `localStorage` and the user is redirected to `/`. `app/AuthGuard.tsx` runs on every route and redirects to `/login` if `localStorage` has no secret. No multi-user, no sessions.

## Env vars

| Var | Purpose |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://jlyhytgciwhhsdrszkfn.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server only) |
| `ANTHROPIC_API_KEY` | Anthropic API key |
| `RESEND_API_KEY` | Resend send-only key |
| `RESEND_FROM_EMAIL` | Verified sender address |
| `ADMIN_SECRET` | Flat admin auth secret |
| `CRON_SECRET` | Vercel cron auth — `Authorization: Bearer` header on purge route |
| `GREENHOUSE_WEBHOOK_SECRET` | Greenhouse webhook HMAC secret — required for `/api/webhooks/greenhouse` |

## Cron

`vercel.json` schedules `GET /api/cron/purge` daily at 03:00 UTC. Purges candidates (+ cascade to evaluations, audit_log, and storage files) older than 90 days. Protected by `CRON_SECRET`.

## Commands

```bash
npm run dev        # dev server (Turbopack)
npm run build      # production build
npm test           # run unit tests (vitest)
npx tsc --noEmit   # type check
```

## Tests

Vitest, node environment. 14 tests across 3 files in `test/`.

| File | What it covers |
|---|---|
| `test/auth.test.ts` | `requireAdmin` — correct secret, wrong secret, missing header, unset env var |
| `test/pdf.test.ts` | `extractText` plain text path — content, trimming, empty input, internal newlines |
| `test/agent.test.ts` | Agent JSON parsing and field validation — valid response, each missing field, empty string fields, invalid JSON |

PDF extraction tests cover the plain text branch only. The PDF branch (`application/pdf`) requires a real PDF buffer and is exercised end-to-end via the close flow.


## Conventions

- All API routes check `requireAdmin(req)` first — return 401 before any DB or storage call.
- Server components use `getServiceClient()` directly. Client components use `apiFetch()` which proxies through API routes.
- All DB-reading server pages set `export const dynamic = 'force-dynamic'`.
- Audit log entry written for `evaluation_generated` and `email_sent` events.
- Resend key is send-only — never call management endpoints (`domains.list()` etc.) in application code.
