import { useEffect, useLayoutEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { IconChat, IconX, IconSend } from "../icons/Icons.jsx";
import useVisualViewport from "../hooks/useVisualViewport.js";
import { SFX } from "../audio.js";

// This lives beside the screen router so cards, prompts and results cannot
// unmount the input or discard the user's unfinished message.
export function RoomChat({ messages, onSend, myId, colorRoundId }) {
  const [isOpen, setIsOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const previousCount = useRef(messages.length);
  const previousColorRound = useRef(null);
  useLayoutEffect(() => {
    if (!colorRoundId || colorRoundId === previousColorRound.current) return;
    previousColorRound.current = colorRoundId;
    // Touch devices need the card unobstructed, including in landscape. Keep
    // the draft in FloatingChat and let mouse users keep their chat open.
    if (navigator.userAgentData?.mobile || window.matchMedia("(hover: none) and (pointer: coarse)").matches) setIsOpen(false);
  }, [colorRoundId]);
  useEffect(() => {
    const added = messages.length - previousCount.current;
    if (added > 0) {
      if (!isOpen) setUnread((count) => count + added);
      if (messages.slice(-added).some((message) => !message.system && message.playerId !== myId)) SFX.chat();
    }
    previousCount.current = messages.length;
  }, [messages, isOpen, myId]);
  return <FloatingChat messages={messages} onSend={onSend} myId={myId} isOpen={isOpen} onToggle={() => {
    SFX.tap(); setIsOpen((open) => !open); setUnread(0);
  }} unread={unread} />;
}

export default function FloatingChat({ messages, onSend, myId, isOpen, onToggle, unread }) {
  const [text, setText] = useState("");
  const viewport = useVisualViewport();
  const messagesRef = useRef(null);
  const toggleRef = useRef(null);
  const wasOpen = useRef(false);
  const panelId = useId();

  useLayoutEffect(() => {
    const list = messagesRef.current;
    if (isOpen && list) list.scrollTop = list.scrollHeight;
  }, [messages, isOpen]);

  useLayoutEffect(() => {
    if (!isOpen && wasOpen.current) toggleRef.current?.focus({ preventScroll: true });
    wasOpen.current = isOpen;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onToggle();
        toggleRef.current?.focus({ preventScroll: true });
      }
    };
    const panel = document.getElementById(panelId);
    panel?.addEventListener("keydown", onKeyDown);
    return () => panel?.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onToggle, panelId]);

  const send = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText("");
  };
  const fmt = (ts) =>
    new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return createPortal(
    <div className={`floating-chat-wrap ${isOpen ? "chat-open" : ""}`} style={viewport ? {
      "--chat-viewport-height": `${viewport.height}px`,
      "--chat-keyboard-offset": `${viewport.bottom}px`,
    } : undefined}>
      {isOpen && (
        <div className="floating-chat-panel" id={panelId} role="region" aria-label="Room chat">
          <div className="chat-header-fun">
            <IconChat size={18} color="var(--cyan)" />
            Room Chat
            <button className="btn-close-chat" type="button" aria-label="Close chat" onClick={() => {
              onToggle();
              toggleRef.current?.focus({ preventScroll: true });
            }}>
              <IconX size={14} color="currentColor" />
            </button>
          </div>
          <div className="chat-messages" ref={messagesRef}>
            {messages.length === 0 && (
              <div className="chat-system-msg icon-msg">
                <IconChat size={13} color="currentColor" />
                No messages yet. Say hi!
              </div>
            )}
            {messages.map((msg) =>
              msg.system ? (
                <div key={msg.id} className="chat-system-msg">
                  {msg.text}
                </div>
              ) : (
                <div
                  key={msg.id}
                  className={`chat-bubble ${msg.playerId === myId ? "mine" : "theirs"}`}
                >
                  <div className="chat-bubble-meta">
                    <span>
                      {msg.username}
                      {msg.playerId === myId ? " (you)" : ""}
                    </span>
                    <span style={{ opacity: 0.6 }}>{fmt(msg.timestamp)}</span>
                  </div>
                  <div className="chat-bubble-inner">{msg.text}</div>
                </div>
              ),
            )}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input-fun"
              aria-label="Chat message"
              enterKeyHint="send"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && send()}
              placeholder="Say something..."
              maxLength={200}
            />
            <button
              className="btn-send-fun"
              type="button"
              aria-label="Send message"
              onClick={send}
              disabled={!text.trim()}
            >
              <IconSend size={18} color="currentColor" />
            </button>
          </div>
        </div>
      )}

      <button
        className="floating-chat-btn"
        ref={toggleRef}
        type="button"
        aria-label={isOpen ? "Close chat" : "Open chat"}
        aria-expanded={isOpen}
        aria-controls={isOpen ? panelId : undefined}
        onClick={onToggle}
        title={isOpen ? "Close chat" : "Open chat"}
      >
        <IconChat size={24} color="white" />
        {unread > 0 && (
          <span className="chat-unread-badge">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
    </div>,
    document.body,
  );
}
