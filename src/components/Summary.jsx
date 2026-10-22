import { voteStatus } from '../store/queue.js';
import SuggestForm from './SuggestForm.jsx';

// After the last card: per-nickname answers first, then the same SuggestForm
// used in help-queue mode, then the Next button. Skipped cards can be revisited.
const ANSWER_LABEL = {
  heard: 'Heard it',
  never: 'Never heard',
  unsure: 'Not sure',
};

export default function Summary({
  entity,
  votesById,
  onRevisit,
  onNext,
  hasNext,
  authFetch,
  onSuggested,
  shortDeck,
}) {
  const nicknames = entity.nicknames || [];
  return (
    <section className="summary" aria-label={`${entity.name} — your answers`}>
      <h2 className="summary-title">
        {entity.name}: your answers
        {shortDeck ? <span className="summary-note"> — short deck, add one you know below</span> : null}
      </h2>
      <ol className="summary-list">
        {nicknames.map((n, i) => {
          const status = voteStatus(n.id, votesById);
          return (
            <li key={n.id}>
              <button type="button" className="summary-row" onClick={() => onRevisit(i)}>
                <span className="summary-nick">“{n.text}”</span>
                <span className={`summary-answer${status ? ` is-${status}` : ' is-skipped'}`}>
                  {status ? ANSWER_LABEL[status] : 'Skipped — tap to answer'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <SuggestForm
        entityId={entity.id}
        entityName={entity.name}
        authFetch={authFetch}
        onSuggested={onSuggested}
      />
      <button type="button" className="next-btn" onClick={onNext}>
        {hasNext ? 'Next entry →' : 'Back to start →'}
      </button>
    </section>
  );
}
