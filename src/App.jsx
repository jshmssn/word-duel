import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
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

const SERVER_URL = "word-duel-server-production.up.railway.app";
// const SERVER_URL = "localhost:3001";
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

// ─── Audio Engine ─────────────────────────────────────────────────────────────
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;
function getAudioCtx() {
  if (!audioCtx) audioCtx = new AudioCtx();
  return audioCtx;
}

function playTone(
  freq,
  type = "sine",
  duration = 0.15,
  vol = 0.3,
  startTime = null,
) {
  try {
    const ctx = getAudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.value = vol;
    const t = startTime !== null ? startTime : ctx.currentTime;
    osc.start(t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.stop(t + duration + 0.01);
  } catch {}
}

const SFX = {
  yourTurn() {
    playTone(523, "sine", 0.1, 0.3);
    playTone(659, "sine", 0.12, 0.3, getAudioCtx().currentTime + 0.12);
    playTone(784, "sine", 0.18, 0.35, getAudioCtx().currentTime + 0.25);
  },
  win() {
    const ctx = getAudioCtx();
    [523, 659, 784, 1047].forEach((f, i) =>
      playTone(f, "sine", 0.15, 0.35, ctx.currentTime + i * 0.13),
    );
  },
  lose() {
    const ctx = getAudioCtx();
    [440, 370, 311, 262].forEach((f, i) =>
      playTone(f, "sawtooth", 0.18, 0.25, ctx.currentTime + i * 0.14),
    );
  },
  chat() {
    playTone(880, "sine", 0.08, 0.2);
  },
  confirm() {
    playTone(523, "square", 0.07, 0.2);
    playTone(659, "square", 0.09, 0.2, getAudioCtx().currentTime + 0.08);
  },
  correctGuess() {
    const ctx = getAudioCtx();
    [784, 1047, 1319, 1047, 1319].forEach((f, i) =>
      playTone(f, "sine", 0.1, 0.3, ctx.currentTime + i * 0.1),
    );
  },
  timeout() {
    playTone(200, "sawtooth", 0.4, 0.4);
  },
  timerWarning(remaining) {
    // Gets faster as time runs out
    const interval = remaining <= 3 ? 0.18 : remaining <= 6 ? 0.28 : 0.38;
    const ctx = getAudioCtx();
    playTone(880, "square", 0.06, 0.18);
  },
};

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
function LobbyScreen({ onCreated, onJoined }) {
  const [username, setUsername] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [tab, setTab] = useState("create");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const sock = getSocket();
    sock.on("room-created", ({ code, turnDuration, creatorId }) => {
      setLoading(false);
      onCreated(code, username.trim(), turnDuration, creatorId);
    });
    sock.on("join-error", ({ message }) => {
      setLoading(false);
      setError(message);
    });
    return () => {
      sock.off("room-created");
      sock.off("join-error");
    };
  }, [username, onCreated]);

  const handleCreate = () => {
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

  const handleJoin = () => {
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
    onJoined(joinCode.trim().toUpperCase(), username.trim());
  };

  return (
    <div className="screen">
      <div className="lobby-wrap">
        <div className="logo-wrap">
          <div className="title-swords">
            <div className="title-sword-l">
              <IconSword size={38} color="#FFE135" />
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.8rem",
                letterSpacing: "4px",
                color: "var(--purple)",
              }}
            >
              VS
            </div>
            <div className="title-sword-r">
              <IconSword size={38} color="#FF4DA6" />
            </div>
          </div>
          <div className="game-title">WORD DUEL</div>
          <div className="game-subtitle">
            <IconStar2 size={14} color="currentColor" />
            1v1 Letter Guessing
            <IconStar2 size={14} color="currentColor" />
          </div>
        </div>

        <div className="lobby-card">
          <div className="field-group">
            <div className="field-label">
              <IconStar2 size={14} color="var(--purple)" />
              Your Name
            </div>
            <input
              className="fun-input"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setError("");
              }}
              placeholder="Enter your name..."
              maxLength={16}
            />
          </div>

          <div className="tab-row">
            <button
              className={`tab-pill ${tab === "create" ? "active" : ""}`}
              onClick={() => {
                setTab("create");
                setError("");
              }}
            >
              <span className="btn-icon-row">
                <IconHome size={17} color="currentColor" />
                Create Room
              </span>
            </button>
            <button
              className={`tab-pill ${tab === "join" ? "active" : ""}`}
              onClick={() => {
                setTab("join");
                setError("");
              }}
            >
              <span className="btn-icon-row">
                <IconRocket size={17} color="currentColor" />
                Join Room
              </span>
            </button>
          </div>

          {tab === "join" && (
            <div className="field-group">
              <div className="field-label">
                <IconKey size={14} color="var(--purple)" />
                Room Code
              </div>
              <input
                className="fun-input code-input-fun"
                value={joinCode}
                onChange={(e) => {
                  setJoinCode(e.target.value.toUpperCase());
                  setError("");
                }}
                placeholder="XXXXXXXX"
                maxLength={8}
              />
            </div>
          )}

          {error && (
            <div className="error-bubble">
              <IconX size={16} color="var(--red)" />
              {error}
            </div>
          )}

          {tab === "create" ? (
            <button
              className="btn-fun btn-fun-yellow"
              onClick={handleCreate}
              disabled={loading}
            >
              <div className="btn-icon-row">
                <IconDice size={20} color="currentColor" />
                {loading ? "Creating..." : "Create Room!"}
              </div>
            </button>
          ) : (
            <button
              className="btn-fun btn-fun-cyan"
              onClick={handleJoin}
              disabled={loading}
            >
              <div className="btn-icon-row">
                <IconLightning size={20} color="currentColor" />
                {loading ? "Joining..." : "Join Game!"}
              </div>
            </button>
          )}
        </div>

        <div
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--muted)",
            fontSize: "0.85rem",
            letterSpacing: "1px",
            textAlign: "center",
            lineHeight: 2,
          }}
        >
          <span className="lobby-steps">
            <span>
              <IconLetters size={15} color="currentColor" />
              Ask letters
            </span>
            <span>
              <IconBulb size={15} color="currentColor" />
              Collect clues
            </span>
            <span>
              <IconTarget size={15} color="currentColor" />
              Guess the word
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Waiting / Ready Room ─────────────────────────────────────────────────────
function WaitingScreen({
  code,
  players,
  myId,
  chatMessages,
  onChat,
  onGameStart,
  turnDuration,
  isCreator,
  onTurnDurationChange,
}) {
  const [countdown, setCountdown] = useState(null);
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

  const copyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleReady = () => {
    getSocket().emit("toggle-ready", { code });
  };

  const handleTimerChange = (event) => {
    onTurnDurationChange(Number(event.target.value));
  };

  useEffect(() => {
    const sock = getSocket();
    const handleCountdown = ({ count }) => setCountdown(count);
    const handleCountdownCancel = () => setCountdown(null);
    const handleGameStart = (data) => {
      setCountdown(null);
      onGameStart(data);
    };

    sock.on("countdown", handleCountdown);
    sock.on("countdown-cancel", handleCountdownCancel);
    sock.on("game-start", handleGameStart);

    return () => {
      sock.off("countdown", handleCountdown);
      sock.off("countdown-cancel", handleCountdownCancel);
      sock.off("game-start", handleGameStart);
    };
  }, [onGameStart]);

  const hasTwoPlayers = players.length === 2;

  return (
    <div
      className="screen"
      style={{ justifyContent: "flex-start", paddingTop: 28 }}
    >
      <div className="waiting-main">
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "1.8rem",
            background: "linear-gradient(135deg,var(--yellow),var(--pink))",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            letterSpacing: "3px",
          }}
        >
          WORD DUEL
        </div>

        <div
          className="room-code-box"
          style={{ width: "100%" }}
          onClick={copyCode}
        >
          <div className="room-code-label-fun">
            <IconKey
              size={12}
              color="var(--purple)"
              style={{ display: "inline" }}
            />{" "}
            Share this code!
          </div>
          <div className="room-code-chars">{code}</div>
          <div className="copy-hint">
            {copied ? (
              <>
                <IconCheck size={14} color="var(--green)" /> Copied!
              </>
            ) : (
              <>
                <IconCopy size={14} color="var(--muted)" /> Click to copy
              </>
            )}
          </div>
        </div>

        {isCreator && (
          <div className="timer-setting-panel">
            <div className="field-label">
              <IconLightning size={14} color="var(--cyan)" />
              Turn Timer
            </div>
            <select
              className="fun-input timer-select"
              value={turnDuration}
              onChange={handleTimerChange}
            >
              <option value={0}>No Timer</option>
              <option value={30}>30 seconds</option>
              <option value={45}>45 seconds</option>
              <option value={60}>1 minute</option>
            </select>
          </div>
        )}

        <div className="player-slots" style={{ width: "100%" }}>
          {[0, 1].map((i) => {
            const p = players[i];
            const [c1, c2] = avatarGrad(i);
            return (
              <div
                key={i}
                className={`player-card ${p ? "filled" : "empty"} ${p?.ready ? "ready-yes" : ""}`}
              >
                <div
                  className="player-avatar-fun"
                  style={{
                    background: p
                      ? `linear-gradient(135deg, ${c1}, ${c2})`
                      : "var(--bg3)",
                  }}
                >
                  {p ? p.username[0].toUpperCase() : "?"}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="player-name-fun">
                    {p ? p.username : "Waiting..."}
                  </div>
                  {p?.id === myId && (
                    <span className="you-tag">
                      <IconReturnArrow size={11} color="currentColor" />
                      that's you!
                    </span>
                  )}
                </div>
                {p ? (
                  <div className={`ready-pill ${p.ready ? "yes" : "no"}`}>
                    {p.ready ? (
                      <>
                        <IconCheck size={12} color="var(--green)" /> Ready!
                      </>
                    ) : (
                      <>
                        <IconX size={12} color="var(--red)" /> Not Ready
                      </>
                    )}
                  </div>
                ) : (
                  <span className="pulse-dot" />
                )}
              </div>
            );
          })}
        </div>

        {countdown !== null && (
          <div className="countdown-overlay">
            <div className="countdown-num" key={countdown}>
              {countdown}
            </div>
            <div className="countdown-label-fun">
              <IconLightning size={18} color="currentColor" />
              Game Starting!
            </div>
          </div>
        )}

        {hasTwoPlayers && (
          <button
            className={`btn-ready-fun ${imReady ? "is-ready" : "not-ready"}`}
            onClick={handleReady}
          >
            {imReady ? (
              <>
                <IconCheck size={22} color="currentColor" /> Ready! (tap to
                unready)
              </>
            ) : (
              <>
                <IconShield size={22} color="currentColor" /> Press Start /
                Ready!
              </>
            )}
          </button>
        )}

        {!hasTwoPlayers && (
          <div
            style={{
              fontFamily: "var(--font-display)",
              color: "var(--muted)",
              fontSize: "0.95rem",
              letterSpacing: "1px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span className="pulse-dot" /> Waiting for opponent...
          </div>
        )}

        {hasTwoPlayers &&
          !players.every((p) => p.ready) &&
          countdown === null && (
            <div
              style={{
                fontFamily: "var(--font-display)",
                color: "var(--muted)",
                fontSize: "0.85rem",
                letterSpacing: "1px",
                textAlign: "center",
              }}
            >
              Both players must be ready to start!
            </div>
          )}
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

// ─── Game Screen ──────────────────────────────────────────────────────────────
function GameScreen({
  gameState,
  myId,
  onGameOver,
  onReturnToWaiting,
  chatMessages,
  onChat,
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
  const [log, setLog] = useState([]);
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

  const logEndRef = useRef(null);
  const prevMsgCount = useRef(chatMessages.length);
  const prevRemaining = useRef(turnDuration || 0);

  const isMyTurn = turn === myId;
  const opponent = players.find((p) => p.id !== myId);

  const addLog = useCallback((entry) => setLog((prev) => [...prev, entry]), []);
  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [log]);

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
        }
        addLog({
          type: "count",
          icon: <IconLetterCount size={14} color="currentColor" />,
          text: `${responderName || askerName}: "${letter}" appears ${count} time${count !== 1 ? "s" : ""} in my word!`,
        });
      },
    );

    sock.on("wrong-guess", ({ guesserName, guess }) => {
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
  }, [myId, opponent, addLog, onGameOver]);

  const handleAskLetter = (letter) => {
    if (!isMyTurn || waitingFor) return;
    const l = (letter || letterInput).toUpperCase();
    if (!l || l.length !== 1 || !/[A-Z]/.test(l)) return;
    getSocket().emit("ask-letter", { code: gameState.code, letter: l });
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
    setGuessInput("");
  };

  const handleChatToggle = () => {
    setChatOpen((o) => !o);
    setUnread(0);
  };

  return (
    <div
      className="screen"
      style={{ justifyContent: "flex-start", paddingTop: 16 }}
    >
      <div className="game-layout" style={{ maxWidth: 600, width: "100%" }}>
        {/* Header */}
        <div className="turn-banner-fun">
          <div className="category-tag">
            <IconDice size={16} color="var(--pink)" />
            {category}
          </div>
          <div
            className={`turn-badge ${isMyTurn ? "your-turn" : "their-turn"}`}
          >
            {isMyTurn ? (
              <>
                <IconLightning size={18} color="currentColor" /> Your Turn!
              </>
            ) : (
              <>
                <span
                  className="pulse-dot"
                  style={{ background: "var(--muted)", width: 8, height: 8 }}
                />{" "}
                {opponent?.username}'s Turn
              </>
            )}
          </div>
        </div>

        {/* Timer */}
        {timerTotal > 0 && (
          <TurnTimer
            remaining={timerRemaining}
            total={timerTotal}
            isMyTurn={isMyTurn}
          />
        )}

        {/* Disconnection banner */}
        {opponentLeft && (
          <div className="disconnect-banner">
            <span className="inline-icon-row">
              <IconWarning size={18} color="currentColor" />
              Opponent disconnected!
            </span>
            <button
              className="btn-fun btn-fun-ghost"
              style={{ padding: "8px 16px" }}
              onClick={onReturnToWaiting}
            >
              Return to Waiting Room
            </button>
          </div>
        )}

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
              <div className="prompt-modal">
                <div
                  className="prompt-title prompt-title-row"
                  id="letter-ask-dialog-title"
                >
                  <IconLetters size={18} color="currentColor" />
                  {letterAskPrompt.askerName} asked for the letter:
                </div>
                <div className="prompt-letter-badge">
                  {letterAskPrompt.letter}
                </div>
                <div className="prompt-question">
                  Is "<strong>{letterAskPrompt.letter}</strong>" in your word?
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
              <div className="prompt-modal">
                <div
                  className="prompt-title prompt-title-row"
                  id="letter-count-dialog-title"
                >
                  <IconLetterCount size={18} color="currentColor" />
                  {letterCountPrompt.askerName} wants to know:
                </div>
                <div className="prompt-question">
                  How many "<strong>{letterCountPrompt.letter}</strong>" letters
                  are in your word?
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

        {/* Word panels */}
        <div className="word-panels">
          <div className="word-card my-card">
            <div className="word-card-title">
              <IconShield size={16} color="var(--green)" />
              Your Secret Word
            </div>
            <div className="my-word-text">{myWord.toUpperCase()}</div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "0.75rem",
                color: "var(--green)",
                opacity: 0.6,
                letterSpacing: "2px",
              }}
            >
              {myWordLetterCount} LETTERS - KEEP IT SECRET!
            </div>
          </div>

          <div className="word-card opp-card">
            <div className="word-card-title">
              <IconTarget size={16} color="var(--cyan)" />
              Opponent's Word ({opponentLetterCount} letters)
            </div>
            <div className="letter-tiles">
              {Array.from({ length: opponentLetterCount }).map((_, i) => {
                const letter = confirmedLetters[i];
                return (
                  <div
                    key={i}
                    className={`letter-tile ${letter ? "confirmed" : ""}`}
                  >
                    {letter || ""}
                  </div>
                );
              })}
            </div>
            {confirmedLetters.length > 0 && (
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "0.75rem",
                  color: "var(--cyan)",
                  letterSpacing: "2px",
                }}
              >
                GOT: {confirmedLetters.join("  ")}
              </div>
            )}
          </div>
        </div>

        {/* Alphabet */}
        <div className="alpha-section">
          <div className="alpha-section-title">
            <IconQuestion size={16} color="var(--purple)" />
            Asked Letters
          </div>
          <div className="alphabet-grid-fun">
            {ALPHABET.map((l) => (
              <button
                key={l}
                className={`alpha-key ${askedLetters[l] === "yes" ? "asked-yes" : askedLetters[l] === "no" ? "asked-no" : ""}`}
                onClick={() => {
                  if (isMyTurn && !askedLetters[l] && !waitingFor) {
                    handleAskLetter(l);
                  }
                }}
                title={
                  askedLetters[l] === "yes"
                    ? "In the word!"
                    : askedLetters[l] === "no"
                      ? "Not in word"
                      : "Click to ask"
                }
              >
                {l}
              </button>
            ))}
          </div>
        </div>

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
                      disabled={!letterInput}
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

        {/* Log */}
        <div className="game-log">
          {log.length === 0 && (
            <div className="log-row info">
              <span className="log-icon">
                {isMyTurn ? (
                  <IconLightning size={14} color="currentColor" />
                ) : (
                  <IconHourglass size={14} color="currentColor" />
                )}
              </span>
              {isMyTurn
                ? "It's your turn - ask a letter or guess!"
                : `${opponent?.username} goes first!`}
            </div>
          )}
          {log.map((entry, i) => (
            <div key={i} className={`log-row ${entry.type}`}>
              <span className="log-icon">{entry.icon}</span>
              {entry.text}
            </div>
          ))}
          <div ref={logEndRef} />
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

