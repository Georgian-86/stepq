# StepQ Pre-launch Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship stepq.in's pre-launch site (Figma W01–W11, W16–W17, E01, E03, plus W15 Privacy) as a pixel-faithful, fully working, tested Next.js + Firebase app in a monorepo that the Expo apps will later join.

**Architecture:** pnpm + Turborepo monorepo. `apps/web` (Next.js App Router, Tailwind) talks only to Firebase callable Functions in `functions/` (2nd gen, `asia-south1`, App Check enforced). Firestore holds all records; the browser reads only `public/stats` and `public/backers`. Mail is queued to a `mail` collection and delivered by a Firestore trigger through Resend, so a mail outage never loses a submission. Shared packages hold tokens, zod schemas + API types, UPI and username logic, brand SVGs and React Email templates.

**Tech Stack:** Node 22, pnpm 10, Turborepo, TypeScript 5 (strict), Next.js 15, React 19, Tailwind CSS 4, Motion (`motion/react`), Firebase JS SDK 11 + firebase-admin 13 + firebase-functions 6, zod 3, Resend + React Email, `qrcode`, `@fontsource/nunito` + `@fontsource/fredoka`, Vitest, Testing Library, `@firebase/rules-unit-testing`, Playwright, axe-core, Lighthouse CI.

**Spec:** `docs/superpowers/specs/2026-10-23-prelaunch-website-design.md` (read it before any task; section numbers below refer to it).

## Global Constraints

- Figma file key `ALlGHGf0uFKj8bqXaoZnK1`; each screen's node id is in spec §4. Implement from `get_design_context` for that node (load `figma:figma-design-to-code` first); the Figma screenshot is the visual target.
- Colours, radii, spacing, type styles: exactly the Figma variables in Task 2. No raw hex in components.
- Copy: verbatim from Figma, except sample data. **Never render** 12,480, #12,481, or the sample backer names — real data or nothing (spec §2 anti-goals).
- Brand/asset SVGs: exported from Figma, never redrawn or substituted (Task 4).
- All writes go through callable Functions with `enforceAppCheck: true`; Firestore/Storage rules deny every client write.
- Every form is validated with the same zod schema on client and server (`@stepq/schemas`).
- Functions region `asia-south1`. Secrets: `RESEND_API_KEY`, `ACTION_SIGNING_SECRET`. Params: `MAIL_FROM` (default `StepQ <hello@stepq.in>`), `FOUNDER_INBOX` (default `connect@stepq.in`), `SITE_URL` (default `https://stepq.in`), `AMBASSADOR_KIT_URL` (default empty).
- UPI base payload, verbatim: `upi://pay?pa=bhakti0parmar1@oksbi&pn=bhakti%20parmar&aid=uGICAgIDdi9q2dQ`.
- Motion: only transform/opacity; ≤ 2 moving things per view; everything honours `prefers-reduced-motion: reduce` (spec §7).
- Breakpoints: single column < 1024 px, nav menu sheet < 768 px, side padding 120 → 20 px, hero 72 → 44 px, targets ≥ 44 px (spec §8).
- Open client questions Q1–Q6 never block a task: unknown content lives in `apps/web/src/content/site.ts` or a Functions param, defaults match Figma, and `pnpm check:launch` (Task 19) lists what is still empty. Q1 default: no email field on W06; Verify sends no email. Q2 default: personal UPI ID as given.
- Commit after every task with a conventional message; CI must be green before the next task starts.

## Review Focus

1. **Double submit** (double tap on Join / Pay / Submit, or a retried request) → exactly one record. Owned by Tasks 8–11: every write callable takes `requestId: string (uuid)` and is idempotent on it; tests call twice with one id and assert one doc.
2. **Email casing and whitespace** (`" Riya@Gmail.com "` after `riya@gmail.com`) → treated as the same person. Task 3 normalises; Task 8 test joins twice with both forms and asserts `status: 'existing'` and the same position.
3. **Indian phone formats** (`+91 98765 43210`, `098765-43210`, `9876543210`) → all accepted and stored as `+919876543210`; `12345` rejected with the field error. Task 3 test table.
4. **Two people reserving the same username at once** → one gets it, the other sees "Taken". Task 8 test fires two `reserveUsername` calls concurrently via `Promise.all`.
5. **Resend down or slow** → user still sees success; mail is retried. Task 6 test: transport throws once, trigger retries, doc ends `status: 'sent'`; Task 8 test: join succeeds while transport is failing.

---

## File Structure

```
package.json · pnpm-workspace.yaml · turbo.json · tsconfig.base.json · eslint.config.mjs · .prettierrc
firebase.json · .firebaserc · firestore.rules · firestore.indexes.json · storage.rules
.github/workflows/ci.yml · .github/workflows/deploy.yml
scripts/check-launch.ts
packages/tokens/      src/tokens.ts (values) · src/css.ts (CSS vars) · tailwind.css (@theme) · src/index.ts
packages/schemas/     src/{fields,waitlist,username,team,ambassador,backing,founder,actions,api}.ts · src/index.ts
packages/core/        src/upi.ts · src/reference.ts · src/index.ts
packages/brand/       svg/{piko-happy,piko-cheer,piko-nudge}.svg · svg/icons/*.svg · src/index.ts
packages/emails/      src/{Layout,AmbassadorApproved,FounderMessage,TeamApplicationAlert,AmbassadorAlert,BackingAlert,ReserveLink}.tsx · src/index.ts
functions/            src/index.ts · src/config.ts
                      src/lib/{admin,appCheck,signedToken,rateLimit,idempotency,mail,ip}.ts
                      src/handlers/{waitlist,team,ambassador,backing,founder,actions}.ts
                      src/triggers/deliverMail.ts
                      test/*.test.ts (emulator)
apps/web/             next.config.ts · apphosting.yaml · postcss.config.mjs
                      src/app/layout.tsx · src/app/globals.css
                      src/app/(site)/layout.tsx · page.tsx · join-the-team/{page,sent/page}.tsx
                      src/app/(site)/fund/{page,thank-you/page}.tsx · ambassadors/{page,received/page}.tsx
                      src/app/(site)/privacy/page.tsx · confirm/page.tsx · src/app/join/route.ts
                      src/components/ui/{Button,Field,TextArea,ChipGroup,Checkbox,Select,FileDrop,Modal,ErrorSummary}.tsx
                      src/components/site/{Nav,Footer,Wordmark,Piko,Reveal}.tsx
                      src/features/waitlist/{WaitlistCard,LiveCount,ReserveUsernameModal,UsernameReservedModal}.tsx
                      src/features/home/{HowItWorks,HelpBuild,BackersWall,FounderStrip}.tsx
                      src/features/team/{RoleList,TeamApplicationForm}.tsx
                      src/features/fund/{FundForm,ScanToPayCard,PayModal,IosUpiSheet,UpiQr}.tsx
                      src/features/ambassador/{AmbassadorForm,TermsModal}.tsx
                      src/features/founder/{FounderModal,MessageSentModal}.tsx
                      src/lib/{firebase,api,useModalParam,useZodForm,platform}.ts
                      src/content/site.ts
                      e2e/*.spec.ts · e2e/figma/*.png · e2e/helpers/emulator.ts · playwright.config.ts
```

