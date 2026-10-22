import { useState } from 'react';

// Preset "where did you hear it" chips shared by both suggest entry points.
export const WHERE_PRESETS = ['Reddit', 'HoYoLAB', 'Discord', 'In-game chat', 'Friend', 'Other'];

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
        body: JSON.stringify({
          entityId,
          nickname: text,
          sourceUrl: sourceUrl.trim() || undefined,
          whereHeard,
        }),
      });
      setState({ kind: 'done', message: `Thanks — “${text}” is in for review.` });
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
    <form className="suggest" onSubmit={submit} aria-label={`Suggest a nickname for ${entityName}`}>
      <h3 className="suggest-title">Add one you know</h3>
      <p className="suggest-sub">
        Heard a name for {entityName} that is missing here? Suggestions are kept separate from
        research results until reviewed.
      </p>
      <label className="field" htmlFor={`suggest-nick-${entityId}`}>
        Nickname
        <input
          id={`suggest-nick-${entityId}`}
          type="text"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          placeholder="e.g. Cocogoat"
          autoComplete="off"
          maxLength={60}
        />
      </label>
      <label className="field" htmlFor={`suggest-url-${entityId}`}>
        Source link <span className="optional">(optional)</span>
        <input
          id={`suggest-url-${entityId}`}
          type="url"
          inputMode="url"
          value={sourceUrl}
          onChange={(e) => setSourceUrl(e.target.value)}
          placeholder="https://…"
          autoComplete="off"
        />
      </label>
      <fieldset className="where-group">
        <legend>
          Where did you hear it? <span className="optional">(pick any)</span>
        </legend>
        <div className="where-chips">
          {WHERE_PRESETS.map((tag) => (
            <button
              key={tag}
              type="button"
              className={`where-chip${whereHeard.includes(tag) ? ' is-on' : ''}`}
              aria-pressed={whereHeard.includes(tag)}
              onClick={() => toggleWhere(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </fieldset>
      <button type="submit" className="suggest-send" disabled={!nickname.trim() || state.kind === 'sending'}>
        {state.kind === 'sending' ? 'Sending…' : 'Send suggestion'}
      </button>
      {state.message ? (
        <p role={state.kind === 'error' ? 'alert' : 'status'} className={`suggest-msg ${state.kind}`}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
