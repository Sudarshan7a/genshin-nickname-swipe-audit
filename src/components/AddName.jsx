import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import SuggestForm from './SuggestForm.jsx';

// "We missed one" is reachable on every record, not only after the last name is
// answered. Collapsed by default so it never competes with the names, one tap
// to open.
export default function AddName({ entityId, entityName, authFetch, onSuggested, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const panelId = `add-name-${entityId}`;

  return (
    <div className="add-name">
      <button
        type="button"
        className="add-name-toggle"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
      >
        {open ? <X size={16} aria-hidden="true" /> : <Plus size={16} aria-hidden="true" />}
        {open ? 'Close' : `We missed one — add a name for ${entityName}`}
      </button>
      {open ? (
        <div id={panelId} className="add-name-body">
          <SuggestForm
            entityId={entityId}
            entityName={entityName}
            authFetch={authFetch}
            onSuggested={(text) => {
              if (typeof onSuggested === 'function') onSuggested(text);
            }}
          />
        </div>
      ) : null}
    </div>
  );
}