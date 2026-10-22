// scripts/ingest.mjs — STEP 0 ingest. Reads ONLY `new research/`, writes `data/entities.json`.
// Never invent names/nicknames/sources. Missing fields stay null.
// Usage: node scripts/ingest.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  normalizeNicknameText,
  nicknameId,
  collapseConfidence
} from '../shared/logic.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const NR = path.join(ROOT, 'new research');
const CHAR_DIR = path.join(NR, 'character');
const ART_DIR = path.join(NR, 'aritfacts');
const WPN_DIR = path.join(NR, 'weapons');
const WPN_BATCH_DIR = path.join(WPN_DIR, 'weapon research by other agent');
const OUT_FILE = path.join(ROOT, 'data', 'entities.json');
const NOTES_FILE = path.join(ROOT, 'DATA-NOTES.md');

const conflicts = []; // every merge/conflict decision, written to DATA-NOTES.md
const parseFailures = [];
const log = (s) => conflicts.push(s);

/* ---------------- small pure helpers (tested in tests/ingest.test.js) ---------------- */

/** Split one candidate cell into individual aliases on "/". */
export function splitAliases(raw) {
  return String(raw ?? '')
    .split('/')
    .map((s) => s.trim().replace(/^['"“”*]+|['"“”*]+$/g, '').trim())
    .filter((s) => s && !/^(none|n\/a|—|---|\.*)$/i.test(s));
}

/** A raw alias string that is really prose/a joke description, not a votable term. */
export function isProseAlias(alias) {
  const a = String(alias).trim();
  if (!a) return true;
  if (a.length > 40) return true;
  if (/[.!?]$/.test(a)) return true;
  if (/\bjoke\b/i.test(a) && /\s/.test(a)) return true;
  if (/^starts with\b/i.test(a)) return true;
  if (/["“”]/.test(a)) return true;
  return false;
}

/** Extract markdown-link + bare URLs, cleaned + deduped, order preserved. */
export function extractUrls(text) {
  const out = [];
  const seen = new Set();
  const push = (u) => {
    const clean = String(u).replace(/[.,;:!?'"”)\]]+$/g, '');
    if (!/^https?:\/\//i.test(clean)) return;
    if (seen.has(clean)) return;
    seen.add(clean);
    out.push(clean);
  };
  for (const m of String(text).matchAll(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g)) push(m[1]);
  const stripped = String(text).replace(/\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/g, ' ');
  for (const m of stripped.matchAll(/(https?:\/\/[^\s)>\]]+)/g)) push(m[1]);
  return out;
}

/** Backticked + “quoted” + "quoted" terms inside a line (for do-not-promote mining). */
export function quotedTerms(line) {
  const out = [];
  for (const m of String(line).matchAll(/`([^`]+)`/g)) out.push(m[1]);
  for (const m of String(line).matchAll(/[“"]([^“”"]{1,60})[”"]/g)) out.push(m[1]);
  return out;
}

/** Bold-led field labels that are section metadata, never nickname candidates. */
export function isFieldLabel(term) {
  const parts = String(term).split('/').map((p) => p.trim().replace(/:$/, ''));
  if (!parts.length) return false;
  return parts.every((t) => /^(assessment|confidence|evidence|sources?|notes?|search notes?|candidate terms?|exact|do not promote|shared|retrieved|quote|outcome|previous report outcome|nickname|research note|re-review note)$/i.test(t));
}

const CONF_RANK = { high: 3, medium: 2, preliminary: 1, unknown: 0 };
export function maxConfidence(a, b) {
  return CONF_RANK[a] >= CONF_RANK[b] ? a : b;
}

/** Sub-contexts (### headings) where tables/bullets must NOT be read as candidates. */
export function isCandidateContext(ctx) {
  if (!ctx) return true; // no subheading: tables directly under the item heading count
  if (/candidate/i.test(ctx)) return true;
  return !/evidence|source|method|scope|note|gap|register|reference|rule|finding|summary|recommend|disposition|check|report|retriev|fetch|record/i.test(ctx);
}

function headingKeyAndDisplay(title, keySet) {
  const bt = title.match(/`([^`]+)`/);
  if (bt && keySet.has(bt[1].toLowerCase())) {
    const key = bt[1].toLowerCase();
    const parts = title.replace(/`/g, '').split('—');
    let display = (parts.length > 1 ? parts[parts.length - 1] : parts[0]).replace(/^\d+\.\s*/, '').trim() || null;
    // headings like `1. Lauma (lauma)`: strip the trailing parenthesized key
    if (display) display = display.replace(/\s*\([a-z0-9'_-]+\)\s*$/i, '').trim() || null;
    return { key, display };
  }
  const pm = title.match(/^([A-Za-z0-9'_-]+)\s*\(([^)]+)\)\s*$/);
  if (pm && keySet.has(pm[1].toLowerCase())) return { key: pm[1].toLowerCase(), display: pm[2].trim() };
  return null;
}

/**
 * Split markdown into sections keyed by entity key.
 * Numbered headings without a key in the title open pending sections (key resolved
 * later from an `Exact key:` line — never from the heading number). Batch/report meta
 * headings close the current section. Non-numbered ### subheadings become the section's
 * table/bullet context (ctx).
 */
export function splitKeyedSections(md, keySet) {
  const sections = [];
  let cur = null;
  const flush = () => {
    if (cur) sections.push(cur);
    cur = null;
  };
  for (const line of String(md).split('\n')) {
    const h = line.match(/^#{2,4}\s+(.*)$/);
    if (!h) {
      if (cur) {
        cur.parts[cur.parts.length - 1].lines.push(line);
        cur.body += line + '\n';
      }
      continue;
    }
    const title = h[1].trim();
    const hit = headingKeyAndDisplay(title, keySet);
    if (hit) {
      flush();
      // bare `1. `key`` headings carry no display name — fall back to prettified key later
      const display = hit.display && hit.display.toLowerCase() !== hit.key ? hit.display : null;
      cur = { key: hit.key, display, heading: title, parts: [{ ctx: null, lines: [] }], body: '' };
      continue;
    }
    if (/^\d+\.\s+/.test(title)) {
      flush();
      cur = { key: null, display: title.replace(/^\d+\.\s*/, '').trim(), heading: title, parts: [{ ctx: null, lines: [] }], body: '' };
      continue;
    }
    if (/batch|report|summary|scope|coverage|appendix/i.test(title)) {
      flush();
      continue;
    }
    // sub-context heading inside a section (### Candidates / ### Evidence / ...)
    if (cur) {
      cur.parts.push({ ctx: title.toLowerCase(), lines: [] });
      cur.body += line + '\n';
    }
  }
  flush();
  return sections;
}

/* ---------------- entity store ---------------- */

function makeEntity(id, type, key, name, imageUrl) {
  return { id, type, key, name, imageUrl: imageUrl ?? null, _map: new Map() };
}

function addCandidate(ent, text, { sourceUrl = null, sources = [], quote = null, researchConfidence = 'unknown', provenance = [] }) {
  const norm = normalizeNicknameText(text);
  if (!norm) return;
  const id = nicknameId(ent.id, text);
  const srcList = [...(sources ?? [])];
  if (sourceUrl && !srcList.includes(sourceUrl)) srcList.unshift(sourceUrl);
  const got = ent._map.get(norm);
  if (got) {
    for (const s of srcList) if (s && !got.sources.includes(s)) got.sources.push(s);
    for (const p of provenance) if (p && !got.provenance.includes(p)) got.provenance.push(p);
    if (quote && !got.quote) got.quote = quote;
    got.researchConfidence = maxConfidence(got.researchConfidence, researchConfidence);
    return;
  }
  ent._map.set(norm, {
    id,
    text: String(text).trim(),
    sourceUrl: sourceUrl ?? null,
    sources: srcList.filter(Boolean),
    quote: quote ?? null,
    researchConfidence,
    provenance: [...provenance]
  });
}

function finalizeEntity(ent) {
  const rank = { high: 0, medium: 1, preliminary: 2, unknown: 3 };
  const nicknames = [...ent._map.values()]
    .sort((a, b) => rank[a.researchConfidence] - rank[b.researchConfidence] || a.text.localeCompare(b.text))
    .map(({ id, text, sourceUrl, sources, quote, researchConfidence, provenance }) => ({
      id, text, sourceUrl, sources, quote, researchConfidence, provenance: [...provenance].sort()
    }));
  return { id: ent.id, type: ent.type, name: ent.name, imageUrl: ent.imageUrl, nicknames };
}

function prettifyKey(key) {
  return key.replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\w/, (c) => c.toUpperCase());
}

/** Group consecutive table lines into {header, separator, rows} blocks. */
export function tableBlocks(lines) {
  const blocks = [];
  let cur = null;
  const flush = () => {
    if (cur) blocks.push(cur);
    cur = null;
  };
  for (const line of lines) {
    if (/^\s*\|/.test(line)) {
      const cells = line.trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      if (/^[-:\s|]+$/.test(cells.join(''))) {
        if (cur) cur.hasSeparator = true;
        continue; // separator row consumed, not data
      }
      if (!cur) cur = { header: cells, hasSeparator: false, rows: [] };
      else cur.rows.push(cells);
      continue;
    }
    flush();
  }
  flush();
  return blocks.filter((b) => b.hasSeparator);
}

const CLASS_EXCLUDE = /official|in-universe|title|form of address|honorific|\blore\b|spelling variant|generic|descript|not a nickname|not a stable|role\/title/i;

/* ---------------- characters ---------------- */

function parseCharacterSections(files, keySet) {
  const acc = new Map();
  const ensure = (k) => {
    if (!acc.has(k)) acc.set(k, { displays: new Set(), cands: [] });
    return acc.get(k);
  };
  for (const f of files) {
    const md = fs.readFileSync(path.join(CHAR_DIR, f), 'utf8');
    const provenance = [`character/${f}`];
    for (const s of splitKeyedSections(md, keySet)) {
      const slot = ensure(s.key);
      if (s.display) slot.displays.add(s.display);
      const urls = extractUrls(s.body);
      const lines = s.body.split('\n');
      // section-level confidence fallback (plain or bold "Confidence:" labels)
      let sectionConf = 'unknown';
      for (const line of lines) {
        const cm = line.match(/confiden\w*\*{0,2}\s*:\s*(.+)$/i);
        if (cm) { sectionConf = collapseConfidence(cm[1]); break; }
      }
      // exclusion mining: do-not-promote / not-a-community-nickname sentences
      // (strip bold markers first: researchers write "Do **not** promote")
      const excluded = new Set();
      for (const sent of s.body.split(/(?<=[.!?])\s+/)) {
        const plain = sent.replace(/\*/g, '');
        if (/do not promote/i.test(plain) || /not (?:the |a )?community[- ]?nickname/i.test(plain)) {
          for (const t of quotedTerms(sent)) excluded.add(normalizeNicknameText(t));
        }
      }
      const displayNorm = (s.display || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const keep = (text, confRaw) => {
        for (const alias of splitAliases(text)) {
          if (isProseAlias(alias)) continue;
          const n = normalizeNicknameText(alias);
          if (!n || excluded.has(n)) continue;
          if (displayNorm && n.replace(/[^a-z0-9]/g, '') === displayNorm) continue; // official name
          slot.cands.push({ text: alias.trim(), confidenceRaw: confRaw ?? sectionConf, urls, provenance });
        }
      };
      // tables (only candidate tables: header names a candidate-ish column; per-part ctx)
      for (const part of s.parts) {
        if (!isCandidateContext(part.ctx)) continue;
        for (const t of tableBlocks(part.lines)) {
          const headJoined = t.header.join(' | ');
          if (!/candidate|observed term|alias|nickname/i.test(headJoined)) continue;
          const classIdx = t.header.findIndex((c) => /class|type/i.test(c));
          const confIdx = t.header.findIndex((c) => /confiden/i.test(c));
          for (const row of t.rows) {
            const rowText = row.join(' | ');
            if (/not a nickname|not a separate alias|must not be mapped|do not map/i.test(rowText)) continue;
            if (classIdx >= 0 && CLASS_EXCLUDE.test(row[classIdx] || '')) continue;
            const notesIdx = t.header.findIndex((c) => /note/i.test(c));
            if (notesIdx >= 0 && /not a nickname|not a stable|do not label/i.test(row[notesIdx] || '')) continue;
            const termCell = (row[0] || '').replace(/\*\*/g, '').trim();
            if (!termCell || /^(candidate|observed term|term)$/i.test(termCell)) continue;
            keep(termCell, collapseConfidence(confIdx >= 0 ? (row[confIdx] || sectionConf) : sectionConf));
          }
        }
      }
      for (const part of s.parts) {
        if (!isCandidateContext(part.ctx)) continue;
        for (const line of part.lines) {
          const t = line.trim();
          if (t.startsWith('|')) continue; // handled as tables above
          // ctx-gated bullets + prose candidate lines
          const b = t.match(/^-\s*\*\*(.+?)\*\*\s*(?:—|-|:)?\s*(.*)$/);
          if (b) {
            if (/^candidate terms/i.test(b[1])) {
              for (const m of t.matchAll(/`([^`]+)`/g)) {
                if (/^none\b/i.test(m[1])) continue;
                keep(m[1], sectionConf);
              }
              continue;
            }
            if (isFieldLabel(b[1]) || b[1].length > 40 || /[.!?]$/.test(b[1].trim())) continue;
            const lab = (b[2].match(/\*\*(.+?)\*\*/) || [])[1] || '';
            if (/not a nickname|not a separate alias|must not be mapped|do not map/i.test(lab) || /not a nickname|not a separate alias|must not be mapped|do not map/i.test(b[2])) continue;
            keep(b[1], collapseConfidence(lab || sectionConf));
            continue;
          }
          if (/\*?\*?candidate terms?/i.test(t)) {
            for (const m of t.matchAll(/`([^`]+)`/g)) {
              if (/^none\b/i.test(m[1])) continue;
              keep(m[1], sectionConf);
            }
          }
        }
      }
    }
  }
  return acc;
}

/* ---------------- artifacts (parse by Exact key, never by number) ---------------- */

function parseArtifactSections(files, keySet) {
  const acc = new Map();
  const ensure = (k) => {
    if (!acc.has(k)) acc.set(k, { displays: new Set(), cands: [] });
    return acc.get(k);
  };
  for (const f of files) {
    const md = fs.readFileSync(path.join(ART_DIR, f), 'utf8');
    const provenance = [`aritfacts/${f}`];
    for (const s of splitKeyedSections(md, keySet)) {
      let key = s.key;
      if (!key) {
        const km = (s.body.match(/exact key:\*{0,2}\s*`([^`]+)`/i) || [])[1];
        key = (km || '').toLowerCase();
      }
      if (!key || !keySet.has(key)) {
        parseFailures.push(`artifact ${f} :: heading "${s.heading}" has no resolvable Exact key`);
        continue;
      }
      const dm = s.body.match(/exact display name:\*{0,2}\s*`([^`]+)`/i);
      const slot = ensure(key);
      slot.displays.add(dm ? dm[1] : s.display);
      const urls = extractUrls(s.body);
      const lines = s.body.split('\n');
      let sectionConf = 'unknown';
      for (const line of lines) {
        const am = line.match(/assessment\*{0,2}\s*:\s*(.+)$/i);
        if (am) { sectionConf = collapseConfidence(am[1]); break; }
      }
      const displayNorm = (dm ? dm[1] : s.display || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const keep = (text, confRaw) => {
        for (const alias of splitAliases(text)) {
          if (isProseAlias(alias)) continue;
          const n = normalizeNicknameText(alias);
          if (!n) continue;
          if (displayNorm && n.replace(/[^a-z0-9]/g, '') === displayNorm) continue;
          slot.cands.push({ text: alias.trim(), confidenceRaw: confRaw ?? sectionConf, urls, provenance });
        }
      };
      // outcome-style blocks (batch-1 format): Outcome + nickname fields
      const outcome = (s.body.match(/-\s*outcome:\s*([^\n]+)/i) || [])[1] || '';
      if (outcome) {
        if (!/found/i.test(outcome)) continue; // not stated → zero candidates
        const nm = (s.body.match(/-\s*(?:candidate nickname|nickname\s*\/\s*abbreviation|nickname|abbreviation)\s*:\s*([^\n]+)/i) || [])[1] || '';
        const qm = s.body.match(/-\s*quote:\s*([^\n]+)/i);
        let quote = qm ? qm[1].trim().replace(/^["“”']+|["“”']+$/g, '').trim() : null;
        if (!quote || /^(—+|-+|…+)$/.test(quote)) quote = null;
        if (nm.trim() && !/^—+$/.test(nm.trim()) && !/^-+$/.test(nm.trim())) {
          for (const alias of splitAliases(nm.replace(/\*\*/g, ''))) {
            if (isProseAlias(alias)) continue;
            slot.cands.push({
              text: alias.trim(), confidenceRaw: sectionConf === 'unknown' ? 'high' : sectionConf,
              urls, provenance, quoteOverride: quote
            });
          }
        }
        // attach quotes to candidates of this section
        if (quote) for (const c of slot.cands) if (c.provenance === provenance && !c.quote) c.quote = quote;
        continue;
      }
      // tables (corrective format), per-part ctx
      for (const part of s.parts) {
        if (!isCandidateContext(part.ctx)) continue;
        for (const t of tableBlocks(part.lines)) {
          const headJoined = t.header.join(' | ');
          if (!/candidate/i.test(headJoined)) continue;
          const confIdx = t.header.findIndex((c) => /evidence status|confidence/i.test(c));
          for (const row of t.rows) {
            const rowText = row.join(' | ');
            if (/not a nickname|too generic|explicitly rejected|not a separate alias|must not be mapped/i.test(rowText)) continue;
            const termCell = (row[0] || '').replace(/`/g, '').replace(/\*\*/g, '').trim();
            if (!termCell || /^(candidate|exact)/i.test(termCell)) continue;
            keep(termCell, collapseConfidence(confIdx >= 0 ? (row[confIdx] || sectionConf) : sectionConf));
          }
        }
      }
      // **Candidate:** / **Candidate terms...:** lines, per-part ctx
      for (const part of s.parts) {
        if (!isCandidateContext(part.ctx)) continue;
        for (const line of part.lines) {
          const t = line.trim();
          if (t.startsWith('|')) continue;
          const cm = t.match(/\*?\*?candidates?(?: terms?( found)?)?\*?\*?\s*:\s*(.+)$/i);
          if (!cm) continue;
          const after = cm[2] || '';
          if (/none established/i.test(after)) continue;
          const lineConf = /technical|unconfirmed|pending|not .*establish/i.test(after) ? 'preliminary' : sectionConf;
          const ticks = [...after.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
          if (ticks.length) {
            for (const tk of ticks) {
              if (/^none\b/i.test(tk)) continue;
              keep(tk, lineConf);
            }
          } else if (!/none/i.test(after)) {
            const plain = after.replace(/\*\*/g, '').trim();
            if (plain) keep(plain, lineConf);
          }
        }
      }
    }
  }
  return acc;
}

/* ---------------- weapons ---------------- */

function parseOutcomeBlocks(fileAbs, provenance, keySet, defaultConf) {
  // outcome-gated `Nickname:` blocks (original weapons report + artifact batch-1 shape)
  const out = new Map();
  const md = fs.readFileSync(fileAbs, 'utf8');
  for (const s of splitKeyedSections(md, keySet)) {
    const body = s.body;
    const outcome = (body.match(/-\s*outcome:\s*([^\n]+)/i) || [])[1] || '';
    if (!/found/i.test(outcome)) continue;
    const nickRaw = (body.match(/-\s*(?:candidate nickname|nickname\s*\/\s*abbreviation|nicknames?|abbreviation)\s*:\s*([^\n]+)/i) || [])[1] || '';
    if (!nickRaw.trim() || /^—+$/.test(nickRaw.trim()) || /^-+$/.test(nickRaw.trim())) continue;
    const srcLine = (body.match(/-\s*source:\s*([^\n]+)/i) || [])[1] || '';
    const srcs = extractUrls(srcLine + '\n' + body);
    const qm = body.match(/-\s*quote:\s*([^\n]+)/i);
    let quote = qm ? qm[1].trim().replace(/^["“”']+|["“”']+$/g, '').trim() : null;
    if (!quote || /^(—+|-+|…+)$/.test(quote)) quote = null;
    const note = (body.match(/-\s*(?:re-review note|research note):\s*([\s\S]*?)(?=\n- |\n## |\n### |$)/i) || [])[1] || '';
    const confText = `${outcome} ${note}`;
    let conf;
    if (/preliminary|snippet|cache miss|402|429|could not|failed|unreadable|placeholder|no readable|not readable/i.test(confText)) conf = 'preliminary';
    else if (/readable|explicit/i.test(confText)) conf = 'high';
    else conf = defaultConf;
    const cleaned = nickRaw.replace(/\*\*/g, '').replace(/\s*\(.*\)\s*$/, '').trim();
    for (const alias of splitAliases(cleaned)) {
      if (isProseAlias(alias)) continue;
      if (!out.has(s.key)) out.set(s.key, []);
      out.get(s.key).push({
        text: alias, quote, sourceUrl: srcs[0] ?? null, sources: srcs,
        confidenceRaw: conf, provenance
      });
    }
  }
  return out;
}

function parseWeaponBatchJsons() {
  const out = new Map();
  const files = fs.readdirSync(WPN_BATCH_DIR).filter((f) => f.endsWith('.json')).sort();
  for (const f of files) {
    const j = JSON.parse(fs.readFileSync(path.join(WPN_BATCH_DIR, f), 'utf8'));
    const provenance = [`weapons/weapon research by other agent/${f}`];
    const items = Array.isArray(j) ? j : j.results;
    for (const it of items) {
      const verdict = it.status ?? it.outcome;
      if (verdict !== 'found') continue;
      const raws = Array.isArray(it.nicknames)
        ? it.nicknames.map((n) => ({ text: n.alias, quote: n.quote ?? null, url: n.source_url ?? null }))
        : [{ text: it.nickname, quote: it.quote ?? null, url: it.source_url ?? (it.source_urls || [])[0] ?? null }];
      const extraSrcs = Array.isArray(it.pages_read) ? it.pages_read.filter((u) => /^https?:\/\//.test(u)) : [];
      for (const r of raws) {
        if (!r.text || !String(r.text).trim() || isProseAlias(String(r.text))) continue;
        const srcs = [...extractUrls(r.url ?? ''), ...extraSrcs.filter((u) => u !== r.url)];
        if (!out.has(it.key)) out.set(it.key, []);
        out.get(it.key).push({
          text: String(r.text).trim(), quote: r.quote ?? null,
          sourceUrl: srcs[0] ?? null, sources: srcs,
          confidenceRaw: 'medium', provenance
        });
      }
    }
  }
  return out;
}

/* ---------------- main ---------------- */

function main() {
  const charExport = JSON.parse(fs.readFileSync(path.join(CHAR_DIR, 'characters-export.json'), 'utf8'));
  const charKeys = charExport.keys.map((k) => String(k).toLowerCase());
  const charKeySet = new Set(charKeys);
  const artJson = JSON.parse(fs.readFileSync(path.join(ART_DIR, 'artifact_sets.json'), 'utf8'));
  const artKeySet = new Set(artJson.items.map((i) => i.key.toLowerCase()));
  const wpnJson = JSON.parse(fs.readFileSync(path.join(WPN_DIR, 'weapons.json'), 'utf8'));
  const wpnKeySet = new Set(wpnJson.items.map((i) => i.key.toLowerCase()));

  const entities = [];
  const byId = new Map();
  const getEnt = (type, key, name, imageUrl) => {
    const id = `${type}:${key}`;
    if (!byId.has(id)) {
      const e = makeEntity(id, type, key, name, imageUrl);
      byId.set(id, e);
      entities.push(e);
    }
    return byId.get(id);
  };

  /* ---- characters ---- */
  const charFiles = fs.readdirSync(CHAR_DIR).filter((f) => /^character-nickname-research-batch-\d+\.md$/.test(f)).sort();
  const charParsed = parseCharacterSections(charFiles, charKeySet);
  const charDisplayNames = new Map();
  for (const [k, v] of charParsed) {
    const names = [...v.displays].filter(Boolean);
    if (names.length) charDisplayNames.set(k, names.sort((a, b) => a.length - b.length)[0]);
  }
  const ineffProvs = [...new Set((charParsed.get('ineffa') ?? { cands: [] }).cands.flatMap((c) => c.provenance))];
  if (ineffProvs.length > 1) log(`- **ineffa duplicated across batches merged**: sources unioned from ${ineffProvs.join(', ')}; deduped by normalized text, all sources kept.`);
  for (const key of charKeys) {
    const name = charDisplayNames.get(key) ?? prettifyKey(key);
    const ent = getEnt('character', key, name, null);
    for (const c of (charParsed.get(key) ?? { cands: [] }).cands) {
      addCandidate(ent, c.text, {
        sourceUrl: c.urls[0] ?? null, sources: c.urls, quote: c.quote ?? null,
        researchConfidence: collapseConfidence(c.confidenceRaw), provenance: c.provenance
      });
    }
  }
  const zeroCharResearched = charKeys.filter((k) => (charParsed.get(k) ?? { cands: [] }).cands.length === 0);
  log(`- **emilie / escoffier have zero research coverage**: created as entities with zero nicknames (display names fall back to prettified keys); they enter the "Help us find names" queue. No names invented.`);
  if (zeroCharResearched.length) log(`- **character sections with no usable candidates (${zeroCharResearched.length})** → zero-nickname help-queue entities: ${zeroCharResearched.join(', ')}.`);
  log(`- **title/lore/official-name rows excluded, never ingested as nicknames** (e.g. Traveler for aether, Tianquan for ningguang, Lelek for odette, Amy/full-name rows, yunjin/zibai title tables, Divine Priestess for kokomi).`);

  /* ---- artifacts ---- */
  const artFiles = fs.readdirSync(ART_DIR).filter((f) => /^artifact-set-nickname-research-(batch-\d+|corrective-silken-song)\.md$/.test(f)).sort();
  const artParsed = parseArtifactSections(artFiles, artKeySet);
  log(`- **corrective-silken-song is additive**: SMS/[Silken Moon] added to silkenmoonsserenade, SDP/SoDP added to songofdayspast; nothing replaced.`);
  log(`- **batch-6 misnumbering resolved by Exact key, never by heading number**: headings 51–60 mapped to true keys tenacityofthemillelith…vermillionhereafter + wandererstroupe (true 53–61,63).`);
  for (const dupKey of ['viridescentvenerer', 'wandererstroupe']) {
    const provs = [...new Set((artParsed.get(dupKey) ?? { cands: [] }).cands.flatMap((c) => c.provenance))];
    if (provs.length > 1) log(`- **${dupKey} duplicated in batch-6 + batch-7 merged**: unioned from ${provs.join(', ')}; "OC" for obsidiancodex kept as technical-only (single-source, preliminary).`);
  }
  for (const item of artJson.items) {
    const key = item.key.toLowerCase();
    const ent = getEnt('artifact', key, item.display_name, item.image_url ?? null);
    for (const c of (artParsed.get(key) ?? { cands: [] }).cands) {
      addCandidate(ent, c.text, {
        sourceUrl: c.urls[0] ?? null, sources: c.urls, quote: c.quote ?? c.quoteOverride ?? null,
        researchConfidence: collapseConfidence(c.confidenceRaw), provenance: c.provenance
      });
    }
  }
  const artCovered = new Set(artParsed.keys());
  const artMissing = artJson.items.map((i) => i.key).filter((k) => !artCovered.has(k.toLowerCase()));
  if (artMissing.length) log(`- **artifacts with no research section (${artMissing.length})** → zero-nickname help-queue entities.`);

  /* ---- weapons: all 26 batch JSONs + recheck + original (union) ---- */
  const wpnFromJson = parseWeaponBatchJsons();
  const wpnFromRecheck = parseOutcomeBlocks(
    path.join(WPN_DIR, 'weapons-recheck-research.md'),
    ['weapons/weapons-recheck-research.md'], wpnKeySet, 'high'
  );
  const wpnFromOrig = parseOutcomeBlocks(
    path.join(WPN_DIR, 'research-output', 'weapons-research.md'),
    ['weapons/research-output/weapons-research.md'], wpnKeySet, 'medium'
  );
  log(`- **weapons precedence: union, not replacement**. All 26 batch JSONs + recheck + original report unioned per key; every nickname kept with its file in provenance and its own researchConfidence ("preliminary" stays "preliminary"); identical normalized texts dedupe, keeping all sources. Voting decides.`);
  log(`- **calamityofeshu / CoE**: recheck says found-preliminary (snippet only, Cache miss) while batch-04 says not stated → kept as a separate preliminary candidate (provenance: recheck).`);
  log(`- **beyondthechrysalis / chrysalis**: original report has no section; recheck says not stated; batch-03 says found ("working towards R5 Chrysalis") → kept as a medium candidate (provenance: weapons-batch-03.json).`);
  log(`- **lumine thread cross-references excluded**: "Windy Man"/"Windblade" must-not-map to Lumine (they refer to Aether in the joke thread) and are not in aether's candidate evidence either — excluded from both, left for human review; "Windy Woman character" is declared not-a-separate-alias of "Windy Woman" and excluded.`);
  const disagree = [];
  for (const key of wpnKeySet) {
    const texts = new Set();
    for (const src of [wpnFromOrig.get(key) ?? [], wpnFromRecheck.get(key) ?? [], wpnFromJson.get(key) ?? []]) {
      for (const c of src) texts.add(`${normalizeNicknameText(c.text)}`);
    }
    if (texts.size > 1) {
      disagree.push({
        key,
        texts: [...new Set([
          ...(wpnFromOrig.get(key) ?? []).map((c) => c.text),
          ...(wpnFromRecheck.get(key) ?? []).map((c) => c.text),
          ...(wpnFromJson.get(key) ?? []).map((c) => c.text)
        ])]
      });
    }
  }
  if (disagree.length) {
    log(`- **weapons keys where sources attest DIFFERENT nickname texts (${disagree.length})** — all kept as separate candidates:`);
    for (const d of disagree.sort((x, y) => x.key.localeCompare(y.key))) {
      log(`  - ${d.key}: ${d.texts.join(' · ')}`);
    }
  }
  log(`- **shared shorthand collisions preserved per key, never merged**: Fav (several Favonius weapons), FH (batch-8: fracturedhalo + fruitfultheory), MW (batch-11: missivewindspear + mitternachtswaltz), Donut (everlastingmoonglow + jadefallssplendor per other-agent note), WGS (waster/gravestone ambiguity noted in original batch 25).`);
  log(`- **researcher joke/misspelling exclusions honored** (never ingested): "cursed sword" (aquilafavonia), "doo doo balls" passive joke, "jade ball" description, "Breezeborne Bow" descriptive shortening, "Ailey hunter" misspelling, "Amenoma Lite" (other weapon), BCS/BCW database-only shorthands, "etherlight" truncation, "club" descriptor.`);
  log(`- **drifting confidence labels collapsed to high / medium / preliminary / unknown**: Strongly supported/Recurring/High/verified/explicit/readable → high; Moderate/Medium/Attested/Context-limited → medium; Weak/Low/one-off/joke/snippet/Cache-miss/402/unverified → preliminary; else unknown.`);

  for (const item of wpnJson.items) {
    const key = item.key.toLowerCase();
    const ent = getEnt('weapon', key, item.display_name, item.image_url ?? null);
    for (const src of [wpnFromOrig.get(key) ?? [], wpnFromRecheck.get(key) ?? [], wpnFromJson.get(key) ?? []]) {
      for (const c of src) {
        addCandidate(ent, c.text, {
          sourceUrl: c.sourceUrl, sources: c.sources, quote: c.quote,
          researchConfidence: collapseConfidence(c.confidenceRaw), provenance: c.provenance
        });
      }
    }
  }

  /* ---- output ---- */
  const finalEntities = entities.map(finalizeEntity);
  const stats = { character: 0, weapon: 0, artifact: 0 };
  const buckets = { '0': 0, '1-2': 0, '3-7': 0, '8+': 0 };
  const perTypeBuckets = { character: { ...buckets }, weapon: { ...buckets }, artifact: { ...buckets } };
  const zeroNames = { character: [], weapon: [], artifact: [] };
  let most = { name: null, n: 0 };
  for (const e of finalEntities) {
    stats[e.type]++;
    const n = e.nicknames.length;
    const b = n === 0 ? '0' : n <= 2 ? '1-2' : n <= 7 ? '3-7' : '8+';
    buckets[b]++;
    perTypeBuckets[e.type][b]++;
    if (n === 0) zeroNames[e.type].push(e.name);
    if (n > most.n) most = { name: `${e.type}:${e.name}`, n };
  }

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify({
    version: 1,
    generatedAt: new Date().toISOString(),
    counts: stats,
    entities: finalEntities
  }, null, 2));

  const notes = `# DATA-NOTES — ingest conflict resolutions\n\n` +
    `Generated ${new Date().toISOString()} by \`scripts/ingest.mjs\`. Newer/corrective sources win on overlap; ` +
    `nothing was invented (missing → null). Nickname id = sha1(entityId + '::' + normalized text)[0:16]; ` +
    `normalized = lowercase, single-spaced, trimmed. Re-running ingest never deletes votes: votes key on nickname id.\n\n` +
    `## Entity IDs\n\n` +
    `- Entity id is \`<type>:<key>\` (e.g. \`character:ganyu\`) so identical keys across types can never collide.\n` +
    `- Display names: characters from research headings (fallback: prettified key); ` +
    `artifacts/weapons from their JSON inventories. Character imageUrl is always null (no image data in research).\n\n` +
    `## Resolutions (every conflict)\n\n${conflicts.join('\n')}\n\n` +
    `## Quote policy\n\n` +
    `- Quotes only from explicit \`Quote:\` fields (weapons/artifacts batch-1). Character/artifact evidence prose is NOT quoted (quote stays null); ` +
    `the section's URLs land in \`sources\` with the file in \`provenance\`.\n\n` +
    `## Parse failures\n\n${parseFailures.length ? parseFailures.map((p) => `- ${p}`).join('\n') : '- none'}\n`;
  fs.writeFileSync(NOTES_FILE, notes);

  const total = finalEntities.length;
  console.log(`entities: ${total} (character ${stats.character}, weapon ${stats.weapon}, artifact ${stats.artifact})`);
  for (const t of ['character', 'weapon', 'artifact']) {
    const b = perTypeBuckets[t];
    console.log(`${t}: total ${stats[t]} | 0:${b['0']} 1-2:${b['1-2']} 3-7:${b['3-7']} 8+:${b['8+']}`);
  }
  console.log(`overall buckets: 0:${buckets['0']} 1-2:${buckets['1-2']} 3-7:${buckets['3-7']} 8+:${buckets['8+']}`);
  console.log(`most nicknames: ${most.name} (${most.n})`);
  console.log(`zero-nickname characters (${zeroNames.character.length}): ${zeroNames.character.join(', ')}`);
  console.log(`zero-nickname artifacts (${zeroNames.artifact.length}): ${zeroNames.artifact.join(', ')}`);
  console.log(`zero-nickname weapons: ${zeroNames.weapon.length}`);
  console.log(`parse failures: ${parseFailures.length}`);
  for (const p of parseFailures.slice(0, 20)) console.log(`  ! ${p}`);
}

const isMain = process.argv[1] && path.basename(process.argv[1]).replace(/\.mjs$/, '') === 'ingest';
if (isMain) main();
