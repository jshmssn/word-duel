import { useEffect } from "react";
import ModalOverlay from "./ModalOverlay.jsx";
import {
  IconSword, IconLightning, IconChat, IconShield, IconTarget,
  IconLetters, IconCheck, IconX, IconClock,
} from "../icons/Icons.jsx";

export function Brand({ compact = false }) {
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true"><IconSword size={22} color="currentColor" /></div>
      <div className="brand-copy"><span>WORD<span className="brand-accent">DUEL</span></span><small>THE WORD BATTLE ARENA</small></div>
    </div>
  );
}

export function ExperienceShell({ children, screen, code, connected, audioEnabled, onAudioToggle, onShowRules, toast }) {
  return (
    <div className="app-shell">
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="site-header">
        <div className="site-header-inner">
          <Brand compact />
          <nav className="site-nav" aria-label="Global controls">
            {code && screen !== "lobby" && <span className="header-room">ROOM <strong>{code}</strong></span>}
            <span className={`connection-pill ${connected ? "online" : "offline"}`} role="status">
              <span className="connection-dot" />{connected ? "LIVE SERVER" : "RECONNECTING"}
            </span>
            <button className="nav-action howto-link" onClick={onShowRules} type="button">How to play</button>
            <button
              className={`nav-action sound-toggle ${audioEnabled ? "sound-active" : ""}`}
              onClick={onAudioToggle}
              type="button"
              aria-label={`Turn sound ${audioEnabled ? "off" : "on"}`}
              aria-pressed={audioEnabled}
              title={audioEnabled ? "Mute game sounds" : "Enable game sounds"}
            >
              <span aria-hidden="true">{audioEnabled ? "♫" : "♪"}</span> <span>Sound {audioEnabled ? "on" : "off"}</span>
            </button>
          </nav>
        </div>
      </header>
      <main key={screen} className={`view-frame view-${screen}`}>{children}</main>
      <footer className="site-footer">
        <span>WORD DUEL <span className="footer-cross">✦</span> OUTTHINK. OUTSPELL. OUTPLAY.</span>
        <span>REAL-TIME WORDPLAY</span>
      </footer>
      <Toast toast={toast} />
    </div>
  );
}

export function Toast({ toast }) {
  return (
    <div className="toast-layer" role="status" aria-live="polite" aria-atomic="true">
      {toast && (
        <div key={toast.id} className={`feedback-toast toast-${toast.tone || "info"}`}>
          <span className="toast-symbol" aria-hidden="true">{toast.tone === "success" ? "✦" : toast.tone === "error" ? "!" : "↗"}</span>
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
}

const PARTICLES = Array.from({ length: 34 }, (_, i) => ({
  x: Math.round(Math.sin(i * 2.4) * (160 + (i % 5) * 36)),
  y: Math.round(Math.cos(i * 1.73) * (120 + (i % 7) * 34)),
  rotation: `${(i * 71) % 430 - 215}deg`,
  delay: `${(i % 9) * 37}ms`,
  color: ["#a78bfa", "#50e3ca", "#ffbf69", "#fc78ad", "#8ccaff"][i % 5],
}));
export function ConfettiBurst({ active }) {
  if (!active) return null;
  return <div className="confetti-layer" aria-hidden="true">{PARTICLES.map((p, i) => (
    <i key={i} className="confetti-bit" style={{ "--tx": `${p.x}px`, "--ty": `${p.y}px`, "--rot": p.rotation, "--delay": p.delay, "--confetti": p.color }} />
  ))}</div>;
}

export function RulesDialog({ onClose, gameMode = "word-duel" }) {
  const isColorCard = gameMode === "color-card";
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <ModalOverlay className="rules-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-heading">
        <div className="rules-top"><span className="eyebrow"><IconLightning size={14} color="currentColor" /> THE PLAYBOOK</span><button className="close-circle" onClick={onClose} aria-label="Close instructions"><IconX size={17} color="currentColor" /></button></div>
        <h2 id="rules-heading">{isColorCard ? <>One target. Your color.<br /><span>Closest match wins.</span></> : <>One word. Two minds.<br /><span>Only one winner.</span></>}</h2>
        <div className="rules-steps">
          {isColorCard ? <>
            <div><span className="rule-number">01</span><div className="rule-icon"><IconTarget size={21} color="currentColor" /></div><div><h3>Shared colors, one memory</h3><p>The host chooses the card count and answer time. Each card has a unique random color, shared with everyone for 5 seconds before it disappears.</p></div></div>
            <div><span className="rule-number">02</span><div className="rule-icon"><IconClock size={21} color="currentColor" /></div><div><h3>Mix, submit, or edit</h3><p>Use hue, saturation, and brightness to color your blank card. The host chooses 30, 45, or 60 seconds. Submit early or edit; your latest selection is auto-submitted at the deadline.</p></div></div>
            <div><span className="rule-number">03</span><div className="rule-icon"><IconCheck size={21} color="currentColor" /></div><div><h3>Results, rankings, repeat</h3><p>Everyone can edit until the timer ends. Review your result for 5 seconds, then see rankings for 10 seconds. The server starts the next card automatically. Highest average accuracy wins the match.</p></div></div>
          </> : <>
          <div><span className="rule-number">01</span><div className="rule-icon"><IconShield size={21} color="currentColor" /></div><div><h3>Get your secret word</h3><p>Every player receives a secret word from the same category. Investigate the next player in lobby order and keep yours hidden!</p></div></div>
          <div><span className="rule-number">02</span><div className="rule-icon"><IconLetters size={21} color="currentColor" /></div><div><h3>Investigate the letters</h3><p>On your turn, ask if a letter appears in the opponent's word. Confirmed letters don't reveal their positions.</p></div></div>
          <div><span className="rule-number">03</span><div className="rule-icon"><IconTarget size={21} color="currentColor" /></div><div><h3>Take your shot</h3><p>Ask a count for a confirmed letter, or try a full-word guess. Every action uses your turn; a wrong guess isn't the end.</p></div></div>
          </>}
        </div>
        <div className="rules-foot"><span><IconCheck size={15} color="currentColor" /> {isColorCard ? "Mix, match, win." : "Ask, deduce, win."}</span><button onClick={onClose} className="btn-fun btn-fun-yellow">Got it <span aria-hidden="true">↗</span></button></div>
      </div>
    </ModalOverlay>
  );
}

export function SectionHeading({ kicker, title, right }) {
  return <div className="section-heading"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2></div>{right && <div className="section-heading-right">{right}</div>}</div>;
}

export function StepsPreview() {
  return <div className="gameplay-guide">
    <div><span className="guide-icon"><IconLetters size={19} color="currentColor" /></span><strong>Ask a letter</strong><small>Gather intel</small></div>
    <span className="guide-arrow">→</span>
    <div><span className="guide-icon"><IconChat size={19} color="currentColor" /></span><strong>Find clues</strong><small>Connect the dots</small></div>
    <span className="guide-arrow">→</span>
    <div><span className="guide-icon"><IconTarget size={19} color="currentColor" /></span><strong>Guess first</strong><small>Claim victory</small></div>
  </div>;
}

export function ProgressBar({ value, max, color = "violet", label }) {
  const pct = Math.max(0, Math.min(100, max ? (value / max) * 100 : 0));
  return <div className={`progress-bar-wrap progress-${color}`}>
    {label && <div className="progress-bar-label"><span>{label}</span><strong>{value}<span> / {max}</span></strong></div>}
    <div className="progress-track" role="progressbar" aria-label={label || "Progress"} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}><span className="progress-fill" style={{ transform: `scaleX(${pct / 100})` }} /></div>
  </div>;
}
