// One-shot research tool: screenshot reference pages into design/refs/.
// Usage: node tools/shoot-refs.mjs  (kept for M6 re-shoots)
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const REFS = [
  ['hoyoverse-chars', 'https://genshin.hoyoverse.com/en/character/mondstadt'],
  ['linear-refresh', 'https://linear.app/now/behind-the-latest-design-refresh'],
  ['balatro-juice', 'https://blakecrosley.com/guides/design/balatro'],
  ['mobbin-card', 'https://mobbin.com/glossary/card'],
  ['m3-motion', 'https://m3.material.io/styles/motion/easing-and-duration'],
  ['laws-fitts', 'https://lawsofux.com/fittss-law/'],
  ['persona5-ui', 'https://jiaxinwen.wordpress.com/2017/04/27/the-ui-design-of-persona-5/'],
  ['magicui-shine', 'https://magicui.design/docs/components/shine-border'],
  ['aceternity-cards', 'https://ui.aceternity.com/blocks/cards'],
  ['awwwards-swipe', 'https://www.awwwards.com/inspiration/card-swipe-interaction-imagine-people'],
];

mkdirSync('design/refs', { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
for (const [name, url] of REFS) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `design/refs/${name}.png` });
    console.log('ok', name);
  } catch (e) {
    console.log('MISS', name, String(e).split('\n')[0]);
  }
}
await browser.close();
