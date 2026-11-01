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
    await page.clock.fastForward(30000);
    await expect(page.locator(mode === "color-card" ? ".color-card-screen" : ".game-screen")).toBeVisible();
    if (mode === "color-card") await expect(page.locator(".color-timer .timer-seconds")).toHaveText("30s");
    await page.evaluate(() => { window.testSocket.id = "new-transport-id"; });
    await receive(page, "connect", {});
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
