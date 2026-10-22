import { useState } from 'react';
import { ActionButton } from './ui/button.jsx';

export const WHERE_PRESETS = ['Reddit', 'HoYoLAB', 'Discord', 'In-game chat', 'Friend', 'Other'];

// Log-a-name form. Suggestions stay quarantined until a human reviews them.
export default function SuggestForm({ entityId, entityName, authFetch, onSuggested }) {
  const [nickname, setNickname] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [whereHeard, setWhereHeard] = useState([]);
  const [state, setState] = useState({ kind: 'idle', message: '' });

  function toggleWhere(tag) {
    setWhereHeard((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function submit(e) {
    e.preventDefault();
    const text = nickname.trim();
    if (!text || state.kind === 'sending') return;
    setState({ kind: 'sending', message: '' });
    try {
      await authFetch('/api/suggest', {
        method: 'POST',
        body: JSON.stringify({ entityId, nickname: text, sourceUrl: sourceUrl.trim() || undefined, whereHeard }),
      });
      setState({ kind: 'done', message: `“${text}” is in for review.` });
      setNickname('');
      setSourceUrl('');
      setWhereHeard([]);
      if (typeof onSuggested === 'function') onSuggested(text);
    } catch (err) {
      if (err && err.status === 409) {
        setState({ kind: 'error', message: err.message || 'That name is already on file for this entry.' });
      } else {
        setState({ kind: 'error', message: 'Could not send. Check your connection and try again.' });
      }
    }
  }

  return (
    <form onSubmit={submit} aria-label={`Suggest a nickname for ${entityName}`} className="border border-dashed border-dim/60 p-5">
      <h3 className="font-shout text-xl uppercase">Know another one?</h3>
      <p className="mt-1 font-whisper text-lg italic text-dim">
        Heard a name for {entityName} that's missing? It stays out of the results until a human reviews it.
      </p>
      <div className="mt-4 flex flex-col gap-4">
        <label htmlFor={`sg-nick-${entityId}`} className="block">
          <span className="mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.22em] text-dim">Nickname</span>
          <input
            id={`sg-nick-${entityId}`}
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Walnut"
            autoComplete="off"
            maxLength={60}
            className="block w-full border border-rule bg-surface px-4 py-3 text-ink placeholder:text-dim/60"
          />
        </label>
        <label htmlFor={`sg-url-${entityId}`} className="block">
          <span className="mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.22em] text-dim">
            Source link <span className="normal-case tracking-normal opacity-70">(optional)</span>
          </span>
          <input
            id={`sg-url-${entityId}`}
            type="url"
            inputMode="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://…"
            autoComplete="off"
            className="block w-full border border-rule bg-surface px-4 py-3 text-ink placeholder:text-dim/60"
          />
        </label>
        <fieldset>
          <legend className="mb-2 text-[0.72rem] font-bold uppercase tracking-[0.22em] text-dim">
            Where did you hear it? <span className="normal-case tracking-normal opacity-70">(pick any)</span>
          </legend>
          <div className="flex flex-wrap gap-2">
            {WHERE_PRESETS.map((tag) => (
              <button
                key={tag}
                type="button"
                aria-pressed={whereHeard.includes(tag)}
                onClick={() => toggleWhere(tag)}
                className={`min-h-[44px] border px-4 text-[0.82rem] ${whereHeard.includes(tag) ? 'border-gold text-gold' : 'border-rule text-dim'}`}
              >
                {tag}
              </button>
            ))}
          </div>
        </fieldset>
        <ActionButton type="submit" disabled={!nickname.trim() || state.kind === 'sending'}>
          {state.kind === 'sending' ? 'Sending…' : 'Log it for review'}
        </ActionButton>
        {state.message ? (
          <p role={state.kind === 'error' ? 'alert' : 'status'} className={`text-[0.85rem] font-bold ${state.kind === 'error' ? 'text-never' : 'text-heard'}`}>
            {state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}
