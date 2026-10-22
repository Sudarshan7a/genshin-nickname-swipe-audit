import { expect } from '@playwright/test';
import { test, gotoDeck, myVotes, apiHeaders } from './helpers';

test.afterEach(async ({ consoleState }) => {
  expect(consoleState.errors).toEqual([]);
});

type Nick = { id: string; text: string };
type Ent = { id: string; type: string; name: string; nicknames: Nick[] };

async function deckEntities(page): Promise<Ent[]> {
  const res = await page.request.get('/api/entities', { headers: await apiHeaders(page) });
  expect(res.ok()).toBeTruthy();
  const { entities } = await res.json();
  return (entities as Ent[]).filter((e) => (e.nicknames ?? []).length > 0);
}

async function activeCardText(page) {
  return (await page.locator('[data-testid="card-nick"]').first().textContent()) ?? '';
}

function bare(text: string) {
  return text.replace(/[“”"]/g, '').trim();
}

async function mouseDrag(page, dx: number, dy: number, fast: boolean) {
  const card = page.locator('.swipe-card').first();
  const box = await card.boundingBox();
  if (!box) throw new Error('no card box');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  const steps = fast ? 4 : 24;
  for (let i = 1; i <= steps; i += 1) {
    await page.mouse.move(cx + (dx * i) / steps, cy + (dy * i) / steps, { steps: 1 });
    if (!fast) await page.waitForTimeout(18);
  }
  await page.mouse.up();
}

async function touchDrag(page, dx: number, dy: number, fast: boolean) {
  const session = await page.context().newCDPSession(page);
  const card = page.locator('.swipe-card').first();
  const box = await card.boundingBox();
  if (!box) throw new Error('no card box');
  const cx = Math.round(box.x + box.width / 2);
  const cy = Math.round(box.y + box.height / 2);
  const point = (x: number, y: number) => ({ x: Math.round(x), y: Math.round(y), id: 1 });
  await session.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [point(cx, cy)] });
  const steps = fast ? 4 : 24;
  for (let i = 1; i <= steps; i += 1) {
    await session.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [point(cx + (dx * i) / steps, cy + (dy * i) / steps)],
    });
    if (!fast) await page.waitForTimeout(18);
  }
  await session.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
}

async function drag(page, project: string, dx: number, dy: number, fast: boolean) {
  if (project === 'mobile') await touchDrag(page, dx, dy, fast);
  else await mouseDrag(page, dx, dy, fast);
}

const ANSWERS = [
  { dir: 'right' as const, dx: 260, dy: 0, answer: 'heard' },
  { dir: 'left' as const, dx: -260, dy: 0, answer: 'never' },
  { dir: 'up' as const, dx: 0, dy: -260, answer: 'unsure' },
];

for (const { dir, dx, dy, answer } of ANSWERS) {
  test(`drag ${dir} commits ${answer}`, async ({ page }, testInfo) => {
    const voter = `drag-${dir}-${testInfo.project.name}-${Date.now()}`;
    await gotoDeck(page, voter);
    const [first] = await deckEntities(page);
    const target = first.nicknames[0];
    expect(bare(await activeCardText(page))).toBe(target.text);
    await drag(page, testInfo.project.name, dx, dy, true);
    await expect.poll(() => activeCardText(page), { timeout: 8000 }).not.toContain(target.text);
    expect(await myVotes(page)).toContainEqual(
      expect.objectContaining({ nicknameId: target.id, entityId: first.id, answer }),
    );
  });
}

test('slow short drag springs back with no commit', async ({ page }, testInfo) => {
  const voter = `drag-slow-${testInfo.project.name}-${Date.now()}`;
  await gotoDeck(page, voter);
  const [first] = await deckEntities(page);
  const before = bare(await activeCardText(page));
  expect(before).toBe(first.nicknames[0].text);
  const beforeVotes = await myVotes(page);
  await drag(page, testInfo.project.name, 42, 0, false);
  await page.waitForTimeout(900);
  expect(bare(await activeCardText(page))).toBe(before);
  expect(await myVotes(page)).toEqual(beforeVotes);
});

test('fast flick commits via velocity', async ({ page }, testInfo) => {
  const voter = `drag-flick-${testInfo.project.name}-${Date.now()}`;
  await gotoDeck(page, voter);
  const [first] = await deckEntities(page);
  const target = first.nicknames[0];
  expect(bare(await activeCardText(page))).toBe(target.text);
  await drag(page, testInfo.project.name, 190, 0, true);
  await expect.poll(() => activeCardText(page), { timeout: 8000 }).not.toContain(target.text);
  expect(await myVotes(page)).toContainEqual(
    expect.objectContaining({ nicknameId: target.id, answer: 'heard' }),
  );
});
