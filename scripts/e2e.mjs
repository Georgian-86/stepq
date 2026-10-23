// Builds the Functions, then runs Playwright (apps/web) inside the full emulator suite.
// Usage: pnpm e2e [-- <playwright args>], e.g. `pnpm e2e -- home --project=desktop`.
import { execFileSync } from 'node:child_process';
import { existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd, args) => execFileSync(cmd, args, { cwd: root, stdio: 'inherit' });

// The Functions emulator reads secrets from functions/.secret.local (git-ignored).
const secrets = join(root, 'functions', '.secret.local');
if (!existsSync(secrets)) {
  writeFileSync(secrets, 'ACTION_SIGNING_SECRET=e2e-signing-secret\nRESEND_API_KEY=re_e2e\n');
}

const quote = (a) => `'${a.replace(/'/g, `'\\''`)}'`;
const args = process.argv.slice(2).filter((a) => a !== '--');
const inner = ['pnpm --filter web exec playwright test', ...args.map(quote)].join(' ');

try {
  run('pnpm', ['--filter', 'functions', 'build']);
  run('pnpm', [
    'exec',
    'firebase',
    'emulators:exec',
    '--project',
    'demo-stepq',
    '--only',
    'functions,firestore,storage',
    inner,
  ]);
} catch (e) {
  process.exit(typeof e.status === 'number' ? e.status : 1);
}
