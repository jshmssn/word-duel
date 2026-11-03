import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, game, players } from "./serverFixture.js";

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.clock.install();
  await page.goto("/");
});

for (const mode of ["word-duel", "color-card"]) {
  test(`${mode}: a 30 second mobile interruption keeps the game and restores the stable player seat`, async ({ page }) => {
    const session = { code: room.code, playerId: "mobile-player", token: "private-test-token" };
    await receive(page, "room-session", session);
    await receive(page, "room-created", { ...room, gameMode: mode });
    const now = await page.evaluate(() => Date.now());
    const state = { ...game, gameMode: mode, roundId: "reconnect-round", phase: "picking", roundNumber: 1, totalRounds: 5,
      memorizeEndsAt: now, roundEndsAt: now + 30000, roundDuration: 30, submittedPlayerIds: [], serverNow: now };
    await receive(page, mode === "color-card" ? "START_GAME" : "game-start", state);
    await receive(page, "disconnect", {});
    await expect(page.locator(".room-pause-overlay")).toBeVisible();
    await expect(page.getByRole("button", { name: "Reconnect", exact: true })).toBeEnabled();
    await page.clock.fastForward(30000);
    await expect(page.locator(mode === "color-card" ? ".color-card-screen" : ".game-screen")).toBeVisible();
    if (mode === "color-card") await expect(page.locator(".color-timer .timer-seconds")).toHaveText("30s");
    await page.evaluate(() => { window.testSocket.id = "new-transport-id"; });
    await receive(page, "connect", {});
    await expect(page.getByRole("button", { name: "Reconnect", exact: true })).toBeDisabled();
    await expect.poll(() => page.evaluate(() => window.testSocket.sent.find((entry) => entry.event === "resume-room")?.data)).toEqual(session);
    await receive(page, "room-restored", {
      ...room, gameMode: mode, playerId: "mobile-player", screen: "game", pausedAt: null, serverNow: now + 30000, chatMessages: [],
      gameState: { ...state, memorizeEndsAt: now + 30000, roundEndsAt: now + 60000, myDraft: "#66CCCC", submittedPlayerIds: ["mobile-player"], confirmedLetters: ["C", "A"], askedLetters: { A: "yes" }, currentTurn: "mobile-player", timerRemaining: 23 },
    });
    await page.evaluate(() => window.testSocket.acknowledge("resume-room", { success: true }));
    await expect(page.locator(".room-pause-overlay")).toHaveCount(0);
    if (mode === "color-card") {
      await expect(page.getByTestId("picked-color")).toHaveCSS("background-color", "rgb(102, 204, 204)");
      await expect(page.getByRole("button", { name: "Answer submitted" })).toBeDisabled();
      await page.getByRole("button", { name: "Edit answer" }).click();
      await page.evaluate(() => window.testSocket.acknowledge("EDIT_COLOR", { success: true }));
      await receive(page, "SUBMISSION_UPDATE", { code: room.code, roundId: state.roundId, submittedPlayerIds: [] });
      await expect(page.getByRole("slider", { name: "Hue", exact: true })).toBeEnabled();
    } else {
      await expect(page.getByRole("button", { name: /Ask about A;/ })).toBeDisabled();
      await expect(page.locator(".timer-seconds")).toHaveText("23s");
      await page.getByRole("button", { name: "Ask about B", exact: true }).click();
    }
    await expect(page.locator(".quit-room")).toBeEnabled();
  });
}

