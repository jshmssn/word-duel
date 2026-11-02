import { useEffect } from "react";
import ModalOverlay from "./ModalOverlay.jsx";
import RoomPauseModal from "./RoomPauseModal.jsx";
import useVisualViewport from "../hooks/useVisualViewport.js";
import {
  IconSword, IconLightning, IconChat, IconShield, IconTarget,
  IconLetters, IconCheck, IconX, IconClock,
} from "../icons/Icons.jsx";

const GAME_BRANDS = {
  "word-duel": { title: "Word Duel", subtitle: "THE WORD BATTLE ARENA" },
  "color-card": { title: "Color Card", subtitle: "THE COLOR MEMORY ARENA" },
  "finish-word": { title: "Finish the Word", subtitle: "THE WORD CHAIN ARENA" },
};

export function Brand({ compact = false, gameMode }) {
  const brand = GAME_BRANDS[gameMode] || { title: "GamifyLuv", subtitle: "YOUR EVERYDAY PLAYGROUND" };
  return (
    <div className={`brand ${compact ? "brand-compact" : ""}`}>
      <div className="brand-mark" aria-hidden="true"><IconSword size={22} color="currentColor" /></div>
      <div className="brand-copy" key={brand.title}><span>{brand.title}</span><small>{brand.subtitle}</small></div>
    </div>
  );
}

export function ExperienceShell({ children, screen, code, gameMode, connected, audioEnabled, onAudioToggle, onShowRules, toasts, onDismissToast, onQuit, leaving, roomPause, restoring, onReconnect, players, myId, onKickVote }) {
  const viewport = useVisualViewport();
  const inGame = screen === "game";
  const activeMode = screen === "lobby" ? null : gameMode;
  const title = GAME_BRANDS[activeMode]?.title || "GamifyLuv";
  useEffect(() => { document.title = activeMode ? `${title} · GamifyLuv` : "GamifyLuv"; }, [title, activeMode]);
  useEffect(() => {
    document.documentElement.classList.toggle("game-viewport", inGame);
    if (inGame) window.scrollTo(0, 0);
    return () => document.documentElement.classList.remove("game-viewport");
  }, [inGame]);
  return (
    <div className={`app-shell ${inGame ? "in-game" : ""} mode-${activeMode || "home"}`} style={inGame && viewport ? { "--game-height": `${viewport.height}px`, "--game-top": `${viewport.offsetTop}px` } : undefined}>
      <div className="ambient ambient-one" aria-hidden="true" />
      <div className="ambient ambient-two" aria-hidden="true" />
      <header className="site-header">
        <div className="site-header-inner">
          <Brand compact gameMode={activeMode} />
          <nav className="site-nav" aria-label="Global controls">
            {code && screen !== "lobby" && <span className="header-room">ROOM <strong>{code}</strong></span>}
            <span className={`connection-pill ${connected ? "online" : "offline"}`} role="status">
              <span className="connection-dot" />{connected ? "LIVE SERVER" : "RECONNECTING"}
            </span>
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
            {code && screen !== "lobby" && <button className="nav-action quit-room" onClick={onQuit} disabled={leaving} type="button"><IconX size={15} color="currentColor" /><span>{leaving ? "Quitting…" : "Quit room"}</span></button>}
          </nav>
        </div>
      </header>
      <main key={screen} className={`view-frame view-${screen}`}>{children}</main>
      <button className="help-launcher howto-link" onClick={onShowRules} type="button"><span aria-hidden="true">?</span> How to play</button>
      {(screen === "game" || screen === "gameover") && (roomPause || restoring) && <RoomPauseModal players={players} myId={myId} pause={roomPause} restoring={restoring} connected={connected} onReconnect={onReconnect} onVote={onKickVote} onQuit={onQuit} leaving={leaving} />}
      <footer className="site-footer">
        <span>{title} <span className="footer-cross">✦</span> THINK. PLAY. CONNECT.</span>
        <span>PLAY TOGETHER, ANYWHERE</span>
      </footer>
      <Toast toasts={toasts} onDismiss={onDismissToast} />
    </div>
  );
}

