import { useEffect, useMemo, useRef, useState } from "react";
import { SFX } from "../audio.js";

// The clock is visual only. Turn order, deadlines, hearts and dictionary checks
// always come from the server; every action is bound to a particular turn.
export default function useFinishWord({ gameState, socket, myId, connected, onFeedback }) {
  const prefix = gameState.requiredPrefix || "";
  const draftEnding = () => gameState.currentPlayerId === myId && prefix && gameState.typingText?.toLowerCase().startsWith(prefix)
    ? gameState.typingText.slice(prefix.length) : "";
  const [suffix, setSuffix] = useState(draftEnding);
  const word = prefix ? `${prefix}${suffix}` : "";
  const [pending, setPending] = useState(false);
  const [choosingLetter, setChoosingLetter] = useState(false);
  const [error, setError] = useState("");
  const [rejectedAttempts, setRejectedAttempts] = useState(0);
  const [now, setNow] = useState(Date.now);
  const inputRef = useRef(null);
  const request = useRef(null);
  const choiceRequest = useRef(null);
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
  const canChooseLetter = isMyTurn && me?.isAlive !== false && connected && !gameState.pausedAt && remaining > 0 && gameState.awaitingStartingLetterChoice;
  const canPlay = isMyTurn && me?.isAlive !== false && connected && !gameState.pausedAt && remaining > 0 && !gameState.awaitingStartingLetterChoice && Boolean(prefix);

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
    const restoredSuffix = draftEnding();
    latestTyping.current = prefix ? `${prefix}${restoredSuffix}` : "";
    setSuffix(restoredSuffix); setError(""); setPending(false);
    choiceRequest.current = null; setChoosingLetter(false);
  }, [gameState.turnId, gameState.recoveredAt, prefix, myId]);

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
    choiceRequest.current = null;
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
    const text = value.replace(/\s/g, "").slice(0, 64 - prefix.length);
    setSuffix(text); setError("");
    latestTyping.current = `${prefix}${text}`;
    if (typingTimer.current) return;
    const turnId = gameState.turnId;
    typingTimer.current = setTimeout(() => {
      typingTimer.current = null;
      if (currentTurn.current !== turnId || !socket.connected) return;
      socket.emit("player_typing", { code: gameState.code, turnId, text: latestTyping.current });
    }, 50);
  }

  function pasteWord(event) {
    event.preventDefault();
    if (!canPlay || request.current) return;
    const input = event.currentTarget;
    const start = input.selectionStart ?? 0;
    const end = input.selectionEnd ?? suffix.length;
    let pasted = event.clipboardData.getData("text").replace(/\s/g, "");
    // A complete word can replace the ending without duplicating its prefix.
    // Pasting into the middle of an ending inserts the clipboard literally.
    if (start === 0 && end === suffix.length && pasted.toLowerCase().startsWith(prefix)) pasted = pasted.slice(prefix.length);
    changeWord(suffix.slice(0, start) + pasted + suffix.slice(end));
    const caret = Math.min(start + pasted.length, 64 - prefix.length);
    requestAnimationFrame(() => input.setSelectionRange(caret, caret));
  }

  async function chooseStartingLetter(letter) {
    if (!canChooseLetter || choiceRequest.current) return;
    const token = {}; choiceRequest.current = token;
    setChoosingLetter(true); setError("");
    try {
      const response = await socket.timeout(5000).emitWithAck("choose_starting_letter", { code: gameState.code, turnId: gameState.turnId, letter });
      if (choiceRequest.current !== token) return;
      if (!response?.success) setError(response?.message || "Could not select your starting letter.");
    } catch {
      if (choiceRequest.current === token) setError("No confirmation received. Please try choosing your letter again.");
    } finally {
      if (choiceRequest.current === token) { choiceRequest.current = null; setChoosingLetter(false); }
    }
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
    setSuffix(cleanedWord.slice(prefix.length));
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
        setSuffix(""); latestTyping.current = prefix;
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

  return { word, suffix, changeWord, pasteWord, submit, inputRef, pending, error, remaining, canPlay, canChooseLetter, chooseStartingLetter, choosingLetter, isMyTurn, me, activePlayer };
}
