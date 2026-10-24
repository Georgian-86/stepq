# Deploying a preview to Vercel (no Firebase yet)

A preview build shows the whole site to the client before any Firebase project exists. It is
switched on by one build-time variable, `NEXT_PUBLIC_PREVIEW_MODE=1`. In a preview build:

- Firebase is never initialised (no App Check, no Firestore listeners, no callables).
- Forms validate as usual and answer with simulated responses after about 600 ms. Nothing is
  saved; the waitlist position and reserved usernames last only for the browser session.
- The live count shows 0 and the backers wall is hidden.
- Approve and verify links (`/confirm`) say they work once the backend is connected.
- **The UPI hand-off on /fund is real**: paying there sends real money to the founder's UPI ID.
  The preview banner says so on the fund pages, and the QR modal, the iOS app sheet and the
  Android "Open UPI app" state each say "Preview: UPI payments made here are real and won't be
  recorded."
- Thank-you and confirmation copy that would claim something was sent, emailed or recorded
  says "Preview: nothing was saved or emailed." instead.
- A banner on every page reads "Preview — forms don't save anything yet."
- Every page is `noindex` (robots meta tag and an `X-Robots-Tag` header).

## Vercel steps

1. In Vercel, **Add New… → Project** and import the GitHub repository.
2. **Root Directory**: `apps/web`. Leave "Include files outside the root directory" on (the
   app uses the workspace packages under `packages/`).
3. Framework preset: Next.js. Install and build commands come from `apps/web/vercel.json`
   (`cd ../.. && pnpm install --frozen-lockfile`, then `cd ../.. && pnpm --filter web build`),
   so leave the overrides off.
4. **Environment Variables** (Production and Preview), both required:
   - `NEXT_PUBLIC_PREVIEW_MODE` = `1`
   - `ENABLE_EXPERIMENTAL_COREPACK` = `1`, so Vercel uses the pnpm version pinned in the root
     `package.json` (`packageManager: pnpm@10.28.0`) instead of its default pnpm.

   Do not add any `NEXT_PUBLIC_FIREBASE_*` variables. Optionally set `NEXT_PUBLIC_SITE_URL` to
   the Vercel URL so canonical/OG URLs point at the preview.
5. Node.js version (Settings → Build and Deployment): 22.x (root `engines`: node >= 22).
6. Deploy. Check the banner on the home page and that a response carries
   `X-Robots-Tag: noindex, nofollow` (`curl -I https://<project>.vercel.app/`).

## Check locally

```sh
pnpm e2e:preview          # builds with only NEXT_PUBLIC_PREVIEW_MODE=1, runs e2e/preview.spec.ts
```

## Going live

Remove `NEXT_PUBLIC_PREVIEW_MODE` (or deploy the real hosting setup) and set the
`NEXT_PUBLIC_FIREBASE_*` and `NEXT_PUBLIC_RECAPTCHA_KEY` values. With the flag unset the site
behaves exactly as without this feature.
