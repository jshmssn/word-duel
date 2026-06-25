import { useEffect, useMemo, useRef, useState } from "react";

const CATEGORIES = [
  { name: "Traditional Games", emoji: "🎲" },
  { name: "Countries", emoji: "🌍" },
  { name: "Animals", emoji: "🐾" },
  { name: "Food", emoji: "🍕" },
  { name: "Sports", emoji: "⚽" },
  { name: "Fruits", emoji: "🍓" },
  { name: "Occupations", emoji: "💼" },
  { name: "Nature", emoji: "🌿" },
  { name: "Philippine Names", emoji: "🇵🇭" },
  { name: "Music", emoji: "🎵" },
  { name: "Actor / Actress", emoji: "🎬" },
  { name: "Science", emoji: "🔬" },
  { name: "Math", emoji: "➕" },
  { name: "Cities", emoji: "🏙️" },
  { name: "Brands", emoji: "🏷️" },
  { name: "Movies", emoji: "🎥" },
  { name: "TV Shows", emoji: "📺" },
  { name: "Video Games", emoji: "🎮" },
  { name: "Technology", emoji: "💻" },
  { name: "Historical Figures", emoji: "🏛️" },
  { name: "Landmarks", emoji: "🗿" },
  { name: "Mythology", emoji: "⚡" },
  { name: "Space", emoji: "🚀" },
  { name: "Festivals", emoji: "🎉" },
  { name: "Filipino Culture", emoji: "🌺" },
  { name: "Cartoon Characters", emoji: "🐭" },
  { name: "Superheroes", emoji: "🦸" },
  { name: "Body Parts", emoji: "🫀" },
  { name: "Vehicles", emoji: "🚗" },
  { name: "Plants", emoji: "🌱" },
];

const ACCENTS = [
  "#c77dff",
  "#00e5ff",
  "#ff4da6",
  "#ffe135",
  "#69ff47",
  "#ff7043",
  "#40a9ff",
  "#bcff4f",
];

const REEL_HEIGHT = 318;
const ROW_HEIGHT = 54;
const FINAL_CYCLE = 6;
const SPIN_DURATION = 3200;

function normalizeName(name) {
  return String(name || "")
    .trim()
    .toLowerCase();
}

function getAudioBridge() {
  if (typeof window === "undefined") return {};
  return window.wordDuelAudio || {};
}

function playSlotTone(freq, type, duration, vol, startTime = null) {
  const fallbackTone = typeof window !== "undefined" ? window.playTone : null;
  const tone = getAudioBridge().playTone || fallbackTone;
  if (typeof tone !== "function") return;
  tone(freq, type, duration, vol, startTime);
}

function getSlotAudioCtx() {
  const fallbackGetCtx =
    typeof window !== "undefined" ? window.getAudioCtx : null;
  const getCtx = getAudioBridge().getAudioCtx || fallbackGetCtx;
  if (typeof getCtx !== "function") return null;
  try {
    return getCtx();
  } catch {
    return null;
  }
}

function playFightFanfare() {
  const fallbackSfx = typeof window !== "undefined" ? window.SFX : null;
  const sfx = getAudioBridge().SFX || fallbackSfx;
  try {
    if (typeof sfx?.yourTurn === "function") sfx.yourTurn();
  } catch {}
}

function easeOutBack(value) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(value - 1, 3) + c1 * Math.pow(value - 1, 2);
}

