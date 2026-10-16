import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import SlotMachine from "./SlotMachine.jsx";
import { SFX, playTone, isAudioEnabled, setAudioEnabled } from "./audio.js";
import { ExperienceShell, ConfettiBurst, ProgressBar, RulesDialog, SectionHeading, StepsPreview } from "./components/Experience.jsx";
import LetterWorkbench from "./components/LetterWorkbench.jsx";
import {
  IconSword,
  IconShield,
  IconKey,
  IconTarget,
  IconChat,
  IconTrophy,
  IconSkull,
  IconSend,
  IconCheck,
  IconX,
  IconLightning,
  IconQuestion,
  IconLetterCount,
  IconDice,
  IconStar2,
  IconCopy,
  IconHome,
  IconRocket,
  IconLetters,
  IconBulb,
  IconClock,
  IconWarning,
  IconBoom,
  IconReturnArrow,
  IconHourglass,
} from "./icons/Icons.jsx";

const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (import.meta.env.DEV
    ? "http://localhost:3001"
    : "https://word-duel-server.onrender.com");
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const AVATAR_COLORS = [
  ["#FFE135", "#FF7043"],
  ["#00E5FF", "#7B2FFF"],
  ["#FF4DA6", "#FF7043"],
  ["#69FF47", "#00E5FF"],
];

function avatarGrad(i) {
  return AVATAR_COLORS[i % AVATAR_COLORS.length];
}

function withLetterCount(letters, letter, count) {
  const targetCount = Math.max(0, Number(count) || 0);
  const next = [];
  let inserted = false;

  letters.forEach((knownLetter) => {
    if (knownLetter === letter) {
      if (!inserted) {
        next.push(...Array.from({ length: targetCount }, () => letter));
        inserted = true;
      }
      return;
    }

    next.push(knownLetter);
  });

  if (!inserted) {
    next.push(...Array.from({ length: targetCount }, () => letter));
  }

  return next;
}

let socket = null;
function getSocket() {
  if (!socket) socket = io(SERVER_URL);
  return socket;
}

