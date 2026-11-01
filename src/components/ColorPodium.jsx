import { IconTrophy } from "../icons/Icons.jsx";
import { podiumPlayers } from "../logic/colorCard.js";

export default function ColorPodium({ result, myId }) {
  const match = result.matchComplete;
  const scoreKey = match ? "averageAccuracy" : "accuracy";
  const players = podiumPlayers(match ? result.standings || [] : result.entries || [], scoreKey);
  if (!players.length) return null;
  return <section className="color-podium" aria-label={match ? "Match podium" : "Card podium"}>
    <div className="color-podium-heading"><span className="eyebrow">{match ? "THE FINAL THREE" : `CARD ${result.roundNumber} · TOP THREE`}</span><h2>{match ? "Your color champions." : "A shade above the rest."}</h2><p>{match ? "Highest average accuracy across this match." : "The closest matches for this card."}</p></div>
    <ol className={`color-podium-grid podium-count-${players.length}`}>
      {players.map((player, index) => {
        const place = ["1st", "2nd", "3rd"][player.podiumRank - 1];
        const placement = `${player.tied ? "Joint " : ""}${place}`;
        return <li key={player.id} value={player.podiumRank} className={`color-podium-place place-${index + 1} medal-${player.podiumRank} ${player.id === myId ? "is-you" : ""}`} aria-label={`${placement} place: ${player.username}, ${player[scoreKey].toFixed(2)} percent ${match ? "average " : ""}accuracy`}>
          <div className="color-podium-person"><span className="podium-medal">{placement}</span><span className="podium-avatar" aria-hidden="true">{player.username.slice(0, 1).toUpperCase()}</span><strong className="podium-name" title={player.username}>{player.username}</strong>{player.id === myId && <span className="podium-you">YOU</span>}</div>
          <div className="podium-step"><strong className="podium-accuracy">{player[scoreKey].toFixed(2)}<small>%</small></strong><span>{match ? "AVG. ACCURACY" : "ACCURACY"}</span><div className="podium-emblem" aria-hidden="true">{player.podiumRank === 1 ? <IconTrophy size={27} color="currentColor" /> : player.podiumRank}</div></div>
        </li>;
      })}
    </ol>
  </section>;
}
