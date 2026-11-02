import { useEffect, useLayoutEffect, useRef, useState } from "react";
import useFinishWord from "../hooks/useFinishWord.js";
import "./FinishWord.css";

export const FINISH_WORD_CHARACTERS = Object.freeze([
  { id: "knight", name: "Knight", color: "#b4c8ee", accent: "#f3be6e", detail: "A word is your weapon." },
  { id: "wizard", name: "Wizard", color: "#ba9af8", accent: "#f2c77c", detail: "Cast the next word." },
  { id: "ninja", name: "Ninja", color: "#8a9bbd", accent: "#ff7e9e", detail: "Quick mind. Quiet moves." },
  { id: "robot", name: "Robot", color: "#70d6e6", accent: "#f2c77c", detail: "Built to outspell." },
  { id: "alien", name: "Alien", color: "#9fe89f", accent: "#ba9af8", detail: "Vocabulary from beyond." },
  { id: "pirate", name: "Pirate", color: "#f2b98f", accent: "#ef7886", detail: "Claim the final letter." },
  { id: "astronaut", name: "Astronaut", color: "#e4eaf7", accent: "#84dcef", detail: "One giant word ahead." },
  { id: "dino", name: "Dino", color: "#9bd6a1", accent: "#f2ca86", detail: "Small arms. Big words." },
]);

const characterFor = (id) => FINISH_WORD_CHARACTERS.find((character) => character.id === id) || FINISH_WORD_CHARACTERS[0];
const playerName = (player) => player?.username || player?.name || "Player";

