import { access } from 'node:fs/promises';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
try { await access(path.join(root, '.dev.vars')); }
catch {
  console.error('Run npm run setup:local once before starting the app and file library.');
  process.exit(1);
}

let stopping = false;
const children = [];
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (!child.pid || child.exitCode !== null) continue;
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/pid', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    } else child.kill('SIGTERM');
  }
  process.exitCode = code;
}
function start(script, args) {
  const child = spawn(process.execPath, [path.join(root, script), ...args], {
    cwd: root, stdio: 'inherit', windowsHide: true,
  });
  children.push(child);
  child.on('error', error => { console.error(error.message); stop(1); });
  child.on('exit', code => { if (!stopping) stop(code ?? 1); });
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());

start('node_modules/wrangler/bin/wrangler.js', ['dev', '--config', 'wrangler.dev.jsonc', '--ip', '127.0.0.1', '--port', '8787']);
start('node_modules/vite/bin/vite.js', ['--host', '127.0.0.1', '--port', '5173', '--strictPort', ...process.argv.slice(2)]);