export function Toast({ toasts = [], onDismiss }) {
  const viewport = useVisualViewport();
  const visibleToasts = toasts.slice(-(viewport?.height < 300 ? 1 : viewport?.height < 500 ? 2 : 4));
  return (
    <div className="toast-layer" role="status" aria-live="polite" aria-relevant="additions" style={viewport ? { "--toast-offset": `${viewport.offsetTop}px` } : undefined}>
      {visibleToasts.map((toast) => (
        <div key={toast.id} className={`feedback-toast toast-${toast.tone || "info"}`}>
          <span className="toast-symbol" aria-hidden="true">{toast.tone === "success" ? "✦" : toast.tone === "error" ? "!" : "↗"}</span>
          <span>{toast.message}</span>
          <button type="button" className="toast-dismiss" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification"><IconX size={14} color="currentColor" /></button>
        </div>
      ))}
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
  const isFinishWord = gameMode === "finish-word";
  useEffect(() => {
    const onKey = (event) => { if (event.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <ModalOverlay className="rules-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="rules-dialog" role="dialog" aria-modal="true" aria-labelledby="rules-heading">
        <div className="rules-top"><span className="eyebrow"><IconLightning size={14} color="currentColor" /> {isFinishWord ? "FINISH THE WORD" : isColorCard ? "COLOR CARD" : "WORD DUEL"} · HOW TO PLAY</span><button className="close-circle" onClick={onClose} aria-label="Close instructions"><IconX size={17} color="currentColor" /></button></div>
        <h2 id="rules-heading">{isFinishWord ? <>Last letter. Next word.<br /><span>Stay in the chain.</span></> : isColorCard ? <>One target. Your color.<br /><span>Closest match wins.</span></> : <>Secret words. Sharp minds.<br /><span>Crack the code first.</span></>}</h2>
        <div className="rules-steps">
          {isFinishWord ? <>
            <div><span className="rule-number">01</span><div className="rule-icon"><IconShield size={21} color="currentColor" /></div><div><h3>Choose your character</h3><p>Pick one of eight exclusive characters. Once everyone has a character, the host can start with 2 to 8 players. Each player begins with three hearts.</p></div></div>
            <div><span className="rule-number">02</span><div className="rule-icon"><IconClock size={21} color="currentColor" /></div><div><h3>Ten seconds. One word.</h3><p>On your turn, enter an English word of at least two letters starting with the displayed letter. Each accepted word passes its last letter to the next player. A word can only be used once per match. Everyone can see what you type.</p></div></div>
            <div><span className="rule-number">03</span><div className="rule-icon"><IconLightning size={21} color="currentColor" /></div><div><h3>Keep your hearts</h3><p>An invalid word or a timeout costs one heart and passes the turn. After ten accepted words, the chain uses the last two letters. An impossible suffix is still a challenge: keep your hearts until one player remains.</p></div></div>
          </> : isColorCard ? <>
            <div><span className="rule-number">01</span><div className="rule-icon"><IconTarget size={21} color="currentColor" /></div><div><h3>Shared colors, one memory</h3><p>The host chooses the card count and answer time. Each card has a unique random color, shared with everyone for 5 seconds before it disappears.</p></div></div>
            <div><span className="rule-number">02</span><div className="rule-icon"><IconClock size={21} color="currentColor" /></div><div><h3>Mix, submit, or edit</h3><p>Use hue, saturation, and brightness to color your blank card. The host chooses 30, 45, or 60 seconds. If everyone submits with at least 20 seconds left, a vote opens to reveal results early. More than half of all players must vote Yes; voting closes 10 seconds before the answer timer. Editing cancels the vote.</p></div></div>
            <div><span className="rule-number">03</span><div className="rule-icon"><IconCheck size={21} color="currentColor" /></div><div><h3>Results, rankings, repeat</h3><p>Your latest color is auto-submitted at the deadline. Results show your accuracy and submission time, excluding paused time. Review for 5 seconds, then see rankings for 10 seconds. The next card starts automatically. Highest average accuracy wins the match.</p></div></div>
          </> : <>
          <div><span className="rule-number">01</span><div className="rule-icon"><IconShield size={21} color="currentColor" /></div><div><h3>Get your secret word</h3><p>Every player receives a secret word from the same category. Investigate the next player in lobby order and keep yours hidden!</p></div></div>
          <div><span className="rule-number">02</span><div className="rule-icon"><IconLetters size={21} color="currentColor" /></div><div><h3>Investigate the letters</h3><p>On your turn, ask if a letter appears in the opponent's word. Confirmed letters don't reveal their positions.</p></div></div>
          <div><span className="rule-number">03</span><div className="rule-icon"><IconTarget size={21} color="currentColor" /></div><div><h3>Take your shot</h3><p>Ask a count for a confirmed letter, or try a full-word guess. Every action uses your turn; a wrong guess isn't the end.</p></div></div>
          </>}
        </div>
        <div className="rules-foot"><span><IconCheck size={15} color="currentColor" /> {isFinishWord ? "Link words. Outlast everyone." : isColorCard ? "Mix, match, win." : "Ask, deduce, win."}</span><button onClick={onClose} className="btn-fun btn-fun-yellow">Got it <span aria-hidden="true">↗</span></button></div>
      </div>
    </ModalOverlay>
  );
}

export function SectionHeading({ kicker, title, right }) {
  return <div className="section-heading"><div><div className="section-kicker">{kicker}</div><h2>{title}</h2></div>{right && <div className="section-heading-right">{right}</div>}</div>;
}

export function StepsPreview({ gameMode = "word-duel" }) {
  if (gameMode === "finish-word") return <div className="gameplay-guide"><div><span className="guide-icon"><IconShield size={19} color="currentColor" /></span><strong>Choose a character</strong><small>One character per player</small></div><span className="guide-arrow">→</span><div><span className="guide-icon"><IconLetters size={19} color="currentColor" /></span><strong>Chain your words</strong><small>Follow the last letter</small></div><span className="guide-arrow">→</span><div><span className="guide-icon"><IconCheck size={19} color="currentColor" /></span><strong>Keep your hearts</strong><small>Last player wins</small></div></div>;
  if (gameMode === "color-card") return <div className="gameplay-guide"><div><span className="guide-icon"><IconTarget size={19} color="currentColor" /></span><strong>Memorize</strong><small>Five seconds to look</small></div><span className="guide-arrow">→</span><div><span className="guide-icon"><IconLightning size={19} color="currentColor" /></span><strong>Mix your color</strong><small>Hue, saturation, brightness</small></div><span className="guide-arrow">→</span><div><span className="guide-icon"><IconCheck size={19} color="currentColor" /></span><strong>Compare</strong><small>Closest match wins</small></div></div>;
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