export function FinishWordCharacter({ characterId, className = "", decorative = false }) {
  const character = characterFor(characterId);
  const id = character.id;
  const common = { stroke: "#172138", strokeWidth: 3, strokeLinejoin: "round", strokeLinecap: "round" };
  return <svg className={`finish-word-character ${className}`} viewBox="0 0 120 150" role={decorative ? undefined : "img"} aria-hidden={decorative || undefined} aria-label={decorative ? undefined : character.name}>
    <ellipse cx="60" cy="140" rx="40" ry="7" fill="#071020" opacity=".35" />
    <g {...common}>
      <path d="M39 109 L36 134 Q44 141 54 135 L57 113 M65 111 L67 135 Q77 141 85 134 L81 108" fill={id === "astronaut" ? "#c3cee5" : "#344663"} />
      <path d="M36 76 Q20 78 22 108 Q28 113 34 105 L39 93 M84 76 Q100 78 98 108 Q92 113 86 105 L81 93" fill={character.color} />
      <path d="M38 73 Q59 65 82 74 L86 113 Q60 125 34 113 Z" fill={character.color} />
      {id === "knight" && <>
        <path d="M34 74 L43 65 L78 65 L89 75 L78 86 L60 80 L43 86 Z" fill="#d9e3f8" />
        <path d="M60 82 L60 115 M42 96 L78 96" fill="none" stroke="#6e86b1" />
        <path d="M35 64 L35 35 Q60 11 85 35 L85 64 L60 75 Z" fill="#d9e3f8" />
        <path d="M37 43 L83 43 L80 58 L40 58 Z" fill="#344663" />
        <path d="M49 45 L49 57 M60 45 L60 57 M71 45 L71 57" stroke="#d9e3f8" />
        <path d="M59 25 Q48 6 69 5 Q82 6 87 21 Q73 14 63 28" fill={character.accent} />
      </>}
      {id === "wizard" && <>
        <path d="M37 79 L23 120 L96 120 L82 78" fill="#8d6bd0" />
        <circle cx="60" cy="51" r="27" fill="#f0c7af" />
        <path d="M41 62 Q60 77 80 61 L69 89 L60 77 L52 89 Z" fill="#ebedf8" />
        <path d="M28 38 L91 38 L78 28 L68 2 L49 26 Z" fill="#9a79e6" />
        <path d="M64 13 L66 19 L72 20 L67 24 L68 30 L62 27 L57 30 L58 24 L53 20 L60 19 Z" fill={character.accent} strokeWidth="1.6" />
        <circle cx="50" cy="51" r="2" fill="#172138" /><circle cx="70" cy="51" r="2" fill="#172138" />
        <path d="M17 115 L24 50" stroke={character.accent} strokeWidth="5" /><path d="M23 53 L16 41 L27 31 L36 44 Z" fill="#b4ebf6" />
      </>}
      {id === "ninja" && <>
        <path d="M39 76 L83 111 M83 76 L39 111" stroke="#50617e" strokeWidth="8" />
        <circle cx="60" cy="47" r="29" fill="#344663" />
        <path d="M34 40 Q61 32 86 40 L84 54 Q60 63 36 54 Z" fill="#f2cbb4" />
        <path d="M34 35 L86 35 L86 43 L34 43 Z M85 37 L106 32 L101 45 L86 44" fill={character.accent} />
        <path d="M46 47 L52 49 M74 47 L68 49" strokeWidth="4" />
        <path d="M35 101 L85 101 L85 109 L35 109 Z" fill={character.accent} />
      </>}
      {id === "robot" && <>
        <rect x="31" y="24" width="58" height="48" rx="12" fill="#a8e8ef" />
        <path d="M31 38 L22 38 L22 57 L31 57 M89 38 L98 38 L98 57 L89 57" fill="#6da3b9" />
        <path d="M60 23 L60 13" /><circle cx="60" cy="9" r="5" fill={character.accent} />
        <rect x="40" y="35" width="40" height="23" rx="6" fill="#253e58" />
        <circle cx="49" cy="46" r="3" fill="#9df7cd" stroke="none" /><circle cx="71" cy="46" r="3" fill="#9df7cd" stroke="none" />
        <path d="M51 63 L69 63" fill="none" strokeWidth="2" />
        <rect x="45" y="84" width="30" height="21" rx="4" fill="#d8f0f3" /><circle cx="53" cy="94" r="3" fill={character.accent} /><path d="M64 90 L69 90 M64 97 L69 97" strokeWidth="2" />
      </>}
      {id === "alien" && <>
        <path d="M34 34 Q60 5 86 34 Q93 57 60 78 Q27 57 34 34" fill={character.color} />
        <ellipse cx="46" cy="44" rx="8" ry="12" transform="rotate(-25 46 44)" fill="#26374b" />
        <ellipse cx="74" cy="44" rx="8" ry="12" transform="rotate(25 74 44)" fill="#26374b" />
        <circle cx="44" cy="41" r="2" fill="#fff" stroke="none" /><circle cx="72" cy="41" r="2" fill="#fff" stroke="none" />
        <path d="M55 62 Q60 66 65 62" fill="none" strokeWidth="2" />
        <path d="M35 80 L85 80 L80 111 Q60 124 40 111 Z" fill={character.accent} /><circle cx="60" cy="96" r="8" fill="#c5f9c7" />
      </>}
      {id === "pirate" && <>
        <circle cx="60" cy="49" r="27" fill={character.color} />
        <path d="M33 31 L22 23 L43 21 Q60 4 77 21 L98 23 L87 36 Z" fill="#344663" />
        <path d="M40 38 L82 38" stroke={character.accent} strokeWidth="7" />
        <path d="M45 80 L49 113 L74 113 L77 80" fill="#f7e1bb" /><path d="M49 89 L76 89 M49 101 L74 101" stroke={character.accent} strokeWidth="6" />
        <path d="M48 27 L72 27" stroke="#e8e9ef" strokeWidth="3" /><circle cx="60" cy="21" r="5" fill="#e8e9ef" />
        <circle cx="49" cy="49" r="2" fill="#172138" /><path d="M68 45 L81 42 L80 55 Q72 61 68 52 Z" fill="#253148" /><path d="M68 45 L41 33" fill="none" strokeWidth="2" />
        <path d="M49 63 Q60 70 70 61" fill="none" /><circle cx="85" cy="60" r="5" fill="none" stroke={character.accent} />
      </>}
      {id === "astronaut" && <>
        <path d="M33 82 L26 78 L24 107 L34 113 M86 82 L94 78 L96 107 L86 113" fill="#8b9fbf" />
        <circle cx="60" cy="45" r="33" fill={character.color} />
        <path d="M34 33 Q60 17 86 33 L84 57 Q61 76 36 57 Z" fill="#486b91" />
        <path d="M42 35 Q54 27 66 31" fill="none" stroke="#b9e9f8" strokeWidth="5" />
        <rect x="43" y="86" width="34" height="23" rx="4" fill="#93b5d7" /><path d="M48 94 L64 94 M48 101 L57 101" stroke="#e5f2ff" strokeWidth="2" /><circle cx="69" cy="101" r="3" fill="#ed889f" stroke="none" />
        <path d="M36 119 L50 119 M70 119 L84 119" stroke={character.accent} strokeWidth="8" />
      </>}
      {id === "dino" && <>
        <path d="M82 96 Q109 106 110 82 Q119 113 84 118" fill="#72b47c" />
        <path d="M41 28 L48 18 L57 26 L66 17 L75 28 L84 24 L86 40" fill={character.accent} />
        <path d="M32 43 Q31 23 59 24 Q85 23 88 48 L100 51 L99 69 Q72 81 47 71 L36 62 Z" fill={character.color} />
        <circle cx="52" cy="42" r="3" fill="#172138" /><circle cx="80" cy="43" r="3" fill="#172138" />
        <path d="M79 62 L96 62" strokeWidth="2" /><circle cx="91" cy="54" r="2" fill="#172138" stroke="none" />
        <path d="M48 82 Q60 75 73 83 L78 111 Q60 119 43 109 Z" fill="#e0e7ad" />
        <path d="M34 83 L45 90 M85 83 L75 90" strokeWidth="8" stroke={character.color} />
      </>}
    </g>
  </svg>;
}

