# StepQ pre-launch website: design

Date: 2026-10-23 · Agency: Arovas · Client: Bhakti Parmar
Figma: file `ALlGHGf0uFKj8bqXaoZnK1`, page "Website & Admin" (`1:5`), section "W1 · Website before launch" (`9:83`).

## 1. Intent

StepQ is a walking app for India. Before the Android and iOS apps ship, stepq.in is a pre-launch site whose job is to **collect people and support**: waitlist signups, reserved usernames, intern applications, ambassador applications, UPI backers and messages to the founder.

It goes to production when finished, so **every flow must really work** (save data, send emails) and every feature is tested before launch. This is not a mock-up.

The site is the first piece of a larger system. The Android and iOS apps (Expo) come later and must reuse the same backend and shared code. Decisions here should make that easy, not just make the website work.

## 2. Goals, non-goals, anti-goals

**Goals**
- A pixel-faithful replica of the W1 Figma frames at desktop width (1440), with sensible responsive behaviour down to 360 px phones (Figma has desktop frames only, plus M01 for phone UPI).
- Every form works end to end, with validation, spam protection and the emails described below.
- A live, real waitlist count.
- UX enhancement through motion and interaction feedback (section 7), never changing the designed layout, copy or colours.
- Automated tests that cover every flow, and a visual comparison against the Figma frames.

**Non-goals (this phase)**
- The admin dashboard. It comes with the after-launch version (W12–W15, E02).
- After-launch pages: W12 Home · After launch, W13/W14 Collaborate, E02.
- The mobile apps themselves. Only the shared foundations they will reuse.
- Hindi or regional languages (add-on B6).

**Anti-goals (failure even if it "works")**
- Any invented number, name or testimonial shown as real: the 12,480 count, "#12,481" and the backer chips (Aarav M. …) in Figma are **sample data**. Real values or nothing.
- A backer appearing on the wall before their payment is checked.
- Lost submissions: a user sees "sent" but nothing was stored or emailed.
- Animation that slows the page, distracts from the forms, or ignores reduced motion.
- Visual drift from Figma ("close enough" is a fail).

## 3. Stack (Arovas's call, approved by the user)

| Part | Choice |
|---|---|
| Repo | One monorepo in `stepq` (pnpm workspaces + Turborepo): `apps/web`, later `apps/mobile`; shared `packages/*` |
| Shared packages | `packages/tokens` (Figma variables → CSS variables + Tailwind theme + JS for React Native), `packages/brand` (Piko SVGs, wordmark), `packages/schemas` (zod schemas for every form, shared by web, Functions and later the app), `packages/emails` (React Email templates) |
| Website | Next.js (App Router) + TypeScript + Tailwind CSS, hosted on Firebase App Hosting at stepq.in |
| Backend | Firebase: Firestore, Cloud Functions (2nd gen, TypeScript, region `asia-south1`), Cloud Storage (résumés), App Check (reCAPTCHA Enterprise) |
| Email | Resend, sending from a verified stepq.in domain; templates in React Email |
| Motion | Motion (`motion/react`) |
| Tests | Vitest (units), Firebase Emulator Suite (Functions + security rules), Playwright (end-to-end at 1440 and 390 widths, visual comparison) |

Firebase plan: Blaze (pay-as-you-go) is required for Functions, App Hosting and outbound email calls.

## 4. Pages and flows (Figma node → route)

Shared: **Web nav / Before launch** (`9:16`), **Web footer** (`9:44`). Components: Button `4:116`, Field `4:135`, Chip `4:142`, Piko `4:265` (Happy / Cheer / Nudge).

