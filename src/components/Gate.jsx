import { useState } from 'react';
import { setInviteCode, getVoterId } from '../store/session.js';

// Bare-URL gate: one code input, nothing else. Verifies the code against
// the server before storing it so a wrong code shows an error immediately.
export default function Gate({ onAuthed }) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError('');
    try {
      const res = await fetch('/api/my-votes', {
        headers: {
          'x-invite-code': trimmed,
          'x-voter-id': getVoterId(),
        },
      });
      if (res.status === 401 || res.status === 403) {
        setError('That code did not work. Check the link and try again.');
        return;
      }
      if (!res.ok) throw new Error(`Server error (${res.status}).`);
      setInviteCode(trimmed);
      onAuthed(trimmed);
    } catch {
      setError('Could not reach the server. Try again in a moment.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="gate-wrap">
      <div className="gate-card" role="main" aria-labelledby="gate-title">
        <p className="gate-kicker">Teyvat field guide</p>
        <h1 id="gate-title">Nickname Swipe</h1>
        <p className="gate-sub">
          This deck is invite-only. Paste the code from your invite link to begin.
        </p>
        <form onSubmit={submit} className="gate-form">
          <label htmlFor="gate-code">Invite code</label>
          <input
            id="gate-code"
            name="code"
            type="text"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. traveler-2026"
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? 'gate-error' : undefined}
          />
          <button type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Checking…' : 'Enter'}
          </button>
        </form>
        {error ? (
          <p id="gate-error" role="alert" className="gate-error">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
