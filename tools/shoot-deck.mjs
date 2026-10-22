// M4 check: screenshot the live deck (test env, e2e db) at both sizes.
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';

const server = spawn('node', ['server/index.js'], {
  env: {
    ...process.env,
    INVITE_CODE: 'test-e2e-2026',
    ADMIN_CODE: 'test-e2e-admin-2026',
    VOTES_DB: 'e2e/.tmp/e2e.db',
    ENTITIES_PATH: 'data/entities.json',
    SKIP_BACKUP: '1',
    PORT: '3112',
  },
  stdio: 'pipe',
  shell: false,
});
await new Promise((r) => setTimeout(r, 3000));
const browser = await chromium.launch();
try {
  for (const [name, vp] of [['deck-m4-mobile', { width: 390, height: 844 }], ['deck-m4-desktop', { width: 1440, height: 900 }]]) {
    const page = await browser.newPage({ viewport: vp });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript(() => {
      window.localStorage.setItem('ns-code', 'test-e2e-2026');
      window.localStorage.setItem('ns-voter', 'm4-check');
    });
    await page.goto('http://127.0.0.1:3112/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `design/${name}.png` });
    console.log('ok', name, 'console-errors:', JSON.stringify(errors));
    await page.close();
  }
} finally {
  await browser.close();
  try { execSync(`taskkill /PID ${server.pid} /T /F`); } catch { /* dead */ }
}
