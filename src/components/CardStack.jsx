import { useCallback, useEffect, useState } from 'react';
import { motion, useMotionValue, useTransform, useReducedMotion, animate } from 'framer-motion';
import { VoteButton } from './ui/button.jsx';
import { Stamp } from './ui/stamp.jsx';

// One nickname card. Drag right = Heard, left = Never, up = Unsure.
// Springs from M3 tokens: critically damped default, bounce on flick commit.
const COMMIT_X = 110;
const COMMIT_Y = -110;

const ANSWER_LABEL = { heard: 'Heard it', never: 'Never heard', unsure: 'Not sure' };
const ANSWER_TEXT = { heard: 'text-heard', never: 'text-never', unsure: 'text-unsure' };

function sourceLabel(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'Source';
  }
}

export default function CardStack({ card, existingAnswer, blind, onCommit, onSkip, canUndo, onUndo }) {
  const reduceMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [slam, setSlam] = useState(null);
  const [announcement, setAnnouncement] = useState('');
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = reduceMotion ? 0 : useTransform(x, [-260, 260], [-7, 7]);
  const heardOpacity = useTransform(x, [20, COMMIT_X], [0, 1]);
  const neverOpacity = useTransform(x, [-20, -COMMIT_X], [0, 1]);
  const unsureOpacity = useTransform(y, [-20, COMMIT_Y], [0, 1]);
  const locked = blind && !existingAnswer;
  const source = card.sourceUrl || (card.sources && card.sources[0]) || null;

  const commit = useCallback(
    (answer) => {
      setAnnouncement(`${card.text} — marked ${ANSWER_LABEL[answer]}.`);
      setSlam(answer);
      try {
        if (navigator.vibrate) navigator.vibrate(12);
      } catch { /* haptics unsupported */ }
      onCommit(answer);
    },
    [card.text, onCommit],
  );

  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') { e.preventDefault(); commit('heard'); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); commit('never'); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); commit('unsure'); }
      else if ((e.key === 'z' || e.key === 'Z') && !e.metaKey && !e.ctrlKey) { e.preventDefault(); onUndo(); }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit, onUndo]);

  function snapBack() {
    animate(x, 0, { type: 'spring', bounce: 0, duration: 0.4 });
    animate(y, 0, { type: 'spring', bounce: 0, duration: 0.4 });
  }

  function handleDragEnd(_e, info) {
    const { offset, velocity } = info;
    if (offset.x > COMMIT_X || velocity.x > 700) commit('heard');
    else if (offset.x < -COMMIT_X || velocity.x < -700) commit('never');
    else if (offset.y < COMMIT_Y || velocity.y < -700) commit('unsure');
    else snapBack();
  }

  function toggleFlip() {
    if (locked) return;
    setFlipped((f) => !f);
  }

  const dragProps = reduceMotion
    ? {}
    : {
        drag: true,
        dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
        dragElastic: 0.75,
        onDragEnd: handleDragEnd,
        onTap: (_e, info) => {
          if (Math.abs(info.offset.x) < 8 && Math.abs(info.offset.y) < 8) toggleFlip();
        },
      };

  return (
    <section aria-label={`Nickname card: ${card.text}`}>
      <motion.div
        className="rise-in relative border border-rule border-l-ember bg-bg px-6 py-8"
        style={reduceMotion ? undefined : { x, y, rotate, borderLeftWidth: 3, touchAction: 'none', userSelect: 'none' }}
        {...dragProps}
      >
        {!flipped ? (
          <div>
            <p className="font-whisper text-xl italic text-dim">heard in the wild?</p>
            <p className="mt-1 font-shout leading-none" style={{ fontSize: 'clamp(2.4rem, 10vw, 3.6rem)', }}>
              {card.text}
            </p>
            {existingAnswer ? (
              <p className="mt-2 text-sm font-bold">
                You said: <span className={ANSWER_TEXT[existingAnswer]}>{ANSWER_LABEL[existingAnswer]}</span>
              </p>
            ) : (
              <p className="mt-2 text-[0.85rem] text-dim">Drag the record, use keys, or stamp it below</p>
            )}
            <button
              type="button"
              onClick={toggleFlip}
              disabled={locked}
              className="mt-4 min-h-[44px] border-b border-dashed border-dim px-1 text-[0.85rem] text-dim disabled:opacity-60"
            >
              {locked ? 'Source sealed until you vote' : 'See research note'}
            </button>
          </div>
        ) : (
          <div>
            <p className="font-whisper text-xl italic text-dim">field note</p>
            {card.quote ? <p className="mt-1 font-whisper text-lg italic">“{card.quote}”</p> : null}
            {source ? (
              <a className="mt-2 font-bold text-gold" href={source} target="_blank" rel="noreferrer">
                Source: {sourceLabel(source)}
              </a>
            ) : (
              <p className="mt-2 text-[0.85rem] text-dim">No source link recorded.</p>
            )}
            {card.researchConfidence ? (
              <p className="mt-1 text-[0.85rem] text-dim">
                Research confidence: <strong className="text-ink">{card.researchConfidence}</strong>
              </p>
            ) : null}
            <button
              type="button"
              onClick={toggleFlip}
              className="mt-4 min-h-[44px] border-b border-dashed border-dim px-1 text-[0.85rem] text-dim"
            >
              Back to nickname
            </button>
          </div>
        )}
        {reduceMotion ? null : (
          <>
            <motion.span className="pointer-events-none absolute" style={{ opacity: heardOpacity }}>
              <Stamp tone="heard">Heard</Stamp>
            </motion.span>
            <motion.span className="pointer-events-none absolute" style={{ opacity: neverOpacity }}>
              <Stamp tone="never">Never</Stamp>
            </motion.span>
            <motion.span className="pointer-events-none absolute" style={{ opacity: unsureOpacity }}>
              <Stamp tone="unsure">Unsure</Stamp>
            </motion.span>
          </>
        )}
        {slam && !reduceMotion ? (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <Stamp tone={slam} slam key={`slam-${card.id}-${slam}`}>
              {slam === 'heard' ? 'Heard' : slam === 'never' ? 'Never' : 'Unsure'}
            </Stamp>
          </span>
        ) : null}
      </motion.div>

      <div className="mt-px grid grid-cols-3 gap-px border border-rule bg-rule" role="group" aria-label="Your answer">
        <VoteButton variant="never" onClick={() => commit('never')} aria-label="Never">Never</VoteButton>
        <VoteButton variant="unsure" onClick={() => commit('unsure')} aria-label="Not sure">Not sure</VoteButton>
        <VoteButton variant="heard" onClick={() => commit('heard')} aria-label="Heard">Heard →</VoteButton>
      </div>
      <div className="mt-3 flex gap-3">
        <button type="button" onClick={onUndo} disabled={!canUndo} className="min-h-[44px] px-2 text-[0.8rem] font-bold uppercase tracking-[0.18em] text-dim disabled:opacity-40">
          Undo
        </button>
        <button type="button" onClick={onSkip} className="min-h-[44px] px-2 text-[0.8rem] font-bold uppercase tracking-[0.18em] text-dim">
          Skip →
        </button>
      </div>
      <div className="sr-only" role="status" aria-live="polite">{announcement}</div>
    </section>
  );
}
