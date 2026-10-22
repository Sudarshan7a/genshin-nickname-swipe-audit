// M4/M5 checks: live app (test env, e2e db) at both sizes + all flows.
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
const voter = `shot-${Date.now()}`;
try {
  for (const vp of [[{ width: 390, height: 844 }, 'mobile'], [{ width: 1440, height: 900 }, 'desktop']]) {
    const [viewport, tag] = vp;
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.addInitScript((v) => {
      window.localStorage.setItem('ns-code', 'test-e2e-2026');
      window.localStorage.setItem('ns-voter', v);
    }, voter + tag);
    await page.goto('http://127.0.0.1:3112/', { waitUntil: 'networkidle', timeout: 30000 });
    await page.getByRole('heading', { name: 'ALBEDO' }).waitFor({ timeout: 15000 });
    await page.screenshot({ path: `design/deck-m5-${tag}.png` });

    // Summary: single-nickname entity voted through.
    await page.getByRole('button', { name: 'Weapons', exact: true }).click();
    await page.getByLabel('Search entries').fill('amos');
    await page.getByRole('heading', { name: "AMOS' BOW" }).waitFor();
    await page.getByRole('button', { name: 'Heard', exact: true }).click();
    await page.getByRole('heading', { name: "AMOS' BOW" }).first().waitFor();
    await page.screenshot({ path: `design/summary-m5-${tag}.png` });

    // Help queue.
    await page.getByLabel('Search entries').fill('');
    await page.getByRole('button', { name: /Help find names/ }).click();
    await page.getByRole('heading', { name: 'Help find names' }).waitFor();
    await page.screenshot({ path: `design/help-m5-${tag}.png` });

    // Admin gate + unlocked desk.
    await page.goto('http://127.0.0.1:3112/#/admin');
    await page.getByRole('heading', { name: 'Review desk' }).waitFor();
    await page.screenshot({ path: `design/admin-gate-m5-${tag}.png` });
    await page.getByLabel('Admin code').fill('test-e2e-admin-2026');
    await page.getByRole('button', { name: 'Unlock' }).click();
    await page.getByRole('button', { name: 'Download results.json' }).waitFor({ timeout: 15000 });
    await page.screenshot({ path: `design/admin-m5-${tag}.png` });

    console.log('ok', tag, 'console-errors:', JSON.stringify(errors));
    await page.close();
  }
} finally {
  await browser.close();
  try { execSync(`taskkill /PID ${server.pid} /T /F`); } catch { /* dead */ }
}
