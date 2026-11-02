import { useEffect, useMemo, useRef, useState } from "react";
import { SFX } from "../audio.js";

// The clock is visual only. Turn order, deadlines, hearts and dictionary checks
// always come from the server; every action is bound to a particular turn.
export default function useFinishWord({ gameState, socket, myId, connected, onFeedback }) {
  const [word, setWord] = useState(() => gameState.currentPlayerId === myId ? gameState.typingText || "" : "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [rejectedAttempts, setRejectedAttempts] = useState(0);
  const [now, setNow] = useState(Date.now);
  const inputRef = useRef(null);
  const request = useRef(null);
  const typingTimer = useRef(null);
  const latestTyping = useRef("");
  const currentTurn = useRef(gameState.turnId);
  const offset = useMemo(() => gameState.serverClockOffset ??
    (typeof gameState.serverNow === "number" ? gameState.serverNow - Date.now() : 0),
  [gameState.serverClockOffset, gameState.serverNow]);
  const me = gameState.players.find((player) => player.id === myId);
  const activePlayer = gameState.players.find((player) => player.id === gameState.currentPlayerId);
  const remaining = Math.max(0, Math.ceil((gameState.turnEndsAt - now) / 1000));
  const isMyTurn = gameState.currentPlayerId === myId && gameState.status === "PLAYING";
  const canPlay = isMyTurn && me?.isAlive !== false && connected && !gameState.pausedAt && remaining > 0;

  useEffect(() => {
    const update = () => setNow(gameState.pausedAt ?? Date.now() + offset);
    update();
    if (gameState.status !== "PLAYING") return;
    const timer = setInterval(update, 100);
    return () => clearInterval(timer);
  }, [offset, gameState.pausedAt, gameState.status]);

  useEffect(() => {
    currentTurn.current = gameState.turnId;
    request.current = null;
    clearTimeout(typingTimer.current);
    typingTimer.current = null;
    const restoredDraft = gameState.currentPlayerId === myId ? gameState.typingText || "" : "";
    latestTyping.current = restoredDraft;
    setWord(restoredDraft); setError(""); setPending(false);
  }, [gameState.turnId, gameState.recoveredAt, myId]);

  useEffect(() => {
    if (!canPlay || pending) return;
    const frame = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [gameState.turnId, canPlay, pending]);

  useEffect(() => {
    if (canPlay) return;
    clearTimeout(typingTimer.current);
    typingTimer.current = null;
  }, [canPlay]);

  useEffect(() => () => {
    request.current = null;
    clearTimeout(typingTimer.current);
  }, []);

  useEffect(() => {
    if (!rejectedAttempts || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = inputRef.current?.closest(".finish-word-input-row")?.animate(
      [0, -8, 8, -6, 6, -3, 3, 0].map((x) => ({ transform: `translateX(${x}px)` })),
      { duration: 380, easing: "ease-out" },
    );
    return () => animation?.cancel();
  }, [rejectedAttempts]);

  function changeWord(value) {
    if (!canPlay || request.current) return;
    const text = value.replace(/\s/g, "").slice(0, 64);
    setWord(text); setError("");
    latestTyping.current = text;
    if (typingTimer.current) return;
    const turnId = gameState.turnId;
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
      if (currentTurn.current !== turnId || !socket.connected) return;
      socket.emit("player_typing", { code: gameState.code, turnId, text: latestTyping.current });
    }, 50);
  }

  async function submit(event) {
    event?.preventDefault();
    if (event?.nativeEvent?.isComposing || !canPlay || request.current || !word.trim()) return;
    const token = {};
    request.current = token;
    setPending(true); setError("");
    clearTimeout(typingTimer.current);
    typingTimer.current = null;
    const cleanedWord = word.replace(/\s/g, "");
    setWord(cleanedWord);
    latestTyping.current = cleanedWord;
    socket.emit("player_typing", { code: gameState.code, turnId: gameState.turnId, text: cleanedWord });
    try {
      const response = await socket.timeout(5000).emitWithAck("submit_word", {
        code: gameState.code, turnId: gameState.turnId, word: cleanedWord,
      });
      if (request.current !== token) return;
      if (!response?.success) {
        const message = response?.message || "Could not submit your word.";
        setError(message); onFeedback(message, "error");
      } else if (response.accepted === false && response.retryable) {
        setError(`${response.message} Try again before time runs out.`);
        setRejectedAttempts((count) => count + 1);
        SFX.wrong();
      }
    } catch {
      if (request.current !== token) return;
      const message = "No confirmation received. Please try again.";
      setError(message); onFeedback(message, "error");
    } finally {
      if (request.current === token) { request.current = null; setPending(false); }
    }
  }

  return { word, changeWord, submit, inputRef, pending, error, remaining, canPlay, isMyTurn, me, activePlayer };
}
