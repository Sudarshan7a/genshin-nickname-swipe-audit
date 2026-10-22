import { TrayChip } from './ui/chip.jsx';
import { voteStatus } from '../store/queue.js';

// Ledger rail: every nickname as a row with its verdict mark.
// Mobile: horizontal snap strip. Desktop: vertical rail (parent layouts it).
export default function Tray({ nicknames, votesById, activeIndex, onSelect }) {
  return (
    <nav aria-label="All nicknames on this record" className="flex gap-0 overflow-x-auto border border-rule lg:flex-col lg:overflow-visible">
      {(nicknames || []).map((n, i) => (
        <TrayChip
          key={n.id}
          text={`${String(i + 1).padStart(2, '0')} ${n.text}`}
          verdict={voteStatus(n.id, votesById)}
          active={i === activeIndex}
          onClick={() => onSelect(i)}
          aria-label={`${n.text}${voteStatus(n.id, votesById) ? ` — you said ${voteStatus(n.id, votesById)}` : ''}`}
        />
      ))}
    </nav>
  );
}
