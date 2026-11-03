import { useEffect, useRef, useState } from "react";
import { ConfettiBurst } from "./Experience.jsx";
import ColorSkipVote from "./ColorSkipVote.jsx";
import ColorPodium from "./ColorPodium.jsx";
import TurnTimer from "./TurnTimer.jsx";
import { SFX } from "../audio.js";
import { hsvToHex, hexToHsv, cardInk, scoreFeedback } from "../logic/colorCard.js";
import "./ColorCard.css";

function ColorSwatch({ color, testId, label, detail, corner, progress, children, className = "" }) {
  return <div className={`color-swatch ${color ? "" : "color-missing"} ${className}`} data-testid={testId} style={{ backgroundColor: color || undefined, color: cardInk(color) }}>
    {progress && <span className="color-card-progress">{progress}</span>}
    {corner}
    <div className="color-swatch-label"><span>{label}</span>{detail && <strong>{detail}</strong>}</div>
    {children}
  </div>;
}

function HsvControls({ hsv, onChange, disabled }) {
  const controls = [
    { key: "h", name: "Hue", short: "HUE", max: 359, unit: "°", gradient: "linear-gradient(to bottom, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)" },
    { key: "s", name: "Saturation", short: "SAT", max: 100, unit: "%", gradient: `linear-gradient(to top, ${hsvToHex({ h: hsv.h, s: 0, v: hsv.v })}, ${hsvToHex({ h: hsv.h, s: 100, v: hsv.v })})` },
    { key: "v", name: "Brightness", short: "VALUE", max: 100, unit: "%", gradient: `linear-gradient(to top, #000000, ${hsvToHex({ h: hsv.h, s: hsv.s, v: 100 })})` },
  ];
  return <fieldset className="hsv-controls" disabled={disabled} aria-label="Color controls">
    <legend className="color-sr-only">Hue, saturation and brightness</legend>
    {controls.map((control) => <label className={`hsv-control hsv-${control.key}`} key={control.key}>
      <span className="hsv-rail" style={{ background: control.gradient }}>
        <input type="range" min="0" max={control.max} step="1" value={Math.round(hsv[control.key])} onChange={(event) => onChange(control.key, Number(event.target.value))} aria-label={control.name} aria-orientation="vertical" aria-valuetext={`${Math.round(hsv[control.key])}${control.unit}`} />
      </span>
      <span className="hsv-caption">{control.short}<output>{Math.round(hsv[control.key])}{control.unit}</output></span>
    </label>)}
  </fieldset>;
}

