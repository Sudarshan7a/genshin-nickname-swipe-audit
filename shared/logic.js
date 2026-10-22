export function normalizeNicknameText(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

// Pure-JS SHA-1 (hex). Byte-identical to node:crypto sha1 for UTF-8 input.
// Kept dependency-free so browsers can share nicknameId with the server.
function sha1Hex(message) {
  const bytes = new TextEncoder().encode(String(message));
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 1 + 8) / 64) * 64;
  const buf = new Uint8Array(paddedLen);
  buf.set(bytes);
  buf[bytes.length] = 0x80;
  const dv = new DataView(buf.buffer);
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 2 ** 32));
  dv.setUint32(paddedLen - 4, bitLen >>> 0);
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);
  const rotl = (x, n) => ((x << n) | (x >>> (32 - n))) >>> 0;
  for (let off = 0; off < paddedLen; off += 64) {
    for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);
    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f;
      let k;
      if (i < 20) {
        f = ((b & c) | (~b & d)) >>> 0;
        k = 0x5a827999;
      } else if (i < 40) {
        f = (b ^ c ^ d) >>> 0;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = ((b & c) | (b & d) | (c & d)) >>> 0;
        k = 0x8f1bbcdc;
      } else {
        f = (b ^ c ^ d) >>> 0;
        k = 0xca62c1d6;
      }
      const tmp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30);
      b = a;
      a = tmp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }
  return [h0, h1, h2, h3, h4].map((h) => h.toString(16).padStart(8, '0')).join('');
}

export function nicknameId(entityId, text) {
  const norm = normalizeNicknameText(text);
  return sha1Hex(`${entityId}::${norm}`).slice(0, 16);
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

// Per-nickname tallies from a flat vote list. Pure.
// Input: [{ nicknameId, entityId, voterId, answer, text? }]
// Output: { [nicknameId]: { entityId, nicknameId, text?, heard, never, unsure, distinctVoters, likely } }
// likely = distinctVoters >= 5 && heard >= 0.8 * (heard + never); unsure never counts toward the bar.
export function computeResults(votes) {
  const byId = new Map();
  for (const v of votes ?? []) {
    if (!v || !v.nicknameId) continue;
    let e = byId.get(v.nicknameId);
    if (!e) {
      e = { entityId: v.entityId, nicknameId: v.nicknameId, heard: 0, never: 0, unsure: 0, voters: new Set() };
      if (v.text !== undefined) e.text = v.text;
      byId.set(v.nicknameId, e);
    }
    if (v.answer === 'heard') e.heard += 1;
    else if (v.answer === 'never') e.never += 1;
    else if (v.answer === 'unsure') e.unsure += 1;
    if (v.voterId !== undefined && v.voterId !== null) e.voters.add(v.voterId);
  }
  const out = {};
  for (const [id, e] of byId) {
    const decided = e.heard + e.never;
    const distinctVoters = e.voters.size;
    const entry = {
      entityId: e.entityId,
      nicknameId: e.nicknameId,
      heard: e.heard,
      never: e.never,
      unsure: e.unsure,
      distinctVoters,
      likely: distinctVoters >= 5 && decided > 0 && e.heard >= 0.8 * decided,
    };
    if (e.text !== undefined) entry.text = e.text;
    out[id] = entry;
  }
  return out;
}

// Normalized-duplicate check for a candidate suggestion. Pure.
// Returns { ok: true } when free, else { match } naming the colliding entry.
export function suggestionDedupe(normalized, existingNormalizedList, pendingNormalizedList) {
  const norm = normalizeNicknameText(normalized);
  const all = [...(existingNormalizedList ?? []), ...(pendingNormalizedList ?? [])];
  const hit = all.find((s) => normalizeNicknameText(s) === norm);
  if (hit !== undefined) return { match: hit };
  return { ok: true };
}

// Current consecutive-day streak from activity date strings (YYYY-MM-DD or ISO).
// Counts back from today; a streak ending yesterday still counts (display only).
export function streakFromDates(dateStrings) {
  const days = new Set();
  for (const d of dateStrings ?? []) {
    if (!d) continue;
    const s = String(d);
    const m = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      days.add(`${m[1]}-${m[2]}-${m[3]}`);
    } else {
      const t = new Date(s);
      if (!Number.isNaN(t.getTime())) days.add(t.toISOString().slice(0, 10));
    }
  }
  if (days.size === 0) return 0;
  const fmt = (t) => new Date(t).toISOString().slice(0, 10);
  const now = Date.now();
  let cursor;
  if (days.has(fmt(now))) cursor = now;
  else if (days.has(fmt(now - 86400000))) cursor = now - 86400000;
  else return 0;
  // Walk back to the start of the current day (UTC) so DST never splits a day.
  const startOfDay = Date.parse(`${fmt(cursor)}T00:00:00.000Z`);
  let streak = 0;
  for (let t = startOfDay; days.has(fmt(t)); t -= 86400000) streak += 1;
  return streak;
}
