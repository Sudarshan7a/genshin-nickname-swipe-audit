import { voteStatus } from '../store/queue.js';

// Every name on the record, on one screen — display only.
// Voting lives on the main card so there is exactly one set of
// Never / Not sure / Heard controls. Tapping a name puts it on the card.
// The verdict mark is text + glyph, never colour alone.
const MARK = {
  never: { glyph: '✕', spoken: 'Never heard', tone: 'text-never' },
  unsure: { glyph: '–', spoken: 'Not sure', tone: 'text-unsure' },
  heard: { glyph: '✓', spoken: 'Heard it', tone: 'text-heard' },
};

export default function NameRoster({ nicknames, votesById, activeId, onFocus }) {
  const list = nicknames || [];
  if (list.length === 0) return null;
  const judged = list.filter((n) => voteStatus(n.id, votesById)).length;

  return (
    <section aria-label="Every name on this record" data-testid="tray" className="roster">
      <header className="roster-head">
        <h3 className="roster-title">All {list.length} names</h3>
        <p className="roster-tally">
          {judged === list.length ? 'All logged' : `${judged} of ${list.length} logged`}
        </p>
      </header>
      <ol className="roster-list">
        {list.map((n, i) => {
          const status = voteStatus(n.id, votesById);
          const mark = status ? MARK[status] : null;
          return (
            <li key={n.id} className="roster-row" data-active={n.id === activeId ? 'true' : 'false'}>
              <div className="roster-row-head">
                <span className="roster-index">{String(i + 1).padStart(2, '0')}</span>
                <button
                  type="button"
                  className="roster-name"
                  onClick={() => onFocus(i)}
                  aria-current={n.id === activeId ? 'true' : undefined}
                  aria-label={`Put ${n.text} on the card${status ? `, you said ${mark.spoken}` : ''}`}
                >
                  {n.text}
                </button>
                <span className={`roster-mark ${mark ? mark.tone : 'text-dim'}`}>
                  <span aria-hidden="true">{mark ? mark.glyph : '·'}</span>
                  <span className="sr-only">{mark ? mark.spoken : 'Not answered yet'}</span>
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}