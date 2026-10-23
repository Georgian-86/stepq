// Point firebase-admin at the emulator project and fail (not skip) when the
// emulator is required but missing.
process.env.GCLOUD_PROJECT ??= 'demo-stepq';
process.env.ACTION_SIGNING_SECRET ??= 'test-signing-secret';
process.env.RESEND_API_KEY ??= 're_test';
if (process.env.REQUIRE_EMULATOR && !process.env.FIRESTORE_EMULATOR_HOST) {
  throw new Error(
    'test:emulator needs the Firestore emulator: pnpm emulators -- "pnpm --filter functions test:emulator"',
  );
}