export function FinishWordHearts({ lives = 3, className = "" }) {
  return <span className={`finish-word-hearts ${className}`} role="img" aria-label={`${lives} ${lives === 1 ? "life" : "lives"} remaining`}>
    {[0, 1, 2].map((index) => <svg key={index} viewBox="0 0 24 22" aria-hidden="true" className={index < lives ? "filled" : "empty"}><path d="M12 20 3 11C-3 4 6-3 12 4c6-7 15 0 9 7Z" /></svg>)}
  </span>;
}

export function FinishWordLobby({ code, players, myId, creatorId, maxPlayers = 8, socket, connected, onFeedback }) {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const activeRequest = useRef(false);
  const isHost = creatorId === myId;
  const me = players.find((player) => player.id === myId);
  const canStart = connected && players.length >= 2 && players.every((player) => player.characterId && player.connected !== false);

  async function act(event, data, key) {
    if (!connected || activeRequest.current) return;
    activeRequest.current = true; setPending(key); setError("");
    try {
      const response = await socket.timeout(5000).emitWithAck(event, { code, ...data });
      if (!response?.success) throw new Error(response?.message || "Could not complete that action.");
      if (event === "select_character") onFeedback(`You chose ${characterFor(data.characterId).name}.`, "success");
    } catch (failure) {
      const message = failure?.message?.includes("timed out") ? "No confirmation received. Please try again." : failure.message;
      setError(message); onFeedback(message, "error");
    } finally { activeRequest.current = false; setPending(null); }
  }

  async function copyCode() {
    try { await navigator.clipboard.writeText(code); onFeedback("Room code copied. Invite your friends!", "success"); }
    catch { onFeedback(`Your room code is ${code}.`, "info"); }
  }

  return <div className="screen finish-word-lobby">
    <div className="finish-word-lobby-heading"><div><span className="eyebrow">FINISH THE WORD · THE CAST</span><h1>Pick your <span>word warrior.</span></h1><p>Eight characters. One of each. Choose yours before someone else does.</p></div><button type="button" className="finish-word-room-code" onClick={copyCode} aria-label={`Copy room code ${code}`}><small>INVITE CODE</small><strong>{code}</strong><span>Tap to copy ↗</span></button></div>
    <div className="finish-word-lobby-layout">
      <section className="finish-word-roster-panel" aria-label="Choose your character">
        <div className="finish-word-panel-title"><h2>Choose your character</h2><span>{me?.characterId ? "Your character is reserved" : "Make it yours"}</span></div>
        <div className="finish-word-character-grid">
          {FINISH_WORD_CHARACTERS.map((character) => {
            const owner = players.find((player) => player.characterId === character.id);
            const selected = owner?.id === myId;
            const locked = Boolean(owner && !selected);
            return <button key={character.id} type="button" data-testid={`character-${character.id}`} className={`finish-word-character-option ${selected ? "selected" : ""} ${locked ? "locked" : ""}`} style={{ "--character-color": character.color }} aria-label={locked ? `${character.name}, taken by ${playerName(owner)}` : selected ? `${character.name}, your selected character` : `Choose ${character.name}`} aria-pressed={selected} disabled={locked || !connected || pending !== null} onClick={() => act("select_character", { characterId: character.id }, character.id)}>
              <span className="finish-word-character-lock" aria-hidden="true">{selected ? "✓ YOURS" : locked ? "LOCKED" : "AVAILABLE"}</span>
              <FinishWordCharacter characterId={character.id} decorative />
              <strong>{character.name}</strong><span className="finish-word-character-owner">{owner ? selected ? "Your character" : playerName(owner) : character.detail}</span>
            </button>;
          })}
        </div>
        {error && <p className="finish-word-error" role="alert">{error}</p>}
      </section>
      <aside className="finish-word-lobby-sidebar">
        <section className="finish-word-party-panel"><div className="finish-word-panel-title"><h2>The lineup</h2><span>{players.length} / {maxPlayers}</span></div><ul className="finish-word-party-list" aria-label="Room players">{players.map((player) => <li key={player.id}>
          <span className="finish-word-party-avatar">{player.characterId ? <FinishWordCharacter characterId={player.characterId} decorative /> : <span aria-hidden="true">?</span>}</span>
          <div><strong>{playerName(player)}{player.id === myId && <small>YOU</small>}</strong><span>{player.connected === false ? "Reconnecting" : player.characterId ? characterFor(player.characterId).name : "Choosing a character…"}</span></div>
          {player.id === creatorId && <span className="finish-word-host-tag">HOST</span>}
        </li>)}</ul></section>
        <section className="finish-word-briefing"><span className="eyebrow">THE RULES ARE SIMPLE</span><h2>Keep the word alive.</h2><div><strong>10s</strong><p>to find a valid word on your turn</p></div><div><FinishWordHearts lives={3} /><p>Wrong word or timeout costs one life.</p></div><p>Start with the last letter. After 10 accepted words, match the last <strong>two</strong>. Every word can be used once.</p><p>Last player standing wins.</p></section>
        {isHost ? <button type="button" className="btn-fun btn-fun-yellow finish-word-start" disabled={!canStart || pending !== null} onClick={() => act("start_game", {}, "start")}>{pending === "start" ? "Starting…" : "Start Finish the Word"}<span aria-hidden="true">→</span></button> : <p className="finish-word-lobby-wait" role="status">{me?.characterId ? "Your character is locked in. Waiting for the host to start." : "Choose a character to join the game."}</p>}
        {isHost && !canStart && <p className="finish-word-lobby-wait">{players.length < 2 ? "Invite at least one other player to start." : "Everyone must choose a character and be connected."}</p>}
      </aside>
    </div>
  </div>;
}

