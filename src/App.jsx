import TurnTimer from "./components/TurnTimer.jsx";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { io } from "socket.io-client";
import SlotMachine from "./SlotMachine.jsx";
import { SFX, playTone, isAudioEnabled, setAudioEnabled } from "./audio.js";
import { ExperienceShell, ConfettiBurst, ProgressBar, RulesDialog, SectionHeading, StepsPreview } from "./components/Experience.jsx";
import LetterWorkbench from "./components/LetterWorkbench.jsx";
import { RoomChat } from "./components/FloatingChat.jsx";
import useToasts from "./hooks/useToasts.js";
import { readRoomSession, saveRoomSession, clearRoomSession } from "./roomSession.js";
import ModalOverlay from "./components/ModalOverlay.jsx";
import { ColorCardGameView, ColorCardResultsView } from "./components/ColorCard.jsx";
import { FINISH_WORD_CHARACTERS, FinishWordCharacter, FinishWordCharacterPicker, FinishWordGameView } from "./components/FinishWord.jsx";
import {
  IconSword,
  IconShield,
  IconKey,
  IconTarget,
  IconChat,
  IconTrophy,
  IconSkull,
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
  if (!socket) socket = io(SERVER_URL, { auth: (done) => done({ session: readRoomSession() }) });
  return socket;
}

// ─── Turn Timer ───────────────────────────────────────────────────────────────
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

function ColorCardSettings({ duration, count, onDurationChange, onCountChange }) {
  return <div className="room-settings-grid">
    <label className="setting-field"><span className="field-label">TIME TO ANSWER EACH CARD</span><select className="fun-input timer-select" value={duration} onChange={(event) => onDurationChange(Number(event.target.value))}><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>1 minute</option></select></label>
    <label className="setting-field"><span className="field-label">NUMBER OF COLOR CARDS</span><select className="fun-input timer-select" value={count} onChange={(event) => onCountChange(Number(event.target.value))}>{Array.from({ length: 100 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value} card{value === 1 ? "" : "s"}</option>)}</select></label>
  </div>;
}

