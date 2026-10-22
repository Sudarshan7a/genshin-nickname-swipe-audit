import { expect } from '@playwright/test';
import { test, gotoDeck, ensureShotDir } from './helpers';

test.afterEach(async ({ consoleState }) => {
  expect(consoleState.errors).toEqual([]);
});

test('screenshots: summary, empty, error, gate', async ({ page, browser }, testInfo) => {
  ensureShotDir();
  const tag = testInfo.project.name;

  // Summary: single-nickname entity voted through the UI.
  await gotoDeck(page, `states-${tag}-${Date.now()}`);
  await page.getByRole('button', { name: 'Weapons', exact: true }).click();
  await page.getByLabel('Search entries').fill('amos');
  await expect(page.getByRole('heading', { name: "AMOS' BOW" })).toBeVisible();
  await page.getByRole('button', { name: 'Heard', exact: true }).click();
  await expect(page.locator('[data-testid="summary"]')).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/summary-${tag}.png` });

  // Empty: impossible search.
  await page.getByLabel('Search entries').fill('zzz-no-such-entry');
  await expect(page.locator('[data-testid="empty"]')).toBeVisible();
  await page.screenshot({ path: `e2e/screenshots/empty-${tag}.png` });

  // Gate: fresh context, no code.
  const gateCtx = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const gate = await gateCtx.newPage();
  const gateErrors: string[] = [];
  gate.on('console', (msg) => {
    if (msg.type() === 'error') gateErrors.push(msg.text());
  });
  gate.on('pageerror', (err) => gateErrors.push(String(err)));
  await gate.goto('/');
  await expect(gate.locator('[data-testid="gate"]')).toBeVisible();
  await gate.screenshot({ path: `e2e/screenshots/gate-${tag}.png` });
  expect(gateErrors).toEqual([]);
  await gateCtx.close();

  // Error: entities endpoint unreachable.
  const offCtx = await browser.newContext({ viewport: page.viewportSize() ?? undefined });
  const off = await offCtx.newPage();
  await off.addInitScript(() => {
    window.localStorage.setItem('ns-code', 'test-e2e-2026');
    window.localStorage.setItem('ns-voter', 'states-offline');
  });
  await off.route('**/api/entities', (route) => route.abort('failed'));
  await off.goto('/');
  await expect(off.locator('[data-testid="error"]')).toBeVisible();
  await off.screenshot({ path: `e2e/screenshots/error-${tag}.png` });
  await offCtx.close();
});