function FinishWordStage({ gameState, myId, localWord }) {
  const viewport = useRef(null);
  const [geometry, setGeometry] = useState({ width: 700, scale: 1 });
  const players = gameState.players;
  const actorStep = 190;
  const worldWidth = Math.max(720, players.length * actorStep + 180);
  const activeIndex = Math.max(0, players.findIndex((player) => player.id === gameState.currentPlayerId));
  const activeX = 180 + activeIndex * actorStep;
  const { width, scale } = geometry;
  const cameraX = width / 2 - activeX * scale;
  useLayoutEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const update = () => {
      const bounds = element.getBoundingClientRect();
      const actor = element.querySelector(".finish-word-actor.active");
      const actorBottom = actor ? parseFloat(getComputedStyle(actor).bottom) || 0 : 35;
      // Reserve room for the nametag and a multi-line live word as well as the
      // character. A short landscape/keyboard viewport must not crop the text.
      const neededHeight = (actor?.offsetHeight || 210) + actorBottom + 90;
      const nextScale = Math.min(bounds.width < 420 ? 0.86 : 1, Math.max(.15, (bounds.height - 20) / neededHeight));
      setGeometry((previous) => previous.width === bounds.width && previous.scale === nextScale ? previous : { width: bounds.width, scale: nextScale });
    };
    update();
    const observer = new ResizeObserver(update); observer.observe(element);
    return () => observer.disconnect();
  }, [activeIndex, players.length]);

  return <section className="finish-word-stage-block" aria-label="Character arena">
    <div className="finish-word-stage-viewport" ref={viewport} data-testid="finish-word-stage">
      <div className="finish-word-stage-sky" aria-hidden="true"><span>A</span><span>Z</span><span>W</span><span>E</span></div>
      <span className="finish-word-stage-caption">{gameState.pausedAt ? "GAME PAUSED" : gameState.currentPlayerId === myId ? "THE WORD IS YOURS" : "LIVE WORD ARENA"}</span>
      <div className="finish-word-stage-camera" data-testid="finish-word-camera" data-active-player={gameState.currentPlayerId} style={{ width: worldWidth, transform: `translate3d(${cameraX}px, 0, 0) scale(${scale})` }}>
        <div className="finish-word-stage-floor" style={{ width: worldWidth + 400 }} aria-hidden="true" />
        {players.map((player, index) => {
          const active = gameState.currentPlayerId === player.id && gameState.status === "PLAYING";
          const text = player.id === myId ? localWord : gameState.typingText;
          return <article key={player.id} className={`finish-word-actor ${active ? "active" : ""} ${player.isAlive === false ? "eliminated" : ""}`} style={{ left: 180 + index * actorStep, "--character-color": characterFor(player.characterId).color }} aria-label={`${playerName(player)}, ${player.isAlive === false ? "eliminated" : `${player.lives} lives`}${active ? ", current turn" : ""}`}>
            {active && <div className={`finish-word-speech ${text ? "has-word" : ""}`} data-testid="live-word-bubble" aria-label={`Live typing from ${playerName(player)}`}><span>{text || "Thinking…"}</span>{!text && <i aria-hidden="true">•••</i>}</div>}
            <div className="finish-word-nametag"><strong>{playerName(player)}{player.id === myId && <small>YOU</small>}</strong><FinishWordHearts lives={player.lives} /></div>
            <FinishWordCharacter characterId={player.characterId} decorative />
            <span className="finish-word-actor-podium" aria-hidden="true" />
            {active && <span className="finish-word-active-arrow" aria-hidden="true">▼</span>}
          </article>;
        })}
      </div>
    </div>
    <ul className="finish-word-player-strip" aria-label="Player lives">{players.map((player) => <li key={player.id} className={`${player.id === gameState.currentPlayerId ? "active" : ""} ${player.isAlive === false ? "eliminated" : ""}`}><span>{playerName(player)}{player.id === myId ? " (you)" : ""}</span><FinishWordHearts lives={player.lives} /></li>)}</ul>
  </section>;
}

