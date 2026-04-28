# Closure

A tool for recruiters who want to tell candidates why they didn't get the job.

---

## What this is

Candidates who reach the interview stage deserve a specific, honest response when they don't get the role. Most don't get one — not because recruiters are indifferent, but because writing 30 individual emails a month, each grounded in the actual interview and job requirements, is genuinely hard to do at volume. Closure is a small internal tool that makes it possible. The recruiter adds a role and its job description, adds each candidate with their CV and any interview notes, and triggers an AI evaluation. The AI reads all the inputs, assesses the gap between what the role required and what the candidate demonstrated, cites specific evidence from the documents, and drafts a rejection email in plain language. The recruiter reads the draft, edits it freely, approves it, and sends it. The email that arrives in the candidate's inbox is specific to them — it names what was strong, names what was missing, and says why, without euphemism or filler.

---

## What it does not solve

Closure handles the recruiter-to-candidate communication stage: where the recruiter owns the relationship and has the information needed to give honest feedback. It does not help with the post-client-meeting stage, where a candidate has met the hiring manager and the recruiter is now waiting on feedback from someone else. That is a different and harder problem — one of internal process and client management, not tooling. Closure does not touch it.

---

## How it works

Each evaluation draws on up to four inputs:

1. **Job description** — the full brief for the role, added once when the role is created
2. **CV** — uploaded as PDF or plain text when the candidate is added
3. **Interview transcript** — optional; Teams and Zoom exports work
4. **Recruiter notes** — anything observed during the interview that isn't in the transcript

The AI reads all four and produces three outputs:

- **Assessment** — a plain-language account of the gap between the role requirements and the candidate's demonstrated background. Not a performance review; a specific explanation of the mismatch.
- **Evidence statement** — the specific moments or details from the CV and transcript that informed the assessment. This is what makes the feedback credible rather than generic.
- **Draft email** — written from the evidence. It does not use phrases like "we've decided to move forward with other candidates" or "we wish you well in your search." It names what the role needed, what was strong, and what the gap was.

The recruiter reads the draft, edits it, and clicks send. Nothing goes out without human approval.

---

## Greenhouse integration

If your firm runs on Greenhouse, Closure connects via webhook so candidates flow in automatically on rejection — no manual data entry.

When a candidate is rejected in Greenhouse, the webhook fires and Closure automatically:

- Fetches the candidate's name, email address, and CV from the Harvest API
- Fetches the job title and description from the Harvest API
- Fetches recruiter notes from the application activity feed
- Downloads the CV file immediately to its own storage (Greenhouse attachment URLs expire after 7 days — Closure downloads on receipt so the file is always available for evaluation)
- Creates the role and candidate records, setting status to pending review

**To connect:**

1. In Closure, go to **Settings → Greenhouse integration**. Copy the webhook endpoint URL shown there.
2. In Greenhouse: **Settings → Dev Center → Web Hooks → Create webhook**. Set the trigger to **Candidate/Prospect Rejected**. Paste the endpoint URL as the endpoint. Enter a secret key and paste the same value into the **Webhook secret key** field in Closure's settings.
3. In Greenhouse: **Settings → Dev Center → Harvest API Keys**. Create a key with read access. Paste it into the **Harvest API key** field in Closure's settings and save.

From this point, any candidate rejected in Greenhouse will appear in Closure as pending review, with all available documents attached.

---

## Email delivery

Closure supports two delivery paths:

**Gmail or Outlook via MCP** — the email sends from the recruiter's own address, using their authenticated session. It appears in the recruiter's sent folder. This is the recommended option for agencies where the recruiter relationship matters. Configure in **Settings → Email delivery**, then ensure the MCP connector is authenticated separately.

**Resend** — a transactional email API. Useful if MCP is not configured or as a fallback. Emails send from a verified sender address set in the `RESEND_FROM_EMAIL` environment variable. If Gmail or Outlook MCP is selected but authentication fails at send time, Closure falls back to Resend automatically.

The active provider is configured in **Settings → Email delivery**.

---

## Stack

