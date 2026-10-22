// Screenshots the three static concepts at mobile + desktop.
import { chromium } from '@playwright/test';

const SHOTS = [
  ['a-mobile', 'design/concepts/a.html', { width: 390, height: 844 }],
  ['a-desktop', 'design/concepts/a.html', { width: 1440, height: 900 }],
  ['b-mobile', 'design/concepts/b.html', { width: 390, height: 844 }],
  ['b-desktop', 'design/concepts/b.html', { width: 1440, height: 900 }],
  ['c-mobile', 'design/concepts/c.html', { width: 390, height: 844 }],
  ['c-desktop', 'design/concepts/c.html', { width: 1440, height: 900 }],
];

const browser = await chromium.launch();
for (const [name, file, vp] of SHOTS) {
  const page = await browser.newPage({ viewport: vp });
  await page.goto(`file://${process.cwd()}/${file}`);
  await page.waitForTimeout(2500); // webfont settle
  await page.screenshot({ path: `design/concepts/${name}.png` });
  console.log('ok', name);
  await page.close();
}
await browser.close();
