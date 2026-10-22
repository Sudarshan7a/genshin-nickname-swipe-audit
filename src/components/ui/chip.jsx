import { cn } from '../../lib/cn.js';

// Tray chip with verdict mark. Left-aligned editorial ledger row on
// desktop, horizontal snap row on mobile.
const MARK = { heard: 'text-heard', never: 'text-never', unsure: 'text-unsure' };

export function TrayChip({ text, verdict, active, ...rest }) {
  return (
    <button
      type="button"
      aria-pressed={!!active}
      className={cn(
        'flex min-h-[44px] flex-none items-center border border-rule px-4 text-[0.82rem] tracking-[0.06em] [overflow-wrap:anywhere]',
        verdict ? 'text-ink' : 'text-dim',
        active && 'border-ember text-ink',
      )}
      {...rest}
    >
      <span className={cn('mr-2 font-bold', verdict ? MARK[verdict] : 'text-dim')}>
        {verdict === 'heard' ? '✓' : verdict === 'never' ? '✕' : verdict === 'unsure' ? '–' : '·'}
      </span>
      {text}
    </button>
  );
}