// ─── Game Over ────────────────────────────────────────────────────────────────
function GameOverScreen({ result, myId, onRematch, chatMessages, onChat }) {
  const isWinner = result.winnerId === myId;
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

  return (
    <div
      className="screen"
      style={{ justifyContent: "flex-start", paddingTop: 36 }}
    >
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
          {isWinner ? "YOU WIN!" : "YOU LOSE"}
        </div>

        <div
          style={{
            fontFamily: "var(--font-display)",
            color: "var(--muted)",
            fontSize: "1rem",
            letterSpacing: "1px",
          }}
        >
          {isWinner
            ? "You cracked the code!"
            : `${result.winnerName} got it first!`}
        </div>

        <div className="reveal-words">
          <div className="reveal-box">
            <div className="reveal-label">Opponent's Word</div>
            <div className="reveal-word opp-word">
              {result.correctWord?.toUpperCase()}
            </div>
          </div>
          <div className="reveal-box">
            <div className="reveal-label">Your Word</div>
            <div className="reveal-word my-word">
              {result.loserWord?.toUpperCase()}
            </div>
          </div>
        </div>

        <div className="gameover-btns">
          <button className="btn-fun btn-fun-yellow" onClick={onRematch}>
            <div className="btn-icon-row">
              <IconDice size={20} color="currentColor" />
              Rematch!
            </div>
          </button>
          <button
            className="btn-fun btn-fun-ghost"
            onClick={() => window.location.reload()}
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
  const [chatMessages, setChatMessages] = useState([]);
  const [turnDuration, setTurnDuration] = useState(0);
  const [creatorId, setCreatorId] = useState(null);

  const myId = getSocket().id;

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
      creatorId: cid,
    }) => {
      setPlayers(pl);
      if (td !== undefined) setTurnDuration(td);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleReadyUpdate = ({ players: pl, creatorId: cid }) => {
      setPlayers(pl);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleTurnDurationUpdate = ({ turnDuration: td, creatorId: cid }) => {
      setTurnDuration(td || 0);
      if (cid !== undefined) setCreatorId(cid);
    };
    const handleChatHistory = ({ messages }) => setChatMessages(messages);
    const handleChatMessage = (msg) =>
      setChatMessages((prev) => [...prev, msg]);
    const handleGameStartEvent = (data) => {
      setGameState((prev) => ({ ...data, code: roomCode || prev?.code }));
      if (data.turnDuration !== undefined) setTurnDuration(data.turnDuration);
      setScreen("game");
      addSystemChat("Game started! Good luck!");
    };
    const handleRematchLobby = ({
      players: pl,
      turnDuration: td,
      creatorId: cid,
    }) => {
      setPlayers(pl);
      if (td !== undefined) setTurnDuration(td);
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
    sock.on("chat-history", handleChatHistory);
    sock.on("chat-message", handleChatMessage);
    sock.on("game-start", handleGameStartEvent);
    sock.on("rematch-lobby", handleRematchLobby);
    sock.on("player-left", handlePlayerLeft);

    return () => {
      sock.off("player-joined", handlePlayerJoined);
      sock.off("ready-update", handleReadyUpdate);
      sock.off("turn-duration-update", handleTurnDurationUpdate);
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

  const handleRoomCreated = (code, username, td, cid) => {
    setRoomCode(code);
    setTurnDuration(td || 0);
    setCreatorId(cid || getSocket().id);
    setPlayers([{ id: getSocket().id, username, ready: false }]);
    setScreen("waiting");
  };

  const handleRoomJoined = (code) => {
    setRoomCode(code);
    setScreen("waiting");
  };

  const handleGameOver = (result) => {
    setGameOverResult(result);
    setScreen("gameover");
    addSystemChat(`${result.winnerName} wins the round!`);
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

  const handleGameStart = useCallback(
    (data) => {
      setGameState((prev) => ({ ...data, code: roomCode || prev?.code }));
      if (data.turnDuration !== undefined) setTurnDuration(data.turnDuration);
      setScreen("game");
    },
    [roomCode],
  );

  if (screen === "lobby")
    return (
      <LobbyScreen onCreated={handleRoomCreated} onJoined={handleRoomJoined} />
    );
  if (screen === "waiting")
    return (
      <WaitingScreen
        code={roomCode}
        players={players}
        myId={myId}
        chatMessages={chatMessages}
        onChat={handleChat}
        onGameStart={handleGameStart}
        turnDuration={turnDuration}
        isCreator={creatorId === myId}
        onTurnDurationChange={handleTurnDurationChange}
      />
    );
  if (screen === "game" && gameState)
    return (
      <GameScreen
        gameState={{ ...gameState, code: roomCode, turnDuration }}
        myId={myId}
        onGameOver={handleGameOver}
        onReturnToWaiting={handleReturnToWaiting}
        chatMessages={chatMessages}
        onChat={handleChat}
      />
    );
  if (screen === "gameover" && gameOverResult)
    return (
      <GameOverScreen
        result={gameOverResult}
        myId={myId}
        onRematch={handleRematch}
        chatMessages={chatMessages}
        onChat={handleChat}
      />
    );
  return null;
}
