import { cn } from '../../lib/cn.js';

// Commit stamp — Concept C's sticker. Rotated double border, never a badge.
const TONE = { heard: 'border-heard text-heard', never: 'border-never text-never', unsure: 'border-unsure text-unsure' };

export function Stamp({ tone = 'heard', children, slam, className }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-block rounded-stamp border-4 border-double px-3 py-1 font-shout text-lg uppercase',
        TONE[tone] || TONE.heard,
        slam && 'stamp-in',
        className,
      )}
      style={{ transform: slam ? undefined : 'rotate(-8deg)', background: 'rgba(11,10,8,0.72)' }}
    >
      {children}
    </span>
  );
}
