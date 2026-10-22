// Offline command queue + optimistic-vote helpers. Plain JS, framework-free
// so tests can import it directly. Server upserts make replay idempotent;
// a 409 on suggest replay means the suggestion already exists, so the item
// is treated as resolved rather than retried forever. Nothing is dropped.

const QUEUE_KEY = 'ns-queue';
const VOTES_KEY = 'ns-my-votes';
const DAYS_KEY = 'ns-vote-dates';

// Module-level fallback when localStorage is unavailable (private mode, tests).
let memoryQueue = null;

function readLS(key) {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      return globalThis.localStorage.getItem(key);
    }
  } catch {
    // fall through to memory
  }
  return null;
}

function writeLS(key, value) {
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.setItem(key, value);
      return;
    }
  } catch {
    // fall through to memory
  }
  if (key === QUEUE_KEY) memoryQueue = value;
}

function readMemoryQueue() {
  return memoryQueue;
}

export function loadQueue() {
  const raw = readLS(QUEUE_KEY) ?? readMemoryQueue();
  if (!raw) return [];
  try {
    const items = JSON.parse(raw);
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

export function saveQueue(items) {
  writeLS(QUEUE_KEY, JSON.stringify(items));
}

export function clearQueue() {
  saveQueue([]);
  memoryQueue = null;
  try {
    if (typeof globalThis.localStorage !== 'undefined') {
      globalThis.localStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    // ignore
  }
}

// item: { op: 'vote' | 'retract' | 'suggest', payload, attempts?, ts? }
export function enqueue(item) {
  const items = loadQueue();
  items.push({
    attempts: 0,
    ts: new Date().toISOString(),
    ...item,
  });
  saveQueue(items);
  return items.length;
}

async function sendItem(authFetch, item) {
  if (item.op === 'vote') {
    await authFetch('/api/vote', { method: 'POST', body: JSON.stringify(item.payload) });
  } else if (item.op === 'retract') {
    await authFetch('/api/vote', { method: 'DELETE', body: JSON.stringify(item.payload) });
  } else if (item.op === 'suggest') {
    try {
      await authFetch('/api/suggest', { method: 'POST', body: JSON.stringify(item.payload) });
    } catch (err) {
      if (err && err.status === 409) return; // already exists — resolved
      throw err;
    }
  } else {
    throw new Error(`Unknown queue op: ${item.op}`);
  }
}

// FIFO: each item attempted in order; failures keep their place with
// attempts++ and are never dropped. Returns { flushed, pending }.
export async function flushQueue(authFetch) {
  const items = loadQueue();
  if (items.length === 0) return { flushed: 0, pending: 0 };
  const remaining = [];
  let flushed = 0;
  for (const item of items) {
    try {
      await sendItem(authFetch, item);
      flushed += 1;
    } catch {
      remaining.push({ ...item, attempts: (item.attempts || 0) + 1 });
    }
  }
  saveQueue(remaining);
  return { flushed, pending: remaining.length };
}

// --- optimistic local vote mirror (nicknameId -> answer) ---

export function loadLocalVotes() {
  const raw = readLS(VOTES_KEY);
  if (!raw) return {};
  try {
    const v = JSON.parse(raw);
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export function saveLocalVotes(votesById) {
  writeLS(VOTES_KEY, JSON.stringify(votesById));
}

export function applyVoteOptimistic(votesById, nicknameId, answer) {
  return { ...votesById, [nicknameId]: answer };
}

export function retractOptimistic(votesById, nicknameId) {
  const next = { ...votesById };
  delete next[nicknameId];
  return next;
}

export function voteStatus(nicknameId, votesById) {
  const a = votesById ? votesById[nicknameId] : undefined;
  return a === 'heard' || a === 'never' || a === 'unsure' ? a : null;
}

// Index of the first unvoted nickname at/after fromIndex (wraps around),
// or -1 when every card has an answer. Drives chip-jump + auto-advance.
export function nextUnvoted(nicknames, votesById, fromIndex = 0) {
  const list = nicknames || [];
  for (let step = 0; step < list.length; step += 1) {
    const i = (fromIndex + step) % list.length;
    if (!voteStatus(list[i].id, votesById)) return i;
  }
  return -1;
}

// --- streak (display only, from local vote days) ---

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function loadVoteDays() {
  const raw = readLS(DAYS_KEY);
  if (!raw) return [];
  try {
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

export function recordVoteDay() {
  const today = todayISO();
  const days = loadVoteDays();
  if (!days.includes(today)) {
    days.push(today);
    writeLS(DAYS_KEY, JSON.stringify(days.slice(-60))); // keep last 60
  }
  return days;
}

// Pure: consecutive-day streak ending today (or yesterday, if the user
// hasn't voted yet today). `days` are 'YYYY-MM-DD' strings.
export function streakFromDates(days, today = todayISO()) {
  const set = new Set(days || []);
  let cursor = set.has(today) ? today : shiftDay(today, -1);
  if (!set.has(cursor)) return 0;
  let streak = 0;
  while (set.has(cursor)) {
    streak += 1;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

function shiftDay(iso, delta) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export function getStreak() {
  return streakFromDates(loadVoteDays());
}
