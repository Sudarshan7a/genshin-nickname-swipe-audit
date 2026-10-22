import { describe, it, expect } from 'vitest';
import { normalizeNicknameText, nicknameId, upsertVote, separateAnswers, isHelpQueueOnly, collapseConfidence } from '../shared/logic.js';

describe('shared logic', () => {
  it('normalizes nickname text for stable ids', () => {
    expect(normalizeNicknameText('  Cocogoat  ')).toBe('cocogoat');
    expect(normalizeNicknameText('Geo   Daddy')).toBe('geo daddy');
    expect(nicknameId('ganyu', 'Cocogoat')).toBe(nicknameId('ganyu', '  cocogoat '));
  });

  it('upserts votes without duplicating (voter+entity+nickname unique)', () => {
    const store = new Map();
    upsertVote(store, { voterId: 'v1', entityId: 'ganyu', nicknameId: 'abc', answer: 'heard' });
    upsertVote(store, { voterId: 'v1', entityId: 'ganyu', nicknameId: 'abc', answer: 'never' });
    expect(store.size).toBe(1);
    expect(store.values().next().value.answer).toBe('never');
  });

  it('keeps heard/never/unsure as separate values', () => {
    const votes = [
      { answer: 'heard' },
      { answer: 'never' },
      { answer: 'unsure' },
      { answer: 'heard' }
    ];
    const sep = separateAnswers(votes);
    expect(sep.heard.length).toBe(2);
    expect(sep.never.length).toBe(1);
    expect(sep.unsure.length).toBe(1);
  });

  it('routes 0-candidate entities to help queue', () => {
    expect(isHelpQueueOnly({ nicknames: [] })).toBe(true);
    expect(isHelpQueueOnly({ nicknames: [{ id: 'x' }] })).toBe(false);
  });

  it('collapses drifting confidence labels', () => {
    expect(collapseConfidence('Strongly supported')).toBe('high');
    expect(collapseConfidence('Attested / medium')).toBe('medium');
    expect(collapseConfidence('Weak / one-off')).toBe('preliminary');
    expect(collapseConfidence('found preliminary; page fetch failed')).toBe('preliminary');
    expect(collapseConfidence('Supported shortened form / technical alias')).toBe('preliminary');
    expect(collapseConfidence('')).toBe('unknown');
  });
});
