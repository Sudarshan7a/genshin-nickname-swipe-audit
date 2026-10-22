// Completion panel. The answer list lives in NameRoster, so this only confirms
// the record is done and offers the way out.
export default function Summary({ entity, votedCount, totalCount, onNext, hasNext }) {
  return (
    <section aria-label={`${entity.name} — record complete`} data-testid="summary" className="summary-panel">
      <p className="summary-kicker">Record complete</p>
      <h3 className="summary-title">{entity.name}</h3>
      <p className="summary-copy">
        {totalCount === 1
          ? 'One name logged. Add another below if you know one we missed.'
          : `All ${totalCount} names logged${votedCount < totalCount ? ', some left blank' : ''}. Add another below if you know one we missed.`}
      </p>
      <button type="button" onClick={onNext} className="summary-next">
        {hasNext ? 'Next entry →' : 'Back to start →'}
      </button>
    </section>
  );
}