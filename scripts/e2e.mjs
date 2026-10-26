// Runs Playwright (apps/web) against a local Postgres.
// Usage: pnpm e2e [-- <playwright args>], e.g. `pnpm e2e -- home --project=desktop`.
// Uses E2E_DATABASE_URL when set; otherwise starts the local PostgreSQL service if needed and
// creates the `stepq_e2e` database (password `postgres` for the postgres user).
import { execFileSync, execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sh = (cmd) => execSync(cmd, { cwd: root, stdio: 'pipe' }).toString().trim();
const quiet = (cmd) => {
  try {
    return sh(cmd);
  } catch {
    return null;
  }
};

if (!process.env.E2E_DATABASE_URL) {
  if (quiet('pg_isready -h 127.0.0.1 -p 5432') === null) {
    quiet('service postgresql start');
    for (let i = 0; i < 20 && quiet('pg_isready -h 127.0.0.1 -p 5432') === null; i++) {
      execSync('sleep 0.5');
    }
  }
  const psql = (sql) =>
    quiet(`psql "postgres://postgres:postgres@127.0.0.1:5432/postgres" -tAc "${sql}"`) ??
    quiet(`su postgres -c 'psql -tAc "${sql}"'`);
  if (psql("select 1 from pg_database where datname = 'stepq_e2e'") !== '1') {
    psql('create database stepq_e2e');
  }
}

const args = process.argv.slice(2).filter((a) => a !== '--');
try {
  execFileSync('pnpm', ['--filter', 'web', 'exec', 'playwright', 'test', ...args], {
    cwd: root,
    stdio: 'inherit',
  });
} catch (e) {
  process.exit(typeof e.status === 'number' ? e.status : 1);
}