function FinishWordResults({ gameState, myId, connected, onRematch }) {
  const winner = gameState.players.find((player) => player.id === gameState.winnerId);
  const won = winner?.id === myId;
  return <div className="screen finish-word-results">
    <span className="eyebrow">FINISH THE WORD · FINAL WORD</span><h1>{won ? "You had the " : "The last "}<span>{won ? "last word." : "word warrior."}</span></h1>
    <section className="finish-word-winner"><span className="finish-word-winner-crown" aria-hidden="true">♛</span><FinishWordCharacter characterId={winner?.characterId} /><h2>{winner ? playerName(winner) : gameState.winnerName || "Match ended"}{won ? " (you)" : ""}</h2><p>{winner ? "Last player standing" : "There are no active players remaining."}</p><FinishWordHearts lives={winner?.lives || 0} /></section>
    <p className="finish-word-final-chain">{gameState.usedWords?.length || 0} unique words · {gameState.hardMode ? "Two-letter mode reached" : "One-letter chain"}</p>
    <ul className="finish-word-final-players" aria-label="Final player lives">{[...gameState.players].sort((first, second) => (second.lives || 0) - (first.lives || 0)).map((player) => <li key={player.id}><span>{playerName(player)}{player.id === myId ? " (you)" : ""}</span><FinishWordHearts lives={player.lives} /></li>)}</ul>
    <button type="button" className="btn-fun btn-fun-yellow" disabled={!connected} onClick={onRematch}>Back to character lobby <span aria-hidden="true">↗</span></button>
  </div>;
}

