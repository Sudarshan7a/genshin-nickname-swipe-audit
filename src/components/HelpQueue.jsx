import { useMemo, useState } from 'react';
import SuggestForm from './SuggestForm.jsx';

// Suggest-only mode for zero-nickname entries. Counter + picker, then the
// same SuggestForm as the post-vote summary.
const HELPED_KEY = 'ns-helped';

function loadHelped() {
  try {
    const raw = localStorage.getItem(HELPED_KEY);
    const v = JSON.parse(raw || '[]');
    return new Set(Array.isArray(v) ? v : []);
  } catch {
    return new Set();
  }
}

export default function HelpQueue({ entities, authFetch }) {
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [helped, setHelped] = useState(loadHelped);
  const [thanks, setThanks] = useState('');

  const remaining = useMemo(
    () => (entities || []).filter((e) => !helped.has(e.id)),
    [entities, helped],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = remaining.slice(0, 60);
    if (!q) return list;
    return remaining.filter((e) => e.name.toLowerCase().includes(q)).slice(0, 60);
  }, [remaining, query]);

  const selected = (entities || []).find((e) => e.id === selectedId) || filtered[0] || null;

  function markHelped(entityId, text) {
    setHelped((prev) => {
      const next = new Set(prev);
      next.add(entityId);
      try {
        localStorage.setItem(HELPED_KEY, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
    const name = (entities || []).find((e) => e.id === entityId)?.name || 'this entry';
    setThanks(`“${text}” for ${name} is in for review.`);
  }

  return (
    <section aria-label="Help us find names" className="flex flex-col gap-4">
      <div>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">Unopened records</p>
        <h2 className="mt-1 font-shout text-4xl uppercase">Help find names</h2>
        <p role="status" className="mt-1 font-whisper text-lg italic text-gold">
          {remaining.length} {remaining.length === 1 ? 'entry still needs' : 'entries still need'} names
        </p>
        {thanks ? <p className="mt-1 text-[0.85rem] font-bold text-heard">{thanks}</p> : null}
      </div>
      <div className="flex flex-col gap-4 lg:grid lg:grid-cols-2">
        <div>
          <label htmlFor="help-search" className="mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.22em] text-dim">
            Find an entry
          </label>
          <input
            id="help-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a name…"
            autoComplete="off"
            className="block w-full border border-rule bg-surface px-4 py-3 text-ink placeholder:text-dim/60"
          />
          <ol className="mt-2 flex max-h-[42vh] flex-col overflow-y-auto">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  onClick={() => { setSelectedId(e.id); setThanks(''); }}
                  aria-pressed={selected && e.id === selected.id}
                  className={`flex w-full items-center gap-3 border-b border-rule py-3 text-left ${selected && e.id === selected.id ? 'text-gold' : 'text-ink'}`}
                >
                  <span className="text-[0.7rem] font-bold uppercase tracking-[0.18em] text-dim">{e.type}</span>
                  {e.name}
                </button>
              </li>
            ))}
          </ol>
          {filtered.length === 0 ? <p className="mt-2 text-dim">No matches — try another name.</p> : null}
        </div>
        <div>
          {selected ? (
            <SuggestForm key={selected.id} entityId={selected.id} entityName={selected.name} authFetch={authFetch} onSuggested={(t) => markHelped(selected.id, t)} />
          ) : (
            <p className="text-dim">You covered them all. New entries appear after re-ingest.</p>
          )}
        </div>
      </div>
    </section>
  );
}