for (const mode of ["word-duel", "color-card", "finish-word"]) {
  test(`${mode}: Reconnect only appears when your own seat needs recovery`, async ({ page }) => {
    const session = { code: room.code, playerId: players[0].id, token: "own-seat-token" };
    const roster = players.map((player, index) => ({ ...player, connected: true, characterId: index ? "wizard" : "knight", lives: 3, isAlive: true }));
    const match = { ...room, gameMode: mode, players: roster };
    await receive(page, "room-session", session);
    await receive(page, "room-created", match);
    const now = await page.evaluate(() => Date.now());
    const state = { ...game, ...match, status: "PLAYING", gameId: "own-seat-match", currentPlayerId: roster[0].id, currentTurnIndex: 0,
      turnId: "turn-1", turnDuration: 15, turnEndsAt: now + 15000, serverNow: now, lastWord: null, requiredPrefix: "a",
      usedWords: [], successfulTurns: 0, hardModeAfter: 10, hardMode: false, typingText: "", history: [],
      roundId: "own-seat-round", phase: "picking", roundNumber: 1, totalRounds: 5, memorizeEndsAt: now,
      roundEndsAt: now + 30000, roundDuration: 30, submittedPlayerIds: [] };
    await receive(page, mode === "finish-word" ? "turn_start" : mode === "color-card" ? "START_GAME" : "game-start", state);
    const pausedRoster = [roster[0], { ...roster[1], connected: false, connectionStatus: "reconnecting" }];
    const pause = { code: room.code, players: pausedRoster, pausedAt: now, serverNow: now, kickVotes: [], message: "ChallengerMobile is reconnecting. The room and timers are paused." };
    await receive(page, "ROOM_PAUSED", pause);
    const dialog = page.getByRole("dialog", { name: "Room paused" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Reconnect", exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Quit room", exact: true })).toBeEnabled();

    // A live transport can still need to reclaim a suspended player seat.
    await receive(page, "ROOM_PAUSED", { ...pause, players: [{ ...roster[0], connected: false }, pausedRoster[1]] });
    const reconnect = page.getByRole("button", { name: "Reconnect", exact: true });
    await expect(reconnect).toBeEnabled();
    await reconnect.click();
    expect(await page.evaluate(() => window.testSocket.sent.filter((entry) => entry.event === "resume-room").map((entry) => entry.data))).toEqual([session]);
    await page.evaluate(() => window.testSocket.acknowledge("resume-room", { success: true }));
    const restored = { ...match, playerId: players[0].id, screen: "game", pausedAt: now, serverNow: now, players: pausedRoster,
      gameState: { ...state, players: pausedRoster, pausedAt: now }, chatMessages: [] };
    await receive(page, "room-restored", restored);
    await expect(dialog).toBeVisible();
    await expect(reconnect).toHaveCount(0);

    await receive(page, "disconnect", {});
    await expect(reconnect).toBeEnabled();
    await reconnect.click();
    await expect(page.getByRole("dialog", { name: "Restoring your room…" })).toBeVisible();
    await expect(reconnect).toBeDisabled();
    await receive(page, "room-restored", restored);
    await page.evaluate(() => window.testSocket.acknowledge("resume-room", { success: true }));
    await expect(dialog).toBeVisible();
    await expect(reconnect).toHaveCount(0);
  });
}

test("a failed session recovery still offers Reconnect when the transport and roster appear connected", async ({ page }) => {
  const session = { code: room.code, playerId: players[0].id, token: "retry-token" };
  await receive(page, "room-session", session);
  await receive(page, "room-created", room);
  await receive(page, "game-start", game);
  await page.evaluate(() => {
    const original = window.testSocket.emitWithAck;
    window.testSocket.emitWithAck = function (event, data) {
      if (event === "resume-room") {
        this.emitWithAck = original;
        return Promise.reject(new Error("operation has timed out"));
      }
      return original.call(this, event, data);
    };
  });
  await receive(page, "connect", {});
  const dialog = page.getByRole("dialog", { name: "Room paused" });
  await expect(dialog).toContainText("Could not restore the room yet.");
  const reconnect = dialog.getByRole("button", { name: "Reconnect", exact: true });
  await expect(reconnect).toBeEnabled();
  await reconnect.click();
  expect(await page.evaluate(() => window.testSocket.sent.find((entry) => entry.event === "resume-room")?.data)).toEqual(session);
  await page.evaluate(() => window.testSocket.acknowledge("resume-room", { success: true }));
  await receive(page, "room-restored", { ...room, gameMode: "word-duel", playerId: players[0].id, screen: "game", pausedAt: null,
    serverNow: await page.evaluate(() => Date.now()), gameState: game, chatMessages: [] });
  await expect(dialog).toHaveCount(0);
});

test("app visibility changes request pause and recovery, while an expired reservation returns home", async ({ page }) => {
  const session = { code: room.code, playerId: players[0].id, token: "test-token" };
  await receive(page, "room-session", session);
  await receive(page, "room-created", room);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  expect(await page.evaluate(() => window.testSocket.sent.some((entry) => entry.event === "suspend-room" && entry.data.code === "ABCD1234"))).toBe(true);
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.evaluate(() => window.testSocket.acknowledge("resume-room", { success: false, message: "Your room reservation expired." }));
  await expect(page.locator(".lobby-screen")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.getItem("gamifyluv:room-session"))).toBeNull();
});