| Figma | Route | Behaviour |
|---|---|---|
| W01 Home `9:85` | `/` | Hero, waitlist form, live count, How it works, Help build StepQ, early backers wall, Talk to the founder strip |
| W02 Reserve username `9:313` | modal over `/` | Opens after a successful waitlist join. Shows "You're on the list!" and the person's real position. Username field with live availability check. "Maybe later" closes it |
| W03 Username reserved `9:330` | modal over `/` | "@name is yours", invite link `stepq.in/join` (copy to clipboard), back to home |
| W04 Join the team `10:127` | `/join-the-team` | Four role cards (accordion; one open at a time) with a JD PDF download each; application form with a PDF résumé upload |
| W05 Application sent `10:268` | `/join-the-team/sent` | Confirmation with the applicant's first name |
| W06 Fund StepQ `10:337` | `/fund` | Steps 1-2-3, static UPI QR card, details form (name, contact number, amount chips or custom amount, "show my name on the sponsor wall") |
| W07 Pay with UPI `10:663` | modal on `/fund` (desktop) | QR for the chosen amount, UPI ID, "I've paid" → W08, Cancel |
| M01 Pay with UPI · Phone `10:668` | phone only | On Android, the Pay button opens a `upi://pay` link and the OS shows its own app chooser (this is what M01 depicts). On iOS, where there is no system chooser, show an M01-styled sheet with deep links for Google Pay, PhonePe, Paytm, BHIM and "Other UPI app" (generic `upi://`) |
| W08 Thank you for backing `10:709` | `/fund/thank-you` | Confirms the recorded amount |
| W09 Become an ambassador `10:778` | `/ambassadors` | What ambassadors do, eligibility box, application form, T&C checkbox (required) |
| W10 Ambassador T&C `10:912` | modal on `/ambassadors` | T&C text, back to the form |
| W11 Application received `10:918` | `/ambassadors/received` | Confirmation |
| W16 Connect with the founder `30:1321` | modal, opened from the home strip | Name, email, phone (optional), topic chips (Partnership, Investment, Feedback, Press, Other), message |
| W17 Message sent `30:1576` | modal | Confirmation |
| E01 Ambassador approved `10:989` | email | Sent to the applicant when approved (section 6) |
| E03 New message for the founder `30:1840` | email | Sent to connect@stepq.in on every W16 submission, Reply-To set to the sender |

Modals get their own URLs (for example `/?modal=founder`) so the back button closes them and they can be linked.

## 5. Data and backend

All writes go through Cloud Functions. The browser never writes to Firestore directly; security rules deny all client writes. Public reads are allowed only on `public/stats` and `public/backers`.

| Collection | Contents | Rules |
|---|---|---|
| `waitlist/{id}` | name, email (lower-cased), gender, ageGroup, position, username?, createdAt, source | One entry per email. A repeat email returns the existing position instead of creating a duplicate |
| `usernames/{name}` | waitlistId, createdAt | Lower-case, 3–20 characters, `a–z 0–9 . _`, no leading or trailing dot. Reserved in a transaction, so two people can never get the same name. A reserved-word list blocks names like `stepq`, `admin`, `piko`. One username per waitlist entry. These carry over to app accounts later |
| `teamApplications/{id}` | name, email, phone, role, résumé path, link?, whyStepQ, createdAt | Résumé: PDF only, ≤ 5 MB, stored privately in Cloud Storage |
| `ambassadorApplications/{id}` | name, email, phone, city, instagram, followers band, collegeOrCompany, plan, agreedToTerms, status (pending/approved), createdAt, approvedAt? | |
| `backings/{id}` | name, phone, amount, showOnWall, reference code, status (pending/verified), createdAt, verifiedAt? | Created when the person taps Pay ("We record each tap on Pay…") |
| `founderMessages/{id}` | name, email, phone?, topic, message, createdAt | |
| `public/stats` | waitlistCount | Updated by the server in the same transaction as each join |
| `public/backers` | list of first name + last initial for verified backers who opted in | |

The joining Function returns a short-lived signed token, and only that token can reserve a username for that entry, so nobody can reserve names for other people.

