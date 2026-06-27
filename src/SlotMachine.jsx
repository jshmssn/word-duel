import { useEffect, useRef, useState, useCallback } from "react";

// ─── Data ───────────────────────────────────────────────────────────────────

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

// Vivid segment colors – cycles through the wheel
const SEGMENT_COLORS = [
  "#7c3aed", // violet
  "#0e9488", // teal
  "#d97706", // amber
  "#db2777", // pink
  "#2563eb", // blue
  "#dc2626", // red
  "#059669", // green
  "#9333ea", // purple
  "#ea580c", // orange
  "#0284c7", // sky
  "#65a30d", // lime
  "#c026d3", // fuchsia
];

const SLICE = (2 * Math.PI) / CATEGORIES.length;
const SPIN_DURATION = 4200; // ms

// ─── Audio helpers ───────────────────────────────────────────────────────────

function getAudioBridge() {
  if (typeof window === "undefined") return {};
  return window.wordDuelAudio || {};
}

function playTone(freq, type, duration, vol, startTime = null) {
  const bridge = getAudioBridge();
  const tone = bridge.playTone || (typeof window !== "undefined" ? window.playTone : null);
  if (typeof tone !== "function") return;
  try { tone(freq, type, duration, vol, startTime); } catch { /* silent */ }
}

function getAudioCtx() {
  const bridge = getAudioBridge();
  const getCtx = bridge.getAudioCtx || (typeof window !== "undefined" ? window.getAudioCtx : null);
  if (typeof getCtx !== "function") return null;
  try { return getCtx(); } catch { return null; }
}

function playFanfare() {
  const bridge = getAudioBridge();
  const sfx = bridge.SFX || (typeof window !== "undefined" ? window.SFX : null);
  try { if (typeof sfx?.yourTurn === "function") sfx.yourTurn(); } catch { /* silent */ }
}

// ─── Canvas draw ─────────────────────────────────────────────────────────────

function drawWheel(canvas, angle, highlightIndex = -1) {
  const W = canvas.width;
  const CX = W / 2;
  const CY = W / 2;
  const R = CX - 6;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, W, W);

  CATEGORIES.forEach((cat, i) => {
    const start = angle + i * SLICE - Math.PI / 2;
    const end = start + SLICE;
    const mid = start + SLICE / 2;
    const color = SEGMENT_COLORS[i % SEGMENT_COLORS.length];
    const isHighlight = i === highlightIndex;

    // Segment fill
    ctx.beginPath();
    ctx.moveTo(CX, CY);
    ctx.arc(CX, CY, isHighlight ? R + 4 : R, start, end);
    ctx.closePath();
    ctx.fillStyle = isHighlight ? color : color + "dd";
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,0.55)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Label – always reads left-to-right (flip text on left half of wheel)
    ctx.save();
    ctx.translate(CX, CY);

    // mid is the angle of the segment midpoint in canvas coords.
    // Normalise to [0, 2π) so we can tell left vs right half.
    const midNorm = ((mid % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const onLeftHalf = midNorm > Math.PI / 2 && midNorm < (3 * Math.PI) / 2;

    if (onLeftHalf) {
      // Rotate to the midpoint then flip 180° so text reads outward correctly
      ctx.rotate(mid + Math.PI);
      ctx.textAlign = "left";
    } else {
      ctx.rotate(mid);
      ctx.textAlign = "right";
    }

    ctx.fillStyle = "#fff";
    const fSize = W < 300 ? 9 : 11;
    ctx.font = `600 ${fSize}px -apple-system, sans-serif`;
    ctx.shadowColor = "rgba(0,0,0,0.7)";
    ctx.shadowBlur = 3;

    const maxChars = W < 300 ? 8 : 11;
    const label =
      cat.name.length > maxChars
        ? cat.name.slice(0, maxChars) + "…"
        : cat.name;

    const textX = onLeftHalf ? -(R - 8) : R - 8;
    // Draw emoji first (slightly larger), then name
    const emojiSize = fSize + 2;
    ctx.font = `${emojiSize}px -apple-system, sans-serif`;
    const emojiW = ctx.measureText(cat.emoji + " ").width;
    if (onLeftHalf) {
      ctx.fillText(cat.emoji + " ", textX, 4);
      ctx.font = `600 ${fSize}px -apple-system, sans-serif`;
      ctx.fillText(label, textX + emojiW, 4);
    } else {
      ctx.font = `600 ${fSize}px -apple-system, sans-serif`;
      const nameW = ctx.measureText(label).width;
      ctx.font = `${emojiSize}px -apple-system, sans-serif`;
      ctx.fillText(cat.emoji, textX - nameW - emojiW + ctx.measureText(cat.emoji).width, 4);
      ctx.font = `600 ${fSize}px -apple-system, sans-serif`;
      ctx.fillText(label, textX, 4);
    }

    ctx.restore();
  });

  // Center hub
  const hubR = W < 300 ? 14 : 18;
  ctx.beginPath();
  ctx.arc(CX, CY, hubR, 0, 2 * Math.PI);
  ctx.fillStyle = "#1e0838";
  ctx.fill();
  ctx.strokeStyle = "rgba(199,125,255,0.7)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(CX, CY, hubR * 0.5, 0, 2 * Math.PI);
  ctx.fillStyle = "#c77dff";
  ctx.fill();
}

