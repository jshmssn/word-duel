import { useState, useEffect, useRef, useCallback } from "react";
import { io } from "socket.io-client";
import {
  IconSword, IconShield, IconKey, IconTarget, IconChat,
  IconTrophy, IconSkull, IconSend, IconCheck, IconX,
  IconLightning, IconQuestion, IconDice, IconStar2, IconCopy
} from "./icons/Icons.jsx";

const SERVER_URL = "http://localhost:3001";
const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

// Avatar colors cycle
const AVATAR_COLORS = [
  ["#FFE135","#FF7043"],
  ["#00E5FF","#7B2FFF"],
  ["#FF4DA6","#FF7043"],
  ["#69FF47","#00E5FF"],
];

function avatarGrad(i) { return AVATAR_COLORS[i % AVATAR_COLORS.length]; }

let socket = null;
function getSocket() {
  if (!socket) socket = io(SERVER_URL);
  return socket;
}

// ─── Chat Panel ───────────────────────────────────────────────────────────────
function ChatPanel({ messages, onSend, myId, height = 480 }) {
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };

  const fmt = (ts) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="chat-panel" style={{ height }}>
      <div className="chat-header-fun">
        <IconChat size={18} color="var(--cyan)" />
        Room Chat
        <span className="pulse-dot" style={{ marginLeft: "auto", background: "var(--green)" }} />
      </div>

      <div className="chat-messages">
        {messages.length === 0 && (
          <div className="chat-system-msg">No messages yet. Say hi! 👋</div>
        )}
        {messages.map((msg) =>
          msg.system ? (
            <div key={msg.id} className="chat-system-msg">{msg.text}</div>
          ) : (
            <div key={msg.id} className={`chat-bubble ${msg.playerId === myId ? "mine" : "theirs"}`}>
              <div className="chat-bubble-meta">
                <span>{msg.username}{msg.playerId === myId ? " (you)" : ""}</span>
                <span style={{ opacity: 0.6 }}>{fmt(msg.timestamp)}</span>
              </div>
              <div className="chat-bubble-inner">{msg.text}</div>
            </div>
          )
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
        <button className="btn-send-fun" onClick={send} disabled={!text.trim()}>
          <IconSend size={18} color="currentColor" />
        </button>
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
    sock.on("room-created", ({ code }) => { setLoading(false); onCreated(code, username.trim()); });
    sock.on("join-error", ({ message }) => { setLoading(false); setError(message); });
    return () => { sock.off("room-created"); sock.off("join-error"); };
  }, [username, onCreated]);

  const handleCreate = () => {
    if (!username.trim()) { setError("Enter your name first!"); return; }
    setError(""); setLoading(true);
    getSocket().emit("create-room", { username: username.trim() });
  };

  const handleJoin = () => {
    if (!username.trim()) { setError("Enter your name first!"); return; }
    if (!joinCode.trim()) { setError("Enter a room code!"); return; }
    setError(""); setLoading(true);
    getSocket().emit("join-room", { code: joinCode.trim().toUpperCase(), username: username.trim() });
    onJoined(joinCode.trim().toUpperCase(), username.trim());
  };

  return (
    <div className="screen">
      <div className="lobby-wrap">
        {/* Logo */}
        <div className="logo-wrap">
          <div className="title-swords">
            <div className="title-sword-l"><IconSword size={38} color="#FFE135" /></div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", letterSpacing: "4px", color: "var(--purple)" }}>VS</div>
            <div className="title-sword-r"><IconSword size={38} color="#FF4DA6" /></div>
          </div>
          <div className="game-title">WORD DUEL</div>
          <div className="game-subtitle">✦ 1v1 Letter Guessing ✦</div>
        </div>

        {/* Card */}
        <div className="lobby-card">
          {/* Name field */}
          <div className="field-group">
            <div className="field-label">
              <IconStar2 size={14} color="var(--purple)" />
              Your Name
            </div>
            <input
              className="fun-input"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(""); }}
              placeholder="Enter your name..."
              maxLength={16}
            />
          </div>

          {/* Tabs */}
          <div className="tab-row">
            <button className={`tab-pill ${tab === "create" ? "active" : ""}`} onClick={() => { setTab("create"); setError(""); }}>
              🏠 Create Room
            </button>
            <button className={`tab-pill ${tab === "join" ? "active" : ""}`} onClick={() => { setTab("join"); setError(""); }}>
              🚀 Join Room
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
                onChange={(e) => { setJoinCode(e.target.value.toUpperCase()); setError(""); }}
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
            <button className="btn-fun btn-fun-yellow" onClick={handleCreate} disabled={loading}>
              <div className="btn-icon-row">
                <IconDice size={20} color="currentColor" />
                {loading ? "Creating..." : "Create Room!"}
              </div>
            </button>
          ) : (
            <button className="btn-fun btn-fun-cyan" onClick={handleJoin} disabled={loading}>
              <div className="btn-icon-row">
                <IconLightning size={20} color="currentColor" />
                {loading ? "Joining..." : "Join Game!"}
              </div>
            </button>
          )}
        </div>

        <div style={{ fontFamily: "var(--font-display)", color: "var(--muted)", fontSize: "0.85rem", letterSpacing: "1px", textAlign: "center", lineHeight: 2 }}>
          🔤 Ask letters &nbsp;→&nbsp; 💡 Collect clues &nbsp;→&nbsp; 🎯 Guess the word!
        </div>
      </div>
    </div>
  );
}

