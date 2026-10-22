import { describe, it, expect } from 'vitest';
import {
  splitAliases,
  isProseAlias,
  isFieldLabel,
  extractUrls,
  maxConfidence,
  tableBlocks,
  splitKeyedSections,
  isCandidateContext
} from '../scripts/ingest.mjs';
import { nicknameId, normalizeNicknameText } from '../shared/logic.js';

describe('ingest parsing', () => {
  it('splits multi-alias cells on slash', () => {
    expect(splitAliases('Miku / Hatsune Miku')).toEqual(['Miku', 'Hatsune Miku']);
    expect(splitAliases('TotM/ToM')).toEqual(['TotM', 'ToM']);
    expect(splitAliases('Donut / donut')).toEqual(['Donut', 'donut']);
  });

  it('rejects prose masquerading as aliases', () => {
    expect(isProseAlias('Sources')).toBe(false);
    expect(isProseAlias('starts with a P” joke')).toBe(true);
    expect(isProseAlias('a'.repeat(41))).toBe(true);
    expect(isProseAlias('No stable community nickname verified.')).toBe(true);
    expect(isProseAlias('Calcium Carbonate')).toBe(false);
  });

  it('recognizes field labels including slash-joined ones', () => {
    expect(isFieldLabel('Confidence:')).toBe(true);
    expect(isFieldLabel('Sources / search notes')).toBe(true);
    expect(isFieldLabel('Miku / Hatsune Miku')).toBe(false);
  });

  it('extracts and dedupes urls', () => {
    const urls = extractUrls('See [guide](https://keqingmains.com/misc/artifacts/) and https://keqingmains.com/misc/artifacts/ plus https://example.com/a).');
    expect(urls).toEqual(['https://keqingmains.com/misc/artifacts/', 'https://example.com/a']);
  });

  it('keeps the stronger confidence on merge', () => {
    expect(maxConfidence('high', 'preliminary')).toBe('high');
    expect(maxConfidence('unknown', 'medium')).toBe('medium');
  });

  it('nickname ids are stable across re-ingest', () => {
    expect(nicknameId('character:ganyu', 'Cocogoat')).toBe(nicknameId('character:ganyu', '  COCOGOAT  '));
    expect(normalizeNicknameText('Geo   Daddy')).toBe('geo daddy');
  });

  it('splits sections by key and tracks sub-context per part', () => {
    const md = '## 1. `barbara`\n\n### Candidates\n- **Barb** — **Moderate.** x\n\n### Evidence\n- https://example.com\n';
    const secs = splitKeyedSections(md, new Set(['barbara']));
    expect(secs.length).toBe(1);
    expect(secs[0].key).toBe('barbara');
    expect(secs[0].parts.length).toBe(3);
    expect(isCandidateContext(secs[0].parts[1].ctx)).toBe(true);
    expect(isCandidateContext(secs[0].parts[2].ctx)).toBe(false);
  });

  it('only treats header+separator tables as tables', () => {
    const blocks = tableBlocks(['| Candidate | Type |', '|---|---|', '| **Kokofish** | Meme |', '', 'not a table |']);
    expect(blocks.length).toBe(1);
    expect(blocks[0].rows.length).toBe(1);
  });
});