export default function SlotMachine({ selectedCategoryName, onDone }) {
  const [phase, setPhase] = useState("rain");
  const [dealtCount, setDealtCount] = useState(0);
  const [spinTranslate, setSpinTranslate] = useState(0);
  const [landed, setLanded] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [countdown, setCountdown] = useState(null);

  const onDoneRef = useRef(onDone);
  const doneCalledRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const selectedIndex = Math.max(
    0,
    CATEGORIES.findIndex(
      (category) =>
        normalizeName(category.name) === normalizeName(selectedCategoryName),
    ),
  );
  const selectedCategory = CATEGORIES[selectedIndex] || CATEGORIES[0];
  const accent = ACCENTS[selectedIndex % ACCENTS.length];
  const centerOffset = REEL_HEIGHT / 2 - ROW_HEIGHT / 2;
  const finalIndex = FINAL_CYCLE * CATEGORIES.length + selectedIndex;
  const startTranslate =
    centerOffset - (CATEGORIES.length + selectedIndex) * ROW_HEIGHT;
  const targetTranslate = centerOffset - finalIndex * ROW_HEIGHT;
  const stackStep = (REEL_HEIGHT - 58) / CATEGORIES.length;

  const reelItems = useMemo(
    () =>
      Array.from({ length: FINAL_CYCLE + 2 }).flatMap((_, cycle) =>
        CATEGORIES.map((category, categoryIndex) => ({
          ...category,
          accent: ACCENTS[categoryIndex % ACCENTS.length],
          categoryIndex,
          reelIndex: cycle * CATEGORIES.length + categoryIndex,
        })),
      ),
    [],
  );

  useEffect(() => {
    const timeouts = [];
    const intervals = [];
    let frame = null;
    let spinTickTimeout = null;
    let cancelled = false;

    const schedule = (callback, delay) => {
      const id = window.setTimeout(() => {
        if (!cancelled) callback();
      }, delay);
      timeouts.push(id);
      return id;
    };

    const playCardThud = () => {
      playSlotTone(120, "sine", 0.08, 0.3);
      playSlotTone(80, "triangle", 0.1, 0.2);
    };

    const playLand = () => {
      const ctx = getSlotAudioCtx();
      const now = ctx?.currentTime ?? null;
      playSlotTone(180, "sawtooth", 0.15, 0.5, now);
      playSlotTone(1400, "sine", 0.2, 0.3, now !== null ? now + 0.08 : null);
    };

    const startCountdown = () => {
      setPhase("result");
      setResultVisible(true);
      [
        { count: 3, freq: 440 },
        { count: 2, freq: 550 },
        { count: 1, freq: 660 },
      ].forEach((tick, index) => {
        schedule(() => {
          setCountdown(tick.count);
          playSlotTone(tick.freq, "square", 0.08, 0.3);
        }, index * 900);
      });

      schedule(() => {
        setCountdown(0);
        playFightFanfare();
      }, 2700);

      schedule(() => {
        if (doneCalledRef.current) return;
        doneCalledRef.current = true;
        onDoneRef.current?.();
      }, 3300);
    };

    const startSpinTicks = (startedAt) => {
      const tick = () => {
        if (cancelled) return;
        const progress = Math.min(
          1,
          (performance.now() - startedAt) / SPIN_DURATION,
        );
        const interval =
          progress < 0.18
            ? 100 - (progress / 0.18) * 40
            : 60 + Math.pow((progress - 0.18) / 0.82, 1.75) * 240;
        const freq = 900 + Math.round((1 - progress) * 420 + Math.random() * 80);
        playSlotTone(freq, "square", 0.035, 0.14);
        if (progress < 1) spinTickTimeout = window.setTimeout(tick, interval);
      };

      tick();
    };

    const startSpin = () => {
      setPhase("spin");
      setSpinTranslate(startTranslate);
      const startedAt = performance.now();
      startSpinTicks(startedAt);

      const animate = (now) => {
        if (cancelled) return;
        const progress = Math.min(1, (now - startedAt) / SPIN_DURATION);
        const eased = easeOutBack(progress);
        setSpinTranslate(
          startTranslate + (targetTranslate - startTranslate) * eased,
        );

        if (progress < 1) {
          frame = window.requestAnimationFrame(animate);
          return;
        }

        setSpinTranslate(targetTranslate);
        setLanded(true);
        setPhase("landed");
        playLand();
        schedule(startCountdown, 520);
      };

      frame = window.requestAnimationFrame(animate);
    };

    doneCalledRef.current = false;
    setPhase("rain");
    setDealtCount(0);
    setSpinTranslate(startTranslate);
    setLanded(false);
    setResultVisible(false);
    setCountdown(null);

    const ambience = window.setInterval(() => {
      const freq = 800 + Math.random() * 600;
      playSlotTone(freq, "sine", 0.045, 0.13);
    }, 80);
    intervals.push(ambience);

    CATEGORIES.forEach((_, index) => {
      schedule(() => setDealtCount(index + 1), index * 80);
      schedule(playCardThud, index * 80 + 520);
    });

    schedule(() => {
      intervals.forEach((id) => window.clearInterval(id));
      setPhase("stacked");
      schedule(startSpin, 300);
    }, (CATEGORIES.length - 1) * 80 + 640);

    return () => {
      cancelled = true;
      timeouts.forEach((id) => window.clearTimeout(id));
      intervals.forEach((id) => window.clearInterval(id));
      if (spinTickTimeout) window.clearTimeout(spinTickTimeout);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [selectedCategoryName, selectedIndex, startTranslate, targetTranslate]);

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    background: "rgba(26, 5, 51, 0.92)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    animation: "slotOverlayFade 240ms ease-out both",
  };

  const cardStyle = {
    position: "relative",
    width: "min(680px, calc(100vw - 28px))",
    maxHeight: "calc(100vh - 28px)",
    overflow: "hidden",
    padding: "22px 18px 18px",
    background: "linear-gradient(175deg, #2a0d4a, #1e0838, #170630)",
    border: "1.5px solid #5a2d8a",
    borderRadius: 28,
    boxShadow:
      "0 28px 80px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
  };

  const shimmerStripStyle = (edge) => ({
    position: "absolute",
    left: 18,
    right: 18,
    [edge]: 10,
    height: 5,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, #c77dff, #00e5ff, #ff4da6, #ffe135, #69ff47, #ff7043, #c77dff)",
    backgroundSize: "300% 100%",
    animation: "slotRainbowSlide 2.2s linear infinite",
    opacity: 0.82,
    boxShadow: "0 0 18px rgba(199, 125, 255, 0.34)",
  });

  const headerStyle = {
    width: "fit-content",
    margin: "0 auto 16px",
    padding: "8px 18px",
    borderRadius: 999,
    border: "1px solid rgba(199, 125, 255, 0.42)",
    background: "rgba(199, 125, 255, 0.1)",
    color: "#f0e8ff",
    fontFamily: "var(--font-display)",
    fontSize: "clamp(1rem, 4vw, 1.35rem)",
    letterSpacing: "1px",
    textShadow: "0 2px 0 rgba(0, 0, 0, 0.4)",
  };

  const reelStyle = {
    position: "relative",
    height: REEL_HEIGHT,
    overflow: "hidden",
    borderRadius: 22,
    border: "1px solid rgba(90, 45, 138, 0.95)",
    background: "#120425",
    boxShadow:
      "inset 0 0 34px rgba(0, 0, 0, 0.62), 0 16px 38px rgba(0, 0, 0, 0.28)",
  };

  const centerBarStyle = {
    position: "absolute",
    left: 12,
    right: 12,
    top: "50%",
    height: 68,
    transform: "translateY(-50%)",
    borderRadius: 18,
    border: `1px solid ${landed ? accent : "rgba(199, 125, 255, 0.34)"}`,
    background: landed
      ? `linear-gradient(90deg, ${accent}24, rgba(255, 255, 255, 0.1), ${accent}24)`
      : "rgba(199, 125, 255, 0.08)",
    boxShadow: landed
      ? `0 0 26px ${accent}80, inset 0 0 22px ${accent}28`
      : "inset 0 0 18px rgba(199, 125, 255, 0.12)",
    transition: "all 380ms ease",
    pointerEvents: "none",
  };

  const accentBarStyle = (side) => ({
    position: "absolute",
    [side]: 0,
    top: "50%",
    width: 4,
    height: 86,
    transform: "translateY(-50%)",
    borderRadius: side === "left" ? "0 999px 999px 0" : "999px 0 0 999px",
    background: landed ? accent : "rgba(199, 125, 255, 0.4)",
    boxShadow: landed ? `0 0 24px ${accent}` : "none",
    transition: "all 380ms ease",
  });

  const fadeStyle = (edge) => ({
    position: "absolute",
    left: 0,
    right: 0,
    [edge]: 0,
    height: 86,
    background:
      edge === "top"
        ? "linear-gradient(180deg, #120425 0%, rgba(18, 4, 37, 0) 100%)"
        : "linear-gradient(0deg, #120425 0%, rgba(18, 4, 37, 0) 100%)",
    pointerEvents: "none",
  });

  return (
    <div style={overlayStyle}>
      <style>
        {`
          @keyframes slotOverlayFade {
            from { opacity: 0; }
            to { opacity: 1; }
          }

          @keyframes slotRainbowSlide {
            from { background-position: 0% 50%; }
            to { background-position: 300% 50%; }
          }

          @keyframes slotCardDrop {
            0% {
              opacity: 0;
              transform: translateX(-50%) translateY(-430px) rotate(-7deg) scale(0.96);
            }
            68% {
              opacity: 0.92;
              transform: translateX(-50%) translateY(14px) rotate(2deg) scale(1.02);
            }
            84% {
              opacity: 0.92;
              transform: translateX(-50%) translateY(-6px) rotate(-1deg) scale(0.99);
            }
            100% {
              opacity: 0.86;
              transform: translateX(-50%) translateY(0) rotate(0deg) scale(1);
            }
          }

          @keyframes slotResultIn {
            0% { opacity: 0; transform: translateY(16px) scale(0.92); }
            72% { opacity: 1; transform: translateY(-2px) scale(1.03); }
            100% { opacity: 1; transform: translateY(0) scale(1); }
          }

          @keyframes slotCountPop {
            0% { opacity: 0; transform: scale(0.45) rotate(-8deg); }
            62% { opacity: 1; transform: scale(1.16) rotate(2deg); }
            100% { opacity: 1; transform: scale(1) rotate(0deg); }
          }
        `}
      </style>

      <div style={cardStyle}>
        <div style={shimmerStripStyle("top")} />
        <div style={shimmerStripStyle("bottom")} />

        <div style={headerStyle}>⚔️ Category Roulette ⚔️</div>

        <div style={reelStyle}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.055) 0 1px, transparent 1px 5px)",
              mixBlendMode: "screen",
              opacity: 0.2,
              pointerEvents: "none",
            }}
          />

          <div style={centerBarStyle} />
          <div style={accentBarStyle("left")} />
          <div style={accentBarStyle("right")} />

          {(phase === "rain" || phase === "stacked") && (
            <div style={{ position: "absolute", inset: 0 }}>
              {CATEGORIES.slice(0, dealtCount).map((category, index) => (
                <div
                  key={category.name}
                  style={{
                    position: "absolute",
                    left: "50%",
                    bottom: 12 + index * stackStep,
                    zIndex: index + 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    width: "min(84%, 460px)",
                    minHeight: 30,
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "1px solid #5a2d8a",
                    background: "rgba(199, 125, 255, 0.1)",
                    color: "#f0e8ff",
                    fontFamily: "var(--font-ui)",
                    fontWeight: 900,
                    fontSize: "clamp(0.76rem, 2.4vw, 0.92rem)",
                    lineHeight: 1,
                    whiteSpace: "nowrap",
                    boxShadow: "0 8px 16px rgba(0, 0, 0, 0.24)",
                    animation:
                      "slotCardDrop 620ms cubic-bezier(0.2, 0.95, 0.24, 1.14) both",
                  }}
                >
                  <span style={{ fontSize: "1.05em" }}>{category.emoji}</span>
                  <span
                    style={{
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {category.name}
                  </span>
                </div>
              ))}
            </div>
          )}

          {phase !== "rain" && phase !== "stacked" && (
            <div
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: reelItems.length * ROW_HEIGHT,
                transform: `translate3d(0, ${spinTranslate}px, 0)`,
                willChange: "transform",
              }}
            >
              {reelItems.map((item) => {
                const isWinner = landed && item.reelIndex === finalIndex;
                return (
                  <div
                    key={`${item.reelIndex}-${item.name}`}
                    style={{
                      position: "absolute",
                      top: item.reelIndex * ROW_HEIGHT,
                      left: 18,
                      right: 18,
                      height: 44,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "0 16px",
                      borderRadius: 999,
                      border: `1px solid ${isWinner ? item.accent : "rgba(90, 45, 138, 0.78)"}`,
                      background: isWinner
                        ? `linear-gradient(90deg, ${item.accent}24, rgba(255, 255, 255, 0.12), ${item.accent}18)`
                        : "rgba(42, 13, 74, 0.76)",
                      color: "#f0e8ff",
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(0.9rem, 3.1vw, 1.2rem)",
                      letterSpacing: "1px",
                      opacity: landed ? (isWinner ? 1 : 0.08) : 0.92,
                      transform: `scale(${isWinner ? 1.1 : 1})`,
                      filter: landed && !isWinner ? "blur(1px)" : "none",
                      boxShadow: isWinner
                        ? `0 0 28px ${item.accent}72, inset 0 0 20px ${item.accent}24`
                        : "0 8px 16px rgba(0, 0, 0, 0.22)",
                      transition:
                        "opacity 360ms ease, transform 360ms ease, filter 360ms ease, box-shadow 360ms ease",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <span style={{ fontSize: "1.18em" }}>{item.emoji}</span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {item.name}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={fadeStyle("top")} />
          <div style={fadeStyle("bottom")} />
        </div>

        <div
          style={{
            minHeight: 132,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginTop: 14,
          }}
        >
          {resultVisible && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                maxWidth: "100%",
                padding: "10px 18px",
                borderRadius: 18,
                border: `1px solid ${accent}`,
                background: `linear-gradient(135deg, ${accent}22, rgba(255,255,255,0.08))`,
                boxShadow: `0 0 26px ${accent}44`,
                animation: "slotResultIn 420ms cubic-bezier(.2,.9,.25,1.2) both",
              }}
            >
              <span style={{ fontSize: "2rem", lineHeight: 1 }}>
                {selectedCategory.emoji}
              </span>
              <span style={{ minWidth: 0 }}>
                <span
                  style={{
                    display: "block",
                    color: accent,
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.68rem",
                    fontWeight: 900,
                    letterSpacing: "2px",
                    lineHeight: 1,
                  }}
                >
                  CATEGORY
                </span>
                <span
                  style={{
                    display: "block",
                    color: "#f0e8ff",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1rem, 4vw, 1.42rem)",
                    lineHeight: 1.1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {selectedCategory.name}
                </span>
              </span>
            </div>
          )}

          {countdown !== null && (
            <div
              key={countdown}
              style={{
                color: accent,
                fontFamily: "var(--font-display)",
                fontSize: countdown === 0 ? "4rem" : "4.8rem",
                lineHeight: 0.92,
                textShadow: `0 0 26px ${accent}88, 0 5px 0 rgba(0, 0, 0, 0.42)`,
                animation: "slotCountPop 280ms cubic-bezier(.18,.9,.28,1.32) both",
              }}
            >
              {countdown === 0 ? "⚔️" : countdown}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
