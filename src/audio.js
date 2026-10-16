// Small, opt-in synthesized sound engine. No sound files or third-party players.
// All effects (including the roulette) run through the same persisted setting.
const STORAGE_KEY = "word-duel:audio:v2";
let enabled = false;
try {
  enabled = window.localStorage.getItem(STORAGE_KEY) === "on";
} catch { /* Private browsing or storage disabled. */ }

const AudioContextClass = typeof window !== "undefined"
  ? window.AudioContext || window.webkitAudioContext
  : null;
let context = null;

export function isAudioEnabled() { return enabled; }
export function setAudioEnabled(value) {
  enabled = Boolean(value);
  try { window.localStorage.setItem(STORAGE_KEY, enabled ? "on" : "off"); } catch { /* optional */ }
  if (enabled && context?.state === "suspended") context.resume().catch(() => {});
}

export function getAudioCtx() {
  if (!enabled || !AudioContextClass) return null;
  try {
    if (!context) context = new AudioContextClass();
    if (context.state === "suspended") context.resume().catch(() => {});
    return context;
  } catch { return null; }
}

export function playTone(freq, type = "sine", duration = 0.12, vol = 0.2, startTime = null) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  try {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, startTime ?? ctx.currentTime);
    const t = Math.max(ctx.currentTime, startTime ?? ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.0001, vol), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    oscillator.start(t);
    oscillator.stop(t + duration + 0.012);
  } catch { /* Audio is always a progressive enhancement. */ }
}

function sequence(notes, type = "sine", volume = 0.17, gap = 0.09) {
  const ctx = getAudioCtx();
  if (!ctx) return;
  notes.forEach((frequency, index) => playTone(frequency, type, 0.13, volume, ctx.currentTime + index * gap));
}

export const SFX = {
  tap: () => playTone(480, "sine", 0.055, 0.08),
  yourTurn: () => sequence([520, 650, 785], "sine", 0.18, 0.105),
  ding: () => sequence([880, 1175], "triangle", 0.15),
  win: () => sequence([523, 659, 784, 1047, 1319], "sine", 0.2, 0.12),
  lose: () => sequence([440, 370, 311, 262], "triangle", 0.12, 0.14),
  chat: () => playTone(790, "sine", 0.06, 0.10),
  confirm: () => sequence([520, 660], "triangle", 0.12, 0.085),
  correctGuess: () => sequence([785, 1047, 1319], "sine", 0.2, 0.095),
  timeout: () => playTone(260, "triangle", 0.22, 0.16),
  timerWarning: (remaining) => {
    if (remaining <= 5 || remaining % 2 === 0) playTone(760, "sine", 0.06, 0.065);
  },
};

// Compatibility bridge for the existing category roulette's sound hooks.
if (typeof window !== "undefined") {
  window.wordDuelAudio = { playTone, getAudioCtx, SFX };
}