export function ColorCardGameView({ gameState, socket, myId, connected, onFeedback }) {
  const [hsv, setHsv] = useState(() => gameState.myDraft ? hexToHsv(gameState.myDraft) : { h: 0, s: 0, v: 100 });
  const [hasPicked, setHasPicked] = useState(false);
  const [pending, setPending] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(() => Date.now() + (gameState.serverClockOffset || 0));
  const hex = hsvToHex(hsv);
  const submitted = accepted || gameState.submittedPlayerIds.includes(myId);
  const memorizing = gameState.phase !== "picking" && now < gameState.memorizeEndsAt;
  const memorizeRemaining = Math.max(0, Math.ceil((gameState.memorizeEndsAt - now) / 1000));
  const remaining = Math.max(0, Math.ceil((gameState.roundEndsAt - now) / 1000));
  const locked = memorizing || submitted || pending || remaining === 0 || !connected || Boolean(gameState.pausedAt);
  const progress = `${gameState.roundNumber || 1} / ${gameState.totalRounds || 5}`;
  const lastPhase = useRef(null);
  const lastCountdown = useRef(null);
  useEffect(() => {
    if (!gameState.recoveredAt) return;
    if (gameState.myDraft) { setHsv(hexToHsv(gameState.myDraft)); setHasPicked(gameState.myDraft !== "#FFFFFF"); }
    setAccepted(gameState.submittedPlayerIds.includes(myId));
    setPending(false);
  }, [gameState.recoveredAt, myId]);

  useEffect(() => {
    const phase = memorizing ? "memorizing" : "picking";
    if (lastPhase.current === phase) return;
    lastPhase.current = phase;
    if (memorizing) SFX.colorMemorize();
    else SFX.colorMix();
  }, [memorizing]);
  useEffect(() => {
    const seconds = memorizing ? memorizeRemaining : remaining;
    const tick = `${memorizing}:${seconds}`;
    if (lastCountdown.current === tick) return;
    lastCountdown.current = tick;
    if (seconds > 0 && (memorizing ? seconds < 5 : seconds <= 10)) SFX.timerWarning(seconds);
    if (!memorizing && seconds === 0) SFX.timeout();
  }, [memorizing, memorizeRemaining, remaining]);

  useEffect(() => {
    const update = () => setNow(gameState.pausedAt ?? Date.now() + (gameState.serverClockOffset || 0));
    update();
    const interval = setInterval(update, 100);
    return () => clearInterval(interval);
  }, [gameState.serverClockOffset, gameState.pausedAt]);

  useEffect(() => {
    if (!pending) return undefined;
    const timeout = setTimeout(() => { setPending(false); setError("No confirmation received. Please try again."); SFX.timeout(); onFeedback("No confirmation received. Please try again.", "error"); }, 5000);
    return () => clearTimeout(timeout);
  }, [pending, onFeedback]);

  function submit(event) {
    event.preventDefault();
    if (locked) return;
    SFX.tap();
    setPending(true);
    setError("");
    socket.emit("SUBMIT_COLOR", { code: gameState.code, roundId: gameState.roundId, hex }, (response) => {
      setPending(false);
      if (response.success) { setAccepted(true); SFX.colorSubmit(); onFeedback("Color submitted! You can edit until time runs out or a skip vote passes.", "success"); }
      else { setError(response.message); SFX.timeout(); onFeedback(response.message, "error"); }
    });
  }

  function edit() {
    if (pending || remaining === 0 || !connected) return;
    SFX.tap();
    setPending(true);
    socket.emit("EDIT_COLOR", { code: gameState.code, roundId: gameState.roundId }, (response) => {
      setPending(false);
      if (response.success) { setAccepted(false); setError(""); SFX.colorEdit(); onFeedback("Answer unlocked. Keep mixing!", "success"); }
      else { setError(response.message); SFX.timeout(); onFeedback(response.message, "error"); }
    });
  }

  function changeChannel(channel, value) {
    if (locked) return;
    SFX.colorAdjust(channel, value);
    const next = channel === "h" && !hasPicked ? { h: value, s: 100, v: 100 } : { ...hsv, [channel]: value };
    setHsv(next);
    setHasPicked(true);
    socket.emit("UPDATE_COLOR_DRAFT", { code: gameState.code, roundId: gameState.roundId, hex: hsvToHex(next) });
  }

  const status = !connected ? "Disconnected from the server." : memorizing ? "Five seconds. One color. Trust your memory." : submitted ? "Answer submitted. Keep it, edit it, or vote when everyone is ready." : remaining === 0 ? "Time’s up. Everyone’s latest color is being submitted." : "Submit early, or keep mixing. Once everyone submits, a majority can skip to results.";

  return <div className="screen color-card-screen">
    <div className="page-intro"><div><span className="eyebrow">COLOR CARD · CARD {progress}</span><h1>{memorizing ? <>Remember this <span>color.</span></> : <>Match it from <span>memory.</span></>}</h1><p>{memorizing ? "Everyone sees this color. In five seconds, it’s just you and your memory." : "The original is hidden. Find the hue, then dial in saturation and brightness."}</p></div></div>
    <div className="color-round-status" role="status"><strong className={!memorizing && remaining <= 10 ? "color-time-urgent" : ""}>{memorizing ? "MEMORIZE" : `${remaining}s to match`}</strong><span>{gameState.submittedPlayerIds.length} / {gameState.players.length} answers submitted · everyone advances together</span></div>
    <TurnTimer className="color-timer" label={memorizing ? "Time to memorize" : "Time to match"} remaining={memorizing ? memorizeRemaining : remaining} total={memorizing ? 5 : gameState.roundDuration || 30} isMyTurn />
    {!memorizing && gameState.skipVote && <ColorSkipVote key={gameState.skipVote.id} vote={gameState.skipVote} now={now} socket={socket} code={gameState.code} roundId={gameState.roundId} myId={myId} connected={connected && !gameState.pausedAt} onFeedback={onFeedback} />}
    {memorizing ? <ColorSwatch color={gameState.targetColor} testId="target-color" className="color-memory-card" progress={progress} label="Memorize this color" corner={<div className="color-countdown" role="timer" aria-label={`${memorizeRemaining} seconds to memorize`}><strong>{memorizeRemaining}</strong><span>SECONDS</span></div>} />
      : <form className="color-picker-panel" onSubmit={submit}>
        <div className="color-selection-frame">
          <HsvControls hsv={hsv} onChange={changeChannel} disabled={locked} />
          <ColorSwatch color={hex} testId="picked-color" className="color-guess-card" progress={progress} label={hasPicked ? "Your selection" : "Your blank card"} detail={hasPicked ? hex : "Make it a color worth remembering."}>
            <button className="color-card-submit" type="submit" disabled={locked} aria-label={submitted ? "Answer submitted" : pending ? "Submitting color" : "Submit Color"} title="Submit Color"><span aria-hidden="true">{submitted ? "✓" : "→"}</span></button>
          </ColorSwatch>
        </div>
        <div className="color-picker-footer"><p role="status">{status}</p>{submitted && <button type="button" className="color-edit-button" disabled={pending || remaining === 0 || !connected} onClick={edit}>Edit answer</button>}</div>
        {error && <p className="error-bubble" role="alert">{error}</p>}
      </form>}
    {memorizing && <p className="color-memory-note" role="status">{status}</p>}
    <ul className="color-player-status" aria-label="Player submissions">{gameState.players.map((player) => <li key={player.id}><span>{player.username}{player.id === myId ? " (you)" : ""}</span><strong>{gameState.submittedPlayerIds.includes(player.id) || (player.id === myId && accepted) ? "Submitted" : memorizing ? "Memorizing…" : "Mixing…"}</strong></li>)}</ul>
  </div>;
}

