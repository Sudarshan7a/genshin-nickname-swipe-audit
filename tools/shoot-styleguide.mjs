// Screenshots the M3 styleguide at both sizes.
import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';

const preview = spawn('npx', ['vite', 'preview', '--port', '4199'], { stdio: 'pipe', shell: true });
await new Promise((r) => setTimeout(r, 4000));
const browser = await chromium.launch();
try {
  for (const [name, vp] of [['styleguide-mobile', { width: 390, height: 844 }], ['styleguide-desktop', { width: 1440, height: 900 }]]) {
    const page = await browser.newPage({ viewport: vp });
    await page.goto('http://localhost:4199/#/styleguide', { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `design/${name}.png`, fullPage: true });
    console.log('ok', name);
    await page.close();
  }
} finally {
  await browser.close();
  try {
    const { execSync } = await import('node:child_process');
    execSync(`taskkill /PID ${preview.pid} /T /F`);
  } catch { /* already dead */ }
}