// ─── Floating Chat Button ─────────────────────────────────────────────────────
function FloatingChat({ messages, onSend, myId, isOpen, onToggle, unread }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => {
    if (isOpen) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  const fmt = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="floating-chat-wrap">
      {isOpen && (
        <div className="floating-chat-panel">
          <div className="chat-header-fun">
            <IconChat size={18} color="var(--cyan)" />
            Room Chat
            <button className="btn-close-chat" onClick={onToggle}>
              <IconX size={14} color="currentColor" />
            </button>
          </div>
          <div className="chat-messages" style={{ height: 320 }}>
            {messages.length === 0 && (
              <div className="chat-system-msg icon-msg">
                <IconChat size={13} color="currentColor" />
                No messages yet. Say hi!
              </div>
            )}
            {messages.map((msg) =>
              msg.system ? (
                <div key={msg.id} className="chat-system-msg">
                  {msg.text}
                </div>
              ) : (
                <div
                  key={msg.id}
                  className={`chat-bubble ${msg.playerId === myId ? "mine" : "theirs"}`}
                >
                  <div className="chat-bubble-meta">
                    <span>
                      {msg.username}
                      {msg.playerId === myId ? " (you)" : ""}
                    </span>
                    <span style={{ opacity: 0.6 }}>{fmt(msg.timestamp)}</span>
                  </div>
                  <div className="chat-bubble-inner">{msg.text}</div>
                </div>
              ),
            )}
            <div ref={bottomRef} />
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input-fun"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder="Say something..."
              maxLength={200}
            />
            <button
              className="btn-send-fun"
              onClick={send}
              disabled={!text.trim()}
            >
              <IconSend size={18} color="currentColor" />
            </button>
          </div>
        </div>
      )}

      <button
        className="floating-chat-btn"
        onClick={onToggle}
        title="Open Chat"
      >
        <IconChat size={24} color="white" />
        {unread > 0 && (
          <span className="chat-unread-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>
  );
}

// ─── Turn Timer ───────────────────────────────────────────────────────────────
function TurnTimer({ remaining, total, isMyTurn }) {
  if (!total) return null;
  const pct = Math.max(0, (remaining / total) * 100);
  const danger = remaining <= 10;
  const urgent = remaining <= 5;

  return (
    <div className={`turn-timer-wrap ${danger ? "timer-danger" : ""}`}>
      <div className="timer-label">
        <span className="timer-label-title">
          <IconClock size={14} color="currentColor" />
          {isMyTurn ? "Your Time" : "Opponent's Time"}
        </span>
        <span className={`timer-seconds ${urgent ? "timer-urgent" : ""}`}>
          {remaining}s
        </span>
      </div>
      <div className="timer-bar-bg">
        <div
          className="timer-bar-fill"
          style={{
            width: `${pct}%`,
            background: urgent
              ? "var(--red)"
              : danger
                ? "#FFA500"
                : "var(--green)",
          }}
        />
      </div>
    </div>
  );
}

// ─── Lobby ───────────────────────────────────────────────────────────────────
function GameLogPanel({ log = [], emptyContent, className = "" }) {
  const logBoxRef = useRef(null);

  useEffect(() => {
    const box = logBoxRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [log]);

  return (
    <div className={`game-log ${className}`} ref={logBoxRef}>
      {log.length === 0 && emptyContent}
      {log.map((entry, i) => (
        <div key={i} className={`log-row ${entry.type}`}>
          <span className="log-icon">{entry.icon}</span>
          {entry.text}
        </div>
      ))}
    </div>
  );
}

function LobbyScreen({ onCreated, onJoined, connected }) {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState("create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sock = getSocket();
    sock.on("room-created", ({ code, turnDuration, roundLimit, creatorId, players, mode }) => {
      setLoading(false);
      onCreated(code, username.trim(), turnDuration, creatorId, players, roundLimit, mode);
    });
    sock.on("room-joined", (details) => {
      setLoading(false);
      onJoined(details);
    });
    sock.on("join-error", ({ message }) => {
      setLoading(false);
      setError(message);
    });
    return () => {
      sock.off("room-created");
      sock.off("room-joined");
      sock.off("join-error");
    };
  }, [username, onCreated]);

  const handleCreate = () => {
    if (!connected) { setError("The game server is offline. Check that it is running."); return; }
    if (!username.trim()) {
      setError("Enter your name first!");
      return;
    }
    setError("");
    setLoading(true);
    getSocket().emit("create-room", {
      username: username.trim(),
    });
  };

  const handleCreateBotRoom = () => {
    if (!connected) { setError("The game server is offline. Check that it is running."); return; }
    if (!username.trim()) {
      setError("Enter your name first!");
      return;
    }
    setError("");
    setLoading(true);
    getSocket().emit("create-bot-room", {
      username: username.trim(),
    });
  };

  const handleJoin = () => {
    if (!connected) { setError("The game server is offline. Check that it is running."); return; }
    if (!username.trim()) {
      setError("Enter your name first!");
      return;
    }
    if (!joinCode.trim()) {
      setError("Enter a room code!");
      return;
    }
    setError("");
    setLoading(true);
    getSocket().emit("join-room", {
      code: joinCode.trim().toUpperCase(),
      username: username.trim(),
    });
  };

  return (
    <div className="screen lobby-screen">
      <div className="lobby-layout">
        <section className="hero-panel">
          <div className="hero-eyebrow"><span className="eyebrow-line" /> THE REAL-TIME WORD ARENA <span className="eyebrow-spark">✦</span></div>
          <h1 className="hero-headline">WORDS ARE<br /><span>YOUR WEAPON.</span></h1>
          <p className="hero-description">Two players. Two secret words. One chance to outthink your opponent. Ask smart, connect the clues, and claim the win.</p>
          <div className="hero-tags"><span><IconLightning size={15} color="currentColor" /> LIVE 1V1 DUELS</span><span><IconTarget size={15} color="currentColor" /> SOLO PRACTICE</span><span><IconTrophy size={15} color="currentColor" /> BEST OF 3 OR 5</span></div>
          <div className="arena-preview" aria-label="A sample letter puzzle">
            <div className="preview-top"><span className="preview-pill"><span className="connection-dot" /> ROUND IN PROGRESS</span><span className="preview-subtitle">YOUR CLUE BOARD <span aria-hidden="true">↗</span></span></div>
            <div className="preview-matchup"><div className="preview-player"><span className="preview-avatar preview-you">Y</span><span>YOU <small>DETECTIVE</small></span></div><div className="preview-versus">VS</div><div className="preview-player right"><span>RIVAL <small>WORD KEEPER</small></span><span className="preview-avatar preview-rival">R</span></div></div>
            <div className="preview-letter-label"><span>UNPOSITIONED CLUES</span><span>2 / 6 LETTERS FOUND</span></div>
            <div className="preview-tiles"><span className="mock-letter revealed">A</span><span className="mock-letter revealed">E</span><span className="mock-letter">·</span><span className="mock-letter">·</span><span className="mock-letter">·</span><span className="mock-letter">·</span></div>
            <div className="preview-foot"><span>✦ Known letters, unknown positions</span><span>33% DISCOVERED</span></div><div className="preview-progress"><span /></div>
          </div>
          <div className="hero-bottom">NO DOWNLOADS <span>✦</span> NO GUESSWORK — JUST SKILL.</div>
        </section>
        <section className="lobby-entry">
          <div className="entry-top"><span className="eyebrow"><IconSword size={16} color="currentColor" /> YOUR NEXT CHALLENGE</span><span className="entry-orbit">✳</span></div>
          <h2>Enter the <span>arena.</span></h2>
          <p className="entry-desc">Choose a name and start your next word battle.</p>
          <div className="entry-form">
            <label className="field-group" htmlFor="player-username"><span className="field-label">PLAYER NAME <span>01 / 02</span></span>
              <input id="player-username" autoComplete="nickname" className="fun-input" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") tab === "create" ? handleCreate() : handleJoin(); }} placeholder="What should we call you?" maxLength={16} />
            </label>
            <div className="tab-row" role="tablist" aria-label="Choose room action">
              <button type="button" role="tab" aria-selected={tab === "create"} className={`tab-pill ${tab === "create" ? "active" : ""}`} onClick={() => {setTab("create"); setError("");}}><IconHome size={17} color="currentColor" /> Create room</button>
              <button type="button" role="tab" aria-selected={tab === "join"} className={`tab-pill ${tab === "join" ? "active" : ""}`} onClick={() => {setTab("join"); setError("");}}><IconRocket size={17} color="currentColor" /> Join room</button>
            </div>
            {tab === "join" && <label className="field-group enter-from-right" htmlFor="room-join-code"><span className="field-label">8-CHARACTER ROOM CODE</span><input id="room-join-code" className="fun-input code-input-fun" value={joinCode} onChange={(e) => { setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleJoin()} placeholder="ENTER CODE" maxLength={8} /></label>}
            {error && <div className="error-bubble" role="alert"><IconWarning size={16} color="currentColor" /> {error}</div>}
            {!connected && !error && <div className="connection-notice" role="status">Connecting to game server…</div>}
            {tab === "create" ? <div className="create-actions"><button className="btn-fun btn-fun-yellow" onClick={handleCreate} disabled={loading || !connected}><span className="btn-icon-row"><IconLightning size={19} color="currentColor" /> {loading ? "Opening arena…" : "Create a duel"} <span className="action-arrow">↗</span></span></button><button className="btn-fun btn-fun-ghost" onClick={handleCreateBotRoom} disabled={loading || !connected}><span className="btn-icon-row"><IconTarget size={19} color="currentColor" /> Practice vs bot <span className="action-arrow">→</span></span></button></div> : <button className="btn-fun btn-fun-yellow" onClick={handleJoin} disabled={loading || !connected}><span className="btn-icon-row"><IconRocket size={18} color="currentColor" /> {loading ? "Finding room…" : "Join the duel"} <span className="action-arrow">↗</span></span></button>}
          </div>
          <div className="entry-bottom"><span className="entry-star">✦</span><div><strong>THINK QUICK. SPELL FASTER.</strong><p>No sign-up required. Invite a friend or face a bot.</p></div></div>
        </section>
      </div>
      <div className="lobby-howto"><div className="mini-section-name">THE PATH TO VICTORY <span> / 3 EASY STEPS</span></div><StepsPreview /></div>
    </div>
  );
}

// ─── Waiting / Ready Room ─────────────────────────────────────────────────────
function WaitingScreen({
  code,
  players,
  myId,
  gameLogs,
  chatMessages,
  onChat,
  onGameStart,
  turnDuration,
  roundLimit,
  isCreator,
  onTurnDurationChange,
  onRoundLimitChange,
}) {
  const [countdown, setCountdown] = useState(null);
  const [showSlotMachine, setShowSlotMachine] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [copied, setCopied] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const prevMsgCount = useRef(chatMessages.length);
  const myPlayer = players.find((p) => p.id === myId);
  const imReady = Boolean(myPlayer?.ready);

  useEffect(() => {
    if (!chatOpen && chatMessages.length > prevMsgCount.current) {
      setUnread((u) => u + (chatMessages.length - prevMsgCount.current));
      SFX.chat();
    }
    prevMsgCount.current = chatMessages.length;
  }, [chatMessages, chatOpen]);

  const handleChatToggle = () => {
    setChatOpen((o) => !o);
    setUnread(0);
  };

  const copyCode = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const input = document.createElement("textarea");
        input.value = code;
        input.style.position = "fixed";
        input.style.opacity = "0";
        document.body.append(input);
        input.select();
        const success = document.execCommand("copy");
        input.remove();
        if (!success) throw new Error("Clipboard unavailable");
      }
      setCopied(true);
      SFX.confirm();
      setTimeout(() => setCopied(false), 1800);
    } catch { window.prompt("Copy this room code:", code); }
  };

  const handleReady = () => {
    getSocket().emit("toggle-ready", { code });
  };

  const handleTimerChange = (event) => {
    onTurnDurationChange(Number(event.target.value));
  };

  const handleRoundLimitChange = (event) => {
    onRoundLimitChange(Number(event.target.value));
  };

  const handleSlotMachineDone = useCallback(() => {
    getSocket().emit("slot-machine-done", { code });
  }, [code]);

  useEffect(() => {
    const sock = getSocket();
    const handleCountdown = ({ count }) => {
      const nextCount = Number(count);
      setCountdown(nextCount > 0 ? nextCount : null);
    };
    const handleCountdownCancel = () => {
      setCountdown(null);
      setShowSlotMachine(false);
      setSelectedCategory("");
    };
    const handleCategorySelected = ({ category, selectedCategoryName }) => {
      const nextCategory = selectedCategoryName || category;
      if (!nextCategory) return;
      setCountdown(null);
      setSelectedCategory(nextCategory);
      setShowSlotMachine(true);
    };
    const handleGameStart = (data) => {
      setCountdown(null);
      setShowSlotMachine(false);
      setSelectedCategory("");
      onGameStart(data);
    };

    sock.on("countdown", handleCountdown);
    sock.on("countdown-cancel", handleCountdownCancel);
    sock.on("category-selected", handleCategorySelected);
    sock.on("game-start", handleGameStart);

    return () => {
      sock.off("countdown", handleCountdown);
      sock.off("countdown-cancel", handleCountdownCancel);
      sock.off("category-selected", handleCategorySelected);
      sock.off("game-start", handleGameStart);
    };
  }, [onGameStart]);

  const hasTwoPlayers = players.length === 2;

  return (
    <div className="screen waiting-screen">
      <div className="waiting-layout-container">
        <div className="page-intro waiting-intro"><div><span className="eyebrow"><IconShield size={16} color="currentColor" /> PRIVATE DUEL LOBBY</span><h1>Prepare for <span>battle.</span></h1><p>Invite your opponent, get ready, and let the words fly.</p></div><div className="lobby-state-chip"><span className="pulse-dot" /> {hasTwoPlayers ? "PLAYERS ASSEMBLED" : "WAITING FOR CHALLENGER"}</div></div>
        <div className="ready-journey" aria-label="Match preparation progress">
          <div className="journey-step done"><span>01</span> ROOM CREATED</div><div className={`journey-line ${hasTwoPlayers ? "done" : ""}`} /><div className={`journey-step ${hasTwoPlayers ? "done" : ""}`}><span>02</span> PLAYERS JOINED</div><div className={`journey-line ${players.every(p=>p.ready) && hasTwoPlayers ? "done" : ""}`} /><div className={`journey-step ${players.every(p=>p.ready) && hasTwoPlayers ? "done" : ""}`}><span>03</span> BOTH READY</div>
        </div>
        <div className="waiting-grid">
          <div className="waiting-main">
            <button className="room-code-box" onClick={copyCode} type="button" aria-label={`Copy room code ${code}`}>
              <span className="room-code-eyebrow"><IconKey size={17} color="currentColor" /> YOUR INVITE CODE</span>
              <span className="room-code-chars">{code}</span>
              <span className="copy-hint">{copied ? <><IconCheck size={15} color="currentColor" /> Copied to clipboard!</> : <><IconCopy size={15} color="currentColor" /> Click to copy & share <span>↗</span></>}</span>
            </button>
            <div className="player-panel">
              <SectionHeading kicker="HEAD TO HEAD" title="Player lineup" right={<span className="player-capacity">{players.length} / 2 PLAYERS</span>} />
              <div className="player-slots">
                {[0, 1].map((i) => { const p = players[i]; const [c1, c2] = avatarGrad(i); return <div key={i} className={`player-card ${p ? "filled" : "empty"} ${p?.ready ? "ready-yes" : ""}`}>
                  <div className="player-avatar-fun" style={p ? { background: `linear-gradient(135deg,${c1},${c2})` } : {}}>{p ? p.username[0].toUpperCase() : "?"}</div>
                  <div className="player-ident"><div className="player-name-fun">{p ? p.username : "Awaiting challenger"}{p?.id === myId && <span className="you-tag">YOU</span>}{p?.isBot && <span className="you-tag">BOT</span>}</div><div className="player-meta-row">{p ? <span><IconTrophy size={13} color="currentColor" /> {p.wins || 0} WINS</span> : <span>SHARE YOUR INVITE CODE ABOVE</span>}</div></div>
                  {p ? <span className={`ready-pill ${p.ready ? "yes" : "no"}`}>{p.ready ? <><IconCheck size={13} color="currentColor" /> READY</> : "NOT READY"}</span> : <span className="empty-player-pulse"><span className="pulse-dot" /></span>}
                </div>; })}
              </div>
              <ProgressBar value={players.filter((p)=>p.ready).length} max={2} label="Players ready" color="mint" />
              {hasTwoPlayers ? <button className={`btn-ready-fun ${imReady ? "is-ready" : "not-ready"}`} onClick={handleReady}><IconShield size={21} color="currentColor" /> {imReady ? "You're ready — tap to cancel" : "I'm ready to battle"} <span className="action-arrow">↗</span></button> : <div className="invite-nudge"><span className="pulse-dot" /> Invite someone to join the duel — or start a new bot match.</div>}
              {hasTwoPlayers && !players.every((p)=>p.ready) && countdown === null && <div className="ready-caption">Both players must hit ready to start the match.</div>}
            </div>
          </div>
          <aside className="waiting-side">
            <div className="room-settings-panel">
              <SectionHeading kicker="MATCH CONFIGURATION" title="Room settings" right={<IconLightning size={18} color="var(--cyan)" />} />
              {isCreator ? <div className="room-settings-grid"><label className="setting-field"><span className="field-label">TURN TIMER</span><select className="fun-input timer-select" value={turnDuration} onChange={handleTimerChange}><option value={0}>Unlimited</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option></select></label><label className="setting-field"><span className="field-label">MATCH FORMAT</span><select className="fun-input timer-select" value={roundLimit} onChange={handleRoundLimitChange}><option value={1}>Single round</option><option value={3}>Best of 3</option><option value={5}>Best of 5</option></select></label></div> : <div className="room-settings-overview"><div><span>TURN TIMER</span><strong>{turnDuration ? `${turnDuration} seconds` : "Unlimited"}</strong></div><div><span>MATCH FORMAT</span><strong>{roundLimit === 1 ? "Single round" : `Best of ${roundLimit}`}</strong></div><small>The room creator controls these settings.</small></div>}
              <div className="settings-note"><IconShield size={15} color="currentColor" /> Fair play is the only rule that matters.</div>
            </div>
            <div className="waiting-log-section"><SectionHeading kicker="WHAT'S HAPPENING" title="Live activity" /><GameLogPanel log={gameLogs} className="waiting-room-log" emptyContent={<div className="log-row info"><span className="log-icon"><IconHourglass size={15} color="currentColor" /></span> Activity will show up here.</div>} /></div>
          </aside>
        </div>
      </div>
      {countdown !== null && <div className="countdown-overlay" role="status"><div className="countdown-card"><span className="eyebrow">GET READY</span><div className="countdown-num" key={countdown}>{countdown}</div><div className="countdown-label-fun"><IconLightning size={19} color="currentColor" /> DUEL STARTING</div></div></div>}
      {showSlotMachine && selectedCategory && <SlotMachine selectedCategoryName={selectedCategory} onDone={handleSlotMachineDone} />}
      <FloatingChat messages={chatMessages} onSend={onChat} myId={myId} isOpen={chatOpen} onToggle={handleChatToggle} unread={unread} />
    </div>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────
function GameScreen({
  gameState,
  myId,
  gameLogs,
  setGameLogs,
  onGameOver,
  onReturnToWaiting,
  chatMessages,
  onChat,
  onFeedback,
}) {
  const {
    category,
    myWord,
    myWordLetterCount,
    opponentLetterCount,
    players,
    currentTurn,
    turnDuration,
  } = gameState;
  const [activeTab, setActiveTab] = useState("ask");
  const [letterInput, setLetterInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [confirmedLetters, setConfirmedLetters] = useState([]);
  const [askedLetters, setAskedLetters] = useState({});
  const [turn, setTurn] = useState(currentTurn);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [timerRemaining, setTimerRemaining] = useState(turnDuration || 0);
  const [timerTotal, setTimerTotal] = useState(turnDuration || 0);

  // Letter ask prompt (for opponent to answer)
  const [letterAskPrompt, setLetterAskPrompt] = useState(null); // { askerName, letter }
  const [letterCountPrompt, setLetterCountPrompt] = useState(null); // { askerName, letter }
  const [letterCountInput, setLetterCountInput] = useState("");

  // Waiting state (asker is waiting for opponent response)
  const [waitingFor, setWaitingFor] = useState(null);

  // Disconnection
  const [opponentLeft, setOpponentLeft] = useState(false);
  const [reward, setReward] = useState(null);
  const rewardTimeout = useRef(null);
  const rewardPop = useCallback((message, tone = "success") => {
    clearTimeout(rewardTimeout.current);
    setReward({ message, id: Date.now() });
    onFeedback(message, tone);
    rewardTimeout.current = setTimeout(() => setReward(null), 1600);
  }, [onFeedback]);
  useEffect(() => () => clearTimeout(rewardTimeout.current), []);

  const prevMsgCount = useRef(chatMessages.length);
  const prevRemaining = useRef(turnDuration || 0);
  const initialTurnSoundPlayed = useRef(false);

  const isMyTurn = turn === myId;
  const opponent = players.find((p) => p.id !== myId);

  const addLog = useCallback(
    (entry) => setGameLogs((prev) => [...prev, entry]),
    [setGameLogs],
  );

  useEffect(() => {
    if (initialTurnSoundPlayed.current || currentTurn !== myId) return;
    initialTurnSoundPlayed.current = true;
    SFX.yourTurn();
  }, [currentTurn, myId]);

  // Chat unread tracking
  useEffect(() => {
    if (!chatOpen && chatMessages.length > prevMsgCount.current) {
      setUnread((u) => u + (chatMessages.length - prevMsgCount.current));
      SFX.chat();
    }
    prevMsgCount.current = chatMessages.length;
  }, [chatMessages, chatOpen]);

  // Timer warning sound
  useEffect(() => {
    if (!timerTotal) return;
    if (
      timerRemaining <= 10 &&
      timerRemaining > 0 &&
      timerRemaining < prevRemaining.current
    ) {
      SFX.timerWarning(timerRemaining);
    }
    prevRemaining.current = timerRemaining;
  }, [timerRemaining, timerTotal]);

  useEffect(() => {
    const sock = getSocket();

    sock.on(
      "letter-result",
      ({ askerId, askerName, letter, hasLetter, confirmedLetters: cl }) => {
        setWaitingFor(null);
        if (askerId === myId) {
          setConfirmedLetters(cl);
          setAskedLetters((prev) => ({
            ...prev,
            [letter]: hasLetter ? "yes" : "no",
          }));
          if (hasLetter) { SFX.ding(); rewardPop(`✦ Letter ${letter} discovered`); }
          else onFeedback(`No ${letter} in their word. Keep hunting.`, "info");
        }
        addLog({
          type: hasLetter ? "yes" : "no",
          icon: hasLetter ? (
            <IconCheck size={14} color="currentColor" />
          ) : (
            <IconX size={14} color="currentColor" />
          ),
          text: `${askerName} asked "${letter}": ${hasLetter ? "YES!" : "Nope"}`,
        });
      },
    );

    sock.on(
      "letter-count-result",
      ({
        askerId,
        askerName,
        responderName,
        letter,
        count,
        confirmedLetters: cl,
      }) => {
        setWaitingFor(null);
        if (askerId === myId) {
          setConfirmedLetters((prev) =>
            Array.isArray(cl) ? cl : withLetterCount(prev, letter, count),
          );
          setAskedLetters((prev) => ({
            ...prev,
            [letter]: Number(count) > 0 ? "yes" : "no",
          }));
          rewardPop(`${letter} appears ${count} time${count === 1 ? "" : "s"}`, "success");
        }
        addLog({
          type: "count",
          icon: <IconLetterCount size={14} color="currentColor" />,
          text: `${responderName || askerName}: "${letter}" appears ${count} time${count !== 1 ? "s" : ""} in my word!`,
        });
      },
    );

    sock.on("wrong-guess", ({ guesserName, guess }) => {
      if (guesserName === players.find((p) => p.id === myId)?.username) onFeedback(`Not ${guess.toUpperCase()} — your next turn is a new chance.`, "error");
      addLog({
        type: "wrong",
        icon: <IconBoom size={14} color="currentColor" />,
        text: `${guesserName} guessed "${guess.toUpperCase()}" - WRONG!`,
      });
    });

    sock.on("turn-change", ({ currentTurn: ct, fromTimeout }) => {
      setTurn(ct);
      setWaitingFor(null);
      setLetterAskPrompt(null);
      setLetterCountPrompt(null);
      if (ct === myId) {
        addLog({
          type: "info",
          icon: fromTimeout ? (
            <IconClock size={14} color="currentColor" />
          ) : (
            <IconReturnArrow size={14} color="currentColor" />
          ),
          text: fromTimeout ? "Time's up! Now your turn." : "Your turn!",
        });
        SFX.yourTurn();
      } else {
        addLog({
          type: "info",
          icon: <IconReturnArrow size={14} color="currentColor" />,
          text: `${opponent?.username}'s turn...`,
        });
      }
    });

    sock.on("turn-timeout", ({ playerId }) => {
      SFX.timeout();
      addLog({
        type: "warn",
        icon: <IconClock size={14} color="currentColor" />,
        text:
          playerId === myId
            ? "You ran out of time!"
            : `${opponent?.username} ran out of time!`,
      });
    });

    sock.on("timer-update", ({ remaining, total }) => {
      setTimerRemaining(remaining);
      setTimerTotal(total);
    });

    // Prompt: opponent is asking a letter
    sock.on("letter-ask-prompt", ({ askerName, letter }) => {
      setLetterAskPrompt({ askerName, letter });
    });

    // Prompt: opponent is asking for letter count
    sock.on("letter-count-prompt", ({ askerName, letter }) => {
      setLetterCountPrompt({ askerName, letter });
      setLetterCountInput("");
    });

    // Asker is waiting
    sock.on("waiting-for-response", ({ action, letter }) => {
      setWaitingFor({ action, letter });
    });

    sock.on("game-over", (data) => {
      if (data.winnerId === myId) SFX.win();
      else SFX.lose();
      addLog({
        type: "yes",
        icon: <IconTrophy size={14} color="currentColor" />,
        text: `${data.winnerName} guessed the word and wins the round!`,
      });
      onGameOver(data);
    });

    sock.on("player-left", ({ username, disconnected }) => {
      addLog({
        type: "info",
        icon: <IconX size={14} color="currentColor" />,
        text: `${username} left.`,
      });
      if (disconnected) setOpponentLeft(true);
    });

    return () => {
      sock.off("letter-result");
      sock.off("letter-count-result");
      sock.off("wrong-guess");
      sock.off("turn-change");
      sock.off("turn-timeout");
      sock.off("timer-update");
      sock.off("letter-ask-prompt");
      sock.off("letter-count-prompt");
      sock.off("waiting-for-response");
      sock.off("game-over");
      sock.off("player-left");
    };
  }, [myId, opponent, players, addLog, onGameOver, onFeedback, rewardPop]);

  const handleAskLetter = (letter) => {
    if (!isMyTurn || waitingFor) return;
    const l = (letter || letterInput).toUpperCase();
    if (!l || l.length !== 1 || !/[A-Z]/.test(l) || askedLetters[l]) return;
    getSocket().emit("ask-letter", { code: gameState.code, letter: l });
    SFX.tap();
    setLetterInput("");
  };

  const handleAnswerLetter = (answer) => {
    getSocket().emit("answer-letter-ask", { code: gameState.code, answer });
    setLetterAskPrompt(null);
    SFX.confirm();
  };

  const handleAskLetterCount = (letter) => {
    if (!isMyTurn || waitingFor) return;
    getSocket().emit("ask-letter-count", { code: gameState.code, letter });
    SFX.tap();
  };

  const handleAnswerLetterCount = () => {
    const c = parseInt(letterCountInput, 10);
    if (isNaN(c) || c < 0) return;
    getSocket().emit("answer-letter-count", { code: gameState.code, count: c });
    setLetterCountPrompt(null);
    setLetterCountInput("");
    SFX.confirm();
  };

  const handleGuess = () => {
    if (!isMyTurn || !guessInput.trim()) return;
    getSocket().emit("guess-word", {
      code: gameState.code,
      guess: guessInput.trim(),
    });
    SFX.tap();
    setGuessInput("");
  };

  const handleChatToggle = () => {
    setChatOpen((o) => !o);
    setUnread(0);
  };


  return (
    <div className="screen game-screen">
      <div className="game-layout">
        <div className="page-intro game-intro"><div><span className="eyebrow"><IconSword size={16} color="currentColor" /> HEAD-TO-HEAD WORD BATTLE</span><h1>The <span>duel is on.</span></h1></div><div className="match-chip"><span className="pulse-dot" /> ROUND {gameState.roundNumber || 1} {gameState.roundLimit > 1 ? `/ ${gameState.roundLimit}` : ""}</div></div>
        <div className="turn-banner-fun">
          <div className="category-tag"><span className="category-symbol"><IconDice size={18} color="currentColor" /></span><div><small>YOUR CATEGORY</small><strong>{category}</strong></div></div>
          <div className={`turn-badge ${isMyTurn ? "your-turn" : "their-turn"}`}>{isMyTurn ? <><IconLightning size={20} color="currentColor" /> YOUR TURN — MAKE IT COUNT!</> : <><span className="pulse-dot" /> {opponent?.username || "Opponent"} IS THINKING</>}</div>
        </div>
        {timerTotal > 0 && <TurnTimer remaining={timerRemaining} total={timerTotal} isMyTurn={isMyTurn} />}
        {opponentLeft && <div className="disconnect-banner"><span className="inline-icon-row"><IconWarning size={18} color="currentColor" /> Opponent disconnected.</span><button className="btn-fun btn-fun-ghost" onClick={onReturnToWaiting}>Back to room</button></div>}
        {/* Letter ask/count prompt (for opponent) */}
        {(letterAskPrompt || letterCountPrompt) && (
          <div
            className="prompt-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby={
              letterAskPrompt
                ? "letter-ask-dialog-title"
                : "letter-count-dialog-title"
            }
          >
            {letterAskPrompt && (
              <div className="prompt-modal prompt-decision-modal">
                <div className="prompt-kicker">Opponent Question</div>
                <div
                  className="prompt-title prompt-title-row"
                  id="letter-ask-dialog-title"
                >
                  <IconLetters size={18} color="currentColor" />
                  {letterAskPrompt.askerName} asked about this letter
                </div>
                <div className="prompt-letter-badge">
                  {letterAskPrompt.letter}
                </div>
                <div className="prompt-question">
                  Does your secret word contain{" "}
                  <strong>{letterAskPrompt.letter}</strong>?
                </div>
                <div className="prompt-secret-strip" aria-label="Your secret word">
                  <span className="prompt-secret-strip-label">
                    <IconShield size={14} color="currentColor" />
                    Your word
                  </span>
                  <span className="prompt-secret-strip-word">
                    {myWord.toUpperCase()}
                  </span>
                  <span className="prompt-secret-strip-count">
                    {myWordLetterCount} letters
                  </span>
                </div>
                <div className="prompt-buttons">
                  <button
                    className="btn-fun btn-fun-green"
                    onClick={() => handleAnswerLetter(true)}
                    autoFocus
                  >
                    <span className="btn-icon-row">
                      <IconCheck size={18} color="currentColor" />
                      Yes
                    </span>
                  </button>
                  <button
                    className="btn-fun btn-fun-red"
                    onClick={() => handleAnswerLetter(false)}
                  >
                    <span className="btn-icon-row">
                      <IconX size={18} color="currentColor" />
                      No
                    </span>
                  </button>
                </div>
              </div>
            )}

            {!letterAskPrompt && letterCountPrompt && (
              <div className="prompt-modal prompt-decision-modal">
                <div className="prompt-kicker">Opponent Question</div>
                <div
                  className="prompt-title prompt-title-row"
                  id="letter-count-dialog-title"
                >
                  <IconLetterCount size={18} color="currentColor" />
                  {letterCountPrompt.askerName} wants a letter count
                </div>
                <div className="prompt-letter-badge prompt-letter-badge-count">
                  {letterCountPrompt.letter}
                </div>
                <div className="prompt-question">
                  How many times does{" "}
                  <strong>{letterCountPrompt.letter}</strong> appear in your
                  secret word?
                </div>
                <div className="prompt-secret-strip" aria-label="Your secret word">
                  <span className="prompt-secret-strip-label">
                    <IconShield size={14} color="currentColor" />
                    Your word
                  </span>
                  <span className="prompt-secret-strip-word">
                    {myWord.toUpperCase()}
                  </span>
                  <span className="prompt-secret-strip-count">
                    {myWordLetterCount} letters
                  </span>
                </div>
                <div className="prompt-count-row">
                  <input
                    type="number"
                    min={0}
                    max={20}
                    className="fun-input prompt-count-input"
                    value={letterCountInput}
                    onChange={(e) => setLetterCountInput(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleAnswerLetterCount()
                    }
                    placeholder="0"
                    autoFocus
                  />
                  <button
                    className="btn-fun btn-fun-yellow prompt-submit-btn"
                    onClick={handleAnswerLetterCount}
                    disabled={letterCountInput === ""}
                  >
                    Submit
                  </button>
                </div>
              </div>
            )}
          </div>
        )}


        <div className="game-grid">
          <div className="game-main-column">
            <div className="word-panels">
              <div className="word-card my-card"><div className="word-card-title"><IconShield size={17} color="var(--mint)" /> YOUR SECRET WORD <span className="secret-pill">TOP SECRET</span></div><div className="my-word-text">{myWord.toUpperCase()}</div><div className="secret-bottom">{myWordLetterCount} LETTERS <span>·</span> DON'T GIVE IT AWAY</div></div>
              <div className="word-card opp-card"><div className="word-card-title"><IconTarget size={17} color="var(--cyan)" /> CRACK THEIR WORD <span className="target-length">{opponentLetterCount} LETTERS</span></div>
                <LetterWorkbench confirmed={confirmedLetters} length={opponentLetterCount} onUseGuess={(word) => { setGuessInput(word); setActiveTab("guess"); }} />
                {reward && <div className="reward-pop" key={reward.id}>{reward.message} <span>✦</span></div>}
              </div>
            </div>
            <div className="alpha-section"><div className="alpha-section-title"><span><IconLetters size={18} color="currentColor" /> LETTER SCANNER</span><span className="alpha-key-legend"><i className="dot-yes" /> IN WORD <i className="dot-no" /> NOT FOUND</span></div><div className="alphabet-grid-fun">{ALPHABET.map((l) => <button key={l} type="button" className={`alpha-key ${askedLetters[l] === "yes" ? "asked-yes" : askedLetters[l] === "no" ? "asked-no" : ""}`} disabled={!isMyTurn || Boolean(askedLetters[l]) || Boolean(waitingFor)} onClick={() => handleAskLetter(l)} title={askedLetters[l] === "yes" ? "Confirmed letter" : askedLetters[l] === "no" ? "Not in word" : "Ask about this letter"} aria-label={`Ask about ${l}${askedLetters[l] ? `; already ${askedLetters[l] === "yes" ? "confirmed" : "ruled out"}` : ""}`}>{l}</button>)}</div></div>
        {/* Action panel */}
        <div className={`action-card ${!isMyTurn ? "disabled" : ""}`}>
          {!isMyTurn && (
            <div className="waiting-msg">
              <span className="pulse-dot" />
              Waiting for {opponent?.username || "opponent"}...
            </div>
          )}
          {isMyTurn && !waitingFor && (
            <>
              <div className="action-tab-row">
                <button
                  className={`action-tab-btn ${activeTab === "ask" ? "active-ask" : ""}`}
                  onClick={() => setActiveTab("ask")}
                >
                  <IconQuestion size={16} color="currentColor" />
                  Ask Letter
                </button>
                <button
                  className={`action-tab-btn ${activeTab === "count" ? "active-count" : ""}`}
                  onClick={() => setActiveTab("count")}
                  disabled={confirmedLetters.length === 0}
                  title={
                    confirmedLetters.length === 0
                      ? "Confirm letters first"
                      : "Ask how many of a letter"
                  }
                >
                  <IconLetterCount size={16} color="currentColor" />
                  Letter Count
                </button>
                <button
                  className={`action-tab-btn ${activeTab === "guess" ? "active-guess" : ""}`}
                  onClick={() => setActiveTab("guess")}
                >
                  <IconTarget size={16} color="currentColor" />
                  Guess Word!
                </button>
              </div>

              {activeTab === "ask" && (
                <>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      letterSpacing: "1px",
                    }}
                  >
                    Click a letter above, or type one:
                  </div>
                  <div className="action-input-row">
                    <input
                      className="single-key-input"
                      value={letterInput}
                      maxLength={1}
                      onChange={(e) =>
                        setLetterInput(
                          e.target.value.toUpperCase().replace(/[^A-Z]/g, ""),
                        )
                      }
                      onKeyDown={(e) =>
                        e.key === "Enter" && handleAskLetter(letterInput)
                      }
                      placeholder="?"
                    />
                    <button
                      className="btn-fun btn-fun-yellow"
                      style={{ flex: 1, padding: "12px" }}
                      onClick={() => handleAskLetter(letterInput)}
                      disabled={!letterInput || Boolean(askedLetters[letterInput])}
                    >
                      <div className="btn-icon-row">
                        <IconQuestion size={18} color="currentColor" />
                        Ask!
                      </div>
                    </button>
                  </div>
                </>
              )}

              {activeTab === "count" && confirmedLetters.length > 0 && (
                <>
                  <div
                    style={{
                      fontFamily: "var(--font-display)",
                      fontSize: "0.8rem",
                      color: "var(--muted)",
                      letterSpacing: "1px",
                    }}
                  >
                    Select a confirmed letter to ask for its count:
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[...new Set(confirmedLetters)].map((l) => (
                      <button
                        key={l}
                        className="letter-count-tile"
                        onClick={() => handleAskLetterCount(l)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {activeTab === "guess" && (
                <div className="action-input-row action-input-row-guess">
                  <input
                    className="guess-input"
                    value={guessInput}
                    onChange={(e) => setGuessInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                    placeholder="Type the word..."
                  />
                  <button
                    className="btn-fun btn-fun-pink guess-submit-btn"
                    onClick={handleGuess}
                    disabled={!guessInput.trim()}
                  >
                    <div className="btn-icon-row">
                      <IconTarget size={18} color="currentColor" />
                      Guess!
                    </div>
                  </button>
                </div>
              )}
            </>
          )}

          {isMyTurn && waitingFor && (
            <div className="waiting-msg" style={{ color: "var(--yellow)" }}>
              <span
                className="pulse-dot"
                style={{ background: "var(--yellow)" }}
              />
              Waiting for {opponent?.username} to answer...
            </div>
          )}
        </div>

          </div>
          <aside className="game-sidebar">
            <div className="intel-panel"><div className="side-kicker">MATCH INTELLIGENCE <span>✦</span></div><h3>Every clue counts.</h3><p>Find the letters and build your own guess in the workbench.</p><div className="intel-stats"><div><strong>{confirmedLetters.length}</strong><small>LETTERS FOUND</small></div><div><strong>{Object.keys(askedLetters).length}</strong><small>LETTERS ASKED</small></div><div><strong>{opponentLetterCount}</strong><small>WORD LENGTH</small></div></div><ProgressBar value={confirmedLetters.length} max={opponentLetterCount} color="mint" label="Discovery progress" /></div>
            <div className="feed-panel"><SectionHeading kicker="THE MATCH SO FAR" title="Live activity" right={<IconChat size={17} color="var(--muted)" />} /><GameLogPanel log={gameLogs} emptyContent={<div className="log-row info"><span className="log-icon"><IconHourglass size={14} color="currentColor" /></span>{isMyTurn ? "Your move. Ask or guess!" : `${opponent?.username} goes first.`}</div>} /></div>
            <div className="tip-panel"><span className="tip-icon"><IconBulb size={18} color="currentColor" /></span><div><strong>PRO TIP</strong><p>Known letters reveal what exists, <em>not where it goes.</em> Rearrange the tiles to test your theory.</p></div></div>
          </aside>
        </div>
      </div>
      <FloatingChat messages={chatMessages} onSend={onChat} myId={myId} isOpen={chatOpen} onToggle={handleChatToggle} unread={unread} />
    </div>
  );
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function AnimatedRevealWord({ label, word, variant, delay = 0 }) {
  const letters = useMemo(() => String(word || "").toUpperCase().split(""), [word]);
  const revealableCount = letters.filter((letter) => letter.trim()).length;
  const [visibleCount, setVisibleCount] = useState(0);

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    if (reduceMotion) { setVisibleCount(revealableCount); return undefined; }
    const timeouts = [];
    setVisibleCount(0);

    let revealIndex = 0;
    letters.forEach((letter, index) => {
      if (!letter.trim()) return;
      revealIndex++;
      const count = revealIndex;
      const timeout = setTimeout(() => {
        setVisibleCount(count);
        playTone(560 + index * 34, "triangle", 0.055, 0.16);
      }, delay + count * 105);
      timeouts.push(timeout);
    });

    const doneTimeout = setTimeout(() => {
      if (revealableCount > 0) SFX.ding();
    }, delay + revealableCount * 105 + 120);
    timeouts.push(doneTimeout);

    return () => timeouts.forEach((timeout) => clearTimeout(timeout));
  }, [delay, letters, revealableCount]);

  let revealIndex = 0;

  return (
    <div className={`reveal-box animated-reveal-box ${variant}`}>
      <div className="reveal-label">{label}</div>
      <div className="reveal-tile-row" aria-label={`${label}: ${word}`}>
        {letters.map((letter, index) => {
          if (!letter.trim()) {
            return <span key={`${letter}-${index}`} className="reveal-space" />;
          }

          revealIndex++;
          const isVisible = revealIndex <= visibleCount;

          return (
            <span
              key={`${letter}-${index}`}
              className={`reveal-letter-tile ${isVisible ? "is-visible" : ""}`}
              style={{ transitionDelay: `${Math.min(index * 22, 180)}ms` }}
            >
              <span>{isVisible ? letter : "?"}</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}

function GameOverScreen({ result, myId, onRematch, chatMessages, onChat }) {
  const isWinner = result.winnerId === myId;
  const resultPlayers = Array.isArray(result.players) ? result.players : [];
  const opponent = resultPlayers.find((player) => player.id !== myId);
  const myResultWord =
    result.wordsByPlayer?.[myId] || result.loserWord || result.correctWord || "";
  const opponentResultWord =
    result.wordsByPlayer?.[opponent?.id] || result.correctWord || result.loserWord || "";
  const longestReveal = Math.max(
    String(myResultWord).replace(/\s/g, "").length,
    String(opponentResultWord).replace(/\s/g, "").length,
  );
  const [revealDone, setRevealDone] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const prevMsgCount = useRef(chatMessages.length);

  useEffect(() => {
    if (!chatOpen && chatMessages.length > prevMsgCount.current) {
      setUnread((u) => u + (chatMessages.length - prevMsgCount.current));
      SFX.chat();
    }
    prevMsgCount.current = chatMessages.length;
  }, [chatMessages, chatOpen]);

  const handleChatToggle = () => {
    setChatOpen((o) => !o);
    setUnread(0);
  };

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches) {
      setRevealDone(true);
      return undefined;
    }
    setRevealDone(false);
    const timeout = setTimeout(() => setRevealDone(true), longestReveal * 105 + 900);
    return () => clearTimeout(timeout);
  }, [longestReveal, result.winnerId]);

  const rematchLabel = result.seriesOver
    ? result.roundLimit > 1
      ? "Rematch Series!"
      : "Rematch!"
    : result.roundLimit > 1
      ? "Next Round!"
      : "Rematch!";

  return (
    <div className="screen gameover-screen">
      <ConfettiBurst active={isWinner} />
      <div className="result-eyebrow"><span className="eyebrow">✦ MATCH REPORT</span><span className="result-divider" /> {isWinner ? "A CHAMPION IS CROWNED" : "NEXT ROUND, NEW CHANCE"}</div>
      <div
        className={`gameover-card ${isWinner ? "win-card" : "lose-card"}`}
        style={{ maxWidth: 480, width: "100%" }}
      >
        <div className="gameover-icon">
          {isWinner ? (
            <IconTrophy size={80} color="#FFE135" />
          ) : (
            <IconSkull size={80} color="#FF4444" />
          )}
        </div>

        <div
          className={`gameover-title-fun ${isWinner ? "win-title" : "lose-title"}`}
        >
          {isWinner ? "VICTORY!" : "ROUND OVER"}
        </div>

        <div
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--muted)",
            fontSize: "1rem",
            letterSpacing: "1px",
            textAlign: "center",
          }}
        >
          {isWinner
            ? "Brilliant deduction. The arena is yours."
            : `${result.winnerName} cracked the word first. You've got the next one.`}
        </div>

        {result.roundLimit > 1 && (
          <div className="series-pill">
            Round {result.roundNumber || 1} of {result.roundLimit}
            {result.seriesOver
              ? ` - ${result.seriesWinnerName} wins the series`
              : ` - first to ${result.winsToSeries}`}
          </div>
        )}

        {resultPlayers.length > 0 && (
          <div className="gameover-scoreboard">
            {resultPlayers.map((player) => (
              <div
                key={player.id}
                className={`score-row ${player.id === result.winnerId ? "round-winner" : ""}`}
              >
                <span className="score-name">
                  {player.username}
                  {player.id === myId ? " (you)" : ""}
                </span>
                <span className="score-wins">
                  <IconTrophy size={15} color="currentColor" />
                  {player.wins || 0} win{(player.wins || 0) === 1 ? "" : "s"}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="reveal-words">
          <AnimatedRevealWord
            label="Opponent's Word"
            word={opponentResultWord}
            variant="opp-word"
          />
          <AnimatedRevealWord
            label="Your Word"
            word={myResultWord}
            variant="my-word"
            delay={180}
          />
        </div>

        <div className="gameover-reveal-state" role="status" aria-live="polite">
          {revealDone ? "✦ THE SECRET WORDS ARE REVEALED" : <><span className="reveal-wait-dots" /> DECODING SECRET WORDS…</>}
        </div>
        <div className={`gameover-btns ${revealDone ? "is-visible" : ""}`}>
          <button
            className="btn-fun btn-fun-yellow"
            onClick={onRematch}
            disabled={!revealDone}
          >
            <div className="btn-icon-row">
              <IconDice size={20} color="currentColor" />
              {rematchLabel}
            </div>
          </button>
          <button
            className="btn-fun btn-fun-ghost"
            onClick={() => window.location.reload()}
            disabled={!revealDone}
          >
            <div className="btn-icon-row">
              <IconX size={18} color="currentColor" />
              Leave
            </div>
          </button>
        </div>
      </div>

      <FloatingChat
        messages={chatMessages}
        onSend={onChat}
        myId={myId}
        isOpen={chatOpen}
        onToggle={handleChatToggle}
        unread={unread}
      />
    </div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("lobby");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [gameState, setGameState] = useState(null);
  const [gameOverResult, setGameOverResult] = useState(null);
  const [gameLogs, setGameLogs] = useState([]);
  const [chatMessages, setChatMessages] = useState([]);
  const [turnDuration, setTurnDuration] = useState(0);
  const [roundLimit, setRoundLimit] = useState(1);
  const [roomMode, setRoomMode] = useState("duel");
  const [creatorId, setCreatorId] = useState(null);
  const [myId, setMyId] = useState(() => getSocket().id || null);
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [audioEnabled, setAudioEnabledState] = useState(isAudioEnabled);
  const [showRules, setShowRules] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimeout = useRef(null);

  const showFeedback = useCallback((message, tone = "info") => {
    clearTimeout(toastTimeout.current);
    setToast({ id: Date.now() + Math.random(), message, tone });
    toastTimeout.current = setTimeout(() => setToast(null), 2400);
  }, []);
  useEffect(() => () => clearTimeout(toastTimeout.current), []);

  useEffect(() => {
    const sock = getSocket();
    const onConnect = () => { setConnected(true); setMyId(sock.id); };
    const onDisconnect = () => { setConnected(false); };
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    if (sock.connected) onConnect();
    return () => { sock.off("connect", onConnect); sock.off("disconnect", onDisconnect); };
  }, []);

  const toggleSound = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    setAudioEnabledState(next);
    if (next) SFX.confirm();
  }, [audioEnabled]);

  const addSystemChat = useCallback((text) => {
    setChatMessages((prev) => [
      ...prev,
      {
        id: Date.now() + Math.random(),
        system: true,
        text,
        timestamp: Date.now(),
      },
    ]);
  }, []);

  const handleChat = useCallback(
    (text) => {
      getSocket().emit("chat-message", { code: roomCode, text });
    },
    [roomCode],
  );

  useEffect(() => {
    const sock = getSocket();
    const handlePlayerJoined = ({
      players: pl,
      turnDuration: td,
      roundLimit: rl,
      creatorId: cid,
      mode,
    }) => {
      setPlayers(pl);
      if (td !== undefined) setTurnDuration(td);
      if (rl !== undefined) setRoundLimit(rl);
      if (cid !== undefined) setCreatorId(cid);
      if (mode) setRoomMode(mode);
    };
    const handleReadyUpdate = ({ players: pl, creatorId: cid }) => {
      setPlayers(pl);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleTurnDurationUpdate = ({ turnDuration: td, creatorId: cid }) => {
      setTurnDuration(td || 0);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleRoundLimitUpdate = ({ roundLimit: rl, creatorId: cid }) => {
      setRoundLimit(rl || 1);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleChatHistory = ({ messages }) => setChatMessages(messages);
    const handleChatMessage = (msg) =>
      setChatMessages((prev) => [...prev, msg]);
    const handleGameStartEvent = (data) => {
      setGameState((prev) => ({ ...data, code: roomCode || prev?.code }));
      if (data.turnDuration !== undefined) setTurnDuration(data.turnDuration);
      if (data.roundLimit !== undefined) setRoundLimit(data.roundLimit);
      setGameLogs([]);
      setScreen("game");
      addSystemChat("Game started! Good luck!");
    };
    const handleRematchLobby = ({
      players: pl,
      turnDuration: td,
      roundLimit: rl,
      creatorId: cid,
    }) => {
      setPlayers(pl);
      if (td !== undefined) setTurnDuration(td);
      if (rl !== undefined) setRoundLimit(rl);
      if (cid !== undefined) setCreatorId(cid);
      setGameState(null);
      setGameOverResult(null);
      setScreen("waiting");
      addSystemChat("Rematch! Press Ready when you're set.");
    };
    const handlePlayerLeft = ({ username }) => {
      addSystemChat(`${username} left the room.`);
      if (screen === "waiting")
        setPlayers((prev) => prev.filter((p) => p.username !== username));
    };

    sock.on("player-joined", handlePlayerJoined);
    sock.on("ready-update", handleReadyUpdate);
    sock.on("turn-duration-update", handleTurnDurationUpdate);
    sock.on("round-limit-update", handleRoundLimitUpdate);
    sock.on("chat-history", handleChatHistory);
    sock.on("chat-message", handleChatMessage);
    sock.on("game-start", handleGameStartEvent);
    sock.on("rematch-lobby", handleRematchLobby);
    sock.on("player-left", handlePlayerLeft);

    return () => {
      sock.off("player-joined", handlePlayerJoined);
      sock.off("ready-update", handleReadyUpdate);
      sock.off("turn-duration-update", handleTurnDurationUpdate);
      sock.off("round-limit-update", handleRoundLimitUpdate);
      sock.off("chat-history", handleChatHistory);
      sock.off("chat-message", handleChatMessage);
      sock.off("game-start", handleGameStartEvent);
      sock.off("rematch-lobby", handleRematchLobby);
      sock.off("player-left", handlePlayerLeft);
    };
  }, [roomCode, screen, addSystemChat]);

  useEffect(() => {
    if (gameState && roomCode && gameState.code !== roomCode)
      setGameState((prev) => ({ ...prev, code: roomCode }));
  }, [roomCode, gameState]);

  const handleRoomCreated = (code, username, td, cid, pl, rl, mode) => {
    setRoomCode(code);
    setTurnDuration(td || 0);
    setRoundLimit(rl || 1);
    setRoomMode(mode || "duel");
    setCreatorId(cid || getSocket().id);
    setPlayers(pl || [{ id: getSocket().id, username, ready: false, wins: 0 }]);
    setGameLogs([]);
    setScreen("waiting");
  };

  const handleRoomJoined = ({ code, players: joinedPlayers, turnDuration: td, roundLimit: rl, creatorId: cid, mode }) => {
    setRoomCode(code);
    setRoomMode(mode || "duel");
    setPlayers(joinedPlayers || []);
    setTurnDuration(td || 0);
    setRoundLimit(rl || 1);
    setCreatorId(cid || null);
    setGameLogs([]);
    setScreen("waiting");
    showFeedback("You joined the arena!", "success");
  };

  const handleGameOver = (result) => {
    setGameOverResult(result);
    setScreen("gameover");
    const winnerWins =
      result.players?.find((p) => p.id === result.winnerId)?.wins ??
      result.winnerWins;
    addSystemChat(
      `${result.winnerName} wins the round${winnerWins !== undefined ? ` (${winnerWins} total win${winnerWins === 1 ? "" : "s"})` : ""}!`,
    );
  };

  const handleReturnToWaiting = useCallback(() => {
    setGameState(null);
    setGameOverResult(null);
    setScreen("waiting");
  }, []);

  const handleRematch = () => getSocket().emit("rematch", { code: roomCode });

  const handleTurnDurationChange = useCallback(
    (duration) => {
      setTurnDuration(duration);
      getSocket().emit("set-turn-duration", {
        code: roomCode,
        turnDuration: duration,
      });
    },
    [roomCode],
  );

  const handleRoundLimitChange = useCallback(
    (limit) => {
      setRoundLimit(limit);
      getSocket().emit("set-round-limit", {
        code: roomCode,
        roundLimit: limit,
      });
    },
    [roomCode],
  );

  const handleGameStart = useCallback(
    (data) => {
      setGameState((prev) => ({ ...data, code: roomCode || prev?.code }));
      if (data.turnDuration !== undefined) setTurnDuration(data.turnDuration);
      if (data.roundLimit !== undefined) setRoundLimit(data.roundLimit);
      setGameLogs([]);
      setScreen("game");
    },
    [roomCode],
  );

  let currentView = null;
  if (screen === "lobby") currentView = <LobbyScreen onCreated={handleRoomCreated} onJoined={handleRoomJoined} connected={connected} />;
  else if (screen === "waiting") currentView = <WaitingScreen code={roomCode} players={players} myId={myId} gameLogs={gameLogs} chatMessages={chatMessages} onChat={handleChat} onGameStart={handleGameStart} turnDuration={turnDuration} roundLimit={roundLimit} isCreator={creatorId === myId} onTurnDurationChange={handleTurnDurationChange} onRoundLimitChange={handleRoundLimitChange} />;
  else if (screen === "game" && gameState) currentView = <GameScreen gameState={{ ...gameState, code: roomCode, turnDuration, roundLimit }} myId={myId} gameLogs={gameLogs} setGameLogs={setGameLogs} onGameOver={handleGameOver} onReturnToWaiting={handleReturnToWaiting} chatMessages={chatMessages} onChat={handleChat} onFeedback={showFeedback} />;
  else if (screen === "gameover" && gameOverResult) currentView = <GameOverScreen result={gameOverResult} myId={myId} onRematch={handleRematch} chatMessages={chatMessages} onChat={handleChat} />;
  return (
    <ExperienceShell screen={screen} code={roomCode} connected={connected} audioEnabled={audioEnabled} onAudioToggle={toggleSound} onShowRules={() => setShowRules(true)} toast={toast}>
      {currentView}
      {showRules && <RulesDialog onClose={() => setShowRules(false)} />}
    </ExperienceShell>
  );
}