---

### Task 1: Monorepo scaffold, tooling and CI

**Files:**
- Create: root `package.json`, `pnpm-workspace.yaml` (`apps/*`, `packages/*`, `functions`), `turbo.json` (pipelines `build`, `lint`, `typecheck`, `test`, `e2e`), `tsconfig.base.json` (strict, `noUncheckedIndexedAccess`), `eslint.config.mjs`, `.prettierrc`, `.gitignore`, `.nvmrc` (22), `.github/workflows/ci.yml`
- Test: `packages/core/src/smoke.test.ts` (temporary; delete in Task 3)

**Interfaces:**
- Produces: root scripts `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, `pnpm emulators` (= `firebase emulators:exec` wrapper used from Task 5 on). Workspace package names `@stepq/<dir>`.

- [ ] **Step 1:** Create the workspace files and an empty `packages/core` with Vitest; write `smoke.test.ts` asserting `1 + 1 === 2`.
- [ ] **Step 2:** Run `pnpm install && pnpm lint && pnpm typecheck && pnpm test`. Expected: all pass, 1 test.
- [ ] **Step 3:** CI workflow: on PR and push, Node 22 + pnpm cache, Java 21 (for emulators), run lint, typecheck, test, then `pnpm e2e` (job added in Task 13; leave a placeholder step that is skipped when `apps/web` is absent).
- [ ] **Step 4:** Commit `chore: scaffold pnpm/turbo monorepo with CI`.

---

### Task 2: Design tokens (`@stepq/tokens`)

**Files:**
- Create: `packages/tokens/src/tokens.ts`, `src/css.ts`, `tailwind.css`, `src/index.ts`
- Test: `packages/tokens/src/tokens.test.ts`

**Interfaces:**
- Produces: `colors: Record<'leaf'|'deep'|'mango'|'tomato'|'ink'|'white'|'mint'|'line'|'muted'|'mangoSoft'|'tomatoSoft'|'tomatoText'|'leafSoft'|'page', string>`, `radius {s:12,m:16,l:24,pill:999}`, `space {xs:4,s:8,m:16,l:24,xl:32}`, `typeStyles: Record<string,{family:'Fredoka'|'Nunito',weight:number,size:number,lineHeight:number,letterSpacing:number,uppercase?:boolean}>`, `toCssVariables(): string`. `tailwind.css` exposes `@theme` colours as `--color-<name>`, fonts `--font-display` (Fredoka) / `--font-body` (Nunito), and utilities `.type-web-hero`, `.type-web-h1`, `.type-web-h2`, `.type-web-h3`, `.type-web-lead`, `.type-web-body`, `.type-web-body-strong`, `.type-web-small`, `.type-web-small-strong`, `.type-label`, `.type-button`, `.type-chip`.

- [ ] **Step 1: Failing test** — `tokens.test.ts`: `colors.leaf === '#22C55E'`, `colors.deep === '#0A7F3F'`, `colors.mango === '#FFB627'`, `colors.tomato === '#F0533A'`, `colors.ink === '#0E2A1A'`, `colors.mint === '#EEF6F0'`, `colors.line === '#DCE7DF'`, `colors.muted === '#55695D'`, `colors.mangoSoft === '#FFF3D6'`, `colors.tomatoSoft === '#FDE6E1'`, `colors.tomatoText === '#B8321C'`, `colors.leafSoft === '#DDF7E6'`, `colors.page === '#F6F9F6'`; `typeStyles['web/hero']` deep-equals `{family:'Fredoka',weight:600,size:72,lineHeight:76,letterSpacing:-1.5}`; `typeStyles['web/h2'].letterSpacing === -0.6`; `typeStyles['app/label']` = Nunito 800 11/14, letterSpacing 1.2, uppercase; `toCssVariables()` contains `--color-deep: #0A7F3F;`.
- [ ] **Step 2:** Run `pnpm --filter @stepq/tokens test`. Expected: FAIL (module missing).
- [ ] **Step 3:** Implement. Web styles from spec §"Type" plus Figma: Hero 72/76 −1.5, H1 48/54, H2 36/42 −0.6, H3 22/28, Lead 20/30, Body 16/26, Body Strong Nunito 700 16/24, Small 14/20, Small Strong 700 14/20, Number 40/44; App styles from the context note table. Cross-check with `get_variable_defs` on node `9:85`.
- [ ] **Step 4:** Run test. Expected: PASS.
- [ ] **Step 5:** Commit `feat(tokens): Figma design tokens as TS, CSS vars and Tailwind theme`.

---

### Task 3: Schemas, API contract, UPI and username logic

**Files:**
- Create: `packages/schemas/src/{fields,waitlist,username,team,ambassador,backing,founder,actions,api,index}.ts`, `packages/core/src/{upi,reference,index}.ts`; delete `smoke.test.ts`
- Test: `packages/schemas/src/*.test.ts`, `packages/core/src/upi.test.ts`, `reference.test.ts`

