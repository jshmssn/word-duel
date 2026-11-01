const KEY = "gamifyluv:room-session";

export function readRoomSession() {
  try {
    const session = JSON.parse(sessionStorage.getItem(KEY));
    return session?.code && session?.token && session?.playerId ? session : null;
  } catch { return null; }
}

export function saveRoomSession(session) {
  try { sessionStorage.setItem(KEY, JSON.stringify(session)); } catch { /* The live socket still works without storage. */ }
}

export function clearRoomSession() {
  try { sessionStorage.removeItem(KEY); } catch { /* Storage is optional. */ }
}
