// npm run share — server + opentunnel together. Reads codes from env/.env.
// Never prints secret codes. Prints the public URL on boot.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// Minimal .env loader (no dependency): KEY=value lines, no interpolation.
function loadEnvFile() {
  const p = path.join(root, '.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    if (process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
loadEnvFile();

const PORT = process.env.PORT || '8099';
const PUBLIC_URL = 'https://nicknameswipe.mkgw5rnc5pej.opentunnel.xyz';

if (!process.env.INVITE_CODE || !process.env.ADMIN_CODE) {
  console.error('share: set INVITE_CODE and ADMIN_CODE in .env (or env) before sharing.');
  process.exit(1);
}

const children = [];
function run(cmd, args, label) {
  const child = spawn(cmd, args, { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], shell: process.platform === 'win32' });
  children.push(child);
  child.stdout.on('data', (d) => process.stdout.write(`[${label}] ${d}`));
  child.stderr.on('data', (d) => process.stderr.write(`[${label}] ${d}`));
  child.on('exit', (code) => {
    console.error(`[${label}] exited (${code}). stopping share.`);
    shutdown();
  });
  return child;
}

let stopping = false;
function shutdown() {
  if (stopping) return;
  stopping = true;
  for (const c of children) {
    try {
      c.kill();
    } catch {
      // already gone
    }
  }
  process.exit(0);
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

run('node', ['server/index.js'], 'app');
run('opentunnel', ['serve'], 'tunnel');
console.log(`share: app on 127.0.0.1:${PORT}, public URL ${PUBLIC_URL}`);
console.log('share: press Ctrl+C to stop both.');