function ResultCard({ entry, result, myId }) {
  const hsv = entry.submittedColor && hexToHsv(entry.submittedColor);
  return <article className={`color-result-card ${result.winnerIds.includes(entry.id) ? "color-winner" : ""}`}>
    <div className="color-result-player"><h2>{entry.username}{entry.id === myId ? " (you)" : ""}</h2>{result.winnerIds.includes(entry.id) && <span className="color-winner-badge">Card winner</span>}</div>
    <div className="color-result-comparison">
      <ColorSwatch color={entry.submittedColor} testId="picked-color" className="color-submitted-result" progress={`${result.roundNumber || 1} / ${result.totalRounds || 5}`} label={entry.autoSubmitted ? "Your selection · auto submitted" : "Your selection"} detail={hsv ? `H${Math.round(hsv.h)} S${Math.round(hsv.s)} V${Math.round(hsv.v)} · ${entry.submittedColor}` : "No submission"} corner={<div className="color-accuracy" aria-label={entry.accuracy === null ? "Unranked" : `Accuracy ${entry.accuracy.toFixed(2)} percent`}><span>ACCURACY</span><strong>{entry.accuracy === null ? "—" : entry.accuracy.toFixed(2)}{entry.accuracy !== null && <small>%</small>}</strong></div>}>
        <p className="color-score-feedback">{scoreFeedback(entry.accuracy)}</p>
      </ColorSwatch>
      <ColorSwatch color={result.targetColor} testId="target-color" className="color-original-result" label="Original" detail={result.targetColor} />
    </div>
    <div className="color-result-distance">RGB distance <strong>{entry.distance === null ? "Unranked" : entry.distance.toFixed(2)}</strong></div>
    <div className="color-result-time">Time consumed <strong>{entry.timeConsumedMs == null ? "—" : `${(entry.timeConsumedMs / 1000).toFixed(2)}s`}{entry.autoSubmitted ? " · Auto submitted" : ""}</strong></div>
  </article>;
}

function ColorRankingReference({ result, myId }) {
  return <section className="color-ranking-reference" aria-label="Given card color">
    <ColorSwatch color={result.targetColor} testId="target-color" className="color-ranking-target" progress={`CARD ${result.roundNumber} · ORIGINAL`} label="Given card color" detail={result.targetColor} />
    <ul className="color-ranking-submissions" aria-label="Players' submitted colors" tabIndex={0} style={{ "--color-player-count": Math.max(1, result.entries.length) }}>
      {result.entries.map((entry) => <li key={entry.id}>
        <ColorSwatch color={entry.submittedColor} testId="submitted-color" className="color-ranking-submission" label={`${entry.username}${entry.id === myId ? " (you)" : ""}`} detail={entry.submittedColor || "No submission"} corner={
          <div className="color-comparison-accuracy" aria-label={Number.isFinite(entry.accuracy) ? `Accuracy ${entry.accuracy.toFixed(2)} percent` : "Unranked"}>
            <span>ACCURACY</span><strong>{Number.isFinite(entry.accuracy) ? <>{entry.accuracy.toFixed(2)}<small>%</small></> : "—"}</strong>
          </div>
        } />
      </li>)}
    </ul>
  </section>;
}

