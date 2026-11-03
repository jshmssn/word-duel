import { useEffect, useRef, useState } from "react";
import ModalOverlay from "./ModalOverlay.jsx";

export default function RoomPauseModal({ players, myId, pause, restoring, connected, onReconnect, onVote, onQuit, leaving }) {
  const [now, setNow] = useState(Date.now);
  const [pending, setPending] = useState(null);
  const [error, setError] = useState("");
  const request = useRef(null);
  const dialog = useRef(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  const serverNow = now + (pause?.serverClockOffset || 0);
  const votes = pause?.kickVotes || [];
  const active = connected && players.find((player) => player.id === myId)?.connected !== false && !restoring && !pause?.recoveryFailed;

  async function choose(vote, choice) {
    if (request.current || !active) return;
    request.current = vote.id;
    setPending(vote.id); setError("");
    try {
      const response = await onVote(vote, choice);
      if (!response.success) setError(response.message || "Could not record your vote.");
    } catch { setError("No confirmation received. Please try again."); }
    finally { request.current = null; setPending(null); }
  }

  return <ModalOverlay className="room-pause-overlay">
    <section ref={dialog} tabIndex={-1} className="room-pause-card" role="dialog" aria-modal="true" aria-labelledby="room-pause-title" onKeyDown={(event) => {
      if (event.key !== "Tab") return;
      const buttons = [...event.currentTarget.querySelectorAll("button:not(:disabled)")];
      const index = buttons.indexOf(document.activeElement);
      if (buttons.length && (index < 0 || (event.shiftKey ? index === 0 : index === buttons.length - 1))) {
        event.preventDefault(); buttons[event.shiftKey ? buttons.length - 1 : 0].focus();
      }
    }}>
      <span className="pulse-dot" />
      <h2 id="room-pause-title">{restoring ? "Restoring your room…" : "Room paused"}</h2>
      <p>{pause?.message || "Reconnecting you to your seat and syncing the game."}</p>
      <ul className="room-connection-list" aria-label="Player connections">
        {players.map((player) => {
          const status = player.connected !== false ? "Connected" : player.connectionStatus === "disconnected" ? "Disconnected" : "Reconnecting";
          const vote = votes.find((candidate) => candidate.playerId === player.id);
          const choice = vote?.yesPlayerIds.includes(myId) ? "Yes" : vote?.noPlayerIds.includes(myId) ? "No" : null;
          const remaining = Math.max(0, Math.ceil(((player.kickEligibleAt || serverNow) - serverNow) / 1000));
          return <li key={player.id}>
            <div className="room-connection-player"><strong>{player.username}{player.id === myId ? " (you)" : ""}</strong><span className={`player-connection-tag status-${status.toLowerCase()}`}>{status}</span></div>
            {player.connected === false && !vote && <p>{remaining > 0 ? `Kick voting available in ${remaining}s.` : "Waiting for the server to open kick voting."}</p>}
            {vote && <div className="room-kick-vote" aria-label={`Kick vote for ${player.username}`}>
              <p>Remove {player.username} and continue? {vote.requiredYes} of {vote.totalPlayers} active players must agree.</p>
              <div className="color-vote-actions">
                <button type="button" disabled={!active || Boolean(choice) || pending !== null} onClick={() => choose(vote, "yes")}>Vote to kick {player.username}</button>
                <button type="button" disabled={!active || Boolean(choice) || pending !== null} onClick={() => choose(vote, "no")}>Keep waiting for {player.username}</button>
              </div>
              <p role="status">{vote.yesPlayerIds.length} agree{choice ? ` · You voted ${choice}` : pending === vote.id ? " · Recording vote…" : ""}</p>
            </div>}
          </li>;
        })}
      </ul>
      <p>Game timers resume when the remaining players are connected.</p>
      {error && <p role="alert">{error}</p>}
      <div className="room-pause-controls">
        {!active && <button type="button" className="btn-fun btn-fun-yellow" onClick={onReconnect} disabled={restoring}>Reconnect</button>}
        <button type="button" className="btn-fun btn-fun-ghost" onClick={onQuit} disabled={leaving}>{leaving ? "Quitting…" : "Quit room"}</button>
      </div>
    </section>
  </ModalOverlay>;
}
