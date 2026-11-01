import { randomBytes } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
const secretFile = path.join(root, '.dev.vars');
try {
  await writeFile(secretFile, `UPLOAD_SECRET="${randomBytes(24).toString('base64url')}"\n`, { flag: 'wx', mode: 0o600 });
  console.log('Created .dev.vars. Open that local file to find your administrator password.');
} catch (error) {
  if (error.code !== 'EEXIST') throw error;
  const existing = await readFile(secretFile, 'utf8');
  if (!/^\s*UPLOAD_SECRET\s*=\s*\S+/m.test(existing)) {
    throw new Error('Add UPLOAD_SECRET to .dev.vars before starting the file library.');
  }
  console.log('Keeping the existing local administrator password.');
}

const migrated = spawnSync(process.execPath, [
  path.join(root, 'node_modules/wrangler/bin/wrangler.js'),
  'd1', 'migrations', 'apply', 'learning-log-files', '--local', '--config', 'wrangler.dev.jsonc',
], { cwd: root, stdio: 'inherit', windowsHide: true });
if (migrated.error) throw migrated.error;
if (migrated.status !== 0) process.exit(migrated.status ?? 1);
console.log('Local D1 and R2 are ready. Start both services with npm run dev.');
