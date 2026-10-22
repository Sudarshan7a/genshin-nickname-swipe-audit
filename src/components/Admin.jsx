import { useCallback, useEffect, useState } from 'react';
import { getAdminCode, setAdminCode } from '../store/session.js';

// Admin view (location.hash === '#/admin'): code input, pending suggestions
// with approve/reject, results.json download via GET /api/export.
// NOTE: the pending list needs GET /api/admin/suggestions — not in the
// RUN.md contract; the panel reports if the endpoint is missing.
export default function Admin({ authFetch }) {
  const [code, setCode] = useState(getAdminCode());
  const [unlocked, setUnlocked] = useState(!!getAdminCode());
  const [items, setItems] = useState(null);
  const [listNote, setListNote] = useState('');
  const [counts, setCounts] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const authed = useCallback(
    (adminCode) =>
      async function adminFetch(path, init = {}) {
        const res = await authFetch(path, {
          ...init,
          headers: { ...(init.headers || {}), 'x-admin-code': adminCode },
        });
        return res;
      },
    [authFetch],
  );

  const refresh = useCallback(
    async (adminCode) => {
      setBusy(true);
      setMsg('');
      try {
        const res = await authed(adminCode)('/api/admin/suggestions');
        if (res.status === 404) {
          setItems(null);
          setListNote('The server has no pending-suggestions endpoint yet — approvals run server-side for now.');
        } else {
          const data = await res.json();
          setItems(data.suggestions || data.items || []);
          setListNote('');
        }
      } catch (err) {
        if (err && (err.status === 401 || err.status === 403)) {
          setUnlocked(false);
          setMsg('Admin code rejected.');
        } else if (err && err.status === 404) {
          setItems(null);
          setListNote('The server has no pending-suggestions endpoint yet — approvals run server-side for now.');
        } else {
          setMsg('Could not load suggestions. Try again.');
        }
      } finally {
        setBusy(false);
      }
      try {
        const res = await authed(adminCode)('/api/results');
        const data = await res.json();
        setCounts(data);
      } catch {
        // counts are a nicety — the export button is the real tool
      }
    },
    [authed],
  );

  useEffect(() => {
    if (unlocked && code) refresh(code);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unlocked]);

  function unlock(e) {
    e.preventDefault();
    if (!code.trim()) return;
    setAdminCode(code.trim());
    setUnlocked(true);
  }

  async function decide(id, action) {
    setMsg('');
    try {
      await authed(code)(`/api/admin/suggestions/${id}`, {
        method: 'POST',
        body: JSON.stringify({ action }),
      });
      setItems((prev) => (prev || []).filter((s) => s.id !== id));
      setMsg(`Suggestion ${action === 'approve' ? 'approved' : 'rejected'}.`);
    } catch {
      setMsg('Action failed. Try again.');
    }
  }

  async function download() {
    setMsg('');
    try {
      const res = await authed(code)('/api/export');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'results.json';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setMsg('Download failed. Try again.');
    }
  }

  if (!unlocked) {
    return (
      <div className="gate-wrap">
        <form className="gate-card" onSubmit={unlock} aria-label="Admin sign in">
          <h1>Review desk</h1>
          <p className="gate-sub">Enter the admin code to review suggestions.</p>
          <div className="gate-form">
            <label htmlFor="admin-code">Admin code</label>
            <input
              id="admin-code"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
            />
            <button type="submit" disabled={!code.trim()}>
              Unlock
            </button>
          </div>
          {msg ? <p role="alert" className="gate-error">{msg}</p> : null}
        </form>
      </div>
    );
  }

  return (
    <section className="admin" aria-label="Admin review">
      <div className="admin-head">
        <h2>Review desk</h2>
        <div className="admin-actions">
          <button type="button" className="util-btn" onClick={() => refresh(code)} disabled={busy}>
            {busy ? 'Loading…' : 'Refresh'}
          </button>
          <button type="button" className="next-btn slim" onClick={download}>
            Download results.json
          </button>
        </div>
      </div>
      {counts ? (
        <p className="admin-counts" role="status">
          {Object.entries(counts.counts || counts).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`).join(' · ')}
        </p>
      ) : null}
      {msg ? <p role="status" className="suggest-msg done">{msg}</p> : null}
      {listNote ? (
        <p className="admin-note">{listNote}</p>
      ) : (
        <ol className="admin-list">
          {(items || []).map((s) => (
            <li key={s.id} className="admin-item">
              <div className="admin-item-main">
                <p className="admin-nick">“{s.nickname || s.text}”</p>
                <p className="admin-meta">
                  {s.entityName || s.entityId}
                  {s.whereHeard && s.whereHeard.length ? ` · heard via ${s.whereHeard.join(', ')}` : ''}
                  {s.sourceUrl ? (
                    <>
                      {' · '}
                      <a href={s.sourceUrl} target="_blank" rel="noreferrer">source</a>
                    </>
                  ) : null}
                </p>
              </div>
              <div className="admin-item-btns">
                <button type="button" className="vote-btn heard slim" onClick={() => decide(s.id, 'approve')}>
                  Approve
                </button>
                <button type="button" className="vote-btn never slim" onClick={() => decide(s.id, 'reject')}>
                  Reject
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}
      {items && items.length === 0 && !listNote ? <p className="help-empty">Nothing pending.</p> : null}
    </section>
  );
}
