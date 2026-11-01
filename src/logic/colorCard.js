export function hsvToHex({ h, s, v }) {
  const hue = ((h % 360) + 360) % 360;
  const saturation = Math.max(0, Math.min(100, s)) / 100;
  const value = Math.max(0, Math.min(100, v)) / 100;
  const chroma = value * saturation;
  const x = chroma * (1 - Math.abs((hue / 60) % 2 - 1));
  const channels = [[chroma, x, 0], [x, chroma, 0], [0, chroma, x], [0, x, chroma], [x, 0, chroma], [chroma, 0, x]][Math.floor(hue / 60)];
  return `#${channels.map((channel) => Math.round((channel + value - chroma) * 255).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

export function hexToHsv(hex) {
  const [r, g, b] = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255);
  const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
  let h = 0;
  if (delta) {
    h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? delta / max * 100 : 0, v: max * 100 };
}

export function cardInk(hex) {
  if (!hex) return "#FFFFFF";
  const luminance = [1, 3, 5].map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((channel) => channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4)
    .reduce((sum, channel, index) => sum + channel * [.2126, .7152, .0722][index], 0);
  return luminance > .179 ? "#10201D" : "#FFFFFF";
}

export function scoreFeedback(accuracy) {
  if (!Number.isFinite(accuracy)) return "No color, no glory. Even the blank card is waiting for a plot twist.";
  if (accuracy === 100) return "A perfect match. Your eyes deserve their own trophy.";
  if (accuracy >= 98) return "Suspiciously precise. Are your eyes a color printer?";
  if (accuracy >= 95) return "Incredible memory. The color wheel sends its respect.";
  if (accuracy >= 90) return "That color stayed rent-free in your brain.";
  if (accuracy >= 80) return "Close! Your memory kept most of the receipt.";
  if (accuracy >= 65) return "Same neighborhood. Definitely the wrong house.";
  if (accuracy >= 45) return "Your memory ordered the color from a sketchy website.";
  if (accuracy >= 25) return "You remembered a color. From a completely different round.";
  if (accuracy >= 10) return "The target called. It wants to know who this stranger is.";
  return "A raccoon with a paint roller remembers a different color, too.";
}
