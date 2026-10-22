import fs from 'node:fs';
import path from 'node:path';

export function backupFileName(date = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return (
    `votes-${date.getUTCFullYear()}${p(date.getUTCMonth() + 1)}${p(date.getUTCDate())}` +
    `-${p(date.getUTCHours())}${p(date.getUTCMinutes())}${p(date.getUTCSeconds())}.db`
  );
}

const BACKUP_PATTERN = /^votes-\d{8}-\d{6}\.db$/;
const KEEP_NEWEST = 14;

// Copy the live db file into backupDir, then prune to the newest 14.
// Returns the created file path, or null when there is no db file yet.
export function backupNow(dbPath, backupDir) {
  if (!fs.existsSync(dbPath)) return null;
  fs.mkdirSync(backupDir, { recursive: true });
  const dest = path.join(backupDir, backupFileName());
  fs.copyFileSync(dbPath, dest);
  const files = fs.readdirSync(backupDir).filter((f) => BACKUP_PATTERN.test(f)).sort();
  while (files.length > KEEP_NEWEST) {
    const oldest = files.shift();
    try {
      fs.unlinkSync(path.join(backupDir, oldest));
    } catch {
      // Already gone (concurrent prune); nothing to do.
    }
  }
  return dest;
}

// Run once at startup, then every 24h. Timer is unref'd so it never holds the process open.
export function startBackups(dbPath, backupDir) {
  try {
    backupNow(dbPath, backupDir);
  } catch (err) {
    console.error('backup failed', err);
  }
  const timer = setInterval(() => {
    try {
      backupNow(dbPath, backupDir);
    } catch (err) {
      console.error('backup failed', err);
    }
  }, 24 * 60 * 60 * 1000);
  if (typeof timer.unref === 'function') timer.unref();
  return timer;
}
