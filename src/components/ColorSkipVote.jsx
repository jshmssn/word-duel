import { useEffect, useRef, useState } from "react";
import { SFX } from "../audio.js";

export default function ColorSkipVote({ vote, now, socket, code, roundId, myId, connected, onFeedback }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const alive = useRef(true);
  const remaining = Math.max(0, Math.ceil((vote.endsAt - now) / 1000));
  const myChoice = vote.yesPlayerIds.includes(myId) ? "yes" : vote.noPlayerIds.includes(myId) ? "no" : null;
  const active = vote.status === "active";
  const lastTick = useRef(remaining);

  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  useEffect(() => { if (myChoice || !active) setPending(false); }, [myChoice, active]);
  useEffect(() => {
    if (active && remaining > 0 && remaining <= 5 && remaining !== lastTick.current) SFX.timerWarning(remaining);
    lastTick.current = remaining;
  }, [remaining, active]);
  useEffect(() => {
    if (!pending) return;
    const timer = setTimeout(() => {
      setPending(false);
      setError("No vote confirmation. Please try again.");
      SFX.timeout();
      onFeedback("No vote confirmation. Please try again.", "error");
    }, 5000);
    return () => clearTimeout(timer);
  }, [pending, onFeedback]);

  function choose(choice) {
    if (!active || myChoice || pending || remaining === 0 || !connected) return;
    setPending(true);
    setError("");
    SFX.voteSelect(choice);
    socket.emit("VOTE_COLOR_SKIP", { code, roundId, voteId: vote.id, choice }, (response) => {
      if (!alive.current) return;
      setPending(false);
      if (response.success) onFeedback(`Vote recorded: ${choice === "yes" ? "Yes, show results" : "No, keep the time"}.`, "success");
      else { setError(response.message); SFX.timeout(); onFeedback(response.message, "error"); }
    });
  }

  if (!active) {
    const message = vote.status === "passed" ? "Vote passed. Showing results…"
      : vote.status === "cancelled" ? "Vote cancelled while a player edits."
        : vote.status === "expired" ? "Vote ended. The answer timer continues." : "No majority to skip. The answer timer continues.";
    return <div className="color-vote-resolved" role="status">{message}</div>;
  }

  return <section className="color-skip-vote" aria-label="Skip time vote">
    <div className="color-vote-heading"><div><span className="eyebrow">EVERYONE HAS SUBMITTED</span><h2>Show results now?</h2></div><strong className={remaining <= 5 ? "color-time-urgent" : ""} role="timer" aria-label={`${remaining} seconds to vote`}>{remaining}s</strong></div>
    <p>{vote.requiredYes} of {vote.totalPlayers} players must vote Yes. The answer timer keeps running.</p>
    <div className="color-vote-actions">
      <button type="button" className={`color-vote-yes ${myChoice === "yes" ? "selected" : ""}`} aria-pressed={myChoice === "yes"} disabled={Boolean(myChoice) || pending || remaining === 0 || !connected} onClick={() => choose("yes")}>Yes, show results</button>
      <button type="button" className={myChoice === "no" ? "selected" : ""} aria-pressed={myChoice === "no"} disabled={Boolean(myChoice) || pending || remaining === 0 || !connected} onClick={() => choose("no")}>No, keep the time</button>
    </div>
    <div className="color-vote-tally" role="status"><span>{vote.yesPlayerIds.length} Yes · {vote.noPlayerIds.length} No</span><strong>{myChoice ? `You voted ${myChoice === "yes" ? "Yes" : "No"}` : pending ? "Recording vote…" : remaining === 0 ? "Voting closed" : "Your vote counts"}</strong></div>
    {error && <p className="color-vote-error" role="alert">{error}</p>}
  </section>;
}