function LobbyScreen({ onCreated, onJoined, connected, gameMode, onModeChange, onFeedback }) {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState("create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [colorDuration, setColorDuration] = useState(30);
  const [colorCardCount, setColorCardCount] = useState(5);

  useEffect(() => {
    const sock = getSocket();
    const handleCreated = ({ code, turnDuration, roundLimit, creatorId, players, mode, gameMode, maxPlayers, colorDuration, colorCardCount }) => {
      setLoading(false);
      onCreated(code, username.trim(), turnDuration, creatorId, players, roundLimit, mode, gameMode, maxPlayers, colorDuration, colorCardCount);
    };
    const handleJoined = (details) => {
      setLoading(false);
      onJoined(details);
    };
    const handleError = ({ message }) => {
      setLoading(false);
      setError(message);
    };
    sock.on("room-created", handleCreated);
    sock.on("room-joined", handleJoined);
    sock.on("join-error", handleError);
    return () => {
      sock.off("room-created", handleCreated);
      sock.off("room-joined", handleJoined);
      sock.off("join-error", handleError);
    };
  }, [username, onCreated, onJoined]);
  useEffect(() => { if (!connected) setLoading(false); }, [connected]);

  const reportError = (message) => { setError(message); onFeedback(message, "error"); };

  const handleCreate = () => {
    if (!connected) { reportError("The game server is offline. Check that it is running."); return; }
    if (!username.trim()) {
      reportError("Enter your name first!");
      return;
    }
    setError("");
    setLoading(true);
    getSocket().emit("CREATE_ROOM", {
      username: username.trim(),
      gameMode,
      maxPlayers,
      ...(gameMode === "color-card" ? { colorDuration, colorCardCount } : {}),
    });
  };

  const handleCreateBotRoom = () => {
    if (!connected) { reportError("The game server is offline. Check that it is running."); return; }
    if (!username.trim()) {
      reportError("Enter your name first!");
      return;
    }
    setError("");
    setLoading(true);
    getSocket().emit("create-bot-room", {
      username: username.trim(),
    });
  };

  const handleJoin = () => {
    if (!connected) { reportError("The game server is offline. Check that it is running."); return; }
    if (!username.trim()) {
      reportError("Enter your name first!");
      return;
    }
    if (!joinCode.trim()) {
      reportError("Enter a room code!");
      return;
    }
    setError("");
    setLoading(true);
    getSocket().emit("join-room", {
      code: joinCode.trim().toUpperCase(),
      username: username.trim(),
    });
  };

  const isColorCard = gameMode === "color-card";
  const isFinishWord = gameMode === "finish-word";

  return (
    <div className="screen lobby-screen">
      <div className="lobby-layout">
        <section className="hero-panel">
          <div className="hero-eyebrow"><span className="eyebrow-line" /> GAMIFYLUV · PLAY TOGETHER <span className="eyebrow-spark">✦</span></div>
          <div className="mode-discovery" aria-label="Explore game modes">
            <button type="button" className={gameMode === "word-duel" ? "selected" : ""} aria-pressed={gameMode === "word-duel"} onClick={() => onModeChange("word-duel")}><IconSword size={20} color="currentColor" /><span><strong>Word Duel</strong><small>Ask. Deduce. Outspell.</small></span></button>
            <button type="button" className={isColorCard ? "selected" : ""} aria-pressed={isColorCard} onClick={() => onModeChange("color-card")}><span className="color-mode-icon" aria-hidden="true" /><span><strong>Color Card</strong><small>Remember. Mix. Match.</small></span></button>
            <button type="button" className={isFinishWord ? "selected" : ""} aria-pressed={isFinishWord} onClick={() => onModeChange("finish-word")}><IconLetters size={20} color="currentColor" /><span><strong>Finish the Word</strong><small>Link. Survive. Win.</small></span></button>
          </div>
          <h1 className="hero-headline">YOUR PEOPLE.<br /><span>YOUR PLAYGROUND.</span></h1>
          <p className="platform-description">Crack secret words in <strong>Word Duel</strong>, test your memory in <strong>Color Card</strong>, or outlast your friends in <strong>Finish the Word</strong>. Pick your next challenge.</p>
          <div key={gameMode} className="mode-hero-copy">
          <h2 className="mode-preview-heading">{isFinishWord ? "Finish the Word / Keep the chain alive." : isColorCard ? "Color Card · Trust your color memory." : "Word Duel · Words are your weapon."}</h2>
          <p className="hero-description">{isFinishWord ? "Eight characters. Three hearts. Fifteen seconds to find your next word. Follow the last letter, watch your rivals type, and be the last player standing." : isColorCard ? "Five seconds to remember a color. One blank card to recreate it. Mix your best match and climb the rankings with up to eight friends." : "A secret word. A room full of rivals. Ask about letters, piece together your clues, and crack the next player’s word before they crack yours."}</p>
          <div className="hero-tags"><span><IconLightning size={15} color="currentColor" /> 2–8 PLAYER ROOMS</span><span><IconTarget size={15} color="currentColor" /> {isFinishWord ? "15-SECOND TURNS" : isColorCard ? "5-SECOND MEMORY TEST" : "SOLO BOT PRACTICE"}</span><span><IconTrophy size={15} color="currentColor" /> {isFinishWord ? "LAST PLAYER STANDING" : isColorCard ? "CLOSEST COLOR WINS" : "BEST OF 3 OR 5"}</span></div>
          {isFinishWord ? <div className="arena-preview finish-word-preview" aria-label="A sample word chain"><div className="preview-top"><span className="preview-pill">FINISH THE WORD</span><span className="preview-subtitle">THREE HEARTS. ONE CHAIN.</span></div><div className="finish-word-demo-chain"><span>APPL<strong>E</strong></span><span aria-hidden="true">&rarr;</span><span><strong>E</strong>LEPHAN<strong>T</strong></span><span aria-hidden="true">&rarr;</span><span><strong>T</strong>URTLE</span></div><div className="preview-foot"><span>Choose a character. Make your move.</span><span>15 SECONDS</span></div></div> : isColorCard ? <div className="arena-preview color-arena-preview" aria-label="A sample color memory challenge"><div className="preview-top"><span className="preview-pill"><span className="connection-dot" /> COLOR CARD</span><span className="preview-subtitle">REMEMBER THE SHADE</span></div><div className="color-demo-cards"><div className="color-demo-original"><span>THE ORIGINAL</span><strong>05<small>SECONDS TO REMEMBER</small></strong></div><div className="color-demo-match"><span>YOUR MATCH</span><strong>98.6%<small>HOW CLOSE CAN YOU GET?</small></strong></div></div><div className="preview-foot"><span>✦ Memorize → Mix → Compare</span><span>PLAY IN FULL COLOR</span></div></div> : <div className="arena-preview" aria-label="A sample letter puzzle">
            <div className="preview-top"><span className="preview-pill"><span className="connection-dot" /> ROUND IN PROGRESS</span><span className="preview-subtitle">YOUR CLUE BOARD <span aria-hidden="true">↗</span></span></div>
            <div className="preview-matchup"><div className="preview-player"><span className="preview-avatar preview-you">Y</span><span>YOU <small>DETECTIVE</small></span></div><div className="preview-versus">VS</div><div className="preview-player right"><span>RIVAL <small>WORD KEEPER</small></span><span className="preview-avatar preview-rival">R</span></div></div>
            <div className="preview-letter-label"><span>UNPOSITIONED CLUES</span><span>2 / 6 LETTERS FOUND</span></div>
            <div className="preview-tiles"><span className="mock-letter revealed">A</span><span className="mock-letter revealed">E</span><span className="mock-letter">·</span><span className="mock-letter">·</span><span className="mock-letter">·</span><span className="mock-letter">·</span></div>
            <div className="preview-foot"><span>✦ Known letters, unknown positions</span><span>33% DISCOVERED</span></div><div className="preview-progress"><span /></div>
          </div>}
          <div className="hero-bottom">NO DOWNLOADS <span>✦</span> PICK A GAME. SHARE A CODE. PLAY.</div>
          </div>
        </section>
        <section className="lobby-entry">
          <div className="entry-top"><span className="eyebrow"><IconSword size={16} color="currentColor" /> YOUR NEXT CHALLENGE</span><span className="entry-orbit">✳</span></div>
          <h2>Enter the <span>arena.</span></h2>
          <p className="entry-desc">Choose a name, pick a game, and invite your friends.</p>
          <div className="entry-form">
            <label className="field-group" htmlFor="player-username"><span className="field-label">PLAYER NAME <span>01 / 02</span></span>
              <input id="player-username" autoComplete="nickname" className="fun-input" value={username} onChange={(e) => { setUsername(e.target.value); setError(""); }} onKeyDown={(e) => { if (e.key === "Enter") tab === "create" ? handleCreate() : handleJoin(); }} placeholder="What should we call you?" maxLength={16} />
            </label>
            <div className="tab-row" role="tablist" aria-label="Choose room action">
              <button type="button" role="tab" aria-selected={tab === "create"} className={`tab-pill ${tab === "create" ? "active" : ""}`} onClick={() => {setTab("create"); setError("");}}><IconHome size={17} color="currentColor" /> Create room</button>
              <button type="button" role="tab" aria-selected={tab === "join"} className={`tab-pill ${tab === "join" ? "active" : ""}`} onClick={() => {setTab("join"); setError("");}}><IconRocket size={17} color="currentColor" /> Join room</button>
            </div>
            {tab === "create" && <div className="create-room-settings">
              <label className="field-group" htmlFor="room-game-mode"><span className="field-label">GAME MODE</span><select id="room-game-mode" className="fun-input timer-select" value={gameMode} onChange={(event) => onModeChange(event.target.value)}><option value="word-duel">Word Duel</option><option value="color-card">Color Card</option><option value="finish-word">Finish the Word</option></select></label>
              <label className="field-group" htmlFor="room-max-players"><span className="field-label">MAX NUMBER OF PLAYERS</span><select id="room-max-players" className="fun-input timer-select" value={maxPlayers} onChange={(event) => setMaxPlayers(Number(event.target.value))}>{Array.from({ length: 7 }, (_, index) => index + 2).map((count) => <option key={count} value={count}>{count} players</option>)}</select></label>
              {gameMode === "color-card" && <ColorCardSettings duration={colorDuration} count={colorCardCount} onDurationChange={setColorDuration} onCountChange={setColorCardCount} />}
            </div>}
            {tab === "join" && <label className="field-group enter-from-right" htmlFor="room-join-code"><span className="field-label">8-CHARACTER ROOM CODE</span><input id="room-join-code" autoCapitalize="characters" autoCorrect="off" spellCheck={false} enterKeyHint="go" className="fun-input code-input-fun" value={joinCode} onChange={(e) => { setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "")); setError(""); }} onKeyDown={(e) => e.key === "Enter" && handleJoin()} placeholder="ENTER CODE" maxLength={8} /></label>}
            {error && <div className="error-bubble" role="alert"><IconWarning size={16} color="currentColor" /> {error}</div>}
            {!connected && !error && <div className="connection-notice" role="status">Connecting to game server…</div>}
            {tab === "create" ? <div className="create-actions"><button className="btn-fun btn-fun-yellow" onClick={handleCreate} disabled={loading || !connected}><span className="btn-icon-row"><IconLightning size={19} color="currentColor" /> {loading ? "Opening arena…" : gameMode === "word-duel" ? "Create a duel" : gameMode === "finish-word" ? "Create Finish the Word room" : "Create Color Card room"} <span className="action-arrow">↗</span></span></button>{gameMode === "word-duel" && <button className="btn-fun btn-fun-ghost" onClick={handleCreateBotRoom} disabled={loading || !connected}><span className="btn-icon-row"><IconTarget size={19} color="currentColor" /> Practice vs bot (2 players) <span className="action-arrow">→</span></span></button>}</div> : <button className="btn-fun btn-fun-yellow" onClick={handleJoin} disabled={loading || !connected}><span className="btn-icon-row"><IconRocket size={18} color="currentColor" /> {loading ? "Finding room…" : "Join room"} <span className="action-arrow">↗</span></span></button>}
          </div>
          <div className="entry-bottom"><span className="entry-star">✦</span><div><strong>{isColorCard ? "A LITTLE MEMORY. A LOT OF COLOR." : "THINK QUICK. SPELL FASTER."}</strong><p>{isColorCard ? "No sign-up required. Invite friends and compare your colors." : "No sign-up required. Invite a friend or face a bot."}</p></div></div>
        </section>
      </div>
      <div className="lobby-howto" key={gameMode}><div className="mini-section-name">{isColorCard ? "COLOR CARD" : "WORD DUEL"}: THE PATH TO VICTORY <span> / 3 EASY STEPS</span></div><StepsPreview gameMode={gameMode} /></div>
    </div>
  );
}

