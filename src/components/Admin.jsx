import { useCallback, useEffect, useState } from 'react';
import { getAdminCode, setAdminCode } from '../store/session.js';

// Review desk (location.hash === '#/admin'): code gate, pending queue with
// approve/reject, results.json download via GET /api/export.
export default function Admin({ authFetch }) {
  const [code, setCode] = useState(getAdminCode());
  const [unlocked, setUnlocked] = useState(!!getAdminCode());
  const [items, setItems] = useState(null);
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
        const data = await res.json();
        setItems(data.suggestions || data.items || []);
      } catch (err) {
        if (err && (err.status === 401 || err.status === 403)) {
          setUnlocked(false);
          setMsg('Admin code rejected.');
        } else {
          setMsg('Could not load suggestions. Try again.');
        }
      } finally {
        setBusy(false);
      }
      try {
        const res = await authed(adminCode)('/api/results');
        setCounts(await res.json());
      } catch { /* counts are a nicety — the export button is the real tool */ }
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
      <div className="mx-auto w-full max-w-md border border-rule bg-bg p-8">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-dim">Guild office only</p>
        <h2 className="mt-1 font-shout text-4xl uppercase">Review desk</h2>
        <form onSubmit={unlock} className="mt-5 flex flex-col gap-4">
          <label htmlFor="admin-code" className="block">
            <span className="mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.22em] text-dim">Admin code</span>
            <input
              id="admin-code"
              type="password"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="block w-full border border-rule bg-surface px-4 py-3 text-ink"
            />
          </label>
          <button type="submit" disabled={!code.trim()} className="min-h-[48px] border border-ember font-bold uppercase tracking-[0.14em] text-gold disabled:opacity-40">
            Unlock
          </button>
        </form>
        {msg ? <p role="alert" className="mt-3 text-[0.85rem] font-bold text-never">{msg}</p> : null}
      </div>
    );
  }

  return (
    <section aria-label="Admin review" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-shout text-3xl uppercase">Review desk</h2>
        <span className="flex-1" />
        <button type="button" onClick={() => refresh(code)} disabled={busy} className="min-h-[44px] border border-rule px-4 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-dim disabled:opacity-40">
          {busy ? 'Loading…' : 'Refresh'}
        </button>
        <button type="button" onClick={download} className="min-h-[44px] border border-ember px-4 text-[0.8rem] font-bold uppercase tracking-[0.14em] text-gold">
          Download results.json
        </button>
      </div>
      {counts ? (
        <p role="status" className="text-[0.82rem] text-dim">
          {(() => {
            const rows = Object.values((counts.results || counts.counts || counts) ?? {});
            if (!Array.isArray(rows) || rows.length === 0) return 'No votes tallied yet.';
            const votes = rows.reduce((a, r) => a + (r.heard || 0) + (r.never || 0) + (r.unsure || 0), 0);
            const likely = rows.filter((r) => r.likely).length;
            return `${rows.length} nicknames tallied · ${votes} votes · ${likely} likely`;
          })()}
        </p>
      ) : null}
      {msg ? <p role="status" className="text-[0.85rem] font-bold text-heard">{msg}</p> : null}
      <ol className="flex flex-col gap-3">
        {(items || []).map((s) => (
          <li key={s.id} className="flex items-center gap-4 border border-rule p-4">
            <div className="min-w-0 flex-1">
              <p className="break-words text-lg font-bold">“{s.nickname || s.text}”</p>
              <p className="mt-1 break-words text-[0.82rem] text-dim">
                {s.entityName || s.entityId}
                {s.whereHeard && s.whereHeard.length ? ` · heard via ${s.whereHeard.join(', ')}` : ''}
                {s.sourceUrl ? (
                  <> · <a href={s.sourceUrl} target="_blank" rel="noreferrer" className="text-gold">source</a></>
                ) : null}
              </p>
            </div>
            <div className="flex flex-none gap-2">
              <button type="button" onClick={() => decide(s.id, 'approve')} className="min-h-[44px] border border-heard px-4 text-[0.8rem] font-bold uppercase tracking-[0.12em] text-heard">
                Approve
              </button>
              <button type="button" onClick={() => decide(s.id, 'reject')} className="min-h-[44px] border border-never px-4 text-[0.8rem] font-bold uppercase tracking-[0.12em] text-never">
                Reject
              </button>
            </div>
          </li>
        ))}
      </ol>
      {items && items.length === 0 ? <p className="text-dim">Nothing pending. The wild is quiet.</p> : null}
    </section>
  );
}
