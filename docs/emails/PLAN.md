# StepQ member emails: what to send, and when

Status: templates built in `packages/emails` (React Email, already wired to Resend in
`apps/web/src/server/mail.ts`). Triggers, the preferences table and the unsubscribe page are
**not built yet**: this doc is the spec for them. Nothing here sends mail or touches data.

## 1. What the research says

| Finding | Source | What it means for StepQ |
|---|---|---|
| Welcome emails are opened far more than any other email (roughly 4x a normal campaign) and should go out immediately. | [Constant Contact 2026](https://community.constantcontact.com/empowerment-hub/post/welcome-email-benchmarks-why-they-get-4x-the-opens-2026-data-PFyIToDw7b0vVX7), [Stripo](https://research.stripo.email/welcome-email-open-rates) | Send Welcome within 5 minutes and make it do real work: the 3 setup steps. |
| Strava's onboarding is 4 emails: welcome (day 0), features (day 2), get the app (day 7), record an activity (day 18). | [Sequenzy: Strava](https://www.sequenzy.com/email-examples/brands/strava) | Our onboarding is shorter because the app does the onboarding: 1 welcome + 2 *conditional* nudges (day 1, day 3) that skip if the member already did the thing. |
| Top subscription apps earn 13.2% of revenue from email vs 4.3% median; the gap is lifecycle flows, not just a sign-up confirmation. Dunning: day 1, 3, 7 then stop. Win-back at 30/60/90 days then suppress. | [Adapty: 5 emails every subscription app should send](https://adapty.io/blog/subscription-app-email-sequences/) | Pro gets welcome, renewal reminder (yearly), billing issue (day 0/3/7) and ended. Win-back for lapsed walkers at day 14 and 30, then stop. |
| Gmail/Yahoo bulk-sender rules (5,000+/day): SPF **and** DKIM, DMARC (p=none minimum, aligned From), one-click unsubscribe (RFC 8058) for marketing mail only, honour unsubscribes within 48 h, spam rate under 0.1% and never 0.3%. | [Gmail sender guidelines FAQ](https://support.google.com/a/answer/14229414) | Lifecycle mail needs `List-Unsubscribe` + `List-Unsubscribe-Post` headers. Transactional mail is exempt. Set up DMARC before launch. |
| DPDP Act 2023 s.9(3) forbids tracking, behavioural monitoring and targeted advertising directed at children (under 18); DPDP Rules 2025 were notified in Nov 2025. | [PIB: DPDP Rules 2025](https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf), [LiveLaw](https://www.livelaw.in/amp/top-stories/digital-personal-data-protection-rules-2025-notified-309928) | Under-18 members get **account email only**. No nudges, summaries or win-backs. (Worth confirming with your lawyer; this is the cautious reading.) |

Product-manager view: the job of email at StepQ is **not** daily engagement (push does that, in
the moment). Email does three jobs push can't: (1) things that must be on record (security,
consent, billing, deletion), (2) reaching people who turned push off or stopped opening the app,
and (3) a weekly "mirror" that makes progress feel real. Everything else stays in push.

## 2. Rules every email follows

1. **Push first, email second.** Streak-at-risk, water reminders, QRun starting, likes and replies
   are push only. Email arrives the next morning or not at all.
2. **Frequency cap** for lifecycle mail: at most 1 a day and 3 a week per member. Transactional
   mail doesn't count and is never held back.
3. **Send times (IST):** summaries 8:00 am Monday; nudges 6:30 pm (after work, before the evening
   walk); never 10 pm to 7 am.
4. **Skip if already done.** Every nudge re-checks its condition at send time (e.g. connectSteps
   is dropped if steps synced since it was queued).
5. **Under 18: account mail only** (the "Under 18" column below).
6. **Two kinds:**
   - *Transactional*: about the member's own account, plan or consent. Always sent. No
     unsubscribe link (the footer says why they got it).
   - *Lifecycle*: tips, summaries, social, results. Has a preference key, an unsubscribe link and
     a "choose which emails" link in the footer, and must carry one-click unsubscribe headers.
7. **Brand:** Leaf header, Deep buttons, Mint/Mango/Tomato callouts, Fredoka headings and Nunito
   body, Piko (happy, cheer or nudge). Pro emails use "Kadam Gold": night-green header with gold
   rule, PRO pill and gold buttons, matching the app's Pro look. Sign-off "Chalo, chalte hain."

## 3. The emails

20 member emails. Subjects are under 60 characters so they don't cut off on phones.

### Account and security

| Email | Subject (sample) | Type | Trigger | When | Skip if | Under 18 | Preview |
|---|---|---|---|---|---|---|---|
| `authConfirmSignup` | Confirm your email for StepQ | Transactional · sent by Supabase | Sign-up with email and password (Supabase Auth "Confirm signup") | Immediately | Signed up with Google or Apple (already verified) | Yes | [view](previews/authConfirmSignup.png) |
| `authResetPassword` | Reset your StepQ password | Transactional · sent by Supabase | A03 Forgot password (Supabase Auth "Reset password") | Immediately | — | Yes | [view](previews/authResetPassword.png) |
| `authEmailChange` | Confirm your new email for StepQ | Transactional · sent by Supabase | Member changes their email (Supabase Auth "Change email address") | Immediately, to the new address | — | Yes | [view](previews/authEmailChange.png) |
| `passwordChanged` | Your StepQ password was changed | Transactional | auth.users.encrypted_password changes (or Supabase "Password changed" notification) | Immediately | — | Yes | [view](previews/passwordChanged.png) |
| `accountDeleted` | Your StepQ account has been deleted | Transactional | app.delete_my_account() writes app.deleted_accounts | Immediately (email is read from app.deleted_accounts, the profile is gone) | — | Yes | [view](previews/accountDeleted.png) |
| `parentConsentReminder` | Reminder: Aarav is waiting for your answer | Transactional | app.parental_consents still pending | Once, 4 days after the first request (3 days left) | Parent already answered; Account deleted | Yes | [view](previews/parentConsentReminder.png) |
| `parentConsentGranted` | Thank you. Aarav can now use StepQ | Transactional | Parent grants consent on stepq.in/parent-consent | Immediately, to the parent (a record of their consent) | — | Yes | [view](previews/parentConsentGranted.png) |

### Onboarding

| Email | Subject (sample) | Type | Trigger | When | Skip if | Under 18 | Preview |
|---|---|---|---|---|---|---|---|
| `welcome` | Welcome to StepQ, Riya! | Transactional | Profile created (A11 All set) and email confirmed | Immediately (within 5 minutes) | Under 18 and parent consent still pending (send after consent) | Yes | [view](previews/welcome.png) |
| `connectSteps` | Piko can’t see your steps yet | Lifecycle (`tips`) | No app.daily_steps rows 24 h after sign-up | Day 1, 6:30 pm IST | Any steps synced; Under 18 | No | [view](previews/connectSteps.png) |
| `findFriends` | Walking is better with friends | Lifecycle (`tips`) | No accepted app.friendships 3 days after sign-up | Day 3, 6:30 pm IST | Has a friend or a pending request; Under 18 | No | [view](previews/findFriends.png) |

### Engagement

| Email | Subject (sample) | Type | Trigger | When | Skip if | Under 18 | Preview |
|---|---|---|---|---|---|---|---|
| `weeklySummary` | Riya, you walked 61,240 steps last week | Lifecycle (`weekly`) | Weekly cron over last Monday–Sunday (IST) of app.daily_steps | Monday 8:00 am IST | Zero steps last week (send winBack instead); Signed up less than 5 days ago; Under 18 | No | [view](previews/weeklySummary.png) |
| `milestone` | 30-day streak! 🎉 | Lifecycle (`milestones`) | First 10K day; streak hits 7, 30, 100, 365; lifetime steps hit 1 lakh, 10 lakh, 1 crore | Next morning, 8:00 am IST (push goes out at the moment) | Another milestone mail in the last 3 days; Under 18 | No | [view](previews/milestone.png) |
| `friendRequest` | Kabir Mehta wants to walk with you on StepQ | Lifecycle (`social`) | app.friendships pending for 24 h and addressee has not opened the app | At most one a day (a digest, not one per request) | Request accepted or declined; Opened the app since; Under 18 | No | [view](previews/friendRequest.png) |
| `challengeResult` | You won in November Monsoon Walk! | Lifecycle (`challenges`) | A challenge the member joined (app.challenge_entries) closes | Morning after it closes, 9:00 am IST. Winners always get it (reward claim is transactional) | Under 18 (unless they won: then send as transactional) | No | [view](previews/challengeResult.png) |
| `winBack` | Piko misses you, Riya | Lifecycle (`tips`) | No steps synced and no app open for 14 days | Day 14 and day 30 of inactivity, 6:30 pm IST. Then stop | Came back; Already got 2 win-backs this lapse; Under 18 | No | [view](previews/winBack.png) |

### StepQ Pro

| Email | Subject (sample) | Type | Trigger | When | Skip if | Under 18 | Preview |
|---|---|---|---|---|---|---|---|
| `welcomePro` | Welcome to StepQ Pro, Riya 👑 | Transactional | app.profiles.plan changes free → pro (App Store purchase or admin grant) | Immediately | Plan was Pro in the last 30 days (a renewal after a lapse: no repeat welcome) | Yes | [view](previews/welcomePro.png) |
| `proRenewalReminder` | Your StepQ Pro renews on 28 Nov 2027 | Transactional | Yearly app.store_subscriptions with auto_renew = true | 7 days before expires_at, 10:00 am IST | Monthly plan (Apple already notifies); auto_renew = false | Yes | [view](previews/proRenewalReminder.png) |
| `proBillingIssue` | Action needed: we couldn’t renew your StepQ Pro | Transactional | App Store Server Notification DID_FAIL_TO_RENEW (appstore-notifications function) | Day 0, then day 3 and day 7 if still failing. Then stop | Renewal recovered (DID_RENEW) | Yes | [view](previews/proBillingIssue.png) |
| `proEnded` | Your StepQ Pro has ended | Transactional | app.profiles.plan changes pro → free (EXPIRED, REFUND, REVOKE or admin) | Immediately | Account deleted | Yes | [view](previews/proEnded.png) |
| `qrunHostApproved` | You can now host QRuns on StepQ | Transactional | Admin sets app.profiles.qrun_host = true | Immediately | — | Yes | [view](previews/qrunHostApproved.png) |

The 7 existing website emails (waitlist reserve link, parent consent request, ambassador and team
alerts, founder message, backing alert, ambassador approved) are unchanged.

### Considered and left out

| Email | Why not |
|---|---|
| Streak at risk / goal reminder | Time-critical: push at 7 pm works, an email is too late and too frequent. |
| Every like, reply, water reminder | Push and the in-app inbox. As email it would break the frequency cap and feel spammy. |
| Payment receipt / invoice | Apple sends the receipt for App Store purchases. Add one when Android or web payments exist. |
| New sign-in from a new device | Supabase doesn't expose sign-in events cheaply yet; revisit with Supabase auth hooks. |
| Data export ready | Export is instant in the app today. |
| Monthly newsletter / product updates | Marketing. Add later as its own `news` preference, opt-in, adults only. |

## 4. Preferences and unsubscribe (to build)

Proposed table `app.email_preferences` (one row per member, RLS: owner reads/writes, admins read):

| Column | Default | Controls |
|---|---|---|
| `tips` | on | connectSteps, findFriends, winBack |
| `weekly` | on | weeklySummary |
| `milestones` | on | milestone |
| `social` | on | friendRequest |
| `challenges` | on | challengeResult (winners always get it) |
| `unsubscribed_all_at` | null | Set by the one-click unsubscribe; stops every lifecycle email |

Under-18 rows are forced off by a check, not by the sender remembering.

`unsubscribeUrl` and `preferencesUrl` should be signed tokens (HMAC of user id + key), so the
link works without logging in. One-click unsubscribe: a `POST /api/email/unsubscribe` that the
`List-Unsubscribe-Post: List-Unsubscribe=One-Click` header points to. The app's Profile →
Notifications screen should show the same switches.

## 5. Plugging in Resend

1. **Domain:** add `stepq.in` (or a subdomain such as `mail.stepq.in` to protect the main
   domain's reputation) in Resend, add its SPF, DKIM and a DMARC record (`p=none` to start, with
   reports). Use separate From addresses: `StepQ <hello@…>` for lifecycle,
   `StepQ <account@…>` for transactional.
2. **Supabase Auth emails:** Supabase → Authentication → SMTP: host `smtp.resend.com`, port 465,
   user `resend`, password = a Resend API key. Then paste
   `packages/emails/supabase-auth/*.html` into Email Templates (regenerate with
   `pnpm --filter @stepq/emails export:supabase`).
3. **Everything else:** `render(name, props, { siteUrl })` from `@stepq/emails` returns
   `{ subject, html, text }`. The website already queues and sends through Resend
   (`queueMail` → `deliverPendingMail`). For lifecycle mail, add the headers:
   ```
   List-Unsubscribe: <https://stepq.in/api/email/unsubscribe?t=…>, <mailto:unsubscribe@stepq.in>
   List-Unsubscribe-Post: List-Unsubscribe=One-Click
   ```
   and a Resend tag per template (`tags: [{ name: 'template', value: name }]`) for per-email stats.
4. **Triggers:** app events live in Supabase (`app` schema). Suggested: database triggers insert
   into a mail queue for the instant ones (welcomePro, proEnded, accountDeleted, qrunHostApproved,
   parentConsentGranted); `pg_cron` jobs for the scheduled ones (weekly summary Monday 8 am IST,
   day-1/day-3 nudges, win-back, renewal reminders); the `appstore-notifications` Edge Function
   for `DID_FAIL_TO_RENEW`. The `catalog` export in `@stepq/emails` has the trigger, timing and
   skip rules for each, in code.
5. **Test first:** send every template to your own inbox in Gmail, Outlook and Apple Mail (dark
   mode too) using the samples: `pnpm --filter @stepq/emails export:html` writes them to
   `packages/emails/out/`.

## 6. Roll-out and what to measure

| Phase | Emails | Measure |
|---|---|---|
| 1 (launch) | Supabase auth 3, welcome, passwordChanged, accountDeleted, parent consent 2, Pro 4, qrunHostApproved | Delivery rate, bounces, spam complaints (<0.1%) |
| 2 (after preferences exist) | connectSteps, findFriends, weeklySummary | Day-7 activation (steps synced + 1 friend), weekly open rate, unsubscribe rate (<0.5% per send) |
| 3 | milestone, friendRequest, challengeResult, winBack | Day-30 retention of emailed vs held-out group (keep 10% as control) |

## 7. Before sending anything for real

- [ ] Add a registered business/postal address to the footer (Gmail/CAN-SPAM best practice for
      lifecycle mail).
- [ ] Confirm the under-18 rule and the 180-day retention wording with your lawyer.
- [ ] Replace the sample `https://stepq.in/app/...` links with your real deep links
      (App Links / Universal Links).
- [ ] Check the sign-off ("Team StepQ") and copy tone.
