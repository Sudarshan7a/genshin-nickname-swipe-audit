import { createHash } from 'node:crypto';

export function normalizeNicknameText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

export function nicknameId(entityId, text) {
  const norm = normalizeNicknameText(text);
  return createHash('sha1').update(`${entityId}::${norm}`).digest('hex').slice(0, 16);
}

export function collapseConfidence(raw) {
  const s = String(raw ?? '').toLowerCase();
  if (!s) return 'unknown';
  if (s.includes('technical-only') || s.includes('technical only') || s.includes('technical alias') || s.includes('technical naming')) return 'preliminary';
  if (s.includes('preliminary') || s.includes('snippet') || s.includes('cache miss') || s.includes('unverified')) return 'preliminary';
  if (s.includes('strong') || s.includes('recurr') || s.includes('high') || s.includes('verif') || s.includes('supported') || s.includes('explicit')) return 'high';
  if (s.includes('medium') || s.includes('moderate') || s.includes('attested') || s.includes('plausible') || s.includes('context')) return 'medium';
  if (s.includes('weak') || s.includes('one-off') || s.includes('oneoff') || s.includes('joke') || s.includes('low') || s.includes('tentat') || s.includes('personal')) return 'preliminary';
  return 'unknown';
}

// Pure upsert helper used by server + tests. votes: Map keyed `${voterId}::${entityId}::${nicknameId}`.
export function upsertVote(store, { voterId, entityId, nicknameId: nid, answer }) {
  if (!['heard', 'never', 'unsure'].includes(answer)) throw new Error('bad answer');
  const key = `${voterId}::${entityId}::${nid}`;
  store.set(key, { voterId, entityId, nicknameId: nid, answer, updatedAt: new Date().toISOString() });
  return store.get(key);
}

export function separateAnswers(votes) {
  const out = { heard: [], never: [], unsure: [] };
  for (const v of votes) {
    if (v.answer === 'heard') out.heard.push(v);
    else if (v.answer === 'never') out.never.push(v);
    else out.unsure.push(v);
  }
  return out;
}

// Zero-candidate rule: entities with 0 nicknames go to help-queue, not main deck.
export function isHelpQueueOnly(entity) {
  return !entity.nicknames || entity.nicknames.length === 0;
}
