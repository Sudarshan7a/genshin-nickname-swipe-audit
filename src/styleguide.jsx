import { useState } from 'react';
import { VoteButton, ActionButton } from './components/ui/button.jsx';
import { TrayChip } from './components/ui/chip.jsx';
import { Stamp } from './components/ui/stamp.jsx';
import { Field } from './components/ui/field.jsx';

// /styleguide (hash route): every primitive + every state, one screen.
const SWATCHES = [
  ['bg', '#0b0a08'], ['surface', '#141210'], ['ink', '#f2ede3'], ['dim', '#a39a89'],
  ['ember', '#ff5a2a'], ['gold', '#ffb03a'], ['heard', '#8fd18a'],
  ['never', '#ff7a6b'], ['unsure', '#8fb4cc'], ['rule', '#2a251d'],
];

export default function Styleguide() {
  const [slammed, setSlammed] = useState(false);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-10 px-5 py-10">
      <header>
        <p className="text-[0.72rem] font-bold uppercase tracking-[0.28em] text-dim">Field record · primitives</p>
        <h1 className="font-shout text-5xl leading-none">STYLEGUIDE</h1>
        <p className="font-whisper text-xl italic text-dim">shout with Anton, whisper with Cormorant</p>
      </header>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">01 · Tokens</h2>
        <div className="grid grid-cols-5 gap-px border border-rule bg-rule">
          {SWATCHES.map(([name, hex]) => (
            <div key={name} className="bg-bg p-3">
              <span className="block h-10 w-full border border-rule" style={{ background: hex }} />
              <span className="mt-1 block text-[0.7rem] text-dim">{name}</span>
              <span className="block text-[0.7rem] text-ink">{hex}</span>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">02 · Vote buttons</h2>
        <div className="grid grid-cols-3 gap-px border border-rule bg-rule">
          <VoteButton variant="never">Never</VoteButton>
          <VoteButton variant="unsure">Not sure</VoteButton>
          <VoteButton variant="heard">Heard →</VoteButton>
        </div>
        <div className="mt-2 grid grid-cols-3 gap-px border border-rule bg-rule opacity-60">
          <VoteButton variant="never" disabled>Never</VoteButton>
          <VoteButton variant="unsure" disabled>Not sure</VoteButton>
          <VoteButton variant="heard" disabled>Heard →</VoteButton>
        </div>
        <p className="mt-1 text-[0.82rem] text-dim">top row live · bottom row disabled</p>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">03 · Actions</h2>
        <div className="flex flex-wrap gap-3">
          <ActionButton>Log it for review</ActionButton>
          <VoteButton variant="ghost">Skip</VoteButton>
          <VoteButton variant="ghost" disabled>Undo (empty)</VoteButton>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">04 · Stamps (click to slam)</h2>
        <button type="button" onClick={() => setSlammed((s) => !s)} className="flex flex-wrap gap-4 border border-rule p-5">
          <Stamp tone="heard" slam={slammed} key={`h${slammed}`}>Heard</Stamp>
          <Stamp tone="never" slam={slammed} key={`n${slammed}`}>Never</Stamp>
          <Stamp tone="unsure" slam={slammed} key={`u${slammed}`}>Unsure</Stamp>
        </button>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">05 · Tray chips</h2>
        <div className="flex gap-0 overflow-x-auto border border-rule">
          <TrayChip text="01 Walnut" verdict="heard" active />
          <TrayChip text="02 Hu Hu" />
          <TrayChip text="03 77th Director" verdict="unsure" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">06 · Fields</h2>
        <div className="flex flex-col gap-4 border border-rule p-5">
          <Field id="sg-nick" label="Nickname" placeholder="e.g. Walnut" hint="As travelers actually say it." />
          <Field id="sg-url" label="Source link (optional)" placeholder="https://…" inputMode="url" />
          <Field id="sg-err" label="Invite code" error="That code did not work. Check the link and try again." defaultValue="wrong-code" />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-[0.72rem] font-bold uppercase tracking-[0.28em] text-ember">07 · Type scale</h2>
        <p className="font-shout text-6xl">WALNUT 64</p>
        <p className="font-shout text-4xl">HU TAO 32</p>
        <p className="text-xl">Body 20 — travelers actually say it.</p>
        <p className="font-whisper text-xl italic">Whisper 20 — the name as travelers say it.</p>
        <p className="text-[0.72rem] uppercase tracking-[0.28em] text-dim">Kicker 12 — field record № 077</p>
      </section>
    </div>
  );
}
