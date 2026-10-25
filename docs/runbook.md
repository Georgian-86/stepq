# StepQ pre-launch site — runbook

How the pieces are hosted, how to deploy them, and how to run the site day to day.

## Where things run

| Part | Where | Deploys |
|---|---|---|
| Website (`apps/web`, Next.js) | Vercel project `stepq` (team golus-projects) | Automatically on every push to the connected branch |
| Callable Functions, mail trigger (`functions/`) | Firebase project | `Deploy backend` GitHub Action (manual) |
| Firestore rules + indexes, Storage rules | Firebase project | Same action |

Firebase projects (`.firebaserc`): `staging` → `stepq-staging-43f0d`. A production project gets its own alias (`production`) when it exists.

## One-time setup: Firebase project

1. **Blaze plan** with a working billing account (Settings → Usage and billing). Set a budget alert.
2. **Firestore**: Build → Firestore Database → Create, `(default)`, location `asia-south1`, production mode.
3. **Storage**: Build → Storage → Get started, location `asia-south1`, production mode.
4. **Web app**: Project settings → General → Your apps → `</>`, nickname `web`. Copy the config values into Vercel (below).
5. **App Check**: Build → App Check → register the web app with **reCAPTCHA Enterprise**. Domains: `vercel.app` (preview) and `stepq.in`. Copy the site key into Vercel. Do not turn on "Enforce" for Firestore reads of `public/*` until the site is live with App Check.
6. **Deploy key for GitHub**: Google Cloud → IAM → Service accounts → create `github-deployer` with roles *Editor*, *Service Account User* and *Secret Manager Admin* (staging; use narrower roles in production). Keys → Add key → JSON. Save the whole JSON as the GitHub repository secret `FIREBASE_SA_STAGING` (`FIREBASE_SA_PROD` for production). Never paste it anywhere else.
7. **Signed résumé links**: give the Functions runtime service account (`<project-number>-compute@developer.gserviceaccount.com`) the role *Service Account Token Creator* on itself, so it can sign the 7-day résumé URLs in team-application emails.

## Website environment (Vercel → stepq → Settings → Environment Variables)

| Variable | Preview mode (no backend) | Connected to Firebase |
|---|---|---|
| `ENABLE_EXPERIMENTAL_COREPACK` | `1` | `1` |
| `NEXT_PUBLIC_PREVIEW_MODE` | `1` | remove it |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | — | from the web app config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | — | from the web app config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | — | e.g. `stepq-staging-43f0d` |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | — | from the web app config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | — | from the web app config |
| `NEXT_PUBLIC_RECAPTCHA_KEY` | — | App Check site key |

`NEXT_PUBLIC_*` values are baked in at build time: redeploy after changing them.

## Functions configuration

Non-secret parameters live in `functions/.env.<project-id>` (committed for staging):
`MAIL_FROM`, `FOUNDER_INBOX`, `SITE_URL` (the site's public URL, used in Approve/Verify links), `AMBASSADOR_KIT_URL`, `MAIL_TRANSPORT` (`outbox` = queue mail in Firestore without sending; empty = send through Resend).

Secrets (Secret Manager), created by the deploy action if missing:

- `ACTION_SIGNING_SECRET` — 32 random bytes, generated once. Rotating it invalidates every outstanding Approve/Verify/reserve link.
- `RESEND_API_KEY` — from the GitHub secret `RESEND_API_KEY`; a placeholder is stored while staging runs in outbox mode.

## Sending real email (Resend)

1. Create a Resend account, add the domain `stepq.in`, and add the DNS records it shows (SPF, DKIM, and the return-path MX/TXT) at the domain registrar. Wait until Resend marks the domain verified.
2. Create an API key (sending access only) and save it as the GitHub secret `RESEND_API_KEY`.
3. Set `MAIL_FROM` to the confirmed sender address and `MAIL_TRANSPORT=` (empty) in the project's `functions/.env.<project-id>`, commit, and run the deploy action.

## Deploying the backend

GitHub → Actions → **Deploy backend** → Run workflow → choose `staging` or `production`.
Production first runs `pnpm check:launch`, which fails while client content is missing (privacy policy, job descriptions, T&C, social links, real sender address…). Fix the listed items or pass the accepted gaps with `--allow`. `recaptchaKey` always reads "unknown" (the check looks for `apps/web/apphosting.yaml`, but the site runs on Vercel): confirm `NEXT_PUBLIC_RECAPTCHA_KEY` in the Vercel settings and allow it.

## Smoke test after a deploy

On the deployed site, with an inbox you control:

1. Join the waitlist → the live count goes up → reserve a username.
2. Join the team with a small PDF résumé.
3. Fund: pick ₹101, tap Pay, then "I've paid" (no real payment needed for the test).
4. Apply as an ambassador.
5. Send a founder message.
6. In Firestore, check one document each in `waitlist`, `usernames`, `teamApplications`, `backings`, `ambassadorApplications`, `founderMessages`, and the `mail` queue entries (`status: sent`, or queued in outbox mode).
7. Open the Approve link from the ambassador alert and the Verify link from the backing alert, confirm both, and check the backer appears on the home page wall.
8. Delete the test documents afterwards.

## Day to day

- **Verify a backing**: open the "Verify" link in the backing alert email, check the amount and reference against the UPI app, then press **Confirm**. The backer's name joins the wall if they opted in.
- **Approve an ambassador**: open the "Approve" link in the application email and press **Confirm**. The applicant gets the approval email.
- Links are single-use in effect (confirming twice does nothing) and expire after 30 days.
