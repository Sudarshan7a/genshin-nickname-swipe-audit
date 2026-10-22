process.env.INVITE_CODE = 'test-invite';
process.env.ADMIN_CODE = 'test-admin';
process.env.SKIP_BACKUP = '1';

import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createApp } from '../server/index.js';
import { backupNow } from '../server/backup.js';
import { rateLimit } from '../server/rate-limit.js';
import { nicknameId } from '../shared/logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projRoot = path.resolve(__dirname, '..');

const INV = { 'x-invite-code': 'test-invite' };
const ADMIN = { 'x-invite-code': 'test-invite', 'x-admin-code': 'test-admin' };

let app;
let deckEntity; // entity with >= 5 nicknames, for vote tests
let emptyEntity; // entity with 0 nicknames, for suggestion tests
let tmpDir;
let dbPath;

function voteAs(voter, nid, entityId, answer) {
  return request(app).post('/api/vote').set(INV).set('x-voter-id', voter).send({ nicknameId: nid, entityId, answer });
}

beforeAll(async () => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'votes-test-'));
  dbPath = path.join(tmpDir, 'test.db');
  app = createApp({ dbPath });
  const data = JSON.parse(fs.readFileSync(path.join(projRoot, 'data', 'entities.json'), 'utf8'));
  deckEntity = data.entities.find((e) => (e.nicknames ?? []).length >= 5);
  emptyEntity = data.entities.find((e) => (e.nicknames ?? []).length === 0);
  expect(deckEntity).toBeTruthy();
  expect(emptyEntity).toBeTruthy();
});

describe('auth gates', () => {
  it('health needs no code', async () => {
    await request(app).get('/api/health').expect(200);
  });

  it('rejects missing and wrong invite codes without hints', async () => {
    const noCode = await request(app).get('/api/entities').expect(401);
    expect(noCode.body.error).toBe('unauthorized');
    await request(app).get('/api/entities').set('x-invite-code', 'wrong').expect(401);
  });

  it('requires admin code for results/export/admin routes', async () => {
    await request(app).get('/api/results').set(INV).expect(403);
    await request(app).get('/api/export').set(INV).expect(403);
    await request(app).post('/api/admin/suggestions/1').set(INV).send({ action: 'approve' }).expect(403);
  });

  it('serves entities with an invite code', async () => {
    const res = await request(app).get('/api/entities').set(INV).expect(200);
    expect(Array.isArray(res.body.entities)).toBe(true);
    expect(res.body.entities.length).toBeGreaterThan(100);
  });

  it('returns JSON 404 for unknown api routes', async () => {
    await request(app).get('/api/nope').set(INV).expect(404);
  });
});