- **Next.js 16** (App Router) — server components for data fetching, API routes for all writes, single deploy unit. Hosted on Vercel.
- **Supabase** — managed Postgres for structured data, Storage for CV and transcript files. Chosen for the service role client pattern, which keeps all database access server-side, and for EU region hosting.
- **Anthropic Claude API** (`claude-sonnet-4-5`) — evaluation generation. Chosen for reliable instruction-following on structured JSON output and for the availability of a Data Processing Agreement.
- **Resend** — transactional email fallback. Send-only API key; no inbound or list management surface.

The storage layer (`uploadFile`, `deleteFile`, `downloadFile` in `lib/upload.ts`) and the email layer (`sendEmail` in `lib/email.ts`) are each behind a single interface. Swapping the underlying provider — different storage backend, different email API — means changing one file.

---

## Self-hosting

**Prerequisites:** Node.js 18+, a Supabase project, a Vercel account, an Anthropic API key.

**1. Clone and install**

```bash
git clone https://github.com/closurehq/Recruiter_Candidate_Response.git
cd Recruiter_Candidate_Response
npm install
```

**2. Configure environment variables**

Copy the example file and fill in values:

```bash
cp .env.local.example .env.local
```

| Variable | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Supabase service role key (server-side only) |
| `ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `ADMIN_SECRET` | Yes | Any strong random string — used to authenticate the UI |
| `RESEND_API_KEY` | If using Resend | Resend send-only API key |
| `RESEND_FROM_EMAIL` | If using Resend | Verified sender address |
| `CRON_SECRET` | If deploying to Vercel | Authenticates the daily purge cron |
| `GREENHOUSE_WEBHOOK_SECRET` | If using Greenhouse | HMAC secret for webhook validation |

**3. Run the schema**

In your Supabase project, open the SQL editor and run the migration files from `supabase/migrations/` in filename order.

**4. Create the storage bucket**

In your Supabase project, go to **Storage** and create a bucket named `candidate-files`. Set it to **private** — no public access.

**5. Deploy to Vercel**

```bash
npx vercel
```

Add all environment variables from step 2 to the Vercel project settings, then redeploy:

```bash
npx vercel --prod
```

**6. Sign in**

Navigate to your deployment URL. Enter the value you set for `ADMIN_SECRET`. This is stored in your browser's `localStorage` and sent as a header with every API request.

The daily purge cron (`GET /api/cron/purge`, 02:00 UTC) requires Vercel Cron, which is available on paid plans.

---

## GDPR

**What personal data is stored:** candidate name, email address, CV text and file, interview transcript text and file, recruiter notes, AI-generated evaluation and evidence statement, draft and final rejection message, audit log entries.

**Retention:** all candidate data is hard-deleted 90 days after the candidate record is created. This includes database rows and storage files. The deletion is automated via the daily purge cron and requires no manual intervention.

**Third parties who receive personal data:**

| Party | Data shared | Basis |
|---|---|---|
| Anthropic | CV text, transcript text, recruiter notes, job description | Evaluation generation. Covered by Anthropic's Data Processing Agreement at [anthropic.com/legal/dpa](https://www.anthropic.com/legal/dpa). Data is not used for model training under the DPA. |
| Resend | Candidate email address, email body | Delivery of the rejection email, if Resend is the configured provider. |
| Greenhouse | None sent — data is fetched from Greenhouse, not transmitted to it | N/A |

**Roles:** the recruiter or agency operating this tool is the data controller. This software is the processor. If you are processing candidate personal data through this tool, you need a lawful basis (legitimate interest in running a fair recruitment process is the most commonly applicable basis for post-interview rejection communication). A data processing agreement should be in place with any third parties listed above.

This is not legal advice. If you are unsure of your obligations under UK GDPR, GDPR, or equivalent legislation, speak to a data protection professional.

---

## Contributing

Pull requests are welcome. Areas where contributions would be most useful:

- **ATS connectors** — Lever, Teamtailor, Recruitee, Workable. The Greenhouse integration in `app/api/webhooks/greenhouse/route.ts` is the reference implementation.
- **Email MCP connectors** — additional providers beyond Gmail and Outlook.
- **Multi-user support** — the current auth model is a single shared secret. An org layer with individual accounts and role-based access would make this usable by larger teams.

Please open an issue before starting significant work so the approach can be discussed first.

---

## Licence

MIT