export function ColorCardResultsView({ result, myId, onRematch, connected, onQuit, leaving }) {
  const reviewing = result.phase === "review";
  const isWinner = !reviewing && (result.matchComplete ? result.matchWinnerIds : result.winnerIds)?.includes(myId);
  const playedReveal = useRef(false);
  useEffect(() => {
    if (playedReveal.current) return;
    playedReveal.current = true;
    if (reviewing) SFX.colorReview();
    else if (isWinner) SFX.win();
    else SFX.colorRanking();
  }, [reviewing, isWinner]);
  const [now, setNow] = useState(() => Date.now() + (result.serverClockOffset || 0));
  useEffect(() => {
    const timer = setInterval(() => setNow(result.pausedAt ?? Date.now() + (result.serverClockOffset || 0)), 100);
    return () => clearInterval(timer);
  }, [result.serverClockOffset, result.pausedAt]);
  const remaining = Math.max(0, Math.ceil(((reviewing ? result.reviewEndsAt : result.rankingEndsAt) - now) / 1000));
  const entries = reviewing ? result.entries.filter((entry) => entry.id === myId) : result.entries;
  const winners = result.matchComplete ? result.standings?.filter((player) => result.matchWinnerIds.includes(player.id)) || [] : result.winners;
  const announcement = reviewing ? "Your selection, the original, and a moment of truth." : winners.length === 0 ? "The colors are in." : `${winners.map((winner) => winner.username).join(" & ")} ${winners.length > 1 ? "share the win" : "wins"}${result.matchComplete ? " for the match" : " this card"}!`;
  return <div className="screen color-card-screen color-results-screen">
    <ConfettiBurst active={isWinner} />
    <div className="page-intro"><div><span className="eyebrow">COLOR CARD · CARD {result.roundNumber} OF {result.totalRounds} · {reviewing ? "YOUR RESULT" : result.matchComplete ? "MATCH COMPLETE" : "RANKINGS"}</span><h1>{reviewing ? <>How close <span>did you get?</span></> : result.matchComplete ? <>Colors remembered. <span>Champion revealed.</span></> : <>Closest to <span>the color.</span></>}</h1><p role="status">{announcement}</p></div></div>
    {!reviewing && <ColorRankingReference result={result} myId={myId} />}
    {(reviewing || !result.matchComplete) && <div className="color-round-status"><strong role="timer">{remaining}s {reviewing ? "until rankings" : "until the next card"}</strong><span>Everyone continues automatically</span></div>}
    {!reviewing && <ColorPodium result={result} myId={myId} />}
    {reviewing ? <div className="color-results-grid color-personal-result">{entries.map((entry) => <ResultCard key={entry.id} entry={entry} result={result} myId={myId} />)}</div>
      : <div className="color-card-ranking"><h2>Card {result.roundNumber} rankings</h2><p>Closest RGB match wins this card.</p><ol>{entries.map((entry) => <li key={entry.id} className={entry.id === myId ? "is-you" : ""}>
        <span className="color-rank-number">{entries.findIndex((player) => player.distance === entry.distance) + 1}</span>
        <span className="color-ranking-swatch" style={{ backgroundColor: entry.submittedColor }} aria-label={`Submitted color ${entry.submittedColor}`} />
        <span className="color-rank-name">{entry.username}{entry.id === myId ? " (you)" : ""}<small className="color-rank-hex">{entry.submittedColor || "No color"}</small><small>Distance {entry.distance?.toFixed(2)}{entry.timeConsumedMs != null ? ` · ${(entry.timeConsumedMs / 1000).toFixed(2)}s` : ""}{entry.autoSubmitted ? " · Auto submitted" : ""}</small></span>
        <strong>{entry.accuracy?.toFixed(2)}%</strong>
      </li>)}</ol></div>}
    {!reviewing && result.standings?.length > 0 && <div className="color-standings"><h2>{result.matchComplete ? "Final standings" : "Match standings"}</h2><p>Average accuracy across {result.roundNumber} of {result.totalRounds} cards. Higher is better.</p><ol>{result.standings.map((player) => <li key={player.id}><span>{player.username}{player.id === myId ? " (you)" : ""}{result.matchWinnerIds?.includes(player.id) ? " · MATCH WINNER" : ""}</span><strong>{player.averageAccuracy.toFixed(2)}%</strong></li>)}</ol></div>}
    <div className="color-result-actions">{!reviewing && result.matchComplete && <button className="btn-fun btn-fun-yellow" onClick={() => { SFX.confirm(); onRematch(); }} disabled={!connected}>Play again</button>}<button className="btn-fun btn-fun-ghost" onClick={onQuit} disabled={leaving}>{leaving ? "Quitting…" : "Quit room"}</button></div>
  </div>;
}
