import { expect } from '@playwright/test';
import { test, gotoDeck, ensureShotDir, ADMIN_CODE } from './helpers';

test.afterEach(async ({ consoleState }) => {
  expect(consoleState.errors).toEqual([]);
});

async function smallTargets(page) {
  return page.evaluate(() => {
    const bad: string[] = [];
    for (const el of Array.from(document.querySelectorAll('button, input'))) {
      const r = (el as HTMLElement).getBoundingClientRect();
      const visible = r.width > 0 && r.height > 0 && r.bottom > 0 && r.right > 0;
      if (!visible) continue;
      if (r.height < 44) bad.push(`${el.tagName}.${(el as HTMLElement).className} h=${Math.round(r.height)}`);
    }
    return bad;
  });
}

async function noHOverflow(page) {
  const overflow = await page.evaluate(() => {
    const d = document.documentElement;
    return { scrollW: d.scrollWidth, clientW: d.clientWidth };
  });
  expect(overflow.scrollW).toBeLessThanOrEqual(overflow.clientW + 1);
}

test('no horizontal overflow; tap targets reachable', async ({ page }, testInfo) => {
  await gotoDeck(page, `layout-${testInfo.project.name}`);
  await expect(page.locator('.card-nick').first()).toBeVisible();
  // Let the card enter-spring settle: rects include transforms while animating.
  await page.waitForFunction(() => {
    const el = document.querySelector('.swipe-card');
    if (!el) return false;
    const t = getComputedStyle(el).transform;
    return t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)';
  });
  await noHOverflow(page);
  expect(await smallTargets(page)).toEqual([]);

  const trayInView = await page.evaluate(() => {
    const tray = document.querySelector('.tray');
    if (!tray) return false;
    const r = tray.getBoundingClientRect();
    return r.left >= -1 && r.right <= window.innerWidth + 1;
  });
  expect(trayInView).toBe(true);

  await page.getByRole('button', { name: /Help find names/ }).click();
  await expect(page.getByRole('heading', { name: /Help us find names/ })).toBeVisible();
  await noHOverflow(page);
  expect(await smallTargets(page)).toEqual([]);

  await page.goto('/#/admin');
  await page.getByLabel(/Admin code/).fill(ADMIN_CODE);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('heading', { name: /Review desk/ })).toBeVisible();
  await noHOverflow(page);
  expect(await smallTargets(page)).toEqual([]);
});

test('screenshots: deck, tray, help queue, admin', async ({ page }, testInfo) => {
  ensureShotDir();
  const tag = testInfo.project.name;
  await gotoDeck(page, `shots-${tag}`);
  await expect(page.locator('.card-nick').first()).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/deck-${tag}.png` });
  await page.locator('.tray').screenshot({ path: `e2e/screenshots/tray-${tag}.png` });

  await page.getByRole('button', { name: /Help find names/ }).click();
  await expect(page.getByRole('heading', { name: /Help us find names/ })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/help-${tag}.png` });

  await page.goto('/#/admin');
  await page.getByLabel(/Admin code/).fill(ADMIN_CODE);
  await page.getByRole('button', { name: 'Unlock' }).click();
  await expect(page.getByRole('heading', { name: /Review desk/ })).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/admin-${tag}.png` });
});