describe('votes', () => {
  it('upserts: voting twice keeps one row with the latest answer', async () => {
    const n = deckEntity.nicknames[0];
    await voteAs('v-upsert', n.id, deckEntity.id, 'heard').expect(200);
    await voteAs('v-upsert', n.id, deckEntity.id, 'never').expect(200);
    const my = await request(app).get('/api/my-votes').set(INV).set('x-voter-id', 'v-upsert').expect(200);
    expect(my.body.votes).toHaveLength(1);
    expect(my.body.votes[0]).toMatchObject({ nicknameId: n.id, entityId: deckEntity.id, answer: 'never' });
  });

  it('keeps heard/never/unsure as separate values across voters', async () => {
    const n = deckEntity.nicknames[1];
    await voteAs('v-a', n.id, deckEntity.id, 'heard').expect(200);
    await voteAs('v-b', n.id, deckEntity.id, 'never').expect(200);
    await voteAs('v-c', n.id, deckEntity.id, 'unsure').expect(200);
    const res = await request(app).get('/api/results').set(ADMIN).expect(200);
    expect(res.body.results[n.id]).toMatchObject({ heard: 1, never: 1, unsure: 1, distinctVoters: 3, likely: false });
  });

  it('marks likely at 4-1 over 5 voters, not at 3-2, unsure excluded', async () => {
    const yes = deckEntity.nicknames[2];
    const no = deckEntity.nicknames[3];
    const mixed = deckEntity.nicknames[4];
    for (let i = 0; i < 4; i++) await voteAs(`v-y${i}`, yes.id, deckEntity.id, 'heard').expect(200);
    await voteAs('v-y4', yes.id, deckEntity.id, 'never').expect(200);
    for (let i = 0; i < 3; i++) await voteAs(`v-n${i}`, no.id, deckEntity.id, 'heard').expect(200);
    for (let i = 3; i < 5; i++) await voteAs(`v-n${i}`, no.id, deckEntity.id, 'never').expect(200);
    for (let i = 0; i < 4; i++) await voteAs(`v-m${i}`, mixed.id, deckEntity.id, 'heard').expect(200);
    await voteAs('v-m4', mixed.id, deckEntity.id, 'never').expect(200);
    for (let i = 5; i < 8; i++) await voteAs(`v-m${i}`, mixed.id, deckEntity.id, 'unsure').expect(200);

    const res = await request(app).get('/api/results').set(ADMIN).expect(200);
    expect(res.body.results[yes.id].likely).toBe(true);
    expect(res.body.results[yes.id].distinctVoters).toBe(5);
    expect(res.body.results[no.id].likely).toBe(false);
    // 4 heard + 1 never + 3 unsure: unsure must not sink the 80% bar
    expect(res.body.results[mixed.id]).toMatchObject({ heard: 4, never: 1, unsure: 3 });
    expect(res.body.results[mixed.id].likely).toBe(true);
    expect(res.body.results[yes.id].text).toBe(yes.text);
  });

  it('validates vote payloads', async () => {
    const n = deckEntity.nicknames[0];
    await request(app)
      .post('/api/vote')
      .set(INV)
      .set('x-voter-id', 'v-bad')
      .send({ nicknameId: n.id, entityId: deckEntity.id, answer: 'maybe' })
      .expect(400);
    await request(app)
      .post('/api/vote')
      .set(INV)
      .set('x-voter-id', 'v-bad')
      .send({ nicknameId: 'deadbeefdeadbeef', entityId: deckEntity.id, answer: 'heard' })
      .expect(400);
  });

  it('deletes a vote and reports 0 when nothing was there', async () => {
    const n = deckEntity.nicknames[0];
    await voteAs('v-del', n.id, deckEntity.id, 'heard').expect(200);
    const first = await request(app)
      .delete('/api/vote')
      .set(INV)
      .set('x-voter-id', 'v-del')
      .send({ nicknameId: n.id })
      .expect(200);
    expect(first.body).toEqual({ ok: true, deleted: 1 });
    const second = await request(app)
      .delete('/api/vote')
      .set(INV)
      .set('x-voter-id', 'v-del')
      .send({ nicknameId: n.id })
      .expect(200);
    expect(second.body).toEqual({ ok: true, deleted: 0 });
  });
});

describe('suggestions', () => {
  it('rejects duplicates of existing nicknames', async () => {
    const existing = deckEntity.nicknames[0];
    const res = await request(app)
      .post('/api/suggest')
      .set(INV)
      .set('x-voter-id', 'v-s1')
      .send({ entityId: deckEntity.id, nickname: `  ${existing.text.toUpperCase()}  ` })
      .expect(409);
    expect(res.body.match).toBeTruthy();
  });

  it('accepts, dedupes pending, and approves into the deck', async () => {
    const created = await request(app)
      .post('/api/suggest')
      .set(INV)
      .set('x-voter-id', 'v-s2')
      .send({ entityId: emptyEntity.id, nickname: 'Z Test Nick', whereHeard: ['friends'] })
      .expect(201);
    expect(created.body.ok).toBe(true);
    const id = created.body.id;

    await request(app)
      .post('/api/suggest')
      .set(INV)
      .set('x-voter-id', 'v-s3')
      .send({ entityId: emptyEntity.id, nickname: 'z   test nick' })
      .expect(409);

    await request(app).post(`/api/admin/suggestions/${id}`).set(ADMIN).send({ action: 'bogus' }).expect(400);
    await request(app).post('/api/admin/suggestions/999999').set(ADMIN).send({ action: 'approve' }).expect(404);
    const approved = await request(app)
      .post(`/api/admin/suggestions/${id}`)
      .set(ADMIN)
      .send({ action: 'approve' })
      .expect(200);
    expect(approved.body).toMatchObject({ ok: true, status: 'approved' });

    const res = await request(app).get('/api/entities').set(INV).expect(200);
    const entity = res.body.entities.find((e) => e.id === emptyEntity.id);
    const merged = entity.nicknames.find((n) => n.id === nicknameId(emptyEntity.id, 'Z Test Nick'));
    expect(merged).toMatchObject({
      text: 'Z Test Nick',
      quote: null,
      researchConfidence: 'unknown',
      provenance: [`user-suggestion:${id}`],
    });

    // The approved nickname is votable through the normal path.
    await voteAs('v-s4', merged.id, emptyEntity.id, 'heard').expect(200);
  });

  it('validates suggestion payloads', async () => {
    await request(app)
      .post('/api/suggest')
      .set(INV)
      .send({ entityId: 'character:nope', nickname: 'X' })
      .expect(400);
    await request(app).post('/api/suggest').set(INV).send({ entityId: emptyEntity.id, nickname: '   ' }).expect(400);
  });
});