**Interfaces:**
- Produces (`@stepq/schemas`):
  - `fields`: `personName` (trim, 2–80), `email` (trim → lower-case, valid), `indianMobile` (strip spaces/dashes/brackets; accept `+91`, `91`, `0` prefixes; must be `[6-9]\d{9}`; output `+91XXXXXXXXXX`), `optionalPhone` (empty → undefined, else 7–15 digits with optional leading `+`), `honeypot` (`z.literal('')`), `requestId` (uuid).
  - `waitlistInput {name, email, gender: 'female'|'male'|'non_binary'|'prefer_not', ageGroup: 'under_18'|'18_24'|'25_34'|'35_44'|'45_60'|'60_plus', source?: string(≤200), website: honeypot, requestId}`; label maps `GENDER_LABELS`, `AGE_LABELS` with Figma strings (`Female`, `Male`, `Non-binary`, `Prefer not to say`, `Under 18`, `18–24`, `25–34`, `35–44`, `45–60`, `60+`).
  - `username`: `normalizeUsername(raw: string): string` (trim, drop leading `@`, lower-case); `usernameSchema` regex `^(?![.])(?!.*[.]$)(?!.*[.]{2})[a-z0-9._]{3,20}$`; `RESERVED_USERNAMES` (`stepq`, `piko`, `admin`, `support`, `help`, `founder`, `team`, `official`, `bhakti`, `connect`, `hello`, `root`, `null`, `undefined`); `usernameProblem(raw): null | 'invalid' | 'reserved'`.
  - `teamApplicationInput {name, email, phone: indianMobile, role: 'marketing'|'design'|'content'|'tech', link?: url, why: 10–1000 chars, resume: {fileName: string, base64: string}, website, requestId}`; `ROLE_LABELS` (`Marketing intern`, `Design intern (UI and brand)`, `Content and social media intern`, `Tech intern (mobile app)`); `RESUME_MAX_BYTES = 5 * 1024 * 1024`.
  - `ambassadorInput {name, email, phone, city: 2–60, instagram: ^@?[A-Za-z0-9._]{1,30}$ (stored without @, lower-case), followers: 'under_1k'|'1k_10k'|'10k_50k'|'50k_plus', collegeOrCompany: 2–120, plan: 10–1000, agreedToTerms: literal true, website, requestId}`.
  - `backingInput {name, phone, amount: int 1–100000, showOnWall: boolean, website, requestId}`; `AMOUNT_PRESETS = [101, 251, 501, 1001]`.
  - `founderMessageInput {name, email, phone: optionalPhone, topic: 'partnership'|'investment'|'feedback'|'press'|'other', message: 10–2000, website, requestId}`.
  - `actions`: `ActionKind = 'verifyBacking' | 'approveAmbassador' | 'reserve'`; `actionTokenInput {token: string}`.
  - `api.ts`: the callable contract used by web and functions:
    ```ts
    export interface Api {
      joinWaitlist:            { in: WaitlistInput;           out: { status: 'joined' | 'existing'; position: number; reserveToken?: string; email: string } };
      checkUsername:           { in: { username: string };    out: { available: boolean; reason?: 'invalid' | 'reserved' | 'taken' } };
      reserveUsername:         { in: { username: string; reserveToken: string }; out: { username: string } };
      submitTeamApplication:   { in: TeamApplicationInput;    out: { firstName: string } };
      submitAmbassador:        { in: AmbassadorInput;         out: { firstName: string } };
      recordBacking:           { in: BackingInput;            out: { reference: string; amount: number; upiLink: string } };
      sendFounderMessage:      { in: FounderMessageInput;     out: { firstName: string } };
      describeAction:          { in: { token: string };       out: { kind: ActionKind; summary: string; done: boolean } };
      confirmAction:           { in: { token: string };       out: { done: true } };
    }
    export type ApiErrorCode = 'invalid-argument' | 'already-exists' | 'resource-exhausted' | 'permission-denied' | 'not-found' | 'failed-precondition';
    ```
    Field-level errors travel in `HttpsError.details = { fields: Record<string, string> }`.