// ─── Waiting / Ready Room ─────────────────────────────────────────────────────
function WaitingScreen({
  code,
  players,
  myId,
  gameLogs,
  onGameStart,
  turnDuration,
  roundLimit,
  gameMode,
  maxPlayers,
  colorDuration,
  onColorDurationChange,
  colorCardCount,
  onColorCardCountChange,
  isCreator,
  onTurnDurationChange,
  onRoundLimitChange,
  onFeedback,
  recoveryCategory,
  connected,
}) {
  const [countdown, setCountdown] = useState(null);
  const [showSlotMachine, setShowSlotMachine] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [copied, setCopied] = useState(false);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const activeRequest = useRef(false);
  const myPlayer = players.find((p) => p.id === myId);
  const imReady = Boolean(myPlayer?.ready);
  const isColorCard = gameMode === "color-card";
  const isFinishWord = gameMode === "finish-word";
  const gameTitle = isFinishWord ? "Finish the Word" : isColorCard ? "Color Card" : "Word Duel";
  const hasTwoPlayers = players.length >= 2;
  const isPlayerReady = (player) => player.ready && player.connected !== false && (!isFinishWord || Boolean(player.characterId));
  const allReady = hasTwoPlayers && players.every(isPlayerReady);
  useEffect(() => {
    if (isFinishWord && (!allReady || !connected)) setCountdown(null);
  }, [isFinishWord, allReady, connected]);
  useEffect(() => {
    if (recoveryCategory) { setSelectedCategory(recoveryCategory); setShowSlotMachine(true); }
  }, [recoveryCategory]);



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
      onFeedback("Room code copied. Invite your friends!", "success");
      SFX.confirm();
      setTimeout(() => setCopied(false), 1800);
    } catch { onFeedback(`Could not copy. Your room code is ${code}.`, "error"); }
  };

  const actFinishWord = async (event, data, key) => {
    if (!connected || activeRequest.current) return;
    activeRequest.current = true;
    setPending(key);
    setError("");
    try {
      const response = await getSocket().timeout(5000).emitWithAck(event, { code, ...data });
      if (!response?.success) throw new Error(response?.message || "Could not complete that action.");
      if (event === "select_character") {
        const character = FINISH_WORD_CHARACTERS.find((candidate) => candidate.id === data.characterId);
        onFeedback(`You chose ${character.name}.`, "success");
      }
    } catch (failure) {
      const message = failure?.message?.includes("timed out") ? "No confirmation received. Please try again." : failure.message;
      setError(message);
      onFeedback(message, "error");
    } finally {
      activeRequest.current = false;
      setPending(null);
    }
  };

  const handleReady = () => {
    if (isFinishWord) actFinishWord("toggle-ready", {}, "ready");
    else getSocket().emit("toggle-ready", { code });
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

  return (
    <div className={`screen waiting-screen${isFinishWord ? " finish-word-lobby" : ""}`}>
      <div className="waiting-layout-container">
        <div className="page-intro waiting-intro"><div><span className="eyebrow"><IconShield size={16} color="currentColor" /> {gameTitle.toUpperCase()} LOBBY</span><h1>Prepare to <span>play.</span></h1><p>{isFinishWord ? "Choose your character, then ready up. Keep the word chain alive in 15-second turns. Last player standing wins." : isColorCard ? `${colorCardCount} unique shared color${colorCardCount === 1 ? "" : "s"}. Memorize each for 5 seconds, then recreate it in ${colorDuration} seconds. The server moves everyone through results and rankings together.` : "Investigate the next player’s secret word in lobby order. Turns rotate through everyone."}</p></div><div className="lobby-state-chip"><span className="pulse-dot" /> {hasTwoPlayers ? "PLAYERS ASSEMBLED" : "WAITING FOR CHALLENGER"}</div></div>
        <div className="ready-journey" aria-label="Match preparation progress">
          <div className="journey-step done"><span>01</span> ROOM CREATED</div><div className={`journey-line ${hasTwoPlayers ? "done" : ""}`} /><div className={`journey-step ${hasTwoPlayers ? "done" : ""}`}><span>02</span> PLAYERS JOINED</div><div className={`journey-line ${allReady ? "done" : ""}`} /><div className={`journey-step ${allReady ? "done" : ""}`}><span>03</span> ALL READY</div>
        </div>
        <div className="waiting-grid">
          <div className="waiting-main">
            <button className="room-code-box" onClick={copyCode} type="button" aria-label={`Copy room code ${code}`}>
              <span className="room-code-eyebrow"><IconKey size={17} color="currentColor" /> YOUR INVITE CODE</span>
              <span className="room-code-chars">{code}</span>
              <span className="copy-hint">{copied ? <><IconCheck size={15} color="currentColor" /> Copied to clipboard!</> : <><IconCopy size={15} color="currentColor" /> Click to copy & share <span>↗</span></>}</span>
            </button>
            <div className="player-panel">
              <SectionHeading kicker="YOUR ROOM" title="Player lineup" right={<span className="player-capacity">{players.length} / {maxPlayers} PLAYERS</span>} />
              <div className="player-slots" aria-label="Room players">
                {Array.from({ length: maxPlayers }, (_, index) => index).map((i) => { const p = players[i]; const [c1, c2] = avatarGrad(i); const ready = p && isPlayerReady(p); return <div key={i} className={`player-card ${p ? "filled" : "empty"} ${ready ? "ready-yes" : ""}`}>
                  <div className="player-avatar-fun" style={p ? { background: `linear-gradient(135deg,${c1},${c2})` } : {}}>{isFinishWord && p?.characterId ? <FinishWordCharacter characterId={p.characterId} decorative /> : p ? p.username[0].toUpperCase() : "?"}</div>
                  <div className="player-ident"><div className="player-name-fun"><span className="player-display-name">{p ? p.username : "Awaiting challenger"}</span>{p?.id === myId && <span className="you-tag">YOU</span>}{p?.isBot && <span className="you-tag">BOT</span>}{p?.connected === false && <span className="player-connection-tag status-reconnecting">Reconnecting</span>}</div><div className="player-meta-row">{p ? isFinishWord ? <span>{FINISH_WORD_CHARACTERS.find((character) => character.id === p.characterId)?.name || "Choosing a character…"}</span> : isColorCard ? <span className="player-accuracy-stat" title={p.previousMatchCardCount ? `Average accuracy from the previous completed match (${p.previousMatchCardCount} cards)` : "No previous match recorded"}><IconTarget size={13} color="currentColor" /><strong>{(p.previousMatchAverageAccuracy ?? 0).toFixed(2)}%</strong> LAST MATCH AVG.</span> : <span><IconTrophy size={13} color="currentColor" /> {p.wins || 0} WINS</span> : <span>SHARE YOUR INVITE CODE ABOVE</span>}</div></div>
                  {p ? <span className={`ready-pill ${ready ? "yes" : "no"}`}>{ready ? <><IconCheck size={13} color="currentColor" /> READY</> : "NOT READY"}</span> : <span className="empty-player-pulse"><span className="pulse-dot" /></span>}
                </div>; })}
              </div>
              <ProgressBar value={players.filter(isPlayerReady).length} max={Math.max(2, players.length)} label="Players ready" color="mint" />
              {hasTwoPlayers ? <button type="button" className={`btn-ready-fun ${imReady ? "is-ready" : "not-ready"}`} aria-pressed={imReady} disabled={!connected || (isFinishWord && (!myPlayer?.characterId || pending !== null))} onClick={handleReady}><IconShield size={21} color="currentColor" /> {pending === "ready" ? "Updating…" : imReady ? "You're ready — tap to cancel" : "I'm ready to battle"} <span className="action-arrow" aria-hidden="true">↗</span></button> : <div className="invite-nudge"><span className="pulse-dot" /> Invite someone to join your room.</div>}
              {hasTwoPlayers && !allReady && countdown === null && <div className="ready-caption" role="status">{isFinishWord && !myPlayer?.characterId ? "Choose a character, then ready up." : "All joined players must hit ready to start. At least two players are required."}</div>}
              {error && <p className="finish-word-error" role="alert">{error}</p>}
            </div>
          </div>
          <aside className="waiting-side">
            {isFinishWord && <FinishWordCharacterPicker players={players} myId={myId} connected={connected} pending={pending} onSelect={(character) => actFinishWord("select_character", { characterId: character.id }, character.id)} />}
            <div className="room-settings-panel">
              <SectionHeading kicker="MATCH CONFIGURATION" title="Room settings" right={<IconLightning size={18} color="var(--cyan)" />} />
              <div className="room-mode-summary"><span>{gameTitle}</span><span>Up to {maxPlayers} players</span></div>
              {isFinishWord ? <div className="room-settings-overview"><div><span>TURN TIMER</span><strong>15 seconds</strong></div><div><span>STARTING LIVES</span><strong>3 hearts per player</strong></div><div><span>WORD CHAIN</span><strong>Start with the last letter</strong></div><div><span>HARD MODE</span><strong>60% two letters after 10 words</strong></div><div><span>WIN CONDITION</span><strong>Last player standing</strong></div><small>Every word can be used once. Only a timeout costs a life. Invalid word? Try again while time remains.</small></div> : isColorCard ? <div className="room-settings-overview"><div><span>MEMORIZE</span><strong>5 seconds per card</strong></div>{isCreator ? <ColorCardSettings duration={colorDuration} count={colorCardCount} onDurationChange={onColorDurationChange} onCountChange={onColorCardCountChange} /> : <><div><span>TIME TO ANSWER EACH CARD</span><strong>{colorDuration === 60 ? "1 minute" : `${colorDuration} seconds`}</strong></div><div><span>NUMBER OF COLOR CARDS</span><strong>{colorCardCount}</strong></div></>}<div><span>SCORING</span><strong>Highest average accuracy wins</strong></div></div> : isCreator ? <div className="room-settings-grid"><label className="setting-field"><span className="field-label">TURN TIMER</span><select className="fun-input timer-select" value={turnDuration} onChange={handleTimerChange}><option value={0}>Unlimited</option><option value={30}>30 seconds</option><option value={45}>45 seconds</option><option value={60}>60 seconds</option></select></label><label className="setting-field"><span className="field-label">MATCH FORMAT</span><select className="fun-input timer-select" value={roundLimit} onChange={handleRoundLimitChange}><option value={1}>Single round</option><option value={3}>Best of 3</option><option value={5}>Best of 5</option></select></label></div> : <div className="room-settings-overview"><div><span>TURN TIMER</span><strong>{turnDuration ? `${turnDuration} seconds` : "Unlimited"}</strong></div><div><span>MATCH FORMAT</span><strong>{roundLimit === 1 ? "Single round" : `Best of ${roundLimit}`}</strong></div><small>The room creator controls these settings.</small></div>}
              <div className="settings-note"><IconShield size={15} color="currentColor" /> Fair play is the only rule that matters.</div>
            </div>
            <div className="waiting-log-section"><SectionHeading kicker="WHAT'S HAPPENING" title="Live activity" /><GameLogPanel log={gameLogs} className="waiting-room-log" emptyContent={<div className="log-row info"><span className="log-icon"><IconHourglass size={15} color="currentColor" /></span> Activity will show up here.</div>} /></div>
          </aside>
        </div>
      </div>
      {countdown !== null && <ModalOverlay className="countdown-overlay" role="status"><div className="countdown-card"><span className="eyebrow">GET READY</span><div className="countdown-num" key={countdown}>{countdown}</div><div className="countdown-label-fun"><IconLightning size={19} color="currentColor" /> {isFinishWord ? "FINISH THE WORD STARTING" : isColorCard ? "COLOR CARD STARTING" : "DUEL STARTING"}</div></div></ModalOverlay>}
      {showSlotMachine && selectedCategory && <SlotMachine selectedCategoryName={selectedCategory} onDone={handleSlotMachineDone} />}
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
  const [workspace, setWorkspace] = useState("play");
  const [letterInput, setLetterInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [confirmedLetters, setConfirmedLetters] = useState(gameState.confirmedLetters || []);
  const [askedLetters, setAskedLetters] = useState(gameState.askedLetters || {});
  const [turn, setTurn] = useState(currentTurn);
  const [timerRemaining, setTimerRemaining] = useState(gameState.timerRemaining ?? turnDuration ?? 0);
  const [timerTotal, setTimerTotal] = useState(turnDuration || 0);

  // Letter ask prompt (for opponent to answer)
  const [letterAskPrompt, setLetterAskPrompt] = useState(gameState.letterAskPrompt || null);
  const [letterCountPrompt, setLetterCountPrompt] = useState(gameState.letterCountPrompt || null);
  const [letterCountInput, setLetterCountInput] = useState("");

  // Waiting state (asker is waiting for opponent response)
  const [waitingFor, setWaitingFor] = useState(gameState.waitingFor || null);
  useEffect(() => {
    if (!gameState.recoveredAt) return;
    setConfirmedLetters(gameState.confirmedLetters || []);
    setAskedLetters(gameState.askedLetters || {});
    setTurn(gameState.currentTurn);
    setTimerRemaining(gameState.timerRemaining ?? gameState.turnDuration ?? 0);
    setLetterAskPrompt(gameState.letterAskPrompt || null);
    setLetterCountPrompt(gameState.letterCountPrompt || null);
    setWaitingFor(gameState.waitingFor || null);
  }, [gameState.recoveredAt]);

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

  const prevRemaining = useRef(turnDuration || 0);
  const initialTurnSoundPlayed = useRef(false);

  const isMyTurn = turn === myId;
  const opponent = players.find((p) => p.id === gameState.opponentId) || players.find((p) => p.id !== myId);
  const currentPlayer = players.find((p) => p.id === turn);

  const addLog = useCallback(
    (entry) => setGameLogs((prev) => [...prev, entry]),
    [setGameLogs],
  );

  useEffect(() => {
    if (initialTurnSoundPlayed.current || currentTurn !== myId) return;
    initialTurnSoundPlayed.current = true;
    SFX.yourTurn();
  }, [currentTurn, myId]);


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
        } else {
          onFeedback(`${askerName} asked about ${letter}: ${hasLetter ? "yes" : "no"}.`);
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
        } else {
          onFeedback(`${responderName || askerName}: ${letter} appears ${count} time${count === 1 ? "" : "s"}.`);
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
      else onFeedback(`${guesserName} guessed ${guess.toUpperCase()}. Incorrect!`);
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
        onFeedback("Your turn! Ask a letter or guess the word.", "success");
      } else {
        addLog({
          type: "info",
          icon: <IconReturnArrow size={14} color="currentColor" />,
          text: `${players.find((player) => player.id === ct)?.username || "Opponent"}'s turn...`,
        });
      }
    });

    sock.on("turn-timeout", ({ playerId }) => {
      SFX.timeout();
      onFeedback(playerId === myId ? "Time’s up! Your turn has passed." : `${players.find((player) => player.id === playerId)?.username || "Opponent"} ran out of time.`, "error");
      addLog({
        type: "warn",
        icon: <IconClock size={14} color="currentColor" />,
        text:
          playerId === myId
            ? "You ran out of time!"
            : `${players.find((player) => player.id === playerId)?.username || "Opponent"} ran out of time!`,
      });
    });

    sock.on("timer-update", ({ remaining, total }) => {
      setTimerRemaining(remaining);
      setTimerTotal(total);
    });

    // Prompt: opponent is asking a letter
    sock.on("letter-ask-prompt", ({ askerName, letter }) => {
      setLetterAskPrompt({ askerName, letter });
      onFeedback(`${askerName} is asking about ${letter}.`);
    });

    // Prompt: opponent is asking for letter count
    sock.on("letter-count-prompt", ({ askerName, letter }) => {
      setLetterCountPrompt({ askerName, letter });
      setLetterCountInput("");
      onFeedback(`${askerName} wants the count for ${letter}.`);
    });

    // Asker is waiting
    sock.on("waiting-for-response", ({ action, letter }) => {
      setWaitingFor({ action, letter });
      onFeedback(`Question sent. Waiting for the answer about ${letter}.`);
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

    const handlePlayerLeft = ({ username, disconnected }) => {
      addLog({
        type: "info",
        icon: <IconX size={14} color="currentColor" />,
        text: `${username} left.`,
      });
      if (disconnected) setOpponentLeft(true);
    };
    sock.on("player-left", handlePlayerLeft);

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
      sock.off("player-left", handlePlayerLeft);
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



  return (
    <div className="screen game-screen">
      <div className="game-layout">
        <div className="page-intro game-intro"><div><span className="eyebrow"><IconSword size={16} color="currentColor" /> HEAD-TO-HEAD WORD BATTLE</span><h1>The <span>duel is on.</span></h1></div><div className="match-chip"><span className="pulse-dot" /> ROUND {gameState.roundNumber || 1} {gameState.roundLimit > 1 ? `/ ${gameState.roundLimit}` : ""}</div></div>
        <div className="turn-banner-fun">
          <div className="category-tag"><span className="category-symbol"><IconDice size={18} color="currentColor" /></span><div><small>YOUR CATEGORY</small><strong>{category}</strong></div></div>
          <div className={`turn-badge ${isMyTurn ? "your-turn" : "their-turn"}`}>{isMyTurn ? <><IconLightning size={20} color="currentColor" /> YOUR TURN — MAKE IT COUNT!</> : <><span className="pulse-dot" /> {currentPlayer?.username || "Opponent"} IS THINKING</>}</div>
        </div>
        {timerTotal > 0 && <TurnTimer remaining={timerRemaining} total={timerTotal} isMyTurn={isMyTurn} />}
        {opponentLeft && <div className="disconnect-banner"><span className="inline-icon-row"><IconWarning size={18} color="currentColor" /> Opponent disconnected.</span><button className="btn-fun btn-fun-ghost" onClick={onReturnToWaiting}>Back to room</button></div>}
        {/* Letter ask/count prompt (for opponent) */}
        {(letterAskPrompt || letterCountPrompt) && (
          <ModalOverlay
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
                    inputMode="numeric"
                    enterKeyHint="send"
                    aria-label="Letter count"
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
          </ModalOverlay>
        )}


        <div className="workspace-tabs" role="tablist" aria-label="Game panels">{[["clues", "Clues & word"], ["play", "Make a move"], ["activity", "Activity"]].map(([id, label]) => <button key={id} type="button" role="tab" id={`workspace-tab-${id}`} aria-controls={`workspace-${id}`} aria-selected={workspace === id} onClick={() => setWorkspace(id)}>{label}</button>)}</div>
        <div className={`game-grid workspace-${workspace}`}>
          <div className="game-main-column">
            <div className="word-panels workspace-panel" id="workspace-clues" aria-labelledby="workspace-tab-clues">
              <div className="word-card my-card"><div className="word-card-title"><IconShield size={17} color="var(--mint)" /> YOUR SECRET WORD <span className="secret-pill">TOP SECRET</span></div><div className="my-word-text">{myWord.toUpperCase()}</div><div className="secret-bottom">{myWordLetterCount} LETTERS <span>·</span> DON'T GIVE IT AWAY</div></div>
              <div className="word-card opp-card"><div className="word-card-title"><IconTarget size={17} color="var(--cyan)" /> CRACK THEIR WORD <span className="target-length">{opponentLetterCount} LETTERS</span></div>
                {players.length > 2 && <p className="word-target-name">Investigating {opponent?.username}’s word</p>}
                <LetterWorkbench confirmed={confirmedLetters} length={opponentLetterCount} onUseGuess={(word) => { setGuessInput(word); setActiveTab("guess"); setWorkspace("play"); onFeedback("Letter arrangement added to your guess."); }} onFeedback={onFeedback} />
                {reward && <div className="reward-pop" key={reward.id}>{reward.message} <span>✦</span></div>}
              </div>
            </div>
            <div className={`move-panel workspace-panel action-${activeTab}`} id="workspace-play" aria-labelledby="workspace-tab-play">
            <div className="alpha-section"><div className="alpha-section-title"><span><IconLetters size={18} color="currentColor" /> LETTER SCANNER</span><span className="alpha-key-legend"><i className="dot-yes" /> IN WORD <i className="dot-no" /> NOT FOUND</span></div><div className="alphabet-grid-fun">{ALPHABET.map((l) => <button key={l} type="button" className={`alpha-key ${askedLetters[l] === "yes" ? "asked-yes" : askedLetters[l] === "no" ? "asked-no" : ""}`} disabled={!isMyTurn || Boolean(askedLetters[l]) || Boolean(waitingFor)} onClick={() => handleAskLetter(l)} title={askedLetters[l] === "yes" ? "Confirmed letter" : askedLetters[l] === "no" ? "Not in word" : "Ask about this letter"} aria-label={`Ask about ${l}${askedLetters[l] ? `; already ${askedLetters[l] === "yes" ? "confirmed" : "ruled out"}` : ""}`}>{l}</button>)}</div></div>
        {/* Action panel */}
        <div className={`action-card ${!isMyTurn ? "disabled" : ""}`}>
          {!isMyTurn && (
            <div className="waiting-msg">
              <span className="pulse-dot" />
              Waiting for {currentPlayer?.username || "opponent"}...
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
                <div className="manual-letter-action">
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
                      aria-label="Letter to ask"
                      autoCapitalize="characters"
                      autoCorrect="off"
                      spellCheck={false}
                      enterKeyHint="send"
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
                </div>
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
                    aria-label="Your word guess"
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck={false}
                    enterKeyHint="go"
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
          </div>
          <aside className="game-sidebar workspace-panel" id="workspace-activity" aria-labelledby="workspace-tab-activity">
            <div className="intel-panel"><div className="side-kicker">MATCH INTELLIGENCE <span>✦</span></div><h3>Every clue counts.</h3><p>Find the letters and build your own guess in the workbench.</p><div className="intel-stats"><div><strong>{confirmedLetters.length}</strong><small>LETTERS FOUND</small></div><div><strong>{Object.keys(askedLetters).length}</strong><small>LETTERS ASKED</small></div><div><strong>{opponentLetterCount}</strong><small>WORD LENGTH</small></div></div><ProgressBar value={confirmedLetters.length} max={opponentLetterCount} color="mint" label="Discovery progress" /></div>
            <div className="feed-panel"><SectionHeading kicker="THE MATCH SO FAR" title="Live activity" right={<IconChat size={17} color="var(--muted)" />} /><GameLogPanel log={gameLogs} emptyContent={<div className="log-row info"><span className="log-icon"><IconHourglass size={14} color="currentColor" /></span>{isMyTurn ? "Your move. Ask or guess!" : `${currentPlayer?.username} goes first.`}</div>} /></div>
            <div className="tip-panel"><span className="tip-icon"><IconBulb size={18} color="currentColor" /></span><div><strong>PRO TIP</strong><p>Known letters reveal what exists, <em>not where it goes.</em> Rearrange the tiles to test your theory.</p></div></div>
          </aside>
        </div>
      </div>
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

function GameOverScreen({ result, myId, onRematch, onQuit, leaving }) {
  const isWinner = result.winnerId === myId;
  const resultPlayers = Array.isArray(result.players) ? result.players : [];
  const opponent = resultPlayers.find((player) => player.id === result.opponentsByPlayer?.[myId]) || resultPlayers.find((player) => player.id !== myId);
  const myResultWord =
    result.wordsByPlayer?.[myId] || result.loserWord || result.correctWord || "";
  const opponentResultWord =
    result.wordsByPlayer?.[opponent?.id] || result.correctWord || result.loserWord || "";
  const longestReveal = Math.max(
    String(myResultWord).replace(/\s/g, "").length,
    String(opponentResultWord).replace(/\s/g, "").length,
  );
  const [revealDone, setRevealDone] = useState(false);



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
            onClick={onQuit}
            disabled={leaving}
          >
            <div className="btn-icon-row">
              <IconX size={18} color="currentColor" />
              {leaving ? "Quitting…" : "Quit room"}
            </div>
          </button>
        </div>
      </div>

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
  const [gameMode, setGameMode] = useState("word-duel");
  const [selectedMode, setSelectedMode] = useState("word-duel");
  const [maxPlayers, setMaxPlayers] = useState(2);
  const [colorDuration, setColorDuration] = useState(30);
  const [colorCardCount, setColorCardCount] = useState(5);
  const [creatorId, setCreatorId] = useState(null);
  const [myId, setMyId] = useState(() => getSocket().id || null);
  const [connected, setConnected] = useState(() => getSocket().connected);
  const [audioEnabled, setAudioEnabledState] = useState(isAudioEnabled);
  const [showRules, setShowRules] = useState(false);
  const { toasts, notify: showFeedback, dismiss: dismissToast } = useToasts();
  const [leaving, setLeaving] = useState(false);
  const roster = useRef([]);
  const voteNotices = useRef(new Set());
  const currentColorRound = useRef(null);
  const identity = useRef(readRoomSession()?.playerId || getSocket().id);
  const [roomPause, setRoomPause] = useState(null);
  const [restoring, setRestoring] = useState(Boolean(readRoomSession()));
  const [recoveryCategory, setRecoveryCategory] = useState(null);

  const resetRoom = useCallback(() => {
    setRoomCode(""); setPlayers([]); roster.current = [];
    setGameState(null); setGameOverResult(null); setGameLogs([]); setChatMessages([]);
    setCreatorId(null); setShowRules(false); setScreen("lobby");
    setRoomPause(null); setRestoring(false); setRecoveryCategory(null);
    currentColorRound.current = null;
    clearRoomSession();
  }, []);

  const handleQuit = async () => {
    if (leaving) return;
    SFX.tap();
    if (!connected) { resetRoom(); showFeedback("You left the room.", "success"); return; }
    setLeaving(true);
    try {
      const response = await getSocket().timeout(5000).emitWithAck("leave-room", { code: roomCode });
      if (!response.success) { showFeedback(response.message || "Could not leave the room.", "error"); return; }
      resetRoom();
      showFeedback("You quit the room.", "success");
    } catch { showFeedback("No server confirmation. Please try quitting again.", "error"); }
    finally { setLeaving(false); }
  };

  useEffect(() => {
    const sock = getSocket();
    const onSession = (session) => { saveRoomSession(session); identity.current = session.playerId; setMyId(session.playerId); };
    const onRestored = (state) => {
      const clock = typeof state.serverNow === "number" ? state.serverNow - Date.now() : 0;
      identity.current = state.playerId;
      setMyId(state.playerId); setRoomCode(state.code); setPlayers(state.players); roster.current = state.players;
      setCreatorId(state.creatorId); setGameMode(state.gameMode); setRoomMode(state.mode);
      setMaxPlayers(state.maxPlayers); setTurnDuration(state.turnDuration); setRoundLimit(state.roundLimit);
      setColorDuration(state.colorDuration); setColorCardCount(state.colorCardCount);
      setChatMessages(state.chatMessages || []);
      setGameState(state.gameState ? { ...state.gameState, code: state.code, serverClockOffset: clock, pausedAt: state.pausedAt, recoveredAt: Date.now() } : null);
      setGameOverResult(state.result ? { ...state.result, serverClockOffset: clock, pausedAt: state.pausedAt } : null);
      currentColorRound.current = state.gameMode === "color-card" ? state.gameState?.roundId : null;
      setScreen(state.screen);
      setRecoveryCategory(state.pendingCategory || null);
      setRoomPause(state.pausedAt ? { ...state, serverClockOffset: clock, message: "Waiting for the other players to reconnect. Timers are paused." } : null);
      setRestoring(false); setConnected(true);
    };
    let resuming = false;
    const onConnect = async () => {
      setConnected(true);
      const session = readRoomSession();
      if (!session) { identity.current = sock.id; setMyId(sock.id); return; }
      if (resuming) return;
      resuming = true;
      setRestoring(true);
      try {
        const response = await sock.timeout(5000).emitWithAck("resume-room", session);
        if (!response.success) { resetRoom(); showFeedback(response.message, "error"); }
      } catch { setRestoring(false); setRoomPause({ recoveryFailed: true, message: "Could not restore the room yet. Reconnecting…" }); showFeedback("Room recovery is taking longer than expected. Tap Reconnect to retry.", "error"); }
      finally { resuming = false; }
    };
    const onDisconnect = () => {
      setConnected(false);
      if (readRoomSession()) {
        setRoomPause((previous) => ({ ...previous, message: "Reconnecting to your room. Your seat is reserved while you reconnect." }));
        setPlayers((previous) => {
          const updated = previous.map((player) => player.id === identity.current ? { ...player, connected: false, connectionStatus: "reconnecting" } : player);
          roster.current = updated;
          return updated;
        });
        setGameState((previous) => previous ? { ...previous, pausedAt: Date.now() + (previous.serverClockOffset || 0) } : previous);
        setGameOverResult((previous) => previous ? { ...previous, pausedAt: Date.now() + (previous.serverClockOffset || 0) } : previous);
      }
      showFeedback("Connection lost. Reconnecting to your room…", "error");
    };
    const onVisible = () => {
      if (document.visibilityState !== "visible") {
        const session = readRoomSession();
        if (sock.connected && session) sock.emit("suspend-room", { code: session.code });
        return;
      }
      if (!sock.connected) sock.connect();
      else if (readRoomSession()) onConnect();
    };
    const onError = () => showFeedback("The server is unavailable. Reconnecting…", "error");
    const onSessionError = ({ message }) => { resetRoom(); showFeedback(message, "error"); };
    sock.on("connect", onConnect);
    sock.on("disconnect", onDisconnect);
    sock.on("connect_error", onError);
    sock.on("room-session", onSession);
    sock.on("room-restored", onRestored);
    sock.on("room-session-error", onSessionError);
    sock.on("room-kicked", onSessionError);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    if (sock.connected) onConnect();
    return () => {
      sock.off("connect", onConnect); sock.off("disconnect", onDisconnect); sock.off("connect_error", onError);
      sock.off("room-session", onSession); sock.off("room-restored", onRestored);
      sock.off("room-session-error", onSessionError); sock.off("room-kicked", onSessionError);
      document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("online", onVisible);
    };
  }, [resetRoom, showFeedback]);

  const toggleSound = useCallback(() => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    setAudioEnabledState(next);
    showFeedback(`Sound ${next ? "enabled" : "muted"}.`, "success");
    if (next) SFX.confirm();
  }, [audioEnabled, showFeedback]);

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
      gameMode: selectedGameMode,
      maxPlayers: capacity,
      colorDuration: cd,
      colorCardCount: cc,
      joinedPlayerId,
    }) => {
      const joined = pl.find((player) => player.id === joinedPlayerId && player.id !== identity.current);
      if (joined) showFeedback(`${joined.username} joined the room.`, "success");
      roster.current = pl;
      setPlayers(pl);
      if (td !== undefined) setTurnDuration(td);
      if (rl !== undefined) setRoundLimit(rl);
      if (cid !== undefined) setCreatorId(cid);
      if (mode) setRoomMode(mode);
      if (selectedGameMode) setGameMode(selectedGameMode);
      if (capacity !== undefined) setMaxPlayers(capacity);
      if (cd !== undefined) setColorDuration(cd);
      if (cc !== undefined) setColorCardCount(cc);
    };
    const handleReadyUpdate = ({ players: pl, creatorId: cid, changedPlayerId }) => {
      pl.forEach((player) => {
        const previous = roster.current.find((candidate) => candidate.id === player.id);
        if (player.id === changedPlayerId && previous && previous.ready !== player.ready) showFeedback(`${player.id === identity.current ? "You are" : `${player.username} is`} ${player.ready ? "ready!" : "no longer ready."}`, player.ready ? "success" : "info");
      });
      roster.current = pl;
      setPlayers(pl);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleTurnDurationUpdate = ({ turnDuration: td, creatorId: cid }) => {
      setTurnDuration(td || 0);
      showFeedback(`Turn timer updated: ${td ? `${td} seconds` : "unlimited"}.`, "success");
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleRoundLimitUpdate = ({ roundLimit: rl, creatorId: cid }) => {
      setRoundLimit(rl || 1);
      showFeedback(`Match format updated: ${rl > 1 ? `best of ${rl}` : "single round"}.`, "success");
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleColorDurationUpdated = ({ code, colorDuration: duration }) => {
      if (code === roomCode) { setColorDuration(duration); showFeedback(`Answer time updated to ${duration} seconds.`, "success"); }
    };
    const handleColorCardCountUpdated = ({ code, colorCardCount: count }) => {
      if (code === roomCode) { setColorCardCount(count); showFeedback(`Match updated to ${count} color card${count === 1 ? "" : "s"}.`, "success"); }
    };
    const handleChatHistory = ({ messages }) => setChatMessages(messages);
    const handleChatMessage = (msg) => {
      setChatMessages((prev) => [...prev, msg]);
      if (!msg.system) showFeedback(msg.playerId === identity.current ? "Message sent." : `${msg.username}: ${msg.text}`, msg.playerId === identity.current ? "success" : "info");
    };
    const handleGameStartEvent = (data) => {
      if (currentColorRound.current !== data.roundId) voteNotices.current.clear();
      currentColorRound.current = data.gameMode === "color-card" ? data.roundId : null;
      setRecoveryCategory(null);
      setGameState((prev) => ({ ...data, code: roomCode || prev?.code,
        ...(typeof data.serverNow === "number" ? { serverClockOffset: data.serverNow - Date.now() } : {}) }));
      setGameMode(data.gameMode || "word-duel");
      setGameOverResult(null);
      if (data.turnDuration !== undefined) setTurnDuration(data.turnDuration);
      if (data.roundLimit !== undefined) setRoundLimit(data.roundLimit);
      setGameLogs([]);
      setScreen("game");
      addSystemChat("Game started! Good luck!");
      showFeedback(data.gameMode === "color-card" ? `Card ${data.roundNumber}: memorize the color!` : "The duel has started. Good luck!", "success");
    };
    const handleRematchLobby = ({
      players: pl,
      turnDuration: td,
      roundLimit: rl,
      creatorId: cid,
      gameMode: selectedGameMode,
      maxPlayers: capacity,
      colorDuration: cd,
      colorCardCount: cc,
      message,
      departure,
      pausedAt,
    }) => {
      setPlayers(pl);
      roster.current = pl;
      if (td !== undefined) setTurnDuration(td);
      if (rl !== undefined) setRoundLimit(rl);
      if (cid !== undefined) setCreatorId(cid);
      if (selectedGameMode) setGameMode(selectedGameMode);
      if (capacity !== undefined) setMaxPlayers(capacity);
      if (cd !== undefined) setColorDuration(cd);
      if (cc !== undefined) setColorCardCount(cc);
      setGameState(null);
      setGameOverResult(null);
      setScreen("waiting");
      setRoomPause(null);
      if (!departure) { addSystemChat(message || "Rematch! Press Ready when you're set."); showFeedback(message || "Back in the waiting room. Ready for a rematch?"); }
    };
    const handlePlayerLeft = ({ playerId, username, message, disconnected }) => {
      if (!message) addSystemChat(`${username} ${disconnected ? "disconnected" : "quit the room"}.`);
      showFeedback(message || `${username} ${disconnected ? "disconnected" : "quit the room"}.`);
      roster.current = roster.current.filter((p) => playerId ? p.id !== playerId : p.username !== username);
      setPlayers(roster.current);
    };
    const handleSubmissionUpdate = ({ code, roundId, submittedPlayerIds }) => {
      setGameState((prev) => prev?.code === code && prev.roundId === roundId ? { ...prev, submittedPlayerIds } : prev);
    };
    const handleColorPickingStarted = ({ code, roundId, phase, roundEndsAt, serverNow }) => {
      if (code !== roomCode) return;
      showFeedback("The original is hidden. Time to mix your color!");
      setGameState((prev) => prev?.code === code && prev.roundId === roundId
        ? { ...prev, phase, roundEndsAt, targetColor: null,
          ...(typeof serverNow === "number" ? { serverClockOffset: serverNow - Date.now() } : {}) } : prev);
    };
    const handleColorSkipVote = ({ code, roundId, vote, serverNow }) => {
      if (code !== roomCode || roundId !== currentColorRound.current || !vote) return;
      setGameState((prev) => prev?.code === code && prev.roundId === roundId ? {
        ...prev, skipVote: vote,
        ...(typeof serverNow === "number" ? { serverClockOffset: serverNow - Date.now() } : {}),
      } : prev);
      const noticeId = `${vote.id}:${vote.status}`;
      if (voteNotices.current.has(noticeId)) return;
      voteNotices.current.add(noticeId);
      const messages = {
        active: "Everyone submitted! Vote to show results early. A majority of all players must vote Yes.",
        passed: "Skip vote passed! Revealing the results.",
        declined: "Skip vote did not pass. The answer timer continues.",
        expired: "Voting time ended without a majority. The answer timer continues.",
        cancelled: "Skip vote cancelled: a player is editing their color.",
      };
      if (vote.status === "active") SFX.voteOpen();
      else if (vote.status === "passed") SFX.votePassed();
      else SFX.voteKept();
      showFeedback(messages[vote.status], vote.status === "passed" ? "success" : "info");
      addSystemChat(messages[vote.status]);
    };
    const handleRoundResults = (result) => {
      currentColorRound.current = null;
      setGameMode("color-card");
      setGameOverResult({ ...result, ...(typeof result.serverNow === "number" ? { serverClockOffset: result.serverNow - Date.now() } : {}) });
      setPlayers(result.players);
      setScreen("gameover");
      const announcement = result.phase === "review" ? `Card ${result.roundNumber} finished. Review your color before rankings appear.`
        : result.winners.length ? `${result.winners.map((winner) => winner.username).join(", ")} ${result.winners.length > 1 ? "share the win" : "wins"} for card ${result.roundNumber}.` : `Card ${result.roundNumber} rankings are ready.`;
      addSystemChat(announcement);
      showFeedback(announcement, "success");
    };
    const handleRoomPaused = (data) => {
      if (data.code !== roomCode) return;
      setRoomPause({ ...data, serverClockOffset: (data.serverNow || Date.now()) - Date.now() }); setPlayers(data.players); roster.current = data.players;
      setGameState((previous) => previous ? { ...previous, pausedAt: data.pausedAt } : previous);
      setGameOverResult((previous) => previous ? { ...previous, pausedAt: data.pausedAt } : previous);
      showFeedback(data.message);
    };
    const handleRoomResumed = (data) => {
      if (data.code !== roomCode) return;
      setRoomPause(null); setRestoring(false);
      showFeedback(data.message, "success");
    };
    const handleFinishState = (state) => {
      if (state.code !== roomCode || state.gameMode !== "finish-word") return;
      const synchronized = { ...state, serverClockOffset: (state.serverNow || Date.now()) - Date.now() };
      setGameMode("finish-word");
      setPlayers(state.players); roster.current = state.players;
      setRecoveryCategory(null);
      if (state.status === "ENDED") {
        setGameOverResult(synchronized); setScreen("gameover");
      } else {
        setGameState(synchronized); setGameOverResult(null); setScreen("game");
      }
    };
    const handleCharacterSelected = (state) => {
      if (state.code !== roomCode) return;
      roster.current = state.players; setPlayers(state.players);
      if (state.creatorId) setCreatorId(state.creatorId);
    };
    const handleStartingLetterChoices = ({ code, gameId, turnId, playerId, choices }) => {
      if (code !== roomCode || playerId !== identity.current) return;
      setGameState((previous) => previous?.gameMode === "finish-word" && previous.gameId === gameId && previous.turnId === turnId && previous.awaitingStartingLetterChoice
        ? { ...previous, startingLetterChoices: choices } : previous);
    };
    const handleFinishTyping = ({ code, gameId, turnId, playerId, text }) => {
      if (code !== roomCode) return;
      setGameState((previous) => previous?.gameMode === "finish-word" && previous.gameId === gameId && previous.turnId === turnId && previous.currentPlayerId === playerId
        ? { ...previous, typingText: text } : previous);
    };
    const handleFinishWord = ({ code, message, accepted, playerId }) => {
      if (code !== roomCode) return;
      if (message) showFeedback(message, accepted ? "success" : playerId === identity.current ? "error" : "info");
    };
    const handleKickVotes = (data) => {
      if (data.code !== roomCode) return;
      setPlayers(data.players); roster.current = data.players;
      setRoomPause((previous) => previous ? { ...previous, kickVotes: data.kickVotes, serverClockOffset: (data.serverNow || Date.now()) - Date.now() } : previous);
    };

    const notices = {
      "join-error": ({ message }) => showFeedback(message, "error"),
      "not-your-turn": () => showFeedback("Wait for your turn before making a move.", "error"),
      "action-pending": () => showFeedback("Wait for the answer to your current question."),
      "room-action-error": ({ message }) => showFeedback(message, "error"),
      "category-selected": ({ category, selectedCategoryName }) => showFeedback(`Category selected: ${selectedCategoryName || category}.`),
      "countdown": ({ count }) => { if (count === 5) showFeedback("Everyone is ready. The game starts in 5 seconds!"); },
      "COLOR_PLAYER_ACTION": ({ username, playerId, action }) => { if (playerId !== identity.current) showFeedback(`${username} ${action === "submitted" ? "submitted a color." : "is editing their answer."}`); },
    };
    Object.entries(notices).forEach(([event, handler]) => sock.on(event, handler));

    sock.on("player-joined", handlePlayerJoined);
    sock.on("ready-update", handleReadyUpdate);
    sock.on("turn-duration-update", handleTurnDurationUpdate);
    sock.on("round-limit-update", handleRoundLimitUpdate);
    sock.on("COLOR_DURATION_UPDATED", handleColorDurationUpdated);
    sock.on("COLOR_CARD_COUNT_UPDATED", handleColorCardCountUpdated);
    sock.on("chat-history", handleChatHistory);
    sock.on("chat-message", handleChatMessage);
    sock.on("game-start", handleGameStartEvent);
    sock.on("START_GAME", handleGameStartEvent);
    sock.on("SUBMISSION_UPDATE", handleSubmissionUpdate);
    sock.on("COLOR_PICKING_STARTED", handleColorPickingStarted);
    sock.on("COLOR_SKIP_VOTE", handleColorSkipVote);
    sock.on("ROUND_RESULTS", handleRoundResults);
    sock.on("COLOR_RANKINGS", handleRoundResults);
    sock.on("rematch-lobby", handleRematchLobby);
    sock.on("player-left", handlePlayerLeft);
    sock.on("ROOM_PAUSED", handleRoomPaused);
    sock.on("ROOM_RESUMED", handleRoomResumed);
    sock.on("ROOM_KICK_VOTES", handleKickVotes);
    sock.on("character_selected", handleCharacterSelected);
    sock.on("starting_letter_choices", handleStartingLetterChoices);
    sock.on("turn_start", handleFinishState);
    sock.on("game_state", handleFinishState);
    sock.on("game_over", handleFinishState);
    sock.on("player_typing", handleFinishTyping);
    sock.on("word_accepted", handleFinishWord);
    sock.on("word_rejected", handleFinishWord);

    return () => {
      Object.entries(notices).forEach(([event, handler]) => sock.off(event, handler));
      sock.off("player-joined", handlePlayerJoined);
      sock.off("ready-update", handleReadyUpdate);
      sock.off("turn-duration-update", handleTurnDurationUpdate);
      sock.off("round-limit-update", handleRoundLimitUpdate);
      sock.off("COLOR_DURATION_UPDATED", handleColorDurationUpdated);
      sock.off("COLOR_CARD_COUNT_UPDATED", handleColorCardCountUpdated);
      sock.off("chat-history", handleChatHistory);
      sock.off("chat-message", handleChatMessage);
      sock.off("game-start", handleGameStartEvent);
      sock.off("START_GAME", handleGameStartEvent);
      sock.off("SUBMISSION_UPDATE", handleSubmissionUpdate);
      sock.off("COLOR_PICKING_STARTED", handleColorPickingStarted);
      sock.off("COLOR_SKIP_VOTE", handleColorSkipVote);
      sock.off("ROUND_RESULTS", handleRoundResults);
      sock.off("COLOR_RANKINGS", handleRoundResults);
      sock.off("rematch-lobby", handleRematchLobby);
      sock.off("player-left", handlePlayerLeft);
      sock.off("ROOM_PAUSED", handleRoomPaused);
      sock.off("ROOM_RESUMED", handleRoomResumed);
      sock.off("ROOM_KICK_VOTES", handleKickVotes);
      sock.off("character_selected", handleCharacterSelected);
      sock.off("starting_letter_choices", handleStartingLetterChoices);
      sock.off("turn_start", handleFinishState);
      sock.off("game_state", handleFinishState);
      sock.off("game_over", handleFinishState);
      sock.off("player_typing", handleFinishTyping);
      sock.off("word_accepted", handleFinishWord);
      sock.off("word_rejected", handleFinishWord);
    };
  }, [roomCode, addSystemChat, showFeedback]);

  useEffect(() => {
    if (gameState && roomCode && gameState.code !== roomCode)
      setGameState((prev) => ({ ...prev, code: roomCode }));
  }, [roomCode, gameState]);

  const handleRoomCreated = (code, username, td, cid, pl, rl, mode, selectedGameMode, capacity, cd, cc) => {
    setRoomCode(code);
    setTurnDuration(td || 0);
    setRoundLimit(rl || 1);
    setRoomMode(mode || "duel");
    setGameMode(selectedGameMode || "word-duel");
    setMaxPlayers(capacity || 2);
    setColorDuration(cd || 30);
    setColorCardCount(cc || 5);
    setCreatorId(cid || getSocket().id);
    setPlayers(pl || [{ id: getSocket().id, username, ready: false, wins: 0 }]);
    roster.current = pl || [{ id: getSocket().id, username, ready: false, wins: 0 }];
    setGameLogs([]);
    setScreen("waiting");
    showFeedback("Room created. Share the code to invite your friends!", "success");
  };

  const handleRoomJoined = ({ code, players: joinedPlayers, turnDuration: td, roundLimit: rl, creatorId: cid, mode, gameMode: selectedGameMode, maxPlayers: capacity, colorDuration: cd, colorCardCount: cc }) => {
    setRoomCode(code);
    setRoomMode(mode || "duel");
    setGameMode(selectedGameMode || "word-duel");
    setMaxPlayers(capacity || 2);
    setColorDuration(cd || 30);
    setColorCardCount(cc || 5);
    setPlayers(joinedPlayers || []);
    roster.current = joinedPlayers || [];
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
    showFeedback(`${result.winnerName} wins the round!`, "success");
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
  const settingsResponse = (response) => { if (!response?.success) showFeedback(response?.message || "Could not update room settings.", "error"); };
  const handleColorDurationChange = (duration) => getSocket().emit("SET_COLOR_DURATION", { code: roomCode, duration }, settingsResponse);
  const handleColorCardCountChange = (count) => getSocket().emit("SET_COLOR_CARD_COUNT", { code: roomCode, count }, settingsResponse);

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
  if (screen === "lobby") currentView = <LobbyScreen onCreated={handleRoomCreated} onJoined={handleRoomJoined} connected={connected} gameMode={selectedMode} onModeChange={setSelectedMode} onFeedback={showFeedback} />;
  else if (screen === "waiting") currentView = <WaitingScreen code={roomCode} players={players} myId={myId} gameMode={gameMode} maxPlayers={maxPlayers} colorDuration={colorDuration} onColorDurationChange={handleColorDurationChange} colorCardCount={colorCardCount} onColorCardCountChange={handleColorCardCountChange} gameLogs={gameLogs} onGameStart={handleGameStart} turnDuration={turnDuration} roundLimit={roundLimit} isCreator={creatorId === myId} onTurnDurationChange={handleTurnDurationChange} onRoundLimitChange={handleRoundLimitChange} onFeedback={showFeedback} recoveryCategory={recoveryCategory} connected={connected && !restoring} />;
  else if (screen === "game" && gameState) currentView = gameMode === "color-card"
    ? <ColorCardGameView key={gameState.roundId} gameState={gameState} socket={getSocket()} myId={myId} connected={connected} onFeedback={showFeedback} />
    : gameMode === "finish-word" ? <FinishWordGameView gameState={gameState} myId={myId} socket={getSocket()} connected={connected && !restoring} onFeedback={showFeedback} onRematch={handleRematch} />
    : <GameScreen gameState={{ ...gameState, code: roomCode, turnDuration, roundLimit }} myId={myId} gameLogs={gameLogs} setGameLogs={setGameLogs} onGameOver={handleGameOver} onReturnToWaiting={handleReturnToWaiting} onFeedback={showFeedback} />;
  else if (screen === "gameover" && gameOverResult) currentView = gameMode === "color-card"
    ? <ColorCardResultsView key={`${gameOverResult.roundId}:${gameOverResult.phase}`} result={gameOverResult} myId={myId} connected={connected} onRematch={handleRematch} onQuit={handleQuit} leaving={leaving} />
    : gameMode === "finish-word" ? <FinishWordGameView gameState={gameOverResult} myId={myId} socket={getSocket()} connected={connected && !restoring} onFeedback={showFeedback} onRematch={handleRematch} />
    : <GameOverScreen result={gameOverResult} myId={myId} onRematch={handleRematch} onQuit={handleQuit} leaving={leaving} />;
  return (
    <>
    <ExperienceShell players={players} myId={myId} onKickVote={(vote, choice) => getSocket().timeout(5000).emitWithAck("VOTE_ROOM_KICK", { code: roomCode, playerId: vote.playerId, voteId: vote.id, choice })} screen={screen} code={roomCode} gameMode={gameMode} connected={connected} audioEnabled={audioEnabled} onAudioToggle={toggleSound} onShowRules={() => setShowRules(true)} toasts={toasts} onDismissToast={dismissToast} onQuit={handleQuit} leaving={leaving} roomPause={roomPause} restoring={restoring} onReconnect={() => { const sock = getSocket(); if (sock.connected) sock.emit("resume-room", readRoomSession(), (response) => { if (!response.success) { resetRoom(); showFeedback(response.message, "error"); } }); else sock.connect(); }}>
      {currentView}
      {showRules && <RulesDialog gameMode={screen === "lobby" ? selectedMode : gameMode} onClose={() => setShowRules(false)} />}
    </ExperienceShell>
    {roomCode && screen !== "lobby" && <RoomChat key={roomCode} messages={chatMessages} onSend={handleChat} myId={myId} colorRoundId={gameMode === "color-card" && screen === "game" ? gameState?.roundId : null} />}
    </>
  );
}
