import { cn } from '../../lib/cn.js';

// Verdict + action buttons. Chunky, bordered, press-down — Concept B's
// affordance disciplined into C's palette.
const VARIANTS = {
  never: 'border-never text-never',
  unsure: 'border-unsure text-unsure',
  heard: 'border-heard text-heard',
  ember: 'border-ember text-gold',
  ghost: 'border-rule text-dim',
};

export function VoteButton({ variant = 'ghost', children, className, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'min-h-[64px] border bg-bg px-2 text-[0.8rem] font-bold uppercase tracking-[0.18em]',
        'transition-transform duration-100 active:scale-[0.97] disabled:opacity-40',
        VARIANTS[variant] || VARIANTS.ghost,
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ActionButton({ children, className, ...rest }) {
  return (
    <button
      type="button"
      className={cn(
        'min-h-[48px] border border-ember bg-ember px-5 font-bold uppercase tracking-[0.14em]',
        'text-[0.85rem] transition-transform duration-100 active:scale-[0.97] disabled:opacity-40',
        className,
      )}
      style={{ color: 'var(--on-ember)' }}
      {...rest}
    >
      {children}
    </button>
  );
}
