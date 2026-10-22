import fs from 'node:fs';
import path from 'node:path';

export default function globalSetup() {
  const dir = path.join('e2e', '.tmp');
  fs.mkdirSync(dir, { recursive: true });
  const db = path.join(dir, 'e2e.db');
  for (const suffix of ['', '-wal', '-shm', '-journal']) {
    try {
      fs.rmSync(db + suffix, { force: true });
    } catch {
      // ignore
    }
  }
}
