import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import Gate from './components/Gate.jsx';
import EntityHeader from './components/EntityHeader.jsx';
import CardStack from './components/CardStack.jsx';
import Tray from './components/Tray.jsx';
import Summary from './components/Summary.jsx';
import HelpQueue from './components/HelpQueue.jsx';
import Admin from './components/Admin.jsx';
import {
  getInviteCode,
  getVoterId,
  clearInviteCode,
  createAuthFetch,
} from './store/session.js';
import {
  loadQueue,
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

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'character', label: 'Characters' },
  { id: 'weapon', label: 'Weapons' },
  { id: 'artifact', label: 'Artifacts' },
];

export default function App() {
  const [code, setCode] = useState(() => getInviteCode());
  const [authFetch] = useState(() =>
    createAuthFetch({
      onUnauthorized: () => setCode(''),
    }),
  );
  const [entities, setEntities] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [votesById, setVotesById] = useState(() => loadLocalVotes());
  const [filter, setFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('deck'); // 'deck' | 'help'
  const [entityIdx, setEntityIdx] = useState(0);
  const [pos, setPos] = useState(0);
  const [history, setHistory] = useState([]); // [{ nicknameId|null, prev, pos }]
  const [exitDir, setExitDir] = useState(null);
  const [blind, setBlind] = useState(() => {
    try {
      return localStorage.getItem('ns-blind') !== 'off';
    } catch {
      return true;
    }
  });
  const [streak, setStreak] = useState(() => getStreak());
  const [pendingCount, setPendingCount] = useState(() => loadQueue().length);
  const [isAdminRoute, setIsAdminRoute] = useState(() => window.location.hash === '#/admin');

  useEffect(() => {
    const onHash = () => setIsAdminRoute(window.location.hash === '#/admin');
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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
        const merged = { ...local, ...serverVotes }; // server wins
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
    getVoterId(); // ensure a stable id exists before first vote
    loadAll();
    const onOnline = () => {
      flushQueue(authFetch).then((r) => setPendingCount(r.pending)).catch(() => {});
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [code, authFetch, loadAll]);

  function toggleBlind() {
    setBlind((b) => {
      try {
        localStorage.setItem('ns-blind', b ? 'off' : 'on');
      } catch {
        // ignore
      }
      return !b;
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
    setExitDir(null);
  }

  function setFilterAndReset(f) {
    setFilter(f);
    resetEntity(0);
  }

  function setQueryAndReset(q) {
    setQuery(q);
    resetEntity(0);
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

  function commit(answer) {
    if (!card || !entity) return;
    const prev = voteStatus(card.id, votesById) || null;
    setHistory((h) => [...h, { nicknameId: card.id, prev, pos: safePos }]);
    const next = applyVoteOptimistic(votesById, card.id, answer);
    setVotesById(next);
    saveLocalVotes(next);
    recordVoteDay();
    setStreak(getStreak());
    setExitDir(answer);
    persist('vote', {
      nicknameId: card.id,
      entityId: entity.id,
      answer,
    });
    const idx = nextUnvoted(nicknames, next, safePos + 1);
    // brief beat so the exit stamp reads before the next card mounts
    window.setTimeout(() => {
      setExitDir(null);
      if (idx === -1) setPos(nicknames.length); // summary (complete === true)
      else setPos(idx);
    }, 160);
  }

  function skip() {
    if (!entity) return;
    setHistory((h) => [...h, { nicknameId: null, prev: null, pos: safePos }]);
    const idx = nextUnvoted(nicknames, votesById, safePos + 1);
    if (idx === -1) setPos(nicknames.length);
    else setPos(idx);
  }

  function undo() {
    setHistory((h) => {
      if (h.length === 0) return h;
      const last = h[h.length - 1];
      if (last.nicknameId) {
        const next = last.prev
          ? applyVoteOptimistic(votesById, last.nicknameId, last.prev)
          : (() => {
              const copy = { ...votesById };
              delete copy[last.nicknameId];
              return copy;
            })();
        setVotesById(next);
        saveLocalVotes(next);
        if (last.prev) persist('vote', { nicknameId: last.nicknameId, entityId: entity.id, answer: last.prev });
        else persist('retract', { nicknameId: last.nicknameId, entityId: entity.id });
      }
      setPos(last.pos);
      setExitDir(null);
      return h.slice(0, -1);
    });
  }

  function jumpTo(i) {
    setPos(i);
    setExitDir(null);
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

  if (!code) {
    return (
      <div className="app">
        <Gate onAuthed={(c) => setCode(c)} />
      </div>
    );
  }

  return (
    <div className="app">
      <div className="topbar">
        <div className="brand">
          <span className="brand-name">Nickname Swipe</span>
          <span className="brand-sub">Do travelers actually say that?</span>
        </div>
        <span className="topbar-spacer" />
        <span className="streak-pill" title="Days in a row you have voted">
          {streak}-day streak
        </span>
        <button
          type="button"
          className={`mode-btn${mode === 'help' ? ' is-on' : ''}`}
          onClick={() => setMode(mode === 'help' ? 'deck' : 'help')}
          aria-pressed={mode === 'help'}
        >
          Help find names{helpList.length ? ` (${helpList.length})` : ''}
        </button>
        <button type="button" className="signout" onClick={signOut}>
          Sign out
        </button>
      </div>

      <div className="progress" role="progressbar" aria-valuenow={doneCount} aria-valuemin={0} aria-valuemax={filtered.length} aria-label="Deck progress">
        <div className="progress-track">
          <div
            className="progress-fill"
            style={{ width: filtered.length ? `${(100 * doneCount) / filtered.length}%` : '0%' }}
          />
        </div>
        <span className="progress-label">
          {doneCount}/{filtered.length} ✓
        </span>
      </div>

      {isAdminRoute ? (
        <Admin authFetch={authFetch} />
      ) : mode === 'help' ? (
        <HelpQueue entities={helpList} authFetch={authFetch} />
      ) : loadError ? (
        <div className="error-state" role="alert">
          <p>{loadError}</p>
          <button type="button" onClick={loadAll}>Retry</button>
        </div>
      ) : !entities ? (
        <div className="load-state" role="status">Loading the deck…</div>
      ) : !entity ? (
        <div className="deck-empty">
          <p>No entries match. Try another search or filter.</p>
        </div>
      ) : (
        <>
          <div className="filters" role="group" aria-label="Filter entries">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                className={`filter-btn${filter === f.id ? ' is-on' : ''}`}
                aria-pressed={filter === f.id}
                onClick={() => setFilterAndReset(f.id)}
              >
                {f.label}
              </button>
            ))}
            <input
              className="search-input"
              type="search"
              value={query}
              onChange={(e) => setQueryAndReset(e.target.value)}
              placeholder="Search names…"
              aria-label="Search entries"
            />
          </div>

          <div className="deck">
            <div className="deck-main">
              <EntityHeader entity={entity} blind={blind} onToggleBlind={toggleBlind} />
              {complete ? (
                <Summary
                  entity={entity}
                  votesById={votesById}
                  onRevisit={jumpTo}
                  onNext={nextEntity}
                  hasNext={entityIdx + 1 < filtered.length}
                  authFetch={authFetch}
                  onSuggested={() => {}}
                  shortDeck={nicknames.length <= 2}
                />
              ) : card ? (
                <AnimatePresence mode="wait">
                  <CardStack
                    key={card.id}
                    card={card}
                    existingAnswer={voteStatus(card.id, votesById)}
                    blind={blind}
                    exitDir={exitDir}
                    onCommit={commit}
                    onSkip={skip}
                    canUndo={history.length > 0}
                    onUndo={undo}
                  />
                </AnimatePresence>
              ) : null}
              {pendingCount > 0 ? (
                <p className="queue-note" role="status">
                  {pendingCount} vote{pendingCount === 1 ? '' : 's'} waiting to sync — they are saved on this device.
                </p>
              ) : null}
            </div>
            <Tray nicknames={nicknames} votesById={votesById} activeIndex={complete ? -1 : safePos} onSelect={jumpTo} />
          </div>
        </>
      )}
    </div>
  );
}
