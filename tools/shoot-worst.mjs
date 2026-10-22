// M6R2: worst-case (33-char nickname) at 320px + reduced-motion deck.
import { chromium } from '@playwright/test';
import { spawn, execSync } from 'node:child_process';

const server = spawn('node', ['server/index.js'], {
  env: { ...process.env, INVITE_CODE: 'test-e2e-2026', ADMIN_CODE: 'x', VOTES_DB: 'e2e/.tmp/e2e.db', ENTITIES_PATH: 'data/entities.json', SKIP_BACKUP: '1', PORT: '3115' },
  stdio: 'pipe', shell: false,
});
await new Promise((r) => setTimeout(r, 3000));
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ viewport: { width: 320, height: 700 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.addInitScript(() => {
    window.localStorage.setItem('ns-code', 'test-e2e-2026');
    window.localStorage.setItem('ns-voter', 'worst-' + Date.now());
  });
  await page.goto('http://127.0.0.1:3115/', { waitUntil: 'networkidle', timeout: 30000 });
  await page.getByRole('button', { name: 'Weapons', exact: true }).click();
  await page.getByLabel('Search entries').fill('luxurious');
  await page.locator('[data-testid="card-nick"]').first().waitFor({ timeout: 15000 });
  const overflow = await page.evaluate(() => ({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth }));
  console.log('worst-case overflow:', JSON.stringify(overflow), 'errors:', JSON.stringify(errors));
  await page.screenshot({ path: 'design/worst-320.png' });
  await page.close();

  const rm = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await rm.addInitScript(() => {
    window.localStorage.setItem('ns-code', 'test-e2e-2026');
    window.localStorage.setItem('ns-voter', 'rm-' + Date.now());
  });
  await rm.goto('http://127.0.0.1:3115/', { waitUntil: 'networkidle', timeout: 30000 });
  await rm.locator('[data-testid="card-nick"]').first().waitFor({ timeout: 15000 });
  await rm.screenshot({ path: 'design/reduced-motion.png' });
  console.log('ok reduced-motion');
  await rm.close();
} finally {
  await browser.close();
  try { execSync('taskkill /PID ' + server.pid + ' /T /F'); } catch { /* dead */ }
}
