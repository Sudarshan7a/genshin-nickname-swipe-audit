import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { openDb } from './db.js';
import { requireInvite, requireAdmin } from './auth.js';
import { rateLimit } from './rate-limit.js';
import { startBackups } from './backup.js';
import {
  nicknameId,
  normalizeNicknameText,
  computeResults,
  suggestionDedupe,
} from '../shared/logic.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const ANSWERS = new Set(['heard', 'never', 'unsure']);

function loadEntities(entitiesPath) {
  const raw = fs.readFileSync(entitiesPath, 'utf8');
  const data = JSON.parse(raw);
  return Array.isArray(data.entities) ? data.entities : [];
}

// Merge approved suggestions into the entity deck at serve time, so an
// approval is visible on the very next GET /api/entities without a restart.
function buildDeck(entities, approvedSuggestions) {
  const byEntity = new Map();
  for (const s of approvedSuggestions) {
    if (!byEntity.has(s.entity_id)) byEntity.set(s.entity_id, []);
    byEntity.get(s.entity_id).push(s);
  }
  const merged = entities.map((e) => {
    const extra = byEntity.get(e.id) ?? [];
    if (extra.length === 0) return e;
    const nicknames = [...(e.nicknames ?? [])];
    for (const s of extra) {
      nicknames.push({
        id: nicknameId(e.id, s.nickname),
        text: s.nickname,
        sourceUrl: s.source_url ?? null,
        sources: s.source_url ? [s.source_url] : [],
        quote: null,
        researchConfidence: 'unknown',
        provenance: [`user-suggestion:${s.id}`],
      });
    }
    return { ...e, nicknames };
  });
  const byNicknameId = new Map();
  for (const e of merged) {
    for (const n of e.nicknames ?? []) byNicknameId.set(n.id, { entityId: e.id, text: n.text });
  }
  return { entities: merged, byNicknameId };
}

function resolveVoterId(req) {
  const raw = req.header('x-voter-id');
  if (typeof raw === 'string' && raw.trim()) return raw.trim().slice(0, 128);
  return randomUUID();
}

