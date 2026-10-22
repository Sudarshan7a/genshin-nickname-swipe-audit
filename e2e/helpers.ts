import { test as base, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

export const INVITE_CODE = 'test-e2e-2026';
export const ADMIN_CODE = 'test-e2e-admin-2026';

// Failing console output collected per test; zero console errors is part of the gate.
type ConsoleState = { errors: string[] };

export const test = base.extend<{ consoleState: ConsoleState }>({
  consoleState: async ({ page }, use) => {
    const state: ConsoleState = { errors: [] };
    page.on('console', (msg) => {
      if (msg.type() === 'error') state.errors.push(msg.text());
    });
    page.on('pageerror', (err) => state.errors.push(String(err)));
    await use(state);
  },
});

export async function gotoDeck(page, voterId: string) {
  await page.addInitScript(
    ({ code, voter }) => {
      window.localStorage.setItem('ns-code', code);
      window.localStorage.setItem('ns-voter', voter);
    },
    { code: INVITE_CODE, voter: voterId },
  );
  await page.goto('/?code=' + INVITE_CODE);
  await expect(page.locator('.card-nick, .summary-title, .gate-card')).toBeVisible();
}

export async function apiHeaders(page) {
  const voterId = await page.evaluate(() => window.localStorage.getItem('ns-voter'));
  return { 'x-invite-code': INVITE_CODE, 'x-voter-id': voterId ?? '' };
}

export async function myVotes(page) {
  const res = await page.request.get('/api/my-votes', { headers: await apiHeaders(page) });
  expect(res.ok()).toBeTruthy();
  return (await res.json()).votes as Array<{ nicknameId: string; entityId: string; answer: string }>;
}

export async function entityById(page, entityId: string) {
  const res = await page.request.get('/api/entities', { headers: await apiHeaders(page) });
  expect(res.ok()).toBeTruthy();
  const { entities } = await res.json();
  return entities.find((e: { id: string }) => e.id === entityId);
}

export function ensureShotDir() {
  fs.mkdirSync(path.join('e2e', 'screenshots'), { recursive: true });
}