// ─── Waiting / Ready Room ─────────────────────────────────────────────────────
function WaitingScreen({ code, players, myId, chatMessages, onChat, onGameStart }) {
  const [imReady, setImReady] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [copied, setCopied] = useState(false);

  const copyCode = () => {
    navigator.clipboard?.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleReady = () => {
    getSocket().emit("toggle-ready", { code });
    setImReady((r) => !r);
  };

  useEffect(() => {
    const sock = getSocket();
    sock.on("ready-update", ({ players: pl }) => {
      const me = pl.find((p) => p.id === myId);
      if (me) setImReady(me.ready);
    });
    sock.on("countdown", ({ count }) => setCountdown(count));
    sock.on("countdown-cancel", () => setCountdown(null));
    sock.on("game-start", (data) => { setCountdown(null); onGameStart(data); });
    return () => {
      sock.off("ready-update");
      sock.off("countdown");
      sock.off("countdown-cancel");
      sock.off("game-start");
    };
  }, [myId, onGameStart]);

  const hasTwoPlayers = players.length === 2;

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: 28 }}>
      <div className="waiting-layout">
        <div className="waiting-main">
          {/* Mini title */}
          <div style={{ fontFamily: "var(--font-display)", fontSize: "1.8rem", background: "linear-gradient(135deg,var(--yellow),var(--pink))", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", letterSpacing: "3px" }}>
            WORD DUEL
          </div>

          {/* Room code */}
          <div className="room-code-box" style={{ width: "100%" }} onClick={copyCode}>
            <div className="room-code-label-fun">
              <IconKey size={12} color="var(--purple)" style={{ display: "inline" }} /> Share this code!
            </div>
            <div className="room-code-chars">{code}</div>
            <div className="copy-hint">
              {copied
                ? <><IconCheck size={14} color="var(--green)" /> Copied!</>
                : <><IconCopy size={14} color="var(--muted)" /> Click to copy</>
              }
            </div>
          </div>

          {/* Players */}
          <div className="player-slots" style={{ width: "100%" }}>
            {[0, 1].map((i) => {
              const p = players[i];
              const [c1, c2] = avatarGrad(i);
              return (
                <div key={i} className={`player-card ${p ? "filled" : "empty"} ${p?.ready ? "ready-yes" : ""}`}>
                  <div className="player-avatar-fun" style={{ background: p ? `linear-gradient(135deg, ${c1}, ${c2})` : "var(--bg3)" }}>
                    {p ? p.username[0].toUpperCase() : "?"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="player-name-fun">{p ? p.username : "Waiting..."}</div>
                    {p?.id === myId && <span className="you-tag">← that's you!</span>}
                  </div>
                  {p
                    ? <div className={`ready-pill ${p.ready ? "yes" : "no"}`}>
                        {p.ready ? <><IconCheck size={12} color="var(--green)" /> Ready!</> : "Not Ready"}
                      </div>
                    : <span className="pulse-dot" />
                  }
                </div>
              );
            })}
          </div>

          {/* Countdown or Ready button */}
          {countdown !== null && (
            <div className="countdown-overlay">
              <div className="countdown-num" key={countdown}>{countdown}</div>
              <div className="countdown-label-fun">⚡ Game Starting!</div>
            </div>
          )}

          {hasTwoPlayers && countdown === null && (
            <button className={`btn-ready-fun ${imReady ? "is-ready" : "not-ready"}`} onClick={handleReady}>
              {imReady
                ? <><IconCheck size={22} color="currentColor" /> Ready! (tap to cancel)</>
                : <><IconShield size={22} color="currentColor" /> Press Ready!</>
              }
            </button>
          )}

          {!hasTwoPlayers && (
            <div style={{ fontFamily: "var(--font-display)", color: "var(--muted)", fontSize: "0.95rem", letterSpacing: "1px", display: "flex", alignItems: "center", gap: 10 }}>
              <span className="pulse-dot" /> Waiting for opponent...
            </div>
          )}

          {hasTwoPlayers && !players.every((p) => p.ready) && countdown === null && (
            <div style={{ fontFamily: "var(--font-display)", color: "var(--muted)", fontSize: "0.85rem", letterSpacing: "1px", textAlign: "center" }}>
              Both players must be ready to start!
            </div>
          )}
        </div>

        {/* Chat */}
        <ChatPanel messages={chatMessages} onSend={onChat} myId={myId} height={500} />
      </div>
    </div>
  );
}

// ─── Game Screen ──────────────────────────────────────────────────────────────
function GameScreen({ gameState, myId, onGameOver, chatMessages, onChat }) {
  const { category, myWord, myWordLetterCount, opponentLetterCount, players, currentTurn } = gameState;
  const [activeTab, setActiveTab] = useState("ask");
  const [letterInput, setLetterInput] = useState("");
  const [guessInput, setGuessInput] = useState("");
  const [log, setLog] = useState([]);
  const [confirmedLetters, setConfirmedLetters] = useState([]);
  const [askedLetters, setAskedLetters] = useState({});
  const [turn, setTurn] = useState(currentTurn);
  const logEndRef = useRef(null);

  const isMyTurn = turn === myId;
  const opponent = players.find((p) => p.id !== myId);

  const addLog = useCallback((entry) => setLog((prev) => [...prev, entry]), []);
  useEffect(() => { logEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [log]);

  useEffect(() => {
    const sock = getSocket();
    sock.on("letter-result", ({ askerId, askerName, letter, hasLetter, confirmedLetters: cl }) => {
      if (askerId === myId) {
        setConfirmedLetters(cl);
        setAskedLetters((prev) => ({ ...prev, [letter]: hasLetter ? "yes" : "no" }));
      }
      addLog({
        type: hasLetter ? "yes" : "no",
        icon: hasLetter ? "✓" : "✗",
        text: `${askerName} asked "${letter}" → ${hasLetter ? "YES!" : "Nope"}`,
      });
    });
    sock.on("wrong-guess", ({ guesserName, guess }) => {
      addLog({ type: "wrong", icon: "💥", text: `${guesserName} guessed "${guess.toUpperCase()}" — WRONG!` });
    });
    sock.on("turn-change", ({ currentTurn: ct }) => {
      setTurn(ct);
      addLog({ type: "info", icon: "↩", text: ct === myId ? "Your turn!" : `${opponent?.username}'s turn...` });
    });
    sock.on("game-over", (data) => onGameOver(data));
    sock.on("player-left", ({ username }) => addLog({ type: "info", icon: "👋", text: `${username} left.` }));
    return () => {
      sock.off("letter-result"); sock.off("wrong-guess"); sock.off("turn-change");
      sock.off("game-over"); sock.off("player-left");
    };
  }, [myId, opponent, addLog, onGameOver]);

  const handleAskLetter = (letter) => {
    if (!isMyTurn) return;
    const l = (letter || letterInput).toUpperCase();
    if (!l || l.length !== 1 || !/[A-Z]/.test(l)) return;
    getSocket().emit("ask-letter", { code: gameState.code, letter: l });
    setLetterInput("");
  };

  const handleGuess = () => {
    if (!isMyTurn || !guessInput.trim()) return;
    getSocket().emit("guess-word", { code: gameState.code, guess: guessInput.trim() });
    setGuessInput("");
  };

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: 16 }}>
      <div className="game-with-chat">
        <div className="game-layout">

          {/* Header */}
          <div className="turn-banner-fun">
            <div className="category-tag">
              <IconDice size={16} color="var(--pink)" />
              {category}
            </div>
            <div className={`turn-badge ${isMyTurn ? "your-turn" : "their-turn"}`}>
              {isMyTurn
                ? <><IconLightning size={18} color="currentColor" /> Your Turn!</>
                : <><span className="pulse-dot" style={{ background: "var(--muted)", width: 8, height: 8 }} /> {opponent?.username}'s Turn</>
              }
            </div>
          </div>

          {/* Word panels */}
          <div className="word-panels">
            <div className="word-card my-card">
              <div className="word-card-title">
                <IconShield size={16} color="var(--green)" />
                Your Secret Word
              </div>
              <div className="my-word-text">{myWord.toUpperCase()}</div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", color: "var(--green)", opacity: 0.6, letterSpacing: "2px" }}>
                {myWordLetterCount} LETTERS — KEEP IT SECRET!
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
                    <div key={i} className={`letter-tile ${letter ? "confirmed" : ""}`}>
                      {letter || ""}
                    </div>
                  );
                })}
              </div>
              {confirmedLetters.length > 0 && (
                <div style={{ fontFamily: "var(--font-display)", fontSize: "0.75rem", color: "var(--cyan)", letterSpacing: "2px" }}>
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
                  onClick={() => { if (isMyTurn && activeTab === "ask" && !askedLetters[l]) handleAskLetter(l); }}
                  title={askedLetters[l] === "yes" ? "✓ In the word!" : askedLetters[l] === "no" ? "✗ Not in word" : "Click to ask"}
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
            {isMyTurn && (
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
                    className={`action-tab-btn ${activeTab === "guess" ? "active-guess" : ""}`}
                    onClick={() => setActiveTab("guess")}
                  >
                    <IconTarget size={16} color="currentColor" />
                    Guess Word!
                  </button>
                </div>

                {activeTab === "ask" && (
                  <>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: "0.8rem", color: "var(--muted)", letterSpacing: "1px" }}>
                      Click a letter above, or type one:
                    </div>
                    <div className="action-input-row">
                      <input
                        className="single-key-input"
                        value={letterInput}
                        maxLength={1}
                        onChange={(e) => setLetterInput(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
                        onKeyDown={(e) => e.key === "Enter" && handleAskLetter(letterInput)}
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

                {activeTab === "guess" && (
                  <div className="action-input-row">
                    <input
                      className="guess-input"
                      value={guessInput}
                      onChange={(e) => setGuessInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleGuess()}
                      placeholder="Type the word..."
                    />
                    <button
                      className="btn-fun btn-fun-pink"
                      style={{ padding: "12px 18px", whiteSpace: "nowrap" }}
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
          </div>

          {/* Log */}
          <div className="game-log">
            {log.length === 0 && (
              <div className="log-row info">
                <span>{isMyTurn ? "⚡" : "⏳"}</span>
                {isMyTurn ? "It's your turn — ask a letter or guess!" : `${opponent?.username} goes first!`}
              </div>
            )}
            {log.map((entry, i) => (
              <div key={i} className={`log-row ${entry.type}`}>
                <span>{entry.icon}</span>
                {entry.text}
              </div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>

        {/* Chat */}
        <ChatPanel messages={chatMessages} onSend={onChat} myId={myId} height={580} />
      </div>
    </div>
  );
}

// ─── Game Over ────────────────────────────────────────────────────────────────
function GameOverScreen({ result, myId, onRematch, chatMessages, onChat }) {
  const isWinner = result.winnerId === myId;

  return (
    <div className="screen" style={{ justifyContent: "flex-start", paddingTop: 36 }}>
      <div className="gameover-layout">
        <div className={`gameover-card ${isWinner ? "win-card" : "lose-card"}`}>

          <div className="gameover-icon">
            {isWinner
              ? <IconTrophy size={80} color="#FFE135" />
              : <IconSkull size={80} color="#FF4444" />
            }
          </div>

          <div className={`gameover-title-fun ${isWinner ? "win-title" : "lose-title"}`}>
            {isWinner ? "YOU WIN!" : "YOU LOSE"}
          </div>

          <div style={{ fontFamily: "var(--font-display)", color: "var(--muted)", fontSize: "1rem", letterSpacing: "1px" }}>
            {isWinner
              ? `🎉 You cracked the code!`
              : `${result.winnerName} got it first!`
            }
          </div>

          <div className="reveal-words">
            <div className="reveal-box">
              <div className="reveal-label">Opponent's Word</div>
              <div className="reveal-word opp-word">{result.correctWord?.toUpperCase()}</div>
            </div>
            <div className="reveal-box">
              <div className="reveal-label">Your Word</div>
              <div className="reveal-word my-word">{result.loserWord?.toUpperCase()}</div>
            </div>
          </div>

          <div className="gameover-btns">
            <button className="btn-fun btn-fun-yellow" onClick={onRematch}>
              <div className="btn-icon-row">
                <IconDice size={20} color="currentColor" />
                Rematch!
              </div>
            </button>
            <button className="btn-fun btn-fun-ghost" onClick={() => window.location.reload()}>
              <div className="btn-icon-row">
                <IconX size={18} color="currentColor" />
                Leave
              </div>
            </button>
          </div>
        </div>

        <ChatPanel messages={chatMessages} onSend={onChat} myId={myId} height={520} />
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
  const [chatMessages, setChatMessages] = useState([]);

  const myId = getSocket().id;

  const addSystemChat = useCallback((text) => {
    setChatMessages((prev) => [...prev, { id: Date.now() + Math.random(), system: true, text, timestamp: Date.now() }]);
  }, []);

  const handleChat = useCallback((text) => {
    getSocket().emit("chat-message", { code: roomCode, text });
  }, [roomCode]);

  useEffect(() => {
    const sock = getSocket();
    sock.on("player-joined", ({ players: pl }) => setPlayers(pl));
    sock.on("ready-update", ({ players: pl }) => setPlayers(pl));
    sock.on("chat-history", ({ messages }) => setChatMessages(messages));
    sock.on("chat-message", (msg) => setChatMessages((prev) => [...prev, msg]));
    sock.on("game-start", (data) => {
      setGameState((prev) => ({ ...data, code: roomCode || prev?.code }));
      setScreen("game");
      addSystemChat("🎮 Game started! Good luck!");
    });
    sock.on("rematch-lobby", ({ players: pl }) => {
      setPlayers(pl);
      setGameState(null);
      setGameOverResult(null);
      setScreen("waiting");
      addSystemChat("🔁 Rematch! Press Ready when you're set.");
    });
    sock.on("player-left", ({ username }) => {
      addSystemChat(`${username} left the room.`);
      if (screen === "waiting") setPlayers((prev) => prev.filter((p) => p.username !== username));
    });
    return () => {
      sock.off("player-joined"); sock.off("ready-update");
      sock.off("chat-history"); sock.off("chat-message");
      sock.off("game-start"); sock.off("rematch-lobby"); sock.off("player-left");
    };
  }, [roomCode, screen, addSystemChat]);

  useEffect(() => {
    if (gameState && roomCode && gameState.code !== roomCode)
      setGameState((prev) => ({ ...prev, code: roomCode }));
  }, [roomCode, gameState]);

  const handleRoomCreated = (code, username) => {
    setRoomCode(code);
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
    addSystemChat(`🏆 ${result.winnerName} wins the round!`);
  };

  const handleRematch = () => getSocket().emit("rematch", { code: roomCode });

  const handleGameStart = (data) => {
    setGameState((prev) => ({ ...data, code: roomCode || prev?.code }));
    setScreen("game");
  };

  if (screen === "lobby") return <LobbyScreen onCreated={handleRoomCreated} onJoined={handleRoomJoined} />;
  if (screen === "waiting") return <WaitingScreen code={roomCode} players={players} myId={myId} chatMessages={chatMessages} onChat={handleChat} onGameStart={handleGameStart} />;
  if (screen === "game" && gameState) return <GameScreen gameState={{ ...gameState, code: roomCode }} myId={myId} onGameOver={handleGameOver} chatMessages={chatMessages} onChat={handleChat} />;
  if (screen === "gameover" && gameOverResult) return <GameOverScreen result={gameOverResult} myId={myId} onRematch={handleRematch} chatMessages={chatMessages} onChat={handleChat} />;
  return null;
}
