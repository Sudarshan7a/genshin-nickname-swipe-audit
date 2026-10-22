import { useState } from 'react';
import { VoteButton, ActionButton } from './components/ui/button.jsx';
import { Stamp } from './components/ui/stamp.jsx';
import { Field } from './components/ui/field.jsx';

const SWATCHES = [
  ['deep slate', '#111a20'], ['surface', '#19252c'], ['text', '#eeeae0'], ['secondary', '#b5c2c2'],
  ['jade', '#73c8a9'], ['progression gold', '#e4c56f'], ['heard', '#9acdb5'],
  ['never', '#dfa49a'], ['unsure', '#a5bfd2'], ['separator', '#35464d'],
];

export default function Styleguide() {
  const [slammed, setSlammed] = useState(false);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-10">
      <header>
        <a href="#/" className="font-shout text-lg uppercase tracking-[.08em]">Teyvat Field Notes</a>
        <h1 className="mt-5 font-shout text-5xl leading-none">INTERFACE KIT</h1>
        <p className="mt-2 max-w-[60ch] text-dim">Game archive surfaces, clear voting controls, and readable field notes.</p>
      </header>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[.14em] text-gold">Color system</h2>
        <div className="grid grid-cols-2 gap-px border border-rule bg-rule sm:grid-cols-5">
          {SWATCHES.map(([name, hex]) => <div key={name} className="bg-bg p-3"><span className="block h-10 w-full border border-rule" style={{ background: hex }} /><span className="mt-2 block text-xs text-dim">{name}</span><span className="text-xs text-ink">{hex}</span></div>)}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[.14em] text-gold">Nickname vote</h2>
        <div className="swipe-card"><p className="text-dim">Have you heard this name?</p><p className="mt-3 font-shout text-5xl">WALNUT</p><p className="mt-2 text-sm text-dim">Answer directly or use left, up, and right arrow keys.</p></div>
        <div className="mt-2 grid grid-cols-3 gap-px border border-rule bg-rule"><VoteButton variant="never"><span aria-hidden="true" className="vote-glyph">✕</span> Never</VoteButton><VoteButton variant="unsure"><span aria-hidden="true" className="vote-glyph">–</span> Not sure</VoteButton><VoteButton variant="heard"><span aria-hidden="true" className="vote-glyph">✓</span> Heard</VoteButton></div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[.14em] text-gold">Actions and record states</h2>
        <div className="flex flex-wrap items-center gap-3"><ActionButton>Log for review</ActionButton><VoteButton variant="ghost">Skip</VoteButton><VoteButton variant="ghost" disabled>Undo</VoteButton><button type="button" onClick={() => setSlammed((s) => !s)} className="border border-rule p-3"><Stamp tone="heard" slam={slammed} key={`heard-${slammed}`}>Heard</Stamp></button></div>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[.14em] text-gold">Every name on a record</h2>
        <p className="mb-3 text-sm text-dim">Display-only ledger. Voting lives on the main card above.</p>
        <div className="roster">
          <header className="roster-head">
            <h3 className="roster-title">All 3 names</h3>
            <p className="roster-tally">1 of 3 logged</p>
          </header>
          <ol className="roster-list">
            <li className="roster-row" data-active="true">
              <div className="roster-row-head">
                <span className="roster-index">01</span>
                <span className="roster-name">Walnut</span>
                <span className="roster-mark text-heard" aria-hidden="true">✓</span>
              </div>
            </li>
            <li className="roster-row" data-active="false">
              <div className="roster-row-head">
                <span className="roster-index">02</span>
                <span className="roster-name">Hu Hu</span>
                <span className="roster-mark text-dim" aria-hidden="true">·</span>
              </div>
            </li>
            <li className="roster-row" data-active="false">
              <div className="roster-row-head">
                <span className="roster-index">03</span>
                <span className="roster-name">77th Director</span>
                <span className="roster-mark text-unsure" aria-hidden="true">–</span>
              </div>
            </li>
          </ol>
        </div>
        <div className="record-actions">
          <button type="button" className="record-action">Undo last</button>
          <button type="button" className="record-action">Skip character →</button>
        </div>
        <button type="button" className="add-name-toggle mt-4">We missed one — add a name for Hu Tao</button>
      </section>

      <section>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-[.14em] text-gold">Fields</h2>
        <div className="flex flex-col gap-4 border border-rule p-5"><Field id="sg-nick" label="Nickname" placeholder="Enter a nickname" hint="Use the name players actually say." /><Field id="sg-url" label="Source link (optional)" placeholder="https://example.com/source" inputMode="url" /><Field id="sg-err" label="Invite code" error="That code did not work. Check it and try again." defaultValue="wrong-code" /></div>
      </section>
    </div>
  );
}
