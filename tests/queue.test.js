import { beforeEach, describe, expect, it } from 'vitest';
import {
  loadQueue,
  saveQueue,
  clearQueue,
  enqueue,
  flushQueue,
  applyVoteOptimistic,
  retractOptimistic,
  voteStatus,
  nextUnvoted,
  streakFromDates,
} from '../src/store/queue.js';

beforeEach(() => {
  clearQueue();
});

describe('offline queue', () => {
  it('enqueue persists items to storage', () => {
    enqueue({ op: 'vote', payload: { nicknameId: 'a', entityId: 'e', answer: 'heard' } });
    enqueue({ op: 'suggest', payload: { entityId: 'e', nickname: 'Foo' } });
    const items = loadQueue();
    expect(items).toHaveLength(2);
    expect(items[0].op).toBe('vote');
    expect(items[0].attempts).toBe(0);
    expect(typeof items[0].ts).toBe('string');
  });

  it('flush sends FIFO and removes successes', async () => {
    const seen = [];
    const authFetch = async (path, init) => {
      seen.push({ path, body: JSON.parse(init.body) });
      return { ok: true };
    };
    enqueue({ op: 'vote', payload: { nicknameId: 'a' } });
    enqueue({ op: 'retract', payload: { nicknameId: 'b' } });
    enqueue({ op: 'suggest', payload: { nicknameId: 'c' } });
    const res = await flushQueue(authFetch);
    expect(res).toEqual({ flushed: 3, pending: 0 });
    expect(seen.map((s) => s.path)).toEqual(['/api/vote', '/api/vote', '/api/suggest']);
    expect(loadQueue()).toEqual([]);
  });

  it('failed items are retained with attempts++ and keep order', async () => {
    const authFetch = async (path, init) => {
      const body = JSON.parse(init.body);
      if (body.nicknameId === 'bad') throw new Error('offline');
      return { ok: true };
    };
    enqueue({ op: 'vote', payload: { nicknameId: 'bad' } });
    enqueue({ op: 'vote', payload: { nicknameId: 'good' } });
    const first = await flushQueue(authFetch);
    expect(first).toEqual({ flushed: 1, pending: 1 });
    const remaining = loadQueue();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].payload.nicknameId).toBe('bad');
    expect(remaining[0].attempts).toBe(1);
    const second = await flushQueue(authFetch);
    expect(second.pending).toBe(1);
    expect(loadQueue()[0].attempts).toBe(2);
  });

  it('a 409 suggest replay counts as resolved, not a failure', async () => {
    const authFetch = async () => {
      const err = new Error('already on file');
      err.status = 409;
      throw err;
    };
    enqueue({ op: 'suggest', payload: { entityId: 'e', nickname: 'Dup' } });
    const res = await flushQueue(authFetch);
    expect(res).toEqual({ flushed: 1, pending: 0 });
    expect(loadQueue()).toEqual([]);
  });

  it('unknown ops are retained, not dropped', async () => {
    const authFetch = async () => ({ ok: true });
    saveQueue([{ op: 'bogus', payload: {}, attempts: 0 }]);
    const res = await flushQueue(authFetch);
    expect(res.pending).toBe(1);
    expect(loadQueue()[0].attempts).toBe(1);
  });
});

describe('optimistic vote helpers', () => {
  it('apply/retract/status round-trip', () => {
    let votes = {};
    expect(voteStatus('x', votes)).toBeNull();
    votes = applyVoteOptimistic(votes, 'x', 'heard');
    expect(voteStatus('x', votes)).toBe('heard');
    votes = applyVoteOptimistic(votes, 'x', 'never'); // change answer
    expect(voteStatus('x', votes)).toBe('never');
    votes = retractOptimistic(votes, 'x');
    expect(voteStatus('x', votes)).toBeNull();
  });

  it('ignores invalid stored answers', () => {
    expect(voteStatus('x', { x: 'maybe' })).toBeNull();
  });

  it('nextUnvoted finds the next card to show (chip jump)', () => {
    const nicks = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
    expect(nextUnvoted(nicks, {}, 0)).toBe(0);
    expect(nextUnvoted(nicks, { a: 'heard' }, 0)).toBe(1);
    expect(nextUnvoted(nicks, { a: 'heard', b: 'never' }, 0)).toBe(2);
    expect(nextUnvoted(nicks, { a: 'heard', b: 'never', c: 'unsure' }, 0)).toBe(-1);
    // wraps around to earlier unvoted cards
    expect(nextUnvoted(nicks, { b: 'heard', c: 'heard' }, 1)).toBe(0);
  });
});

describe('streak', () => {
  it('counts consecutive days ending today', () => {
    expect(streakFromDates(['2026-10-20', '2026-10-21', '2026-10-22'], '2026-10-22')).toBe(3);
  });
  it('tolerates a missing today when yesterday exists', () => {
    expect(streakFromDates(['2026-10-20', '2026-10-21'], '2026-10-22')).toBe(2);
  });
  it('breaks on a gap and is zero with no vote days', () => {
    expect(streakFromDates(['2026-10-18', '2026-10-20', '2026-10-22'], '2026-10-22')).toBe(1);
    expect(streakFromDates([], '2026-10-22')).toBe(0);
  });
});
