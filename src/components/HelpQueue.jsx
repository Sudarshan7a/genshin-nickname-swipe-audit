import { useMemo, useState } from 'react';
import SuggestForm from './SuggestForm.jsx';

// Suggest-only mode for entities with zero nicknames. Counter + picker,
// then the same SuggestForm as the post-vote summary.
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
  const activeId = selected ? selected.id : null;

  function markHelped(entityId, text) {
    setHelped((prev) => {
      const next = new Set(prev);
      next.add(entityId);
      try {
        localStorage.setItem(HELPED_KEY, JSON.stringify([...next]));
      } catch {
        // ignore
      }
      return next;
    });
    const name = (entities || []).find((e) => e.id === entityId)?.name || 'this entry';
    setThanks(`“${text}” for ${name} is in for review.`);
  }

  return (
    <section className="help" aria-label="Help us find names">
      <h2 className="help-title">Help us find names</h2>
      <p className="help-counter" role="status">
        {remaining.length} {remaining.length === 1 ? 'entry still needs' : 'entries still need'} names
      </p>
      {thanks ? <p className="help-thanks">{thanks}</p> : null}
      <div className="help-grid">
        <div className="help-picker">
          <label className="field" htmlFor="help-search">
            Find an entry
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name…"
              autoComplete="off"
            />
          </label>
          <ol className="help-list">
            {filtered.map((e) => (
              <li key={e.id}>
                <button
                  type="button"
                  className={`help-item${e.id === activeId ? ' is-active' : ''}`}
                  onClick={() => {
                    setSelectedId(e.id);
                    setThanks('');
                  }}
                  aria-pressed={e.id === activeId}
                >
                  <span className={`mini-badge type-${e.type}`}>{e.type}</span>
                  {e.name}
                </button>
              </li>
            ))}
          </ol>
          {filtered.length === 0 ? <p className="help-empty">No matches — try another name.</p> : null}
        </div>
        <div className="help-form">
          {selected ? (
            <SuggestForm
              key={selected.id}
              entityId={selected.id}
              entityName={selected.name}
              authFetch={authFetch}
              onSuggested={(text) => markHelped(selected.id, text)}
            />
          ) : (
            <p className="help-empty">You covered them all. New entries appear after re-ingest.</p>
          )}
        </div>
      </div>
    </section>
  );
}