// drawWheel draws segment i starting at: angle + i*SLICE - PI/2
// The pointer sits at -PI/2 (top). A segment i is under the pointer when:
//   angle + i*SLICE - PI/2 <= -PI/2 < angle + (i+1)*SLICE - PI/2
//   => 0 <= angle + i*SLICE < SLICE  => i = floor(-angle / SLICE)
function getTopIndex(angle) {
  const norm = ((-angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(norm / SLICE) % CATEGORIES.length;
}

// The resting angle whose midpoint lands exactly under the pointer.
// Segment midpoint = angle + index*SLICE - PI/2 + SLICE/2 = -PI/2
// => angle = -(index*SLICE + SLICE/2)
function angleForIndex(index) {
  return -(index * SLICE + SLICE / 2);
}

// ─── Easing ──────────────────────────────────────────────────────────────────

function easeOutQuart(t) {
  return 1 - Math.pow(1 - t, 4);
}

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * SpinWheel – drop-in replacement for SlotMachine.
 *
 * Props:
 *   selectedCategoryName  string  – the category the server picked
 *   onDone                fn      – called after countdown finishes
 */
export default function SlotMachine({ selectedCategoryName, onDone }) {
  const canvasRef = useRef(null);
  const angleRef = useRef(0);
  const rafRef = useRef(null);
  const onDoneRef = useRef(onDone);

  const [phase, setPhase] = useState("idle"); // idle | spinning | landed | result
  const [countdown, setCountdown] = useState(null);
  const [winnerIndex, setWinnerIndex] = useState(-1);

  useEffect(() => { onDoneRef.current = onDone; }, [onDone]);

  // Resize canvas to its displayed size (mobile-safe)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const size = Math.min(canvas.offsetWidth, 340);
      canvas.width = size;
      canvas.height = size;
      drawWheel(canvas, angleRef.current, winnerIndex);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    return () => ro.disconnect();
  }, [winnerIndex]);

  // Main animation sequence
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const targetIndex = Math.max(
      0,
      CATEGORIES.findIndex(
        (c) => c.name.trim().toLowerCase() === (selectedCategoryName || "").trim().toLowerCase()
      )
    );

    // Compute final resting angle so targetIndex midpoint is under the pointer
    const restAngle = angleForIndex(targetIndex);
    // Normalise to [-2PI, 0]
    const restNorm = ((restAngle % (2 * Math.PI)) - 2 * Math.PI);
    // Spin at least 8 full rotations forward (wheel rotates clockwise = angle decreases)
    const fullRotations = 8 + Math.floor(Math.random() * 4);
    const totalDelta = fullRotations * 2 * Math.PI + Math.abs(restNorm);

    const startAngle = 0;
    angleRef.current = startAngle;
    setPhase("spinning");
    setCountdown(null);
    setWinnerIndex(-1);

    const startTime = performance.now();
    let lastTickIdx = -1;
    let doneScheduled = false;

    function animate(now) {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / SPIN_DURATION, 1);
      const angle = startAngle - totalDelta * easeOutQuart(t);
      angleRef.current = angle;

      // Tick sound as segments pass
      const currentIdx = getTopIndex(angle);
      if (currentIdx !== lastTickIdx && t < 0.92) {
        const speed = 1 - t; // 1 = fast start, 0 = slow end
        if (speed > 0.05) {
          playTone(600 + currentIdx * 30, "square", 0.03, 0.08 * speed);
        }
        lastTickIdx = currentIdx;
      }

      drawWheel(canvas, angle, t >= 1 ? targetIndex : -1);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        // Landed
        angleRef.current = -totalDelta;
        drawWheel(canvas, angleRef.current, targetIndex);
        setPhase("landed");
        setWinnerIndex(targetIndex);

        // Land thud
        const ctx2 = getAudioCtx();
        const now2 = ctx2?.currentTime ?? null;
        playTone(180, "sawtooth", 0.14, 0.45, now2);
        playTone(1400, "sine", 0.18, 0.28, now2 !== null ? now2 + 0.08 : null);

        // Countdown 3-2-1-⚔️
        const ticks = [
          { count: 3, freq: 440, delay: 500 },
          { count: 2, freq: 550, delay: 1350 },
          { count: 1, freq: 660, delay: 2200 },
          { count: 0, freq: 0, delay: 3050 },
        ];

        ticks.forEach(({ count, freq, delay }) => {
          setTimeout(() => {
            setCountdown(count);
            if (count > 0) playTone(freq, "square", 0.08, 0.3);
            else {
              setPhase("result");
              playFanfare();
            }
          }, delay);
        });

        setTimeout(() => {
          if (!doneScheduled) {
            doneScheduled = true;
            onDoneRef.current?.();
          }
        }, 3700);
      }
    }

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [selectedCategoryName]);

  const winner = CATEGORIES[winnerIndex] ?? null;
  const accentColor =
    winnerIndex >= 0 ? SEGMENT_COLORS[winnerIndex % SEGMENT_COLORS.length] : "#c77dff";

  return (
    <div style={styles.overlay}>
      <style>{css}</style>

      <div style={styles.card}>
        {/* Rainbow strips */}
        <div style={styles.strip("top")} />
        <div style={styles.strip("bottom")} />

        {/* Header */}
        <div style={styles.header}>⚔️ Category Roulette ⚔️</div>

        {/* Wheel area */}
        <div style={styles.wheelWrap}>
          {/* Pointer */}
          <div style={styles.pointer} />

          <canvas
            ref={canvasRef}
            style={{
              ...styles.canvas,
              boxShadow: winnerIndex >= 0
                ? `0 0 0 3px ${accentColor}, 0 0 32px ${accentColor}88`
                : "none",
              transition: "box-shadow 400ms ease",
            }}
          />
        </div>

        {/* Result / countdown area */}
        <div style={styles.resultArea}>
          {winner && (phase === "landed" || phase === "result") && (
            <div
              style={{
                ...styles.resultBadge,
                border: `1px solid ${accentColor}`,
                background: `${accentColor}22`,
                boxShadow: `0 0 20px ${accentColor}44`,
                animation: "swReveal 420ms cubic-bezier(.2,.9,.25,1.2) both",
              }}
            >
              <span style={{ fontSize: "1.8rem" }}>{winner.emoji}</span>
              <span>
                <span style={styles.catLabel}>CATEGORY</span>
                <span style={{ ...styles.catName, color: accentColor }}>
                  {winner.name}
                </span>
              </span>
            </div>
          )}

          {countdown !== null && (
            <div
              key={countdown}
              style={{
                ...styles.countdown,
                color: accentColor,
                textShadow: `0 0 24px ${accentColor}88, 0 4px 0 rgba(0,0,0,0.5)`,
                fontSize: countdown === 0 ? "3.4rem" : "4rem",
                animation: "swCountPop 280ms cubic-bezier(.18,.9,.28,1.32) both",
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

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = {
  overlay: {
    position: "fixed",
    inset: 0,
    zIndex: 9999,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    background:
      "radial-gradient(circle at top, rgba(90,45,138,0.45), transparent 42%), rgba(26,5,51,0.94)",
    backdropFilter: "blur(6px)",
    WebkitBackdropFilter: "blur(6px)",
    animation: "swFade 220ms ease-out both",
  },
  card: {
    position: "relative",
    width: "min(420px, calc(100vw - 24px))",
    maxHeight: "calc(100vh - 24px)",
    overflow: "hidden",
    padding: "16px 16px 18px",
    background: "linear-gradient(175deg, #2a0d4a, #1e0838, #170630)",
    border: "1.5px solid #5a2d8a",
    borderRadius: 24,
    boxShadow:
      "0 24px 72px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08)",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  strip: (edge) => ({
    position: "absolute",
    left: 16,
    right: 16,
    [edge]: 8,
    height: 4,
    borderRadius: 999,
    background:
      "linear-gradient(90deg, #c77dff, #00e5ff, #ff4da6, #ffe135, #69ff47, #ff7043, #c77dff)",
    backgroundSize: "300% 100%",
    animation: "swRainbow 2.2s linear infinite",
    opacity: 0.75,
  }),
  header: {
    width: "fit-content",
    maxWidth: "100%",
    margin: "0 auto",
    padding: "7px 18px",
    borderRadius: 999,
    border: "1px solid rgba(199,125,255,0.42)",
    background: "rgba(199,125,255,0.1)",
    color: "#f0e8ff",
    fontFamily: "var(--font-display, sans-serif)",
    fontSize: "clamp(0.95rem, 4vw, 1.2rem)",
    letterSpacing: "1px",
    textAlign: "center",
    textShadow: "0 2px 0 rgba(0,0,0,0.4)",
  },
  wheelWrap: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  pointer: {
    position: "absolute",
    top: -2,
    left: "50%",
    transform: "translateX(-50%)",
    width: 0,
    height: 0,
    borderLeft: "11px solid transparent",
    borderRight: "11px solid transparent",
    borderTop: "26px solid #c77dff",
    filter: "drop-shadow(0 2px 6px rgba(199,125,255,0.8))",
    zIndex: 10,
  },
  canvas: {
    width: "100%",
    maxWidth: 360,
    height: "auto",
    aspectRatio: "1",
    display: "block",
    borderRadius: "50%",
    border: "2px solid rgba(90,45,138,0.9)",
  },

  resultArea: {
    minHeight: 100,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  resultBadge: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "9px 18px",
    borderRadius: 16,
    maxWidth: "100%",
  },
  catLabel: {
    display: "block",
    color: "#f0e8ff",
    fontFamily: "var(--font-ui, sans-serif)",
    fontSize: "0.65rem",
    fontWeight: 900,
    letterSpacing: "2px",
    lineHeight: 1,
    opacity: 0.7,
  },
  catName: {
    display: "block",
    fontFamily: "var(--font-display, sans-serif)",
    fontSize: "clamp(1rem, 4vw, 1.36rem)",
    lineHeight: 1.15,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  countdown: {
    fontFamily: "var(--font-display, sans-serif)",
    lineHeight: 0.92,
    animation: "swCountPop 280ms cubic-bezier(.18,.9,.28,1.32) both",
  },
};

const css = `
  @keyframes swFade {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes swRainbow {
    from { background-position: 0% 50%; }
    to   { background-position: 300% 50%; }
  }
  @keyframes swReveal {
    0%   { opacity: 0; transform: translateY(12px) scale(0.94); }
    72%  { opacity: 1; transform: translateY(-2px) scale(1.03); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes swCountPop {
    0%   { opacity: 0; transform: scale(0.45) rotate(-8deg); }
    62%  { opacity: 1; transform: scale(1.16) rotate(2deg); }
    100% { opacity: 1; transform: scale(1) rotate(0deg); }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 400ms !important; }
  }
`;
