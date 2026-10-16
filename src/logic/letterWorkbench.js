// Reconcile a local hypothesis with authoritative unordered server clues.
export function reconcileSlots(previous, confirmed, length) {
  const available = new Map();
  confirmed.forEach((letter) => available.set(letter, (available.get(letter) || 0) + 1));
  const next = Array.from({ length }, (_, index) => {
    const letter = previous[index];
    if (!letter || !available.get(letter)) return null;
    available.set(letter, available.get(letter) - 1);
    return letter;
  });
  for (const [letter, count] of available) {
    for (let i = 0; i < count; i++) {
      const free = next.indexOf(null);
      if (free < 0) return next;
      next[free] = letter;
    }
  }
  return next;
}
