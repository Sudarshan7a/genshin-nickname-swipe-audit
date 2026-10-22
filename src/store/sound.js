// Optional UI tick. Default off, persisted. Pure WebAudio, no assets.
const KEY = 'ns-sound';

export function isSoundOn() {
  try {
    return localStorage.getItem(KEY) === 'on';
  } catch {
    return false;
  }
}

export function setSoundOn(on) {
  try {
    localStorage.setItem(KEY, on ? 'on' : 'off');
  } catch { /* ignore */ }
}

let ctx = null;

function tone(freq, delay = 0, dur = 0.08) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = ctx || new AC();
  if (ctx.state === 'suspended') void ctx.resume();
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(0.06, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t);
  osc.stop(t + dur + 0.02);
}

const PITCH = { heard: 660, never: 233, unsure: 440 };

export function tick(answer) {
  if (!isSoundOn()) return;
  try {
    tone(PITCH[answer] || 520);
    if (answer === 'heard') tone(880, 0.07, 0.09);
  } catch { /* silent by design */ }
}
