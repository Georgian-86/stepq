# StepQ pre-launch site — runbook

How the site is hosted, how to configure it, and how to run it day to day.

## Where things run

| Part | Where |
|---|---|
| Website and API (`apps/web`, Next.js; API routes under `src/app/api`) | Vercel project `stepq` (team golus-projects), functions in Mumbai (`bom1`). Deploys on every push. |
| Database | Supabase project `koagkmedvsplbgmltehk` (Mumbai), schema `stepq` |
| Email | Sent by the API after each request, through SMTP (or Resend) |

`functions/` (the earlier Firebase backend) is no longer deployed; it is kept for reference.

## Database (Supabase)

The tables are created automatically on the first request (`apps/web/src/server/schema.ts`; the
same SQL can be pasted into Supabase → SQL editor). They live in the `stepq` schema, which the
Supabase REST API does not expose, with row-level security on and no policies, so only the
server's own connection can read them. See them in Supabase → Table Editor → schema `stepq`:

| Table | What |
|---|---|
| `waitlist` | Everyone who joined, their position and reserved username |
| `team_applications` | Join-the-team applications, résumé PDF included |
| `ambassador_applications` | Ambassador applications (`status` pending / approved) |
| `backings` | Fund StepQ backings (`status` pending / verified, `wall_name` when on the wall) |
| `founder_messages` | Connect-with-the-founder messages |
| `mail` | Every email sent or waiting (`status` queued / sent / failed, `last_error`) |
| `stats` | The live waitlist count |
| `rate_limits`, `requests`, `chunks` | Internal (abuse limits, retry safety, large uploads) |

## Website environment (Vercel → stepq → Settings → Environment Variables)

| Variable | Value |
|---|---|
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` |
| `DATABASE_URL` (**Sensitive**) | Supabase → Connect → **Transaction pooler**: `postgresql://postgres.koagkmedvsplbgmltehk:<password>@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`. The direct `db.…supabase.co` host is IPv6-only and does not work from Vercel. If the password has `@ : / ? #` in it, URL-encode it. |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` (**Sensitive**) | The mailbox `connect@stepq.in`'s SMTP settings, e.g. Google Workspace `smtp.gmail.com` / `465` / `connect@stepq.in` / an app password; Zoho `smtp.zoho.in` / `465`; Hostinger `smtp.hostinger.com` / `465`. |
| `RESEND_API_KEY` (optional, **Sensitive**) | Instead of SMTP: a Resend key for the verified domain `stepq.in`. |
| `SITE_URL` (optional) | Public URL used in emailed links. Default `https://stepq.in`. |
| `MAIL_FROM`, `FOUNDER_INBOX` (optional) | Defaults `StepQ <connect@stepq.in>` and `connect@stepq.in`. |
| `ACTION_SIGNING_SECRET` (optional, **Sensitive**) | Signs the emailed Approve / Verify / reserve / résumé links. Default: derived from `DATABASE_URL`. Changing it (or the database password) voids links already sent. |
| `AMBASSADOR_KIT_URL` (optional) | Link in the ambassador approval email. |
| `NEXT_PUBLIC_PREVIEW_MODE` | **Remove** for the live site. `1` = demo build with no backend (banner, noindex). |

Changes apply to new deployments: redeploy after editing (Deployments → ⋯ → Redeploy).

Without SMTP or Resend set, emails wait in the `mail` table (`queued`) and go out after the next
form submission once a transport is configured.

## Domain

Vercel → stepq → Settings → Domains → add `stepq.in` and `www.stepq.in`, then at the registrar:
`A  @  76.76.21.21` and `CNAME  www  cname.vercel-dns.com` (use the exact values Vercel shows).

## Smoke test after a deploy

On the live site, with an inbox you control:

1. Join the waitlist → the live count goes up → reserve a username.
2. Join the team with a small PDF résumé → the alert in connect@stepq.in has a working résumé link.
3. Fund: pick ₹101, tap Pay, then "I've paid" (no real payment needed for the test).
4. Apply as an ambassador.
5. Send a founder message.
6. In Supabase → Table Editor (schema `stepq`), check one row in each table and that `mail` rows read `sent`.
7. Open the Approve link from the ambassador alert and the Verify link from the backing alert, confirm both, and check the backer appears on the home page wall.
8. Delete the test rows afterwards.

## Day to day

- **Verify a backing**: open the "Verify" link in the backing alert email, check the amount and reference against the UPI app, then press **Confirm**. The backer's name joins the wall if they opted in.
- **Approve an ambassador**: open the "Approve" link in the application email and press **Confirm**. The applicant gets the approval email.
- Links are single-use in effect (confirming twice does nothing) and expire after 30 days.
- **Export** any table as CSV from the Supabase Table Editor.

## Tests

- `pnpm test` — unit tests. Server tests need a Postgres: `TEST_DATABASE_URL=postgres://postgres:postgres@127.0.0.1:5432/stepq_test pnpm --filter web test`.
- `pnpm e2e` — Playwright against a production build and a local Postgres (`stepq_e2e`).
