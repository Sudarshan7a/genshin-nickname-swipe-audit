const RAIL = {
  character: '#e3b341',
  weapon: '#7fa6b8',
  artifact: '#8aa653',
  pyro: '#ff5a2a',
  hydro: '#38bdf8',
  anemo: '#5eead4',
  electro: '#b28dff',
  dendro: '#a3e635',
  cryo: '#bae6fd',
  geo: '#e3b341',
};

export function railFor(entity) {
  const el = (entity.element || '').toLowerCase();
  if (el && RAIL[el]) return RAIL[el];
  return RAIL[entity.type] || '#ff5a2a';
}

// Editorial entity line: index number, Anton name, element tag.
// No art image in M4 — the monogram plate + ember rail carry identity.
export default function EntityHeader({ entity, index, blind, onToggleBlind }) {
  const rail = railFor(entity);
  const initial = (entity.name || '?').trim().charAt(0).toUpperCase();
  return (
    <header style={{ borderLeft: `3px solid ${rail}` }} className="border-y border-rule py-4 pl-4">
      <div className="flex items-baseline gap-3">
        <span className="font-shout text-sm text-ember">{String(index + 1).padStart(3, '0')}</span>
        <h2 className="font-shout text-3xl uppercase leading-none tracking-wide">{entity.name}</h2>
        <span className="ml-auto flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.22em] text-dim">
          <span
            aria-hidden="true"
            className="flex h-8 w-8 items-center justify-center border border-rule font-shout text-sm text-ink"
          >
            {initial}
          </span>
          {entity.type}
          {entity.element ? ` · ${entity.element}` : ''}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-3">
        <p className="font-whisper text-lg italic text-dim">the names as travelers say them</p>
        <button
          type="button"
          onClick={onToggleBlind}
          aria-pressed={blind}
          className="ml-auto min-h-[44px] px-3 text-[0.72rem] font-bold uppercase tracking-[0.2em] text-dim"
          title={blind ? 'Blind mode on: sources hidden until you vote' : 'Blind mode off'}
        >
          Blind {blind ? 'on' : 'off'}
        </button>
      </div>
    </header>
  );
}
