import { voteStatus } from '../store/queue.js';
import SuggestForm from './SuggestForm.jsx';

// After the last card: answers first, then the same SuggestForm, then Next.
const ANSWER_LABEL = { heard: 'Heard it', never: 'Never heard', unsure: 'Not sure' };

export default function Summary({ entity, votesById, onRevisit, onNext, hasNext, authFetch, onSuggested, shortDeck }) {
  const nicknames = entity.nicknames || [];
  return (
    <section aria-label={`${entity.name} — your answers`} className="border border-rule p-6">
      <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">Logged in the field book</p>
      <h3 className="mt-1 font-shout text-3xl uppercase">
        {entity.name}
        {shortDeck ? <span className="font-body text-sm normal-case tracking-normal text-dim"> — short deck, add one you know below</span> : null}
      </h3>
      <ol className="mt-4 flex flex-col">
        {nicknames.map((n, i) => {
          const status = voteStatus(n.id, votesById);
          return (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onRevisit(i)}
                className="flex w-full items-baseline justify-between gap-3 border-b border-rule py-3 text-left"
              >
                <span className="font-bold">“{n.text}”</span>
                <span className={`text-[0.85rem] font-bold ${status === 'heard' ? 'text-heard' : status === 'never' ? 'text-never' : status === 'unsure' ? 'text-unsure' : 'text-dim'}`}>
                  {status ? ANSWER_LABEL[status] : 'Skipped — tap to answer'}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="mt-5">
        <SuggestForm entityId={entity.id} entityName={entity.name} authFetch={authFetch} onSuggested={onSuggested} />
      </div>
      <button
        type="button"
        onClick={onNext}
        className="mt-5 min-h-[52px] w-full border border-ember font-bold uppercase tracking-[0.14em] text-gold"
      >
        {hasNext ? 'Next entry →' : 'Back to start →'}
      </button>
    </section>
  );
}