export function createApp(opts = {}) {
  const dbPath = opts.dbPath ?? process.env.VOTES_DB ?? path.join(root, 'data', 'votes.db');
  const entitiesPath = opts.entitiesPath ?? process.env.ENTITIES_PATH ?? path.join(root, 'data', 'entities.json');
  const entities = loadEntities(entitiesPath);
  const entityIds = new Set(entities.map((e) => e.id));
  const db = openDb(dbPath);

  const app = express();
  // Behind the same-machine tunnel every socket arrives from loopback.
  // Trust only loopback proxies so req.ip is the real client IP from
  // X-Forwarded-For and rate limits are per friend, not per tunnel.
  // If the proxy sends no forwarding header this falls back to the socket
  // address, exactly as before.
  app.set('trust proxy', 'loopback');
  app.use(express.json({ limit: '64kb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.use('/api', requireInvite);

  const writeLimit = rateLimit({ windowMs: 60 * 1000, max: 300 });

  function mergedDeck() {
    const approved = db.prepare('SELECT * FROM suggestions WHERE status = ?').all('approved');
    return buildDeck(entities, approved);
  }

  function tallyResults() {
    const deck = mergedDeck();
    const rows = db
      .prepare('SELECT voter_id AS voterId, nickname_id AS nicknameId, entity_id AS entityId, answer FROM votes')
      .all();
    return computeResults(
      rows.map((r) => ({ ...r, text: deck.byNicknameId.get(r.nicknameId)?.text })),
    );
  }

  app.get('/api/entities', (_req, res) => {
    res.json({ entities: mergedDeck().entities });
  });

  app.post('/api/vote', writeLimit, (req, res) => {
    const { nicknameId: nid, entityId, answer } = req.body ?? {};
    if (typeof nid !== 'string' || typeof entityId !== 'string' || !ANSWERS.has(answer)) {
      return res.status(400).json({ error: 'bad vote' });
    }
    const known = mergedDeck().byNicknameId.get(nid);
    if (!known || known.entityId !== entityId) {
      return res.status(400).json({ error: 'unknown nickname' });
    }
    const voterId = resolveVoterId(req);
    const now = new Date().toISOString();
    db.prepare('INSERT INTO voters (voter_id, created_at) VALUES (?, ?) ON CONFLICT(voter_id) DO NOTHING').run(
      voterId,
      now,
    );
    db.prepare(
      `INSERT INTO votes (voter_id, nickname_id, entity_id, answer, updated_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(voter_id, nickname_id)
       DO UPDATE SET entity_id = excluded.entity_id, answer = excluded.answer, updated_at = excluded.updated_at`,
    ).run(voterId, nid, entityId, answer, now);
    return res.json({ ok: true, vote: { nicknameId: nid, entityId, answer, voterId, updatedAt: now } });
  });

  app.delete('/api/vote', writeLimit, (req, res) => {
    const voterId = req.header('x-voter-id');
    const { nicknameId: nid } = req.body ?? {};
    if (typeof voterId !== 'string' || !voterId || typeof nid !== 'string' || !nid) {
      return res.status(400).json({ error: 'bad request' });
    }
    const info = db.prepare('DELETE FROM votes WHERE voter_id = ? AND nickname_id = ?').run(voterId, nid);
    return res.json({ ok: true, deleted: info.changes > 0 ? 1 : 0 });
  });

  app.get('/api/my-votes', (req, res) => {
    const voterId = req.header('x-voter-id');
    if (typeof voterId !== 'string' || !voterId) {
      return res.status(400).json({ error: 'missing voter' });
    }
    const rows = db
      .prepare(
        'SELECT nickname_id AS nicknameId, entity_id AS entityId, answer, updated_at AS updatedAt FROM votes WHERE voter_id = ? ORDER BY updated_at ASC',
      )
      .all(voterId);
    return res.json({ votes: rows });
  });

  app.post('/api/suggest', writeLimit, (req, res) => {
    const { entityId, nickname, sourceUrl, whereHeard } = req.body ?? {};
    if (typeof entityId !== 'string' || !entityIds.has(entityId)) {
      return res.status(400).json({ error: 'unknown entity' });
    }
    const text = typeof nickname === 'string' ? nickname.trim() : '';
    if (text.length < 1 || text.length > 80) {
      return res.status(400).json({ error: 'bad nickname' });
    }
    let url = null;
    if (sourceUrl !== undefined && sourceUrl !== null && sourceUrl !== '') {
      if (typeof sourceUrl !== 'string' || !/^https?:\/\/\S+$/i.test(sourceUrl.trim())) {
        return res.status(400).json({ error: 'bad sourceUrl' });
      }
      url = sourceUrl.trim();
    }
    let heardJson = null;
    if (whereHeard !== undefined) {
      if (!Array.isArray(whereHeard) || whereHeard.some((w) => typeof w !== 'string')) {
        return res.status(400).json({ error: 'bad whereHeard' });
      }
      heardJson = JSON.stringify(whereHeard.map((w) => w.trim()).filter(Boolean).slice(0, 10));
    }
    const normalized = normalizeNicknameText(text);
    const entity = mergedDeck().entities.find((e) => e.id === entityId);
    const existing = (entity?.nicknames ?? []).map((n) => normalizeNicknameText(n.text));
    const pending = db
      .prepare('SELECT normalized FROM suggestions WHERE entity_id = ? AND status = ?')
      .all(entityId, 'pending')
      .map((r) => r.normalized);
    const dup = suggestionDedupe(normalized, existing, pending);
    if (dup.match) return res.status(409).json({ match: dup.match });
    const voterId = resolveVoterId(req);
    const now = new Date().toISOString();
    db.prepare('INSERT INTO voters (voter_id, created_at) VALUES (?, ?) ON CONFLICT(voter_id) DO NOTHING').run(
      voterId,
      now,
    );
    const info = db
      .prepare(
        `INSERT INTO suggestions (voter_id, entity_id, nickname, normalized, source_url, where_heard, status, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
      )
      .run(voterId, entityId, text, normalized, url, heardJson, now);
    return res.status(201).json({ ok: true, id: Number(info.lastInsertRowid) });
  });

  app.get('/api/results', requireAdmin, (_req, res) => {
    return res.json({ results: tallyResults() });
  });

  app.get('/api/export', requireAdmin, (_req, res) => {
    res.attachment('results.json');
    return res.json({ verified: false, generatedAt: new Date().toISOString(), results: tallyResults() });
  });

  app.get('/api/admin/suggestions', requireAdmin, (req, res) => {
    const status = req.query.status;
    const rows = status === 'pending' || status === 'approved' || status === 'rejected'
      ? db.prepare('SELECT * FROM suggestions WHERE status = ? ORDER BY id ASC').all(status)
      : db.prepare('SELECT * FROM suggestions ORDER BY id ASC').all();
    return res.json({ suggestions: rows });
  });

  app.post('/api/admin/suggestions/:id', writeLimit, requireAdmin, (req, res) => {
    const { action } = req.body ?? {};
    if (action !== 'approve' && action !== 'reject') {
      return res.status(400).json({ error: 'bad action' });
    }
    const row = db.prepare('SELECT * FROM suggestions WHERE id = ?').get(req.params.id);
    if (!row) return res.status(404).json({ error: 'not found' });
    const status = action === 'approve' ? 'approved' : 'rejected';
    db.prepare('UPDATE suggestions SET status = ? WHERE id = ?').run(status, req.params.id);
    return res.json({ ok: true, id: Number(req.params.id), status });
  });

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'not found' });
  });

  const dist = path.join(root, 'dist');
  if (fs.existsSync(dist)) {
    app.use(express.static(dist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(dist, 'index.html'));
    });
  } else {
    app.get('/', (_req, res) => {
      res.json({ ok: true, mode: 'api' });
    });
  }

  return app;
}

const invokedAsMain =
  typeof process.argv[1] === 'string' && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (invokedAsMain) {
  const dbPath = process.env.VOTES_DB ?? path.join(root, 'data', 'votes.db');
  if (process.env.SKIP_BACKUP !== '1') {
    startBackups(dbPath, path.join(root, 'backups'));
  }
  const app = createApp({ dbPath });
  const PORT = Number(process.env.PORT || 3000);
  app.listen(PORT, () => {
    console.log(`nickname-swipe listening on :${PORT}`);
  });
}