export function FinishWordGameView({ gameState, myId, socket, connected, onFeedback, onRematch }) {
  const controller = useFinishWord({ gameState, socket, myId, connected, onFeedback });
  const { word, changeWord, submit, inputRef, pending, error, remaining, canPlay, isMyTurn, me, activePlayer } = controller;
  const total = gameState.turnDuration || 10;
  const progress = Math.min(100, Math.max(0, remaining / total * 100));
  const prefix = gameState.requiredPrefix || "?";
  const status = !connected ? "Reconnecting to the arena…" : gameState.pausedAt ? "Game paused while a player reconnects." : me?.isAlive === false ? "You're out. Watch the remaining word warriors." : isMyTurn ? "Your turn. Keep the chain alive." : `${playerName(activePlayer)} is finding a word.`;
  const history = (gameState.history || []).filter((entry) => entry.word && entry.accepted !== false).slice(-5);

  if (gameState.status === "ENDED") return <FinishWordResults gameState={gameState} myId={myId} connected={connected} onRematch={onRematch} />;

  return <div className={`screen finish-word-game ${isMyTurn ? "your-turn" : ""}`}>
    <header className="finish-word-game-heading"><div><span className="eyebrow">FINISH THE WORD</span><h1>{isMyTurn ? "Your move, " : "Keep the "}<span>{isMyTurn ? "word warrior." : "chain alive."}</span></h1></div><span className={`finish-word-difficulty ${gameState.hardMode ? "hard" : ""}`}>{gameState.hardMode ? "TWO LETTERS · HARD MODE" : `ONE LETTER · ${gameState.successfulTurns || 0}/${gameState.hardModeAfter || 10} TO HARD MODE`}</span></header>
    <div className="finish-word-game-layout">
      <FinishWordStage gameState={gameState} myId={myId} localWord={word} />
      <section className="finish-word-console" aria-label="Word controls">
        <div className="finish-word-turn-header"><span>{isMyTurn ? "YOUR TURN" : `${playerName(activePlayer)}'S TURN`}</span><strong className={remaining <= 3 ? "urgent" : ""} role="timer" aria-label={`${remaining} seconds remaining`}>{remaining}<small>s</small></strong></div>
        <div className="finish-word-time-track" aria-hidden="true"><span style={{ width: `${progress}%` }} /></div>
        <div className="finish-word-prefix-prompt"><span>START YOUR WORD WITH</span><strong data-testid="required-prefix">{prefix.toUpperCase().split("").map((letter, index) => <span key={index}>{letter}</span>)}</strong><p>{gameState.lastWord ? <>Last word: <b>{gameState.lastWord.toUpperCase()}</b></> : "A new chain starts here."}</p></div>
        <div className="finish-word-chain" aria-label="Recent accepted words"><span>THE CHAIN SO FAR</span>{history.length ? <ol>{history.map((entry, index) => <li key={`${entry.turnId || index}:${entry.word}`}>{entry.word}<span aria-hidden="true">→</span></li>)}</ol> : <p>Make the first move.</p>}</div>
        <form className="finish-word-entry" onSubmit={submit}>
          <label htmlFor="finish-word-input">{isMyTurn ? "Your word" : "Watch the live word above the active player"}</label>
          <div className="finish-word-input-row"><input id="finish-word-input" ref={inputRef} aria-label="Your word" value={word} onChange={(event) => changeWord(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} disabled={!canPlay || pending} placeholder={isMyTurn ? `${prefix.toUpperCase()}…` : "Waiting for your turn"} maxLength={64} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="send" /><button type="submit" disabled={!canPlay || pending || !word.trim()} aria-label="Submit word">{pending ? "…" : <span aria-hidden="true">→</span>}</button></div>
          <p className="finish-word-turn-status" role="status">{status}</p>{error && <p className="finish-word-error" role="alert">{error}</p>}
        </form>
        <p className="finish-word-input-hint">2+ letters · English words · no repeats</p>
      </section>
    </div>
  </div>;
}
