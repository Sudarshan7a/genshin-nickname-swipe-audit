import { useState } from 'react';
import { getVoterId, setInviteCode } from '../store/session.js';
import { Field } from './ui/field.jsx';
import { ActionButton } from './ui/button.jsx';

// Guild gate: one code in, field record out. Verifies against /api/my-votes.
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
        headers: { 'x-invite-code': trimmed, 'x-voter-id': getVoterId() },
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
    <div className="flex min-h-dvh items-center justify-center px-5" data-testid="gate">
      <div className="w-full max-w-md border border-rule bg-bg p-8">
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-dim">Field record · invite only</p>
        <h1 className="mt-2 font-shout text-5xl leading-none">
          HEARD IT <span className="font-whisper font-medium italic normal-case text-gold">in the wild?</span>
        </h1>
        <p className="mt-3 text-dim">Log the nicknames travelers actually use. One code gets you in.</p>
        <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
          <Field
            id="gate-code"
            label="Invite code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. traveler-2026"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck="false"
            error={error}
          />
          <ActionButton type="submit" disabled={busy || !code.trim()}>
            {busy ? 'Checking…' : 'Open the field book'}
          </ActionButton>
        </form>
      </div>
    </div>
  );
}