describe('export', () => {
  it('downloads results.json with verified:false', async () => {
    const res = await request(app).get('/api/export').set(ADMIN).expect(200);
    expect(res.headers['content-disposition']).toMatch(/attachment/);
    expect(res.body.verified).toBe(false);
    expect(typeof res.body.generatedAt).toBe('string');
    expect(res.body.results).toBeTruthy();
  });
});

describe('rate limiter', () => {
  it('allows max requests per window then answers 429', () => {
    const mw = rateLimit({ windowMs: 60 * 1000, max: 2 });
    const mkRes = () => ({
      statusCode: 200,
      body: null,
      status(c) {
        this.statusCode = c;
        return this;
      },
      json(b) {
        this.body = b;
        return this;
      },
    });
    let nexts = 0;
    const next = () => {
      nexts += 1;
    };
    const req = { ip: '9.9.9.9', path: '/api/vote' };
    mw(req, mkRes(), next);
    mw(req, mkRes(), next);
    const blocked = mkRes();
    mw(req, blocked, next);
    expect(nexts).toBe(2);
    expect(blocked.statusCode).toBe(429);
    // A different IP is unaffected.
    mw({ ip: '8.8.8.8', path: '/api/vote' }, mkRes(), next);
    expect(nexts).toBe(3);
  });
});

describe('backups', () => {
  it('creates a timestamped copy and prunes to the newest 14', () => {
    const backupDir = path.join(tmpDir, 'backups');
    fs.mkdirSync(backupDir, { recursive: true });
    for (let i = 0; i < 15; i++) {
      fs.writeFileSync(path.join(backupDir, `votes-20200101-0000${String(i).padStart(2, '0')}.db`), 'old');
    }
    const dest = backupNow(dbPath, backupDir);
    expect(dest).toBeTruthy();
    expect(fs.existsSync(dest)).toBe(true);
    const files = fs.readdirSync(backupDir).filter((f) => f.endsWith('.db')).sort();
    expect(files).toHaveLength(14);
    expect(files).not.toContain('votes-20200101-000000.db');
    expect(files).not.toContain('votes-20200101-000001.db');
  });

  it('returns null when there is no db file yet', () => {
    expect(backupNow(path.join(tmpDir, 'missing.db'), path.join(tmpDir, 'backups2'))).toBeNull();
  });
});

describe('admin suggestions list + suggest validation', () => {
  it('lists pending suggestions for admins, 403 without admin code', async () => {
    await request(app).get('/api/admin/suggestions').set(INV).expect(403);
    const before = await request(app).get('/api/admin/suggestions?status=pending').set(ADMIN).expect(200);
    expect(Array.isArray(before.body.suggestions)).toBe(true);
    const r = await request(app).post('/api/suggest').set(INV).set('x-voter-id', 'listv').send({
      entityId: emptyEntity.id,
      nickname: 'Listy McListface',
    });
    expect(r.status).toBe(201);
    const after = await request(app).get('/api/admin/suggestions?status=pending').set(ADMIN).expect(200);
    expect(after.body.suggestions.some((s) => s.nickname === 'Listy McListface')).toBe(true);
  });

  it('rejects malformed sourceUrl and whereHeard', async () => {
    await request(app).post('/api/suggest').set(INV).set('x-voter-id', 'badv').send({
      entityId: emptyEntity.id,
      nickname: 'Bad Url Nick',
      sourceUrl: 'not-a-url',
    }).expect(400);
    await request(app).post('/api/suggest').set(INV).set('x-voter-id', 'badv').send({
      entityId: emptyEntity.id,
      nickname: 'Bad Heard Nick',
      whereHeard: 'reddit',
    }).expect(400);
    const ok = await request(app).post('/api/suggest').set(INV).set('x-voter-id', 'badv').send({
      entityId: emptyEntity.id,
      nickname: 'Good Url Nick',
      sourceUrl: 'https://example.com/post',
      whereHeard: ['Reddit', 'Friend'],
    });
    expect(ok.status).toBe(201);
  });
});
