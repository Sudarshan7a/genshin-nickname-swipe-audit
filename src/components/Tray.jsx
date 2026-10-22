import { voteStatus } from '../store/queue.js';

// Every nickname of the current entity as a chip with a per-chip status
// mark; clicking a chip jumps back to that card to revisit/change answers.
const MARK = { heard: '✓', never: '✕', unsure: '?' };

export default function Tray({ nicknames, votesById, activeIndex, onSelect }) {
  return (
    <nav className="tray" aria-label="All nicknames for this character">
      <ol className="tray-list">
        {(nicknames || []).map((n, i) => {
          const status = voteStatus(n.id, votesById);
          return (
            <li key={n.id}>
              <button
                type="button"
                className={`chip${status ? ` is-${status}` : ''}${i === activeIndex ? ' is-active' : ''}`}
                onClick={() => onSelect(i)}
                aria-pressed={i === activeIndex}
                title={status ? `${n.text} — you said ${status}` : `${n.text} — not voted yet`}
              >
                <span className="chip-mark" aria-hidden="true">
                  {status ? MARK[status] : '·'}
                </span>
                <span className="chip-text">{n.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