**UPI link.** Built from the given payload, `upi://pay?pa=bhakti0parmar1@oksbi&pn=bhakti%20parmar&aid=uGICAgIDdi9q2dQ`, plus `am` (amount), `cu=INR` and `tn` (a note carrying the backing's reference code, for example `StepQ ABCD12`), so the founder can match payments. The static QR on W06 (no amount) is generated from the base payload. The W07 QR includes the amount and note. Both are generated in code, not exported images.

**Spam and abuse.** App Check on every Function. A per-IP and per-email rate limit. A hidden honeypot field. Server-side validation with the shared zod schemas (the client validates with the same schemas).

## 6. Email

Sent through Resend from a stepq.in address. Templates match the E01 and E03 frames.

| Trigger | To | Content |
|---|---|---|
| Founder message (W16) | connect@stepq.in | E03, Reply-To = sender |
| Team application (W04) | connect@stepq.in | Plain branded notification with all fields and a time-limited link to the résumé (no Figma design; Arovas's call) |
| New ambassador application (W09) | connect@stepq.in | Notification with all fields and a one-click **Approve** link |
| Approve link clicked | applicant | E01 Ambassador approved; status → approved |
| New backing (W06 Pay tap) | connect@stepq.in | Notification with name, phone, amount, reference code and time, plus a one-click **Verify** link |
| Verify link clicked | backer, if open question Q1 adds an email field | status → verified; name added to `public/backers` if they opted in |

Approve and Verify links carry an HMAC-signed, single-use token. They open a small confirmation page ("Verify ₹501 from Riya S.? [Confirm]") so email link scanners can't trigger them with a plain GET.

## 7. UX enhancements (motion and interaction)

Sources: ui-ux-pro-max guidance (waitlist pattern, live-count, forms, reduced-motion, excessive-motion rules) and the Figma Piko component descriptions. Layout, copy and colours stay exactly as designed.

- **Piko.** In the hero, a gentle walk loop (body bob plus sneaker swing, about 1.2 s) that pauses when off-screen. On W02, W03, W05, W08, W11 and W17 he plays a single Cheer bounce. Mood follows the Figma rules: Happy for greetings and the hero, Cheer for success, Nudge for form errors.
- **Live waitlist count.** Updates in real time from Firestore. The number rolls to the new value. The pulsing dot stays next to "Live". Screen readers get a single polite status message ("12,481 people have joined the waitlist"), not every tick.
- **Chips** (gender, age, amount, topic, followers). Fill transition about 150 ms, real radio-group semantics, arrow-key navigation.
- **Fields.** The underline animates to deep green on focus (the Figma Focused state). Validation runs on blur. Errors use the Figma Error state (tomato underline, tomato-text helper) plus a focusable error summary after a failed submit.
- **Buttons.** Press scale 0.98, a spinner and disabled state while submitting, so there's no double submit.
- **Username availability.** Debounced check (400 ms) showing "Checking…", then ✓ Available or "Taken". The Reserve button label updates live ("Reserve @riya.walks").
- **Modals.** Fade plus 12 px rise on enter, faster exit. Focus trapped, Esc closes, focus returns to the trigger.
- **Sections.** Subtle fade and 12 px rise on scroll into view for the How it works and Help build cards (staggered 60 ms). Content is visible without JavaScript.
- **Role accordion.** Height animation with the chevron rotating.
- **UPI.** "Copy UPI ID" button with a "Copied" confirmation.
- **Reduced motion.** With `prefers-reduced-motion: reduce`, Piko is static, counts change instantly, and reveals are skipped.
- **Budget.** At most 1–2 moving things per view. Animate only transform and opacity. Reserve space for the count and Piko so nothing shifts (CLS < 0.1).

## 8. Responsive

Figma is desktop-only (1440). Arovas's call: same content and order, single column under 1024 px; the waitlist card stacks under the hero copy; 120 px side padding scales down to 20 px; hero type scales from 72 down to 44 px; nav links collapse into a menu sheet under 768 px. Touch targets are at least 44 px.

## 9. Quality bar and tests

- **Visual.** Playwright screenshots of every W1 frame at 1440, compared against the Figma frame exports (allowed difference ≤ 2% of pixels, excluding live data regions). Phone screenshots at 390 are reviewed by eye.
- **End to end** (against the Firebase emulators, with Resend mocked). Waitlist join → reserve username → taken-name error → duplicate-email path. Team application with a PDF upload, and wrong type or too-big file errors. Fund: amount chip and custom amount, the Pay record, the W07 QR content, Verify link → wall update. Ambassador: T&C required, Approve link → E01 sent. Founder message → E03 sent with Reply-To.
- **Rules tests.** Client writes are denied; only the two public docs are readable.
- **Units.** zod schemas, UPI link builder, username rules, token signing.
- **Accessibility.** axe checks on every page, keyboard-only pass through every flow, contrast check.
- **Performance.** Lighthouse on `/` (phone): Performance ≥ 90, CLS < 0.1.
- After deployment, a smoke test on the live site with real email to an Arovas inbox.

## 10. Assets

Piko (all moods), the wordmark and icons come from Figma as SVGs, used exactly as designed. **Blocker:** this environment's network currently refuses `www.figma.com`, so the SVG exports can't be downloaded. Allow that host in the environment's network settings (Allowed domains), or provide the exported SVGs (`piko-round-{happy,cheer,nudge}.svg` from the earlier chat) in the repo.

Fonts: Fredoka and Nunito, self-hosted with `next/font`.

## 10a. Arovas's calls on details not in Figma

- **Returning waitlist user.** A repeat email never gets a reserve token in the browser. The page says "You're already on the list (#N)", and a "Reserve your username" link is emailed to that address. The link proves they own the email and opens W02. This is the only extra email to users.
- **Live count.** Always the real number from `public/stats`. Space is reserved so nothing shifts. There is no threshold.
- **Backers wall.** The whole "Our early backers" card is hidden until at least one verified backer has opted in. No placeholder names.
- **`stepq.in/join`** (invite link on W03). Redirects to `/`, keeping `?ref=` and UTM parameters, which are stored in `waitlist.source`. No referral rewards (that is add-on B7).
- **Confirmation emails.** None beyond what is listed in section 6. The on-screen confirmations (W03, W05, W08, W11, W17) are the receipts.
- **No double opt-in.** App Check, rate limits and the honeypot handle spam.
- **Footer links to after-launch pages** (Collaborate, Press kit). Collaborate opens the W16 founder modal with topic "Partnership". Press kit is hidden until it exists.

## 11. Left to the builder

Folder structure; component breakdown; Tailwind config details; how Function endpoints are organised; test file layout; the exact easing curves within the limits above; CI setup (GitHub Actions running lint, typecheck, units, emulator tests and Playwright on every PR).

## 12. Open questions for the client

Q1–Q6 need answers from Bhakti or Arovas. The answers will be folded back into this document.

1. **Backer email (W06).** The page promises "a personal thank-you email", but the form has no email field. Add one, or change the copy?
2. **UPI to a personal ID.** Google Pay and PhonePe sometimes block or cap pay-links with a preset amount to personal IDs, and may drop the note used for matching. The QR code and the UPI ID shown on screen still work. Keep the personal ID and accept the risk, or move to a merchant UPI ID or Razorpay (which confirms payments automatically, for a fee of about 2%)? And is a backing a gift, with no rewards or refunds?
3. **Privacy policy.** The forms collect phone numbers, gender, age group and résumés, so India's data protection law (DPDP Act 2023) applies. Proposal: bring W15 Privacy policy forward into this phase. Who supplies the policy text?
4. **Missing content.** The four job-description PDFs, the ambassador eligibility criteria and T&C text, the "Open your ambassador kit" link in E01, and the Instagram, LinkedIn and YouTube URLs.
5. **Addresses.** Does a working connect@stepq.in mailbox exist? Which address do emails come from (the designs use the placeholder hello@stepq.in)?
6. **Accounts.** Who owns or creates the Firebase project (Blaze billing), the Resend account and DNS for stepq.in?
