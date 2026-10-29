// Exercise the real client screens without depending on a live game server.
// Only the Socket.IO transport is replaced; components and handlers run normally.
export const players = [
  { id: "mobile-player", username: "AlexandraMobile", ready: false, wins: 1 },
  { id: "opponent", username: "ChallengerMobile", ready: false, wins: 2 },
];
export const room = {
  code: "ABCD1234", players, turnDuration: 30, roundLimit: 3,
  creatorId: "mobile-player", mode: "duel",
};
export const game = {
  ...room, category: "Historical Figures", myWord: "CHRYSANTHEMUM",
  myWordLetterCount: 13, opponentLetterCount: 13,
  currentTurn: "mobile-player", roundNumber: 1,
};
export const result = {
  ...room, winnerId: "opponent", winnerName: players[1].username,
  roundNumber: 3, seriesOver: true, seriesWinnerName: players[1].username,
  wordsByPlayer: { "mobile-player": "CHRYSANTHEMUM", opponent: "HIPPOPOTAMUS" },
};

export async function installServerFixture(page) {
  await page.route("https://fonts.googleapis.com/**", route => route.abort());
  await page.route("https://fonts.gstatic.com/**", route => route.abort());
  await page.route("**/node_modules/.vite/deps/socket__io-client.js*", route => route.fulfill({
    contentType: "application/javascript",
    body: `
      const listeners = new Map();
      const socket = {
        id: "mobile-player", connected: true, sent: [],
        on(event, handler) {
          if (!listeners.has(event)) listeners.set(event, new Set());
          listeners.get(event).add(handler);
          return this;
        },
        off(event, handler) {
          if (handler) listeners.get(event)?.delete(handler);
          else listeners.delete(event);
          return this;
        },
        emit(event, data) { this.sent.push({ event, data }); return this; },
        listening(event) { return Boolean(listeners.get(event)?.size); },
        receive(event, data) {
          [...(listeners.get(event) || [])].forEach(handler => handler(data));
        },
      };
      window.testSocket = socket;
      export const io = () => socket;
    `,
  }));
}

export async function receive(page, event, data) {
  await page.waitForFunction(event => window.testSocket?.listening(event), event);
  await page.evaluate(({ event, data }) => window.testSocket.receive(event, data), { event, data });
}
