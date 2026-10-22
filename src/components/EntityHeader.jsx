// Entity header: type badge, name, image only when imageUrl exists,
// otherwise a styled initial-letter name plate. Blind-mode toggle lives here.

const TYPE_LABEL = {
  character: 'Character',
  weapon: 'Weapon',
  artifact: 'Artifact',
};

export default function EntityHeader({ entity, blind, onToggleBlind }) {
  const initial = (entity.name || '?').trim().charAt(0).toUpperCase();
  return (
    <header className="entity-head">
      <div className="entity-id-row">
        {entity.imageUrl ? (
          <img
            className="entity-img"
            src={entity.imageUrl}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span className="entity-plate" aria-hidden="true">
            {initial}
          </span>
        )}
        <div className="entity-titles">
          <span className={`type-badge type-${entity.type}`}>
            {TYPE_LABEL[entity.type] || entity.type}
          </span>
          <h2 className="entity-name">{entity.name}</h2>
        </div>
        <button
          type="button"
          className={`blind-toggle${blind ? ' is-on' : ''}`}
          onClick={onToggleBlind}
          aria-pressed={blind}
          title={blind ? 'Blind mode on: sources stay hidden until you vote' : 'Blind mode off: sources visible before voting'}
        >
          <span className="blind-dot" aria-hidden="true" />
          Blind {blind ? 'on' : 'off'}
        </button>
      </div>
    </header>
  );
}
