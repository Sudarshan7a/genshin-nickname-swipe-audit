import { useCallback, useEffect, useMemo, useState } from 'react';
import Gate from './components/Gate.jsx';
import EntityHeader from './components/EntityHeader.jsx';
import CardStack from './components/CardStack.jsx';
import NameRoster from './components/NameRoster.jsx';
import AddName from './components/AddName.jsx';
import Summary from './components/Summary.jsx';
import HelpQueue from './components/HelpQueue.jsx';
import Admin from './components/Admin.jsx';
import Styleguide from './styleguide.jsx';
import {
  getInviteCode,
  getVoterId,
  clearInviteCode,
  createAuthFetch,
} from './store/session.js';
import { loadQueue,
  enqueue,
  flushQueue,
  loadLocalVotes,
  saveLocalVotes,
  applyVoteOptimistic,
  voteStatus,
  nextUnvoted,
  recordVoteDay,
  getStreak,
} from './store/queue.js';
import { isSoundOn, setSoundOn, tick } from './store/sound.js';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'Characters' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'artifact', label: 'Artifacts' },
];

export default function App() {
  const [hash, setHash] = useState(() => window.location.hash);
  const [code, setCode] = useState(() => getInviteCode());
  const [authFetch] = useState(() =>
    createAuthFetch({ onUnauthorized: () => setCode('') }),
  );
  const [entities, setEntities] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [votesById, setVotesById] = useState(() => loadLocalVotes());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('deck');
  const [entityIdx, setEntityIdx] = useState(0);
  const [pos, setPos] = useState(0);
  const [history, setHistory] = useState([]);
  const [blind, setBlind] = useState(() => {
    try {
      return localStorage.getItem('ns-blind') !== 'off';
    } catch {
      return true;
    }
  });
  const [streak, setStreak] = useState(() => getStreak());
  const [soundOn, setSound] = useState(() => isSoundOn());
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length);
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    const onHash = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const isAdminRoute = hash === '#/admin';
  const isStyleguide = hash === '#/styleguide';

  const loadAll = useCallback(async () => {
    setLoadError('');
    try {
      const [entRes, votesRes] = await Promise.all([
        authFetch('/api/entities'),
        authFetch('/api/my-votes'),
      ]);
      const entData = await entRes.json();
      setEntities(entData.entities || []);
      const votesData = await votesRes.json();
      const serverVotes = {};
      for (const v of votesData.votes || []) {
        if (v.nicknameId && v.answer) serverVotes[v.nicknameId] = v.answer;
      }
      setVotesById((local) => {
        const merged = { ...local, ...serverVotes };
        saveLocalVotes(merged);
        return merged;
      });
      const flushRes = await flushQueue(authFetch).catch(() => null);
      if (flushRes) setPendingCount(flushRes.pending);
    } catch (err) {
      setLoadError(err && err.message ? err.message : 'Could not load.');
    }
  }, [authFetch]);

  useEffect(() => {
    if (!code) return;
    getVoterId();
    loadAll();
    const onOnline = () => {
      flushQueue(authFetch).then((r) => setPendingCount(r.pending)).catch(() => {});
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [code, authFetch, loadAll]);

  function toggleBlind() {    setBlind((b) => {
      try {
        localStorage.setItem('ns-blind', b ? 'off' : 'on');
      } catch { /* ignore */ }
      return !b;
    });
  }

  function toggleSound() {
    setSound((s) => {
      setSoundOn(!s);
      return !s;
    });
  }

  const deck = useMemo(() => {
    const list = entities || [];
    return list.filter((e) => e.nicknames && e.nicknames.length > 0);
  }, [entities]);

  const helpList = useMemo(() => {
    const list = entities || [];
    return list.filter((e) => !e.nicknames || e.nicknames.length === 0);
  }, [entities]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return deck.filter((e) => {
      if (filter !== 'all' && e.type !== filter) return false;
      if (q && !e.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [deck, filter, query]);

  const entity = filtered.length > 0 ? filtered[Math.min(entityIdx, filtered.length - 1)] : null;
  const nicknames = entity ? entity.nicknames || [] : [];
  const answeredCount = nicknames.filter((n) => voteStatus(n.id, votesById)).length;
  const complete = entity != null && answeredCount >= nicknames.length;
  const safePos = nicknames.length > 0 ? Math.min(pos, nicknames.length - 1) : 0;
  const card = !complete && entity ? nicknames[safePos] : null;

  const doneCount = useMemo(
    () =>
      filtered.filter(
        (e) => (e.nicknames || []).length > 0 && (e.nicknames || []).every((n) => voteStatus(n.id, votesById)),
      ).length,
    [filtered, votesById],
  );

  function resetEntity(i) {
    setEntityIdx(i);
    setPos(0);
    setHistory([]);
  }

  async function persist(op, payload) {
    enqueue({ op, payload });
    setPendingCount(loadQueue().length);
    try {
      const r = await flushQueue(authFetch);
      setPendingCount(r.pending);
    } catch {
      // stays queued — retry on next vote / reconnect
    }
  }

  const ANSWER_SPOKEN = { heard: 'heard it', never: 'never heard it', unsure: 'not sure' };

  // Single vote path for the main card: drag, keys, and the
  // Never / Not sure / Heard buttons are the same action with the same
  // undo and the same announcement. The right-column roster is display-only.
  function castVote(nickname, answer) {
    if (!entity || !nickname) return;
    const prev = voteStatus(nickname.id, votesById) || null;
    setHistory((h) => [...h, { nicknameId: nickname.id, prev, pos: safePos, entityId: entity.id }]);
    const next = applyVoteOptimistic(votesById, nickname.id, answer);
    setVotesById(next);
    saveLocalVotes(next);
    recordVoteDay();
    setStreak(getStreak());
    tick(answer);
    persist('vote', { nicknameId: nickname.id, entityId: entity.id, answer });
    setAnnouncement(`${nickname.text} — ${ANSWER_SPOKEN[answer]}.`);
    // Only the focused card advances the cursor. Voting a roster row leaves
    // the card where it is so the list does not jump under the finger.
    if (card && nickname.id === card.id) {
      const idx = nextUnvoted(nicknames, next, safePos + 1);
      window.setTimeout(() => {
        setPos(idx === -1 ? nicknames.length : idx);
      }, 180);
    }
  }

  function commit(answer) {
    if (!card) return;
    castVote(card, answer);
  }

  function skip() {
    if (!entity) return;
    setHistory((h) => [...h, { nicknameId: null, prev: null, pos: safePos }]);
    const idx = nextUnvoted(nicknames, votesById, safePos + 1);
    if (idx === -1) setPos(nicknames.length);
    else setPos(idx);
  }

  // Picking a roster name puts it on the card. On phones the card sits above
  // the roster, so bring it back into view.
  function focusRow(i) {
    setPos(i);
    if (window.matchMedia('(max-width: 1023px)').matches) {
      window.requestAnimationFrame(() => {
        document.querySelector('[data-testid="card"]')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  // Step past the whole record without answering it.
  function skipRecord() {
    if (!entity) return;
    setAnnouncement(`Skipped ${entity.name}.`);
    nextEntity();
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      const owner = last.entityId || (entity ? entity.id : null);
      if (last.nicknameId && owner) {
        const next = last.prev
          ? applyVoteOptimistic(votesById, last.nicknameId, last.prev)
          : (() => {
              const copy = { ...votesById };
              delete copy[last.nicknameId];
              return copy;
            })();
        setVotesById(next);
        saveLocalVotes(next);
        if (last.prev) persist('vote', { nicknameId: last.nicknameId, entityId: owner, answer: last.prev });
        else persist('retract', { nicknameId: last.nicknameId, entityId: owner });
      }
      setPos(last.pos);
      return h.slice(0, -1);
    });
  }

  function nextEntity() {
    if (entityIdx + 1 < filtered.length) resetEntity(entityIdx + 1);
    else resetEntity(0);
  }

  function signOut() {
    clearInviteCode();
    setCode('');
    setEntities(null);
  }

  if (isStyleguide) {
    return (
      <div className="app-atmosphere min-h-dvh bg-bg text-ink">
        <main>
          <Styleguide />
        </main>
      </div>
    );
  }

  if (isAdminRoute) {
    return (
      <div className="app-atmosphere min-h-dvh bg-bg text-ink">
        <main className="mx-auto max-w-[1440px] px-4 py-5 md:px-8 md:py-8">
          <Admin />
        </main>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="app-atmosphere min-h-dvh bg-bg text-ink">
        <main>
          <Gate onAuthed={(c) => setCode(c)} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-atmosphere min-h-dvh bg-bg pb-10 text-ink">
      <main className="mx-auto max-w-[1440px] px-4 pt-4 md:px-8 md:pt-8">
        <div role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={filtered.length} aria-label="Deck progress" className="deck-progress mb-3 flex items-center gap-3">
          <div className="h-[3px] flex-1 bg-rule">
            <div className="h-full bg-ember transition-all" style={{ width: filtered.length ? `${(100 * doneCount) / filtered.length}%` : '0%' }} />
          </div>
          <span className="font-shout text-xs tracking-[0.15em] text-dim">{doneCount}/{filtered.length} ✓</span>
        </div>

        <div className="field-topbar flex flex-wrap items-center gap-x-4 gap-y-1 pb-4">
          <a href="#/" className="font-shout text-lg tracking-wide">TEYVAT FIELD NOTES</a>
          <a href="#/admin" className="ml-auto min-h-[44px] px-3 py-3 text-[0.72rem] uppercase tracking-[0.12em] text-dim">Admin</a>
          <button type="button" onClick={signOut} className="min-h-[44px] px-2 text-[0.72rem] uppercase tracking-[0.12em] text-dim underline">
            Sign out
          </button>
          <span className="field-utility flex w-full flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem] font-bold uppercase tracking-[0.18em] text-dim">
            <span>{streak}-day streak</span>
            <button type="button" onClick={toggleSound} aria-pressed={soundOn} title={soundOn ? 'Sound on' : 'Sound off'} className="min-h-[44px]">
              Sound {soundOn ? 'on' : 'off'}
            </button>
            <button type="button" onClick={() => setMode(mode === 'help' ? 'deck' : 'help')} aria-pressed={mode === 'help'} className="min-h-[44px]">
              Help find names{helpList.length ? ` (${helpList.length})` : ''}
            </button>
          </span>
        </div>

        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>

        {mode === 'help' ? (
          <HelpQueue entities={helpList} authFetch={authFetch} />
        ) : loadError ? (
          <div role="alert" data-testid="error" className="border border-never p-6">
            <p>{loadError}</p>
            <button type="button" onClick={loadAll} className="mt-3 min-h-[44px] border border-ink px-4 font-bold uppercase tracking-[0.14em]">Retry</button>
          </div>
        ) : !entities ? (
          <p role="status" data-testid="loading" className="text-dim">Sharpening pencils…</p>
        ) : !entity ? (
          <p data-testid="empty" className="border border-rule p-6 text-dim">No entries match. Try another search or filter.</p>
        ) : (
          <div className="voting-layout flex flex-col gap-4 lg:grid lg:grid-cols-[210px_minmax(0,1fr)_320px] lg:gap-6">
            <aside aria-label="Entry browser" className="entry-browser order-1">
              <div role="group" aria-label="Filter entries" className="flex flex-wrap gap-2">
                {FILTERS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    aria-pressed={filter === f.id}
                    onClick={() => { setFilter(f.id); resetEntity(0); }}
                    className={`min-h-[44px] border px-3 text-[0.78rem] font-bold uppercase tracking-[0.14em] ${filter === f.id ? 'border-ember text-gold' : 'border-rule text-dim'}`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <input
                type="search"
                value={query}
                onChange={(e) => { setQuery(e.target.value); resetEntity(0); }}
                placeholder="Search names…"
                aria-label="Search entries"
                className="mt-2 w-full border border-rule bg-surface px-3 py-3 text-ink placeholder:text-dim/60"
              />
              <ol className="mt-2 hidden max-h-[50vh] overflow-y-auto lg:block">
                {filtered.map((e, i) => (
                  <li key={e.id}>
                    <button
                      type="button"
                      onClick={() => resetEntity(i)}
                      aria-current={i === Math.min(entityIdx, filtered.length - 1)}
                      className={`flex min-h-[44px] w-full items-center border-b border-rule py-1 text-left text-[0.85rem] ${i === Math.min(entityIdx, filtered.length - 1) ? 'text-ink' : 'text-dim'}`}
                    >
                      {String(i + 1).padStart(3, '0')} · {e.name}
                    </button>
                  </li>
                ))}
              </ol>
            </aside>

            <div className="voting-column order-2">
              <EntityHeader entity={entity} index={Math.min(entityIdx, filtered.length - 1)} blind={blind} onToggleBlind={toggleBlind} />
              <div className="mt-4">
                {!complete && card ? (
                  <CardStack
                    key={card.id}
                    card={card}
                    existingAnswer={voteStatus(card.id, votesById)}
                    blind={blind}
                    onCommit={commit}
                    onSkip={skip}
                    onUndo={undo}
                  />
                ) : null}
                {complete ? (
                  <Summary
                    entity={entity}
                    votedCount={answeredCount}
                    totalCount={nicknames.length}
                    onNext={nextEntity}
                    hasNext={entityIdx + 1 < filtered.length}
                  />
                ) : null}
                <AddName
                  entityId={entity.id}
                  entityName={entity.name}
                  authFetch={authFetch}
                  defaultOpen={false}
                />
                <div className="record-actions">
                  <button
                    type="button"
                    className="record-action"
                    onClick={undo}
                    disabled={history.length === 0}
                  >
                    Undo last
                  </button>
                  {complete ? null : (
                    <button type="button" className="record-action" onClick={skipRecord}>
                      Skip {entity.type} →
                    </button>
                  )}
                </div>
                {pendingCount > 0 ? (
                  <p role="status" className="mt-3 text-[0.85rem] text-gold">
                    {pendingCount} vote{pendingCount === 1 ? '' : 's'} waiting to sync — saved on this device.
                  </p>
                ) : null}
              </div>
            </div>

            <div className="record-column order-3">
              <NameRoster
                nicknames={nicknames}
                votesById={votesById}
                activeId={complete || !card ? null : card.id}
                onFocus={focusRow}
              />
              <p className="mt-2 hidden text-[0.8rem] text-dim lg:block">
                Tap a name to put it on the card.
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
