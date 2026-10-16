import { useEffect, useMemo, useRef, useState } from "react";
import { IconDice, IconTarget } from "../icons/Icons.jsx";
import { ProgressBar } from "./Experience.jsx";
import { reconcileSlots } from "../logic/letterWorkbench.js";

// Letters are *unpositioned clues*. This board stores only a local hypothesis;
// moving them NEVER reveals or changes server-side word positions.
export default function LetterWorkbench({ confirmed = [], length = 0, onUseGuess }) {
  const [slots, setSlots] = useState(() => reconcileSlots([], confirmed, length));
  const [selected, setSelected] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const dragFrom = useRef(null);
  const knownCount = Math.min(confirmed.length, length);

  useEffect(() => {
    setSlots((previous) => reconcileSlots(previous, confirmed, length));
    setSelected(null);
  }, [confirmed, length]);

  const swap = (from, to) => {
    if (from === to || from == null || to == null) return;
    setSlots((previous) => {
      const next = [...previous];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });
    setSelected(null);
    setDragOver(null);
  };

  const select = (index) => {
    if (selected !== null) {
      swap(selected, index);
    } else if (slots[index]) {
      setSelected(index);
    }
  };

  const shuffle = () => {
    setSlots((previous) => {
      const next = [...previous];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setSelected(null);
  };

  const solved = length > 0 && knownCount === length;
  const displayedSlots = useMemo(() => slots.slice(0, length), [slots, length]);

  return <div className="letter-workbench">
    <div className="workbench-heading"><div><span className="workbench-caption">YOUR LETTER WORKBENCH</span><p>Positions are a guess — drag or tap tiles to rearrange.</p></div><span className="workbench-count">{knownCount} / {length} FOUND</span></div>
    <div className="hypothesis-rack" role="group" aria-label="Letter arrangement sandbox, not confirmed positions">
      {displayedSlots.map((letter, index) => (
        <button
          type="button"
          key={index}
          draggable={Boolean(letter)}
          onDragStart={(event) => { if (!letter) { event.preventDefault(); return; } dragFrom.current = index; event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", String(index)); }}
          onDragOver={(event) => { if (dragFrom.current === null) return; event.preventDefault(); setDragOver(index); }}
          onDrop={(event) => { event.preventDefault(); const from = dragFrom.current; dragFrom.current = null; swap(from, index); }}
          onDragEnd={() => { dragFrom.current = null; setDragOver(null); }}
          onClick={() => select(index)}
          onKeyDown={(event) => {
            if (!letter || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
            const target = index + (event.key === "ArrowRight" ? 1 : -1);
            if (target >= 0 && target < length) { event.preventDefault(); swap(index, target); event.currentTarget.parentElement?.children[target]?.focus(); }
          }}
          aria-label={`Slot ${index + 1}: ${letter || "unknown"}${letter ? ", click to select, or use arrow keys to move" : ", click to place selected letter"}`}
          aria-pressed={selected === index}
          className={`workbench-tile ${letter ? "has-letter" : "empty-tile"} ${selected === index ? "selected" : ""} ${dragOver === index ? "drag-over" : ""}`}
        >{letter || <span className="empty-mark">·</span>}</button>
      ))}
    </div>
    <div className="workbench-bottom">
      <ProgressBar value={knownCount} max={length} color="mint" label="Letters discovered" />
      <div className="workbench-actions">
        <button className="tiny-action" onClick={shuffle} disabled={knownCount < 2} type="button"><IconDice size={15} color="currentColor" /> Shuffle</button>
        <button className="tiny-action" onClick={() => { setSlots(reconcileSlots([], confirmed, length)); setSelected(null); }} disabled={knownCount === 0} type="button">Reset</button>
        {solved && <button className="tiny-action use-word" onClick={() => onUseGuess(slots.join(""))} type="button"><IconTarget size={15} color="currentColor" /> Try this order</button>}
      </div>
    </div>
  </div>;
}
