import { useEffect, useMemo, useState } from "react";

function remainingSeconds(turnEndsAt) {
  if (!turnEndsAt) return 0;
  return Math.max(0, Math.ceil((new Date(turnEndsAt).getTime() - Date.now()) / 1000));
}

function lives(lifeCount) {
  return Array.from({ length: 3 }, (_, index) => (index < lifeCount ? "♥" : "♡")).join("");
}

function chainWord(word, nextRequiredPrefix) {
  if (!nextRequiredPrefix || !word.endsWith(nextRequiredPrefix)) return word.toUpperCase();
  const start = word.slice(0, -nextRequiredPrefix.length).toUpperCase();
  return (
    <>
      {start}
      <mark>{nextRequiredPrefix.toUpperCase()}</mark>
    </>
  );
}

export default function WordChainMode({ socket, onExit }) {
  const [view, setView] = useState("home");
  const [setup, setSetup] = useState("local");
  const [username, setUsername] = useState("");
  const [playerTwoName, setPlayerTwoName] = useState("Player 2");
  const [roomCode, setRoomCode] = useState("");
  const [game, setGame] = useState(null);
  const [word, setWord] = useState("");
  const [notice, setNotice] = useState("");
  const [lastScorerId, setLastScorerId] = useState(null);
  const [socketId, setSocketId] = useState(socket.id || "");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const onConnect = () => setSocketId(socket.id);
    const onState = (nextState) => {
      setGame(nextState);
      setWord("");
      if (nextState.status === "waiting") setView("waiting");
      else setView("game");
    };
    socket.on("connect", onConnect);
    socket.on("word-chain-state", onState);
    return () => {
      socket.off("connect", onConnect);
      socket.off("word-chain-state", onState);
    };
  }, [socket]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(interval);
  }, []);

  const isLocal = game?.mode === "local";
  const isMyTurn = Boolean(game && (isLocal || game.currentPlayerId === socketId));
  const currentPlayer = game?.players.find((player) => player.id === game.currentPlayerId);
  const secondsLeft = remainingSeconds(game?.turnEndsAt, now);

  const send = (event, payload, onSuccess) => {
    setNotice("");
    socket.emit(event, payload, (result) => {
      if (result?.state) setGame(result.state);
      if (result?.message) setNotice(result.message);
      if (result?.success && result?.word && result?.state) {
        setLastScorerId(result.state.words.at(-1)?.playerId || null);
        window.setTimeout(() => setLastScorerId(null), 480);
      }
      if (result?.success && onSuccess) onSuccess(result);
    });
  };

  const startGame = (mode) => {
    if (!username.trim()) {
      setNotice("Enter Player 1's name first.");
      return;
    }
    send(
      "create-word-chain-game",
      { username: username.trim(), playerTwoName: playerTwoName.trim(), mode },
      (result) => {
        setGame(result.state);
        setView(result.state.status === "waiting" ? "waiting" : "game");
      },
    );
  };

  const joinGame = () => {
    if (!username.trim() || !roomCode.trim()) {
      setNotice("Enter your name and a room code.");
      return;
    }
    send(
      "join-word-chain-game",
      { username: username.trim(), roomCode: roomCode.trim().toUpperCase() },
      (result) => {
        setGame(result.state);
        setView("game");
      },
    );
  };

  const submitWord = (event) => {
    event.preventDefault();
    if (!word.trim() || !game) return;
    send("submit-word-chain-word", { gameId: game.gameId, word: word.trim() }, () => setWord(""));
  };

  const usedWords = useMemo(() => game?.words || [], [game]);

  if (view === "home") {
    return (
      <main className="word-chain-screen">
        <section className="word-chain-landing">
          <button className="chain-back" onClick={onExit}>← All game modes</button>
          <div className="chain-kicker">COMPETITIVE WORD PLAY</div>
          <h1>WORD <span>CHAIN</span></h1>
          <p className="chain-intro">Build a real-word chain. The server picks the next one- or two-letter prefix—your only job is to keep it alive.</p>
          <div className="chain-setup-card">
            <label>Player 1
              <input value={username} onChange={(event) => setUsername(event.target.value)} maxLength={24} placeholder="Your name" autoComplete="nickname" />
            </label>
            <div className="chain-mode-tabs">
              <button className={setup === "local" ? "selected" : ""} onClick={() => setSetup("local")}>Local 1v1</button>
              <button className={setup === "private" ? "selected" : ""} onClick={() => setSetup("private")}>Private room</button>
              <button className={setup === "join" ? "selected" : ""} onClick={() => setSetup("join")}>Join room</button>
            </div>
            {setup === "local" && (
              <label>Player 2
                <input value={playerTwoName} onChange={(event) => setPlayerTwoName(event.target.value)} maxLength={24} placeholder="Player 2" />
              </label>
            )}
            {setup === "join" && (
              <label>Room code
                <input value={roomCode} onChange={(event) => setRoomCode(event.target.value.toUpperCase())} maxLength={6} placeholder="X7KM2P" className="chain-code-input" />
              </label>
            )}
            <button className="chain-primary" onClick={() => setup === "join" ? joinGame() : startGame(setup === "local" ? "local" : "online")}>
              {setup === "local" ? "Start local game" : setup === "private" ? "Create private room" : "Join private room"}
            </button>
            {notice && <p className="chain-notice error">{notice}</p>}
          </div>
          <div className="chain-rules-preview"><span>✓ Local SCOWL dictionary</span><span>✓ 10-second server timer</span><span>✓ No repeats</span></div>
        </section>
      </main>
    );
  }

  if (view === "waiting" && game) {
    return (
      <main className="word-chain-screen">
        <section className="chain-waiting-card">
          <div className="chain-kicker">PRIVATE WORD CHAIN ROOM</div>
          <h1>Invite your <span>opponent</span></h1>
          <p>Share this code. The match begins as soon as they join.</p>
          <div className="chain-room-code">{game.roomCode}</div>
          <div className="chain-waiting-player">{game.players[0]?.name} is ready</div>
          <button className="chain-secondary" onClick={onExit}>Leave room</button>
          {notice && <p className="chain-notice">{notice}</p>}
        </section>
      </main>
    );
  }

  if (!game) return null;

  if (game.status === "ended") {
    const ranking = [...game.players].sort((first, second) => second.score - first.score);
    return (
      <main className="word-chain-screen">
        <section className="chain-result-card">
          <div className="chain-kicker">CHAIN COMPLETE</div>
          <h1>{ranking[0]?.name} <span>wins</span></h1>
          <p>{game.lastWord ? `The chain ended after ${game.lastWord.toUpperCase()}.` : "Only one player remained."}</p>
          <div className="chain-results">
            {ranking.map((player, index) => <div className="chain-result-row" key={player.id}><span>#{index + 1} {player.name}</span><strong>{player.score}</strong></div>)}
          </div>
          <button className="chain-primary" onClick={() => { setGame(null); setView("home"); setNotice(""); }}>Play again</button>
          <button className="chain-secondary" onClick={onExit}>All game modes</button>
        </section>
      </main>
    );
  }

  return (
    <main className="word-chain-screen">
      <section className="word-chain-board">
        <header className="chain-game-header">
          <button className="chain-back" onClick={onExit}>← Exit</button>
          <div><div className="chain-kicker">WORD CHAIN</div><div className="chain-room-mini">{game.mode === "online" ? `ROOM ${game.roomCode}` : "LOCAL 1V1"}</div></div>
          <div className={`chain-clock ${secondsLeft <= 3 ? "urgent" : ""}`}>{secondsLeft}</div>
        </header>

        <div className="chain-scoreboard">
          {game.players.map((player) => (
            <article key={player.id} className={`chain-player-card ${player.id === game.currentPlayerId ? "active" : ""} ${player.id === lastScorerId ? "score-pop" : ""} ${player.eliminated ? "eliminated" : ""}`}>
              <span className="chain-turn-dot" />
              <div className="chain-player-name">{player.name}</div>
              <strong>{player.score}<small> pts</small></strong>
              <div className="chain-lives">{lives(player.lives)}</div>
            </article>
          ))}
        </div>

        {game.status === "choosing-start" ? (
          <section className="chain-start-letters">
            <div className="chain-kicker">{isMyTurn ? "YOUR OPENING TURN" : `${currentPlayer?.name}'S OPENING TURN`}</div>
            <h2>Choose a starting letter</h2>
            <p>Each letter has plenty of real, unused dictionary words available.</p>
            <div className="chain-letter-options">
              {game.startingLetters.map((letter) => <button key={letter} disabled={!isMyTurn} onClick={() => send("select-word-chain-letter", { gameId: game.gameId, letter })}>{letter.toUpperCase()}</button>)}
            </div>
            {notice && <p className="chain-notice">{notice}</p>}
          </section>
        ) : (
          <div className="chain-main-grid">
            <section className="chain-play-area">
              <div className="chain-last-word-label">Previous word</div>
              <div className="chain-last-word">{game.lastWord?.toUpperCase() || "—"}</div>
              <div className="chain-prefix-label">Required prefix</div>
              <div className="chain-prefix">{game.requiredPrefix?.toUpperCase()}</div>
              <p className="chain-turn-copy">{isMyTurn ? "Your turn — find a real word before time runs out." : `${currentPlayer?.name} is thinking…`}</p>
              <form className="chain-word-form" onSubmit={submitWord}>
                <input disabled={!isMyTurn} value={word} onChange={(event) => setWord(event.target.value)} maxLength={32} placeholder={`Enter a word starting with ${game.requiredPrefix?.toUpperCase()}…`} autoCapitalize="none" autoComplete="off" />
                <button disabled={!isMyTurn || !word.trim()} type="submit">Play word</button>
              </form>
              {isMyTurn && <button className="chain-give-up" onClick={() => send("give-up-word-chain-turn", { gameId: game.gameId })}>Give up this turn</button>}
              {notice && <p className={`chain-notice ${notice.includes("Accepted") ? "success" : "error"}`}>{notice}</p>}
              {game.invalidAttempts > 0 && <p className="chain-attempts">Invalid attempts this turn: {game.invalidAttempts} / {game.maxInvalidAttempts}</p>}
            </section>
            <aside className="chain-history">
              <h3>Word chain</h3>
              {usedWords.length === 0 ? <p className="chain-history-empty">The first word will start the chain.</p> : usedWords.map((entry, index) => {
                const nextPrefix = usedWords[index + 1]?.requiredPrefix;
                return <div className="chain-history-word" key={entry.id}><span>{entry.playerId === game.players[0].id ? "P1" : "P2"}</span><strong>{chainWord(entry.word, nextPrefix)}</strong>{nextPrefix && <em>→ {nextPrefix.toUpperCase()}</em>}</div>;
              })}
            </aside>
          </div>
        )}
      </section>
    </main>
  );
}
