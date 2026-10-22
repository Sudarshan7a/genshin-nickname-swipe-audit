import { useCallback, useEffect, useState } from 'react';
import { motion, useMotionValue, useReducedMotion, useTransform } from 'framer-motion';

// One nickname card: drag right = Heard, left = Never, up = Not sure.
// Taps flip to the research back (locked until voted while blind mode is on).
// prefers-reduced-motion renders a static card — buttons only, no drag.

const COMMIT_X = 110;
const COMMIT_Y = -110;

const ANSWER_LABEL = { heard: 'Heard it', never: 'Never heard', unsure: 'Not sure' };

function Back({ card, locked }) {
  const source = card.sourceUrl || (card.sources && card.sources[0]) || null;
  if (locked) {
    return (
      <div className="card-back locked">
        <p className="lock-note">Vote first — the research note stays sealed until then.</p>
      </div>
    );
  }
  return (
    <div className="card-back">
      <p className="back-kicker">Field note</p>
      {card.quote ? <blockquote className="back-quote">“{card.quote}”</blockquote> : null}
      {source ? (
        <a className="back-source" href={source} target="_blank" rel="noreferrer">
          {sourceLabel(source)}
        </a>
      ) : (
        <p className="back-nosource">No source link recorded.</p>
      )}
      {card.researchConfidence ? (
        <p className="back-conf">
          Research confidence: <strong>{card.researchConfidence}</strong>
        </p>
      ) : null}
    </div>
  );
}

function sourceLabel(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    return `Source: ${host}`;
  } catch {
    return 'Source link';
  }
}

export default function CardStack({
  card,
  existingAnswer,
  blind,
  exitDir,
  onCommit,
  onSkip,
  canUndo,
  onUndo,
}) {
  const reduceMotion = useReducedMotion();
  const [flipped, setFlipped] = useState(false);
  const [announcement, setAnnouncement] = useState('');
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const heardOpacity = useTransform(x, [20, COMMIT_X], [0, 1]);
  const neverOpacity = useTransform(x, [-20, -COMMIT_X], [0, 1]);
  const unsureOpacity = useTransform(y, [-20, COMMIT_Y], [0, 1]);
  const rotate = reduceMotion ? 0 : useTransform(x, [-260, 260], [-9, 9]);

  const locked = blind && !existingAnswer;

  const commit = useCallback(
    (answer) => {
      setAnnouncement(`${card.text} — marked ${ANSWER_LABEL[answer]}.`);
      try {
        if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
      } catch {
        // haptics unsupported — fine
      }
      onCommit(answer);
    },
    [card.text, onCommit],
  );

  // Arrow keys mirror the swipe directions; ignored while typing.
  useEffect(() => {
    function onKey(e) {
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        commit('heard');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        commit('never');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        commit('unsure');
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [commit]);

  function handleDragEnd(_e, info) {
    const { offset, velocity } = info;
    if (offset.x > COMMIT_X || velocity.x > 700) commit('heard');
    else if (offset.x < -COMMIT_X || velocity.x < -700) commit('never');
    else if (offset.y < COMMIT_Y || velocity.y < -700) commit('unsure');
  }

  const exit =
    exitDir === 'heard'
      ? { x: 320, opacity: 0 }
      : exitDir === 'never'
        ? { x: -320, opacity: 0 }
        : exitDir === 'unsure'
          ? { y: -320, opacity: 0 }
          : { opacity: 0 };

  const toggleFlip = () => {
    if (locked) return;
    setFlipped((f) => !f);
  };

  const motionProps = reduceMotion
    ? {}
    : {
        drag: true,
        dragConstraints: { left: 0, right: 0, top: 0, bottom: 0 },
        dragElastic: 0.75,
        onDragEnd: handleDragEnd,
        onTap: (_e, info) => {
          // framer fires tap after small drags too — only flip near origin
          if (Math.abs(info.offset.x) < 8 && Math.abs(info.offset.y) < 8) toggleFlip();
        },
      };

  return (
    <section className="card-zone" aria-label={`Nickname card: ${card.text}`}>
      <motion.div
        className="swipe-card"
        style={reduceMotion ? undefined : { x, y, rotate }}
        initial={reduceMotion ? false : { scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={reduceMotion ? { opacity: 0 } : exit}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        {...motionProps}
      >
        <div className={`card-inner${flipped ? ' is-flipped' : ''}`}>
          {!flipped ? (
            <div className="card-front">
              <p className="card-question">Have you heard people call it…</p>
              <p className="card-nick">“{card.text}”</p>
              {existingAnswer ? (
                <p className={`card-prevote prevote-${existingAnswer}`}>
                  You said: {ANSWER_LABEL[existingAnswer]}
                </p>
              ) : (
                <p className="card-hint">Swipe, use keys, or tap a button below</p>
              )}
              <button type="button" className="flip-btn" onClick={toggleFlip} disabled={locked}>
                {locked ? 'Source sealed until you vote' : 'See research note'}
              </button>
            </div>
          ) : (
            <div className="card-flipped">
              <p className="card-nick small">“{card.text}”</p>
              <Back card={card} locked={locked} />
              <button type="button" className="flip-btn" onClick={toggleFlip}>
                Back to nickname
              </button>
            </div>
          )}
        </div>
        {reduceMotion ? null : (
          <>
            <motion.span className="stamp stamp-heard" style={{ opacity: heardOpacity }} aria-hidden="true">
              Heard
            </motion.span>
            <motion.span className="stamp stamp-never" style={{ opacity: neverOpacity }} aria-hidden="true">
              Never
            </motion.span>
            <motion.span className="stamp stamp-unsure" style={{ opacity: unsureOpacity }} aria-hidden="true">
              Unsure
            </motion.span>
          </>
        )}
      </motion.div>

      <div className="vote-row" role="group" aria-label="Your answer">
        <button type="button" className="vote-btn never" onClick={() => commit('never')}>
          <span aria-hidden="true">✕</span> Never
        </button>
        <button type="button" className="vote-btn unsure" onClick={() => commit('unsure')}>
          <span aria-hidden="true">?</span> Not sure
        </button>
        <button type="button" className="vote-btn heard" onClick={() => commit('heard')}>
          <span aria-hidden="true">✓</span> Heard
        </button>
      </div>
      <div className="util-row">
        <button type="button" className="util-btn" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
        <button type="button" className="util-btn" onClick={onSkip}>
          Skip
        </button>
      </div>
      <div className="sr-live" role="status" aria-live="polite">
        {announcement}
      </div>
    </section>
  );
}
