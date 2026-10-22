import { cn } from '../../lib/cn.js';

// Labeled field with hint + error. 16px input floor (no iOS zoom).
export function Field({ label, hint, error, id, className, ...rest }) {
  return (
    <label htmlFor={id} className={cn('block', className)}>
      <span className="mb-2 block text-[0.72rem] font-bold uppercase tracking-[0.22em] text-dim">
        {label}
      </span>
      <input
        id={id}
        className={cn(
          'block w-full border border-rule bg-surface px-4 py-3 text-ink placeholder:text-dim/60',
          error && 'border-never',
        )}
        {...rest}
      />
      {hint && !error && <span className="mt-1 block text-[0.82rem] text-dim">{hint}</span>}
      {error && (
        <span role="alert" className="mt-1 block text-[0.82rem] font-bold text-never">
          {error}
        </span>
      )}
    </label>
  );
}