- Produces (`@stepq/core`): `UPI_BASE`, `buildUpiLink(opts?: { amount?: number; note?: string }): string`, `upiAppLinks(link: string): { gpay: string; phonepe: string; paytm: string; bhim: string; other: string }`, `newReference(): string` (6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789`), `firstName(full: string): string`, `wallName(full: string): string` (`"Riya Sharma" → "Riya S."`).

- [ ] **Step 1: Failing tests.**
  - `fields.test.ts` (table): `+91 98765 43210`, `098765-43210`, `9876543210`, `919876543210` → `+919876543210`; `12345`, `5876543210` → error `"Enter a 10-digit mobile number"`; email `" Riya@Gmail.com "` → `riya@gmail.com`.
  - `username.test.ts`: `normalizeUsername('@Riya.Walks') === 'riya.walks'`; `usernameProblem` → `null` for `riya.walks`, `'invalid'` for `ab`, `.riya`, `riya.`, `ri..ya`, `riya-walks`, 21 chars; `'reserved'` for `@StepQ`.
  - `team.test.ts`: missing `why` → error on `why`; `role: 'sales'` rejected. `ambassador.test.ts`: `agreedToTerms: false` rejected with message `"Please agree to the Terms & Conditions"`; instagram `@Riya.Walks` → `riya.walks`. `backing.test.ts`: amount `0`, `100001`, `50.5` rejected. All schemas: `website: 'x'` rejected.
  - `upi.test.ts`: `buildUpiLink() === UPI_BASE`; `buildUpiLink({amount: 501, note: 'StepQ ABCD12'}) === UPI_BASE + '&am=501.00&cu=INR&tn=StepQ%20ABCD12'`; `upiAppLinks(link).gpay` starts with `gpay://upi/pay?pa=`, `.phonepe` with `phonepe://pay?pa=`, `.paytm` with `paytmmp://pay?pa=`, `.bhim` and `.other` equal `link`.
  - `reference.test.ts`: 1000 calls all match `^[A-HJ-NP-Z2-9]{6}$`; `wallName('riya  sharma') === 'Riya S.'`, `wallName('Riya') === 'Riya'`.
- [ ] **Step 2:** Run `pnpm test`. Expected: FAIL.
- [ ] **Step 3:** Implement. User-facing error messages are short sentences (`"Enter your name"`, `"Enter a valid email"`, `"Pick one"`).
- [ ] **Step 4:** Run `pnpm test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(schemas,core): shared form schemas, API contract, UPI and username rules`.

---

### Task 4: Brand assets and Figma reference images

**Files:**
- Create: `packages/brand/svg/piko-{happy,cheer,nudge}.svg`, `packages/brand/svg/icons/{check,lock,file,chev,upload,x,target,gift,users,briefcase,rupee,megaphone,sparkle}.svg` (exact set = every icon referenced by the W1 frames' `get_design_context` output), `packages/brand/src/index.ts`, `apps/web/e2e/figma/{w01,w02,w03,w04,w05,w06,w07,w08,w09,w10,w11,w16,w17}.png`, `packages/brand/MANIFEST.md` (asset → Figma node id)
- Test: `packages/brand/src/brand.test.ts`

**Interfaces:**
- Produces: `pikoSvg: Record<'happy'|'cheer'|'nudge', string>` (raw SVG markup), `iconSvg: Record<IconName, string>`, `type IconName`.

- [ ] **Step 1:** Export SVGs. Preferred: download the asset URLs from `get_design_context` (requires `www.figma.com` allowed in the environment network). Fallback that works with figma.com blocked: `use_figma` (load `figma:figma-use` first) running `await node.exportAsync({ format: 'SVG_STRING' })` on Piko variants in component set `4:265` and on each icon node, writing the returned strings to files. **Never** redraw. If both fail, stop and report the blocker.
- [ ] **Step 2:** Export reference PNGs: `get_screenshot` per W1 frame with `maxDimension` = frame height so width is 1440 at 1×, `enableBase64Response: true`; copy the saved PNG from the tool-results path into `e2e/figma/`.
- [ ] **Step 3: Test** `brand.test.ts`: every `pikoSvg`/`iconSvg` value starts with `<svg`, has `width` and `height` attributes, and contains no `https://www.figma.com` URL; every PNG in `e2e/figma` is 1440 px wide (read the IHDR bytes).
- [ ] **Step 4:** Run `pnpm --filter @stepq/brand test`. Expected: PASS.
- [ ] **Step 5:** Commit `feat(brand): Piko moods, icons and Figma reference renders exported from Figma`.

---

### Task 5: Firebase config and security rules

**Files:**
- Create: `firebase.json` (functions `functions/`, firestore, storage, emulators: auth off, functions 5001, firestore 8080, storage 9199, ui off; apphosting backend `web` rooted at `apps/web`), `.firebaserc` (`default: "stepq-prod"`, alias `dev: "demo-stepq"` for emulators), `firestore.rules`, `firestore.indexes.json`, `storage.rules`
- Test: `functions/test/rules.test.ts`

**Interfaces:**
- Produces: collections from spec §5: `waitlist`, `waitlistEmails/{email}` (uniqueness index doc → `{waitlistId}`), `usernames`, `teamApplications`, `ambassadorApplications`, `backings`, `founderMessages`, `public/stats {waitlistCount: number, updatedAt}`, `public/backers {names: string[], updatedAt}`, `mail`, `rateLimits`, `requests/{requestId}` (idempotency records). Storage path `resumes/{applicationId}.pdf`.

- [ ] **Step 1: Failing rules tests** (`@firebase/rules-unit-testing`, project `demo-stepq`): unauthenticated client can `get` `public/stats` and `public/backers`; cannot `list` `public`; cannot read or write any other collection; cannot write `public/*`; storage read/write of `resumes/x.pdf` denied.
- [ ] **Step 2:** Run `pnpm emulators -- pnpm --filter functions test rules`. Expected: FAIL (default open/missing rules).
- [ ] **Step 3:** Write rules: deny-all base; `match /public/{doc} { allow get: if doc in ['stats','backers']; }`; storage deny-all.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(firebase): project config and locked-down security rules`.

---

### Task 6: Functions foundation — admin, App Check, tokens, rate limits, idempotency, mail queue

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/src/config.ts`, `functions/src/lib/{admin,appCheck,signedToken,rateLimit,idempotency,mail,ip}.ts`, `functions/src/triggers/deliverMail.ts`, `functions/src/index.ts`
- Test: `functions/test/{signedToken,rateLimit,idempotency,deliverMail}.test.ts`

**Interfaces:**
- Produces:
  - `callOptions` = `{ region: 'asia-south1', enforceAppCheck: true, secrets: [...] }` (App Check enforcement off when `FUNCTIONS_EMULATOR === 'true'`).
  - `signToken(payload: { k: ActionKind; id: string; exp: number }): string` / `verifyToken(token: string, kind: ActionKind): { id: string }` — HMAC-SHA256 with `ACTION_SIGNING_SECRET`, format `base64url(json).base64url(sig)`, constant-time compare, throws `HttpsError('permission-denied')` on bad signature, wrong kind or expiry.
  - `enforceRateLimit(req: CallableRequest, action: string, limit: number, windowSec: number): Promise<void>` — key `sha256(ip + action)`, Firestore transaction on `rateLimits/{key}`; over limit → `HttpsError('resource-exhausted', 'Too many tries. Please wait a few minutes.')`. `clientIp(req)` reads the first `x-forwarded-for` hop.
  - `once<T>(requestId: string, fn: (tx: Transaction) => Promise<T>): Promise<T>` — stores result in `requests/{requestId}` inside the same transaction; a repeat returns the stored result.
  - `queueMail(tx: Transaction | null, mail: { to: string; subject: string; template: TemplateName; props: object; replyTo?: string }): void` — writes `mail/{id}` `{..., status: 'queued', attempts: 0}`.
  - `deliverMail` — `onDocumentCreated('mail/{id}', { retry: true })`: renders with `@stepq/emails`, sends via Resend (or, when `MAIL_TRANSPORT === 'outbox'`, skips sending), sets `status: 'sent'`, `sentAt`; on error increments `attempts`, sets `lastError`, rethrows so Functions retries; gives up (status `failed`) after 6 attempts or 24 h.
- Consumes: `@stepq/schemas` (`ActionKind`), `@stepq/emails` `render(template, props)` (stub until Task 7: returns `{subject, html, text}` from props).

- [ ] **Step 1: Failing tests.** `signedToken`: round-trip; tampered payload → throws; `exp` in the past → throws; kind mismatch → throws. `rateLimit`: 3 calls with limit 3 pass, 4th throws `resource-exhausted`; different IP passes. `idempotency`: `once('id1', fn)` twice → `fn` runs once, same result. `deliverMail` (Review Focus 5): with a transport that throws on first call, the doc ends `status: 'sent'`, `attempts: 1` after the retry; with transport always throwing, after 6 attempts `status: 'failed'`.
- [ ] **Step 2:** Run `pnpm emulators -- pnpm --filter functions test`. Expected: FAIL.
- [ ] **Step 3:** Implement. Transport is injectable (`setMailTransport` for tests); production uses `new Resend(RESEND_API_KEY).emails.send({from: MAIL_FROM, ...})`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(functions): tokens, rate limits, idempotency and retried mail queue`.

---

### Task 7: Email templates (`@stepq/emails`)

**Files:**
- Create: `packages/emails/src/{Layout,AmbassadorApproved,FounderMessage,TeamApplicationAlert,AmbassadorAlert,BackingAlert,ReserveLink,index}.tsx`
- Test: `packages/emails/src/emails.test.ts`

**Interfaces:**
- Produces: `type TemplateName = 'ambassadorApproved' | 'founderMessage' | 'teamApplicationAlert' | 'ambassadorAlert' | 'backingAlert' | 'reserveLink'`; `render(name, props): Promise<{ subject: string; html: string; text: string }>`. Props:
  - `ambassadorApproved {firstName, city, kitUrl?: string}` — E01 `10:989`; subject `Congratulations, {firstName}! You are a StepQ ambassador`; body copy verbatim (city substituted for "Mumbai"); button "Open your ambassador kit" only when `kitUrl`; sign-off "Chalo, chalte hain. / Bhakti, StepQ".
  - `founderMessage {name, email, phone?, topicLabel, message}` — E03 `30:1840`; subject `New message from {name} · {topicLabel}`; button "Reply to {firstName}" → `mailto:{email}`.
  - `teamApplicationAlert {name, email, phone, roleLabel, link?, why, resumeUrl}`, `ambassadorAlert {...all fields, approveUrl}`, `backingAlert {name, phone, amount, reference, createdAtIst, showOnWall, verifyUrl}`, `reserveLink {firstName, position, reserveUrl}` — no Figma frame; use `Layout` (green header with wordmark + Piko Happy, same type and colours as E01).
- Consumes: `@stepq/tokens`, `@stepq/brand`. Email clients block SVG, so Piko is rendered to PNG at build time with `@resvg/resvg-js` and referenced as `${SITE_URL}/email/piko-{mood}.png` (served from `apps/web/public/email/`).

- [ ] **Step 1: Failing tests.** For each template render with sample props and assert: subject string exact; `html` contains every Figma copy line for E01/E03; `text` is non-empty; no `<svg` in html; E01 without `kitUrl` has no "Open your ambassador kit"; `backingAlert` html contains `₹501` and the `verifyUrl`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement; add `pnpm --filter @stepq/emails build:png` writing `apps/web/public/email/piko-{happy,cheer}.png` (144 px, 2×).
- [ ] **Step 4:** Run. Expected: PASS. Replace the Task 6 render stub with this package and rerun functions tests.
- [ ] **Step 5:** Commit `feat(emails): E01, E03 and notification templates`.

---

### Task 8: Waitlist and username Functions

**Files:**
- Create: `functions/src/handlers/waitlist.ts`; export from `index.ts`
- Test: `functions/test/waitlist.test.ts`

**Interfaces:**
- Produces callables (contract in `Api`): `joinWaitlist`, `checkUsername`, `reserveUsername`.
  - `joinWaitlist`: parse `waitlistInput`; rate limit `join` 10/600 s; `once(requestId)`; in a transaction: if `waitlistEmails/{email}` exists → `{status:'existing', position, email}` and `queueMail(reserveLink)` with a 7-day `reserve` token **only if that entry has no username** (no token returned to the browser); else create `waitlist/{id}` with `position = stats.waitlistCount + 1`, write `waitlistEmails/{email}`, set `public/stats.waitlistCount`, return `{status:'joined', position, reserveToken: signToken({k:'reserve', id, exp: now+30 min}), email}`.
  - `checkUsername`: rate limit 60/600 s; `usernameProblem` → reason; else `usernames/{name}` exists → `taken`.
  - `reserveUsername`: verify `reserve` token; transaction: entry already has username → `failed-precondition` ("You already reserved @x"); `usernames/{name}` exists → `already-exists` with `details.fields.username = 'Taken. Try another.'`; else create and set `waitlist/{id}.username`.

- [ ] **Step 1: Failing tests:** first join → position 1, stats 1; second distinct email → 2; same email `" Riya@Gmail.com "` after `riya@gmail.com` → `existing`, position 1, stats unchanged, one `mail` doc with template `reserveLink` (Review Focus 2); repeat with same `requestId` → identical result, one doc (Review Focus 1); honeypot filled → `invalid-argument`; join succeeds while mail transport throws (Review Focus 5); `checkUsername('@StepQ')` → `reserved`; `reserveUsername` happy path sets both docs; two concurrent reserves of `riya.walks` with two different tokens → exactly one fulfilled, the other `already-exists` (Review Focus 4); expired token → `permission-denied`.
- [ ] **Step 2:** Run `pnpm emulators -- pnpm --filter functions test waitlist`. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(functions): waitlist join, live count and username reservation`.

---

### Task 9: Team application Function

**Files:**
- Create: `functions/src/handlers/team.ts`
- Test: `functions/test/team.test.ts`, fixtures `functions/test/fixtures/{resume.pdf,fake.pdf,big.pdf}`

**Interfaces:**
- Produces: `submitTeamApplication`. Decode base64; reject unless bytes start with `%PDF-` and `0 < size ≤ RESUME_MAX_BYTES` (`details.fields.resume` = `"Upload a PDF up to 5 MB"`); rate limit `team` 5/600 s; `once(requestId)`; save `resumes/{id}.pdf` (contentType `application/pdf`) with admin SDK; create `teamApplications/{id}`; queue `teamApplicationAlert` to `FOUNDER_INBOX` with a 7-day signed Storage URL. Returns `{firstName}`.

- [ ] **Step 1: Failing tests:** valid PDF → doc + storage object + one mail; `fake.pdf` (PNG bytes renamed) → field error; `big.pdf` (5 MB + 1) → field error; empty file → field error; repeat `requestId` → one doc.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(functions): team applications with PDF résumé upload`.

---

### Task 10: Ambassador Function and action confirm flow

**Files:**
- Create: `functions/src/handlers/{ambassador,actions}.ts`
- Test: `functions/test/{ambassador,actions}.test.ts`

**Interfaces:**
- Produces: `submitAmbassador` (rate limit 5/600 s, `once`, create `ambassadorApplications/{id}` status `pending`, queue `ambassadorAlert` with `approveUrl = ${SITE_URL}/confirm?token=${signToken({k:'approveAmbassador', id, exp: now+30 days})}`); `describeAction({token})` → `{kind, summary, done}` (summary e.g. `Approve Riya Sharma (Mumbai) as an ambassador?` / `Verify ₹501 from Riya S. (ref ABCD12)?`); `confirmAction({token})` → for `approveAmbassador`: transaction sets `status:'approved', approvedAt`, queues `ambassadorApproved` to the applicant with `kitUrl = AMBASSADOR_KIT_URL || undefined`; second confirm is a no-op returning `{done:true}` without a second email. `verifyBacking` branch is added in Task 11 (switch with exhaustive check).

- [ ] **Step 1: Failing tests:** submit → pending doc + alert mail containing `/confirm?token=`; describe → summary text above, `done:false`; confirm → approved + exactly one `ambassadorApproved` mail to the applicant; confirm again → still one mail; token for a different kind → `permission-denied`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(functions): ambassador applications and signed approve links`.

---

### Task 11: Backing and founder-message Functions

**Files:**
- Create: `functions/src/handlers/{backing,founder}.ts`; extend `actions.ts`
- Test: `functions/test/{backing,founder}.test.ts`

**Interfaces:**
- Produces: `recordBacking` (rate limit 10/600 s, `once`, `reference = newReference()`, create `backings/{id}` `status:'pending'`, queue `backingAlert` with `verifyUrl` for kind `verifyBacking`, return `{reference, amount, upiLink: buildUpiLink({amount, note: 'StepQ ' + reference})}`); `confirmAction` `verifyBacking` branch: set `status:'verified'`, and if `showOnWall` append `wallName(name)` to `public/backers.names` (no duplicates for the same backing); `sendFounderMessage` (rate limit 5/600 s, `once`, store `founderMessages/{id}`, queue `founderMessage` to `FOUNDER_INBOX` with `replyTo: email`).

- [ ] **Step 1: Failing tests:** backing → pending doc, alert mail with `₹501` and reference, returned `upiLink` ends `&am=501.00&cu=INR&tn=StepQ%20<ref>`; verify with `showOnWall:true` → `public/backers.names` contains `Riya S.`; verify twice → listed once; `showOnWall:false` → not listed; founder message → stored + mail with `replyTo` = sender, subject `New message from Riya Sharma · Partnership`; empty optional phone accepted.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(functions): UPI backings with verify links and founder messages`.

---

### Task 12: Web foundation — app shell, UI kit, Nav, Footer, Piko

**Files:**
- Create: `apps/web` (Next.js 15 App Router, Tailwind 4 importing `@stepq/tokens/tailwind.css`), `src/app/{layout,globals.css}`, `src/app/(site)/layout.tsx`, `src/components/ui/*`, `src/components/site/*`, `src/lib/{firebase,api,useModalParam,useZodForm,platform}.ts`, `src/content/site.ts`
- Test: `apps/web/src/**/*.test.tsx` (Vitest + Testing Library + jsdom)

**Interfaces:**
- Consumes: `@stepq/tokens`, `@stepq/brand`, `@stepq/schemas`.
- Produces:
  - `Button({variant: 'primary' | 'text', loading?, ...buttonProps})` — Figma `4:116`: pill, deep green, Nunito 700 16/22, min-height 52; press `scale(0.98)`; `loading` shows a spinner, sets `aria-busy` and `disabled`.
  - `Field({label, error?, ...inputProps})` — `4:135`: caps label (type-label), underline 1.5 px line → 2 px deep on focus (animated), error = tomato underline + tomato-text helper with `aria-describedby`.
  - `TextArea`, `Select` (W04 rounded variants, 12 px radius, 1.5 px line border), `FileDrop({accept:'application/pdf', maxBytes, value, onChange})` (W04 resume row: upload icon, filename, "PDF, up to 5 MB · uploaded", × to clear).
  - `ChipGroup<T>({label, options: {value: T, label: string}[], value, onChange, error?})` — `4:142`: `role="radiogroup"`, roving tabindex, arrow keys; selected = ink bg, white text; 150 ms colour transition.
  - `Checkbox({label, checked, onChange, children?})` — 22 px deep-green box with check icon.
  - `Modal({open, onClose, labelledBy, children})` — overlay `rgba(14,42,26,0.45)` on page colour, card 560 px, radius 28, padding 40, shadow `0 16px 48px rgba(13,41,26,0.12)`; focus trap, Esc, focus return; enter fade + 12 px rise 200 ms, exit 140 ms.
  - `ErrorSummary({errors: Record<string,string>})` — `role="alert"`, focused after a failed submit, links to fields.
  - `Nav` (`9:16`) with menu sheet < 768 px; `Footer` (`9:44`) with links per spec §10a (Press kit hidden, Collaborate → `?modal=founder&topic=partnership`, socials from `site.ts`, hidden when null); `Wordmark`; `Piko({mood, size, motion?: 'walk' | 'cheer' | 'none'})` (walk loop pauses via IntersectionObserver; all motion off under reduced motion); `Reveal` (fade + 12 px rise on viewport enter, 60 ms stagger, content visible without JS).
  - `lib/firebase.ts`: init app + App Check (`ReCaptchaEnterpriseProvider(NEXT_PUBLIC_RECAPTCHA_KEY)`, debug token in dev), connect emulators when `NEXT_PUBLIC_USE_EMULATORS === '1'`.
  - `lib/api.ts`: `call<K extends keyof Api>(name: K, data: Api[K]['in']): Promise<Api[K]['out']>` mapping `HttpsError.details.fields` to `ApiFieldError` and `resource-exhausted` to a friendly message.
  - `useZodForm(schema)` — values, field errors on blur and submit, `submit(fn)` with `requestId` generated once per form instance (Review Focus 1).
  - `useModalParam(name)` — open/close via `?modal=<name>`, back button closes.
  - `content/site.ts` — `{ roles: {id: Role, jdUrl: string | null}[], ambassadorEligibility: string | null, ambassadorTerms: {title: string; body: string}[] | null, socials: {instagram: string|null, linkedin: string|null, youtube: string|null}, privacyPolicy: string | null, contactEmail: 'hello@stepq.in' }` with every unknown `null`.

- [ ] **Step 1: Failing component tests:** ChipGroup arrow-right moves selection and focus; Field shows error text and `aria-invalid`; Modal traps Tab and closes on Esc returning focus; Button `loading` disables and second click doesn't call handler; Piko renders `pikoSvg[mood]` and no animation class when `matchMedia('(prefers-reduced-motion: reduce)')` matches; Footer hides "Press kit" and social links that are null.
- [ ] **Step 2:** Run `pnpm --filter web test`. Expected: FAIL.
- [ ] **Step 3:** Implement from `get_design_context` of `9:16`, `9:44`, `4:116`, `4:135`, `4:142`, `4:265`. Fonts via `@fontsource/fredoka/600.css`, `@fontsource/fredoka/500.css`, `@fontsource/nunito/{400,700,800}.css`.
- [ ] **Step 4:** Run. Expected: PASS. Also `pnpm --filter web build` succeeds.
- [ ] **Step 5:** Commit `feat(web): app shell, UI kit, nav, footer and Piko`.

---

### Task 13: Home (W01) with waitlist, live count, W02/W03 and `/join`

**Files:**
- Create: `src/app/(site)/page.tsx`, `src/features/waitlist/*`, `src/features/home/*`, `src/app/join/route.ts`, `apps/web/playwright.config.ts`, `apps/web/e2e/helpers/emulator.ts`, `apps/web/e2e/home.spec.ts`; enable the e2e job in CI (`firebase emulators:exec` + `next build && next start` with `NEXT_PUBLIC_USE_EMULATORS=1`, `MAIL_TRANSPORT=outbox`)

**Interfaces:**
- Consumes: `call('joinWaitlist' | 'checkUsername' | 'reserveUsername')`, UI kit, `onSnapshot(doc(db,'public','stats'))`, `onSnapshot(doc(db,'public','backers'))`.
- Produces: `e2e/helpers/emulator.ts`: `resetEmulators()`, `readMail(filter): Promise<MailDoc[]>`, `readDoc(path)`, `actionTokenFromMail(mail): string`.
  - `LiveCount` — `{count.toLocaleString('en-IN')} people have joined the waitlist` + "Live" pill; number rolls (Motion `animate` on a MotionValue) when it changes; one `role="status" aria-atomic` sentence; reserved width so no layout shift; renders nothing (keeps space) until the first snapshot.
  - `WaitlistCard` → on `joined` opens `?modal=reserve` (W02) with `You're #{position}. We'll email {email} the day StepQ launches.`; on `existing` shows W02's top half with "You're already on the list (#{position}). We've emailed you a link to reserve your username." (Arovas copy, spec §10a) and no username field.
  - `ReserveUsernameModal` — debounced 400 ms `checkUsername`; states Checking… / ✓ Available / Taken / invalid message; button label `Reserve @{name}`; also opened from the email link `/?modal=reserve&token=…` (uses that token).
  - `UsernameReservedModal` (W03) — `@{name} is yours`, copy button for `stepq.in/join`.
  - `BackersWall` — hidden when `names` empty.
  - `/join` route — 307 to `/` keeping query string; `WaitlistCard` sends `source` = `ref`/`utm_*` params serialised.

- [ ] **Step 1: Failing e2e** (`home.spec.ts`, 1440×900 and 390×844): count shows `0` then `1` after a join in another browser context (live); join with chips picked → W02 shows `You're #1`; type `riya.walks` → "Available" → Reserve → W03 `@riya.walks is yours`; second user types `riya.walks` → "Taken"; join again with the first email → already-on-list message and a `reserveLink` mail in outbox; submit with empty form → ErrorSummary focused, fields marked; no element contains `12,480` or `Aarav M.`; backers card absent; `/join?ref=abc` → `/` and the joined doc has `source` containing `ref=abc`.
- [ ] **Step 2:** Run `pnpm e2e -- home`. Expected: FAIL.
- [ ] **Step 3:** Implement from `get_design_context` of `9:85`, `9:313`, `9:330`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): home page, live waitlist and username reservation`.

---

### Task 14: Join the team (W04, W05)

**Files:**
- Create: `src/app/(site)/join-the-team/{page,sent/page}.tsx`, `src/features/team/*`, `e2e/team.spec.ts`, `e2e/fixtures/{resume.pdf,fake.pdf}`

**Interfaces:**
- Consumes: `call('submitTeamApplication')`, `content.roles`, `ROLE_LABELS`.
- Produces: `RoleList` — accordion, one open; open card = 2 px deep border on white, closed = page bg + 1.5 px line; "View JD"/"Hide JD" with rotating chevron; JD body text from Figma; Download row only when `jdUrl`. Opening a role pre-selects it in the form's "Position applied for". Form reads the file with `FileReader` → base64, validates type/size client-side before upload. Success → `/join-the-team/sent?name=<firstName>` (W05 `Thanks, {firstName}. …`).

- [ ] **Step 1: Failing e2e:** open "Design intern" → form select shows it; upload `fake.pdf` → "Upload a PDF up to 5 MB"; upload `resume.pdf`, fill, submit → W05 with "Thanks, Riya."; outbox has `teamApplicationAlert`; double-click Submit → one `teamApplications` doc.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from `10:127`, `10:268`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): join-the-team page with résumé upload`.

---

### Task 15: Fund StepQ (W06, W07, M01, W08)

**Files:**
- Create: `src/app/(site)/fund/{page,thank-you/page}.tsx`, `src/features/fund/*`, `e2e/fund.spec.ts`

**Interfaces:**
- Consumes: `call('recordBacking')`, `buildUpiLink`, `upiAppLinks`, `AMOUNT_PRESETS`, `qrcode` (`toString(link, {type:'svg', margin: 0})`).
- Produces: `UpiQr({link, size})`; `ScanToPayCard` (static base QR, "Copy UPI ID" with "Copied" state); `FundForm` — chips ₹101/₹251/₹501/₹1,001/Other; "Other" focuses the custom field; typing a custom amount deselects chips; button label `Pay ₹{amount} with UPI`; on submit `recordBacking` then: desktop → `PayModal` (W07: `Scan to pay ₹{amount}`, QR of returned `upiLink`, UPI ID, "I've paid" → `/fund/thank-you?amount=`, Cancel); Android → `location.href = upiLink` and show "I've paid" / "Back" inline; iOS → `IosUpiSheet` (M01 layout: `Pay ₹{amount} with`, Google Pay, PhonePe, Paytm, BHIM, Other UPI app). `platform.ts`: `detectPlatform(): 'android' | 'ios' | 'desktop'` by UA + `pointer: coarse`. W08 copy with the amount.

- [ ] **Step 1: Failing e2e:** desktop: pick ₹251 → button "Pay ₹251 with UPI" → modal QR decodes (use `jsqr` in test) to a link containing `am=251.00` and `tn=StepQ%20`; backing doc pending; outbox `backingAlert`; "I've paid" → W08 shows ₹251. Custom amount `0` → field error. Mobile Android UA (390): tapping Pay navigates to `upi://pay?...` (intercept with `page.route`/`context.on('page')`, assert the URL). iOS UA: sheet lists five options with expected hrefs. Then: take the `verifyBacking` token from the outbox mail, call `confirmAction` through the emulator helper `confirmFromMail(mail)` (added to `e2e/helpers/emulator.ts` here) → home backers wall shows "Riya S." live.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from `10:337`, `10:663`, `10:668`, `10:709`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): fund StepQ with UPI QR, phone deep links and thank-you`.

---

### Task 16: Ambassadors (W09–W11), founder modal (W16, W17), confirm page

**Files:**
- Create: `src/app/(site)/ambassadors/{page,received/page}.tsx`, `src/features/ambassador/*`, `src/features/founder/*`, `src/app/(site)/confirm/page.tsx`, `e2e/{ambassador,founder,confirm}.spec.ts`

**Interfaces:**
- Consumes: `call('submitAmbassador' | 'sendFounderMessage' | 'describeAction' | 'confirmAction')`, `content.ambassadorEligibility`, `content.ambassadorTerms`.
- Produces: `AmbassadorForm` (followers chips, T&C checkbox required, link opens `TermsModal` W10 via `?modal=terms`, keeping form values); eligibility box shows Figma placeholder text until content is set; `TermsModal` shows `ambassadorTerms` or the Figma section headings with their Figma placeholder lines; `FounderModal` (W16, `?modal=founder`, optional `topic` param preselects chip) → `MessageSentModal` (W17 `Thanks, {firstName}. …`); confirm page: reads `token`, calls `describeAction`, shows summary + Confirm button (POST via callable; never on GET), then "Done" state; `done:true` on load shows "Already done".

- [ ] **Step 1: Failing e2e:** ambassador submit without T&C → error "Please agree to the Terms & Conditions"; open T&C and return → typed values kept; submit → W11; take approve token from outbox → `/confirm?token=` shows "Approve Riya Sharma (Mumbai) as an ambassador?" → Confirm → done; outbox has `ambassadorApproved` to applicant; reload → "Already done", still one email. Founder: open from home strip, pick Investment, send → W17; outbox `founderMessage` with `replyTo`. Esc closes founder modal; browser back closes it.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement from `10:778`, `10:912`, `10:918`, `30:1321`, `30:1576`.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat(web): ambassador programme, founder messages and signed confirm page`.

---

### Task 17: Privacy page (W15) and launch-readiness check

**Files:**
- Create: `src/app/(site)/privacy/page.tsx`, `scripts/check-launch.ts`, root script `check:launch`
- Test: `scripts/check-launch.test.ts`, `e2e/privacy.spec.ts`

**Interfaces:**
- Consumes: `content/site.ts`, Functions params.
- Produces: privacy page laid out from `11:1108` (W15 frame in the after-launch section) rendering `content.privacyPolicy` (Markdown) — shows a "Policy coming soon" notice while null and is `noindex`. `check-launch.ts` prints each unfilled item (Q1–Q6 mapping: JD URLs, eligibility, T&C, privacy text, socials, kit URL, `MAIL_FROM` still `hello@stepq.in` placeholder) and exits 1 if any remain; `--allow` flag lists accepted gaps.

- [ ] **Step 1: Failing tests:** `check-launch` with current defaults exits 1 and lists `privacyPolicy`, `ambassadorTerms`, `roles.marketing.jdUrl`; with a filled fixture exits 0. e2e: footer "Privacy policy" opens `/privacy`.
- [ ] **Step 2:** Run. Expected: FAIL.
- [ ] **Step 3:** Implement.
- [ ] **Step 4:** Run. Expected: PASS.
- [ ] **Step 5:** Commit `feat: privacy page and launch-readiness check`.

---

### Task 18: Fidelity, responsive, accessibility and performance pass

**Files:**
- Create: `e2e/visual.spec.ts`, `e2e/a11y.spec.ts`, `lighthouserc.json`; fix any component files
- Test: those specs

**Interfaces:**
- Consumes: `e2e/figma/*.png` (Task 4), all pages.

- [ ] **Step 1: Tests.** `visual.spec.ts`: for each W1 frame, render the matching state at 1440 wide (seed emulator data so the live count and username show the Figma sample values only inside the test, masked regions: live count, position), `toHaveScreenshot` compared against the Figma PNG with `maxDiffPixelRatio: 0.02`. Phone 390 screenshots saved as artifacts for eye review. `a11y.spec.ts`: axe on every route and open modal → zero serious/critical violations; keyboard-only run of the waitlist and founder flows. Lighthouse CI on `/` mobile: performance ≥ 0.9, CLS < 0.1, accessibility ≥ 0.95. Reduced-motion run: `page.emulateMedia({reducedMotion:'reduce'})` → no element has a running animation (`document.getAnimations().length === 0` after load).
- [ ] **Step 2:** Run. Expected: some FAIL.
- [ ] **Step 3:** Fix every diff until green. Do not loosen thresholds.
- [ ] **Step 4:** Run full `pnpm lint typecheck test e2e`. Expected: PASS.
- [ ] **Step 5:** Commit `test: visual parity with Figma, accessibility and performance gates`.

---

### Task 19: Deployment pipeline and runbook

**Files:**
- Create: `apps/web/apphosting.yaml` (env `NEXT_PUBLIC_RECAPTCHA_KEY`, `NEXT_PUBLIC_FIREBASE_*`, region `asia-south1`), `.github/workflows/deploy.yml` (manual dispatch: `pnpm check:launch`, then `firebase deploy --only functions,firestore,storage`; App Hosting builds from the `main` branch), `docs/runbook.md`

**Interfaces:**
- Produces: `docs/runbook.md` covering: creating the Firebase project + Blaze; enabling App Check (reCAPTCHA Enterprise key for stepq.in); setting secrets (`firebase functions:secrets:set RESEND_API_KEY`, `ACTION_SIGNING_SECRET` = 32 random bytes); Resend domain verification DNS records; App Hosting custom domain DNS; the post-deploy smoke test (join, reserve, team with PDF, fund + verify, ambassador + approve, founder message — with real emails to an Arovas inbox, then deleting those test records); how to verify a backing and approve an ambassador from email.

- [ ] **Step 1:** Write the files. Validate `deploy.yml` with `actionlint`; `firebase deploy --dry-run --project demo-stepq` succeeds locally.
- [ ] **Step 2:** Commit `chore: deploy workflow and production runbook`.
- [ ] **Step 3:** Run `/coderabbit:code-review` (or `coderabbit:code-reviewer` agent) on the branch; fix findings; push.
