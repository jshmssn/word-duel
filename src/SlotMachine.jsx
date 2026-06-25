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

const SHUFFLE_EMOJIS = ["🎲", "❓", "⚡", "🌟", "🎯", "🌀", "✨", "🔮"];

const REEL_HEIGHT = 286;
const ROW_HEIGHT = 58;
const FINAL_CYCLE = 5;
const SPIN_DURATION = 2800;
const INTRO_DURATION = 760;
const INTRO_ACCENT = "#c77dff";

function normalizeName(name) {
  return String(name || "").trim().toLowerCase();
}

function getAudioBridge() {
  if (typeof window === "undefined") return {};
  return window.wordDuelAudio || {};
}

function playSlotTone(freq, type, duration, vol, startTime = null) {
  const fallbackTone = typeof window !== "undefined" ? window.playTone : null;
  const tone = getAudioBridge().playTone || fallbackTone;

  if (typeof tone !== "function") return;

  try {
    tone(freq, type, duration, vol, startTime);
  } catch {
    // Audio should never break the game.
  }
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
  } catch {
    // Ignore unavailable audio.
  }
}

export default function SlotMachine({ selectedCategoryName, onDone }) {
  const [phase, setPhase] = useState("intro");
  const [spinTranslate, setSpinTranslate] = useState(0);
  const [landed, setLanded] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);
  const [countdown, setCountdown] = useState(null);
  const [shuffleEmoji, setShuffleEmoji] = useState("❓");

  const onDoneRef = useRef(onDone);
  const doneCalledRef = useRef(false);

  useEffect(() => {
    onDoneRef.current = onDone;
  }, [onDone]);

  const selectedIndex = Math.max(
    0,
    CATEGORIES.findIndex(
      (category) =>
        normalizeName(category.name) === normalizeName(selectedCategoryName)
    )
  );

  const selectedCategory = CATEGORIES[selectedIndex] || CATEGORIES[0];
  const accent = ACCENTS[selectedIndex % ACCENTS.length];
  const activeAccent = phase === "intro" ? INTRO_ACCENT : accent;

  const centerOffset = REEL_HEIGHT / 2 - ROW_HEIGHT / 2;
  const finalIndex = FINAL_CYCLE * CATEGORIES.length + selectedIndex;

  const startTranslate =
    centerOffset - (CATEGORIES.length + selectedIndex) * ROW_HEIGHT;

  const targetTranslate = centerOffset - finalIndex * ROW_HEIGHT;

  const reelItems = useMemo(() => {
    return Array.from({ length: FINAL_CYCLE + 2 }).flatMap((_, cycle) =>
      CATEGORIES.map((category, categoryIndex) => ({
        ...category,
        accent: ACCENTS[categoryIndex % ACCENTS.length],
        categoryIndex,
        reelIndex: cycle * CATEGORIES.length + categoryIndex,
      }))
    );
  }, []);

  useEffect(() => {
    const timeouts = [];
    const intervals = [];
    let cancelled = false;

    const schedule = (callback, delay) => {
      const id = window.setTimeout(() => {
        if (!cancelled) callback();
      }, delay);

      timeouts.push(id);
      return id;
    };

    const clearAllIntervals = () => {
      intervals.forEach((id) => window.clearInterval(id));
    };

    const playLand = () => {
      const ctx = getSlotAudioCtx();
      const now = ctx?.currentTime ?? null;

      playSlotTone(180, "sawtooth", 0.14, 0.45, now);
      playSlotTone(1400, "sine", 0.18, 0.28, now !== null ? now + 0.08 : null);
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
        }, index * 850);
      });

      schedule(() => {
        setCountdown(0);
        playFightFanfare();
      }, 2550);

      schedule(() => {
        if (doneCalledRef.current) return;

        doneCalledRef.current = true;
        onDoneRef.current?.();
      }, 3150);
    };

    doneCalledRef.current = false;

    setPhase("intro");
    setSpinTranslate(startTranslate);
    setLanded(false);
    setResultVisible(false);
    setCountdown(null);
    setShuffleEmoji("❓");

    const shuffleEmojiInterval = window.setInterval(() => {
      const randomIndex = Math.floor(Math.random() * SHUFFLE_EMOJIS.length);
      setShuffleEmoji(SHUFFLE_EMOJIS[randomIndex]);
    }, 120);

    intervals.push(shuffleEmojiInterval);

    schedule(() => {
      if (cancelled) return;

      setPhase("spin");

      playSlotTone(620, "sine", 0.08, 0.18);
      playSlotTone(820, "sine", 0.08, 0.16);

      const tickInterval = window.setInterval(() => {
        playSlotTone(920 + Math.random() * 180, "square", 0.03, 0.09);
      }, 170);

      intervals.push(tickInterval);

      schedule(() => {
        setSpinTranslate(targetTranslate);
      }, 80);

      schedule(() => {
        clearAllIntervals();

        setSpinTranslate(targetTranslate);
        setLanded(true);
        setPhase("landed");

        playLand();

        schedule(startCountdown, 560);
      }, SPIN_DURATION + 140);
    }, INTRO_DURATION);

    return () => {
      cancelled = true;

      timeouts.forEach((id) => window.clearTimeout(id));
      clearAllIntervals();
    };
  }, [selectedCategoryName, selectedIndex, startTranslate, targetTranslate]);

  const overlayStyle = {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    background:
      "radial-gradient(circle at top, rgba(90, 45, 138, 0.45), transparent 42%), rgba(26, 5, 51, 0.94)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    animation: "slotOverlayFade 220ms ease-out both",
  };

  const cardStyle = {
    position: "relative",
    width: "min(620px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 24px)",
    overflow: "hidden",
    padding: "20px 16px 16px",
    background: "linear-gradient(175deg, #2a0d4a, #1e0838, #170630)",
    border: "1.5px solid #5a2d8a",
    borderRadius: 26,
    boxShadow:
      "0 26px 78px rgba(0, 0, 0, 0.58), inset 0 1px 0 rgba(255, 255, 255, 0.08)",
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
    opacity: 0.78,
    boxShadow: "0 0 18px rgba(199, 125, 255, 0.34)",
  });

  const headerStyle = {
    width: "fit-content",
    maxWidth: "100%",
    margin: "0 auto 14px",
    padding: "8px 18px",
    borderRadius: 999,
    border: "1px solid rgba(199, 125, 255, 0.42)",
    background: "rgba(199, 125, 255, 0.1)",
    color: "#f0e8ff",
    fontFamily: "var(--font-display)",
    fontSize: "clamp(1rem, 4vw, 1.3rem)",
    letterSpacing: "1px",
    textAlign: "center",
    textShadow: "0 2px 0 rgba(0, 0, 0, 0.4)",
  };

  const reelStyle = {
    position: "relative",
    height: REEL_HEIGHT,
    overflow: "hidden",
    borderRadius: 22,
    border: "1px solid rgba(90, 45, 138, 0.95)",
    background:
      "radial-gradient(circle at center, rgba(199, 125, 255, 0.16), transparent 48%), #120425",
    boxShadow:
      "inset 0 0 34px rgba(0, 0, 0, 0.62), 0 16px 38px rgba(0, 0, 0, 0.28)",
  };

  const centerBarStyle = {
    position: "absolute",
    left: 12,
    right: 12,
    top: "50%",
    height: 74,
    transform: "translateY(-50%)",
    borderRadius: 20,
    border: `1px solid ${landed ? accent : "rgba(199, 125, 255, 0.36)"}`,
    background: landed
      ? `linear-gradient(90deg, ${accent}28, rgba(255,255,255,0.1), ${accent}20)`
      : "linear-gradient(90deg, rgba(199,125,255,0.08), rgba(255,255,255,0.08), rgba(199,125,255,0.08))",
    boxShadow: landed
      ? `0 0 30px ${accent}88, inset 0 0 24px ${accent}28`
      : "inset 0 0 18px rgba(199, 125, 255, 0.12)",
    transition: "all 380ms ease",
    pointerEvents: "none",
    zIndex: 3,
  };

  const fadeStyle = (edge) => ({
    position: "absolute",
    left: 0,
    right: 0,
    [edge]: 0,
    height: 92,
    background:
      edge === "top"
        ? "linear-gradient(180deg, #120425 0%, rgba(18, 4, 37, 0) 100%)"
        : "linear-gradient(0deg, #120425 0%, rgba(18, 4, 37, 0) 100%)",
    pointerEvents: "none",
    zIndex: 4,
  });

  return (
    <div style={overlayStyle}>
      <style>
        {`
          @keyframes slotOverlayFade {
            from {
              opacity: 0;
            }

            to {
              opacity: 1;
            }
          }

          @keyframes slotRainbowSlide {
            from {
              background-position: 0% 50%;
            }

            to {
              background-position: 300% 50%;
            }
          }

          @keyframes slotPulse {
            0%, 100% {
              opacity: 0.72;
              transform: scale(1);
            }

            50% {
              opacity: 1;
              transform: scale(1.035);
            }
          }

          @keyframes slotScanner {
            0% {
              transform: translateX(-120%);
              opacity: 0;
            }

            20% {
              opacity: 1;
            }

            100% {
              transform: translateX(120%);
              opacity: 0;
            }
          }

          @keyframes slotIntroIn {
            0% {
              opacity: 0;
              transform: translateY(18px) scale(0.96);
            }

            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes slotResultIn {
            0% {
              opacity: 0;
              transform: translateY(16px) scale(0.92);
            }

            72% {
              opacity: 1;
              transform: translateY(-2px) scale(1.03);
            }

            100% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }

          @keyframes slotCountPop {
            0% {
              opacity: 0;
              transform: scale(0.45) rotate(-8deg);
            }

            62% {
              opacity: 1;
              transform: scale(1.16) rotate(2deg);
            }

            100% {
              opacity: 1;
              transform: scale(1) rotate(0deg);
            }
          }

          @media (max-width: 480px) {
            .slot-machine-card {
              padding: 18px 12px 14px !important;
              border-radius: 22px !important;
            }

            .slot-machine-header {
              font-size: 0.98rem !important;
              padding: 7px 14px !important;
              margin-bottom: 12px !important;
            }

            .slot-machine-reel {
              height: 260px !important;
              border-radius: 18px !important;
            }

            .slot-machine-result-card {
              padding-left: 12px !important;
              padding-right: 12px !important;
            }

            .slot-machine-reel-row {
              left: 12px !important;
              right: 12px !important;
              padding-left: 12px !important;
              padding-right: 12px !important;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .slot-machine-reel-track {
              transition-duration: 900ms !important;
            }
          }
        `}
      </style>

      <div className="slot-machine-card" style={cardStyle}>
        <div style={shimmerStripStyle("top")} />
        <div style={shimmerStripStyle("bottom")} />

        <div className="slot-machine-header" style={headerStyle}>
          ⚔️ Category Roulette ⚔️
        </div>

        <div className="slot-machine-reel" style={reelStyle}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "repeating-linear-gradient(180deg, rgba(255,255,255,0.052) 0 1px, transparent 1px 6px)",
              mixBlendMode: "screen",
              opacity: 0.16,
              pointerEvents: "none",
            }}
          />

          <div
            style={{
              position: "absolute",
              inset: 12,
              borderRadius: 20,
              border: "1px solid rgba(199, 125, 255, 0.12)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          <div style={centerBarStyle} />

          {phase === "intro" && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 18,
                zIndex: 5,
                animation: "slotIntroIn 360ms ease-out both",
              }}
            >
              <div
                style={{
                  position: "relative",
                  width: "min(430px, 92%)",
                  padding: "22px 18px",
                  borderRadius: 24,
                  border: "1px solid rgba(199, 125, 255, 0.42)",
                  background:
                    "linear-gradient(145deg, rgba(42,13,74,0.92), rgba(23,6,48,0.94))",
                  boxShadow:
                    "0 18px 38px rgba(0,0,0,0.34), inset 0 0 26px rgba(199,125,255,0.1)",
                  overflow: "hidden",
                  textAlign: "center",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    bottom: 0,
                    width: "45%",
                    background:
                      "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)",
                    animation: "slotScanner 950ms ease-in-out infinite",
                  }}
                />

                <div
                  style={{
                    color: "#f0e8ff",
                    fontFamily: "var(--font-ui)",
                    fontSize: "0.72rem",
                    fontWeight: 900,
                    letterSpacing: "2px",
                    marginBottom: 8,
                    opacity: 0.9,
                  }}
                >
                  PREPARING CATEGORY
                </div>

                <div
                  style={{
                    color: INTRO_ACCENT,
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(2rem, 10vw, 3.8rem)",
                    lineHeight: 1,
                    textShadow: `0 0 24px ${INTRO_ACCENT}88`,
                    animation: "slotPulse 900ms ease-in-out infinite",
                  }}
                >
                  {shuffleEmoji}
                </div>

                <div
                  style={{
                    marginTop: 10,
                    color: "#f0e8ff",
                    fontFamily: "var(--font-display)",
                    fontSize: "clamp(1rem, 4vw, 1.36rem)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  Shuffling...
                </div>
              </div>
            </div>
          )}

          {phase !== "intro" && (
            <div
              className="slot-machine-reel-track"
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top: 0,
                height: reelItems.length * ROW_HEIGHT,
                transform: `translate3d(0, ${spinTranslate}px, 0)`,
                transition:
                  phase === "spin"
                    ? `transform ${SPIN_DURATION}ms cubic-bezier(0.08, 0.82, 0.18, 1)`
                    : "none",
                willChange: phase === "spin" ? "transform" : "auto",
                zIndex: 1,
              }}
            >
              {reelItems.map((item) => {
                const isWinner = landed && item.reelIndex === finalIndex;

                return (
                  <div
                    key={`${item.reelIndex}-${item.name}`}
                    className="slot-machine-reel-row"
                    style={{
                      position: "absolute",
                      top: item.reelIndex * ROW_HEIGHT + 6,
                      left: 18,
                      right: 18,
                      height: 46,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "0 16px",
                      borderRadius: 999,
                      border: `1px solid ${
                        isWinner
                          ? item.accent
                          : "rgba(90, 45, 138, 0.72)"
                      }`,
                      background: isWinner
                        ? `linear-gradient(90deg, ${item.accent}2e, rgba(255,255,255,0.14), ${item.accent}24)`
                        : "rgba(42, 13, 74, 0.76)",
                      color: "#f0e8ff",
                      fontFamily: "var(--font-display)",
                      fontSize: "clamp(0.92rem, 3vw, 1.18rem)",
                      letterSpacing: "1px",
                      opacity: landed ? (isWinner ? 1 : 0.08) : 0.92,
                      transform: `scale(${isWinner ? 1.08 : 1})`,
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
                        minWidth: 0,
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

          <div
            style={{
              position: "absolute",
              left: 0,
              top: "50%",
              width: 5,
              height: 88,
              transform: "translateY(-50%)",
              borderRadius: "0 999px 999px 0",
              background: landed ? accent : "rgba(199, 125, 255, 0.4)",
              boxShadow: landed ? `0 0 24px ${accent}` : "none",
              transition: "all 360ms ease",
              zIndex: 5,
            }}
          />

          <div
            style={{
              position: "absolute",
              right: 0,
              top: "50%",
              width: 5,
              height: 88,
              transform: "translateY(-50%)",
              borderRadius: "999px 0 0 999px",
              background: landed ? accent : "rgba(199, 125, 255, 0.4)",
              boxShadow: landed ? `0 0 24px ${accent}` : "none",
              transition: "all 360ms ease",
              zIndex: 5,
            }}
          />

          <div style={fadeStyle("top")} />
          <div style={fadeStyle("bottom")} />
        </div>

        <div
          style={{
            minHeight: 128,
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
              className="slot-machine-result-card"
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
                animation:
                  "slotResultIn 420ms cubic-bezier(.2,.9,.25,1.2) both",
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
                animation:
                  "slotCountPop 280ms cubic-bezier(.18,.9,.28,1.32) both",
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
