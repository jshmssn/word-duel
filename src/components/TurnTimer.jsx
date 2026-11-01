import { IconClock } from "../icons/Icons.jsx";

export default function TurnTimer({ remaining, total, isMyTurn, label, className = "" }) {
  if (!total) return null;
  const percent = Math.max(0, Math.min(100, remaining / total * 100));
  const danger = remaining <= Math.min(10, total / 3);
  const urgent = remaining <= Math.min(5, total / 5);
  return <div className={`turn-timer-wrap ${danger ? "timer-danger" : ""} ${className}`} role="group" aria-label={label || "Turn timer"}>
    <div className="timer-label"><span className="timer-label-title"><IconClock size={16} color="currentColor" />{label || (isMyTurn ? "Your Time" : "Opponent's Time")}</span><span className={`timer-seconds ${urgent ? "timer-urgent" : ""}`}>{remaining}<small>s</small></span></div>
    <div className="timer-bar-bg"><div className="timer-bar-fill" style={{ width: `${percent}%`, background: urgent ? "var(--red)" : danger ? "#FFA500" : "var(--green)" }} /></div>
  </div>;
}
