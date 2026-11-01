import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, game, players } from "./serverFixture.js";

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.goto("/");
});

test("landing previews and instructions follow the selected mode; home uses GamifyLuv", async ({ page }) => {
  await expect(page).toHaveTitle("GamifyLuv");
  await expect(page.locator(".brand-copy")).toContainText("GamifyLuv");
  await expect(page.locator(".hero-headline")).toContainText("YOUR PLAYGROUND");
  await expect(page.locator(".platform-description")).toContainText("Word Duel");
  await expect(page.locator(".platform-description")).toContainText("Color Card");
  await page.getByRole("button", { name: /Color Card Remember/ }).click();
  await expect(page.locator("#room-game-mode")).toHaveValue("color-card");
  await expect(page.locator(".mode-preview-heading")).toContainText("Color Card");
  await expect(page.locator(".color-arena-preview")).toBeVisible();
  await expect(page.locator(".lobby-howto")).toContainText("Mix your color");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toContainText("COLOR CARD · HOW TO PLAY");
  await expect(page.getByRole("dialog")).toContainText(/hue/i);
  await page.getByRole("button", { name: "Close instructions" }).click();
  await page.locator("#room-game-mode").selectOption("word-duel");
  await expect(page.locator(".mode-preview-heading")).toContainText("Word Duel");
  await page.getByRole("button", { name: "How to play" }).click();
  await expect(page.getByRole("dialog")).toContainText("WORD DUEL · HOW TO PLAY");
  await expect(page.getByRole("dialog")).toContainText("Investigate the letters");
});

for (const mode of ["word-duel", "color-card"]) {
  for (const phase of ["waiting", "game"]) {
    test(`${mode}: server-confirmed quit from ${phase} clears the room and restores home`, async ({ page }) => {
      await receive(page, "room-created", { ...room, gameMode: mode });
      if (phase === "game") {
        const now = Date.now();
        await receive(page, mode === "color-card" ? "START_GAME" : "game-start", {
          ...game, gameMode: mode, roundId: "quit-test", phase: "memorizing", targetColor: "#A34F2E",
          memorizeEndsAt: now + 5000, roundEndsAt: now + 35000, submittedPlayerIds: [],
        });
      }
      await expect(page.locator(".brand-copy")).toContainText(mode === "color-card" ? "Color Card" : "Word Duel");
      await page.locator(".site-header").getByRole("button", { name: "Quit room" }).click();
      await expect(page.locator(".quit-room")).toBeDisabled();
      expect(await page.evaluate(() => window.testSocket.sent.find((event) => event.event === "leave-room").data)).toEqual({ code: room.code });
      await page.evaluate(() => window.testSocket.acknowledge("leave-room", { success: true }));
      await expect(page.locator(".lobby-screen")).toBeVisible();
      await expect(page.locator(".feedback-toast").last()).toContainText("You quit the room");
      await expect(page).toHaveTitle("GamifyLuv");
      await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("game-viewport"))).toBe(false);
    });
  }
}

test("quit failures allow retry; a departure appears once in chat and in a toast", async ({ page }) => {
  await receive(page, "room-created", room);
  await page.getByRole("button", { name: "Quit room" }).click();
  await page.evaluate(() => window.testSocket.acknowledge("leave-room", { success: false, message: "Please retry." }));
  await expect(page.locator(".feedback-toast").last()).toContainText("Please retry");
  await expect(page.getByRole("button", { name: "Quit room" })).toBeEnabled();
  await receive(page, "game-start", game);
  const message = "ChallengerMobile quit the room. The round was cancelled; ready up to play again.";
  await receive(page, "chat-message", { id: "departure", system: true, text: message, timestamp: Date.now() });
  await receive(page, "player-left", { playerId: "opponent", username: players[1].username, message });
  await receive(page, "rematch-lobby", { ...room, players: [players[0]], departure: true, message });
  await expect(page.locator(".waiting-screen")).toBeVisible();
  await expect(page.locator(".feedback-toast")).toContainText([message]);
  await page.getByRole("button", { name: "Open chat" }).click();
  await expect(page.locator(".chat-system-msg")).toContainText(["Game started! Good luck!", message]);
});

test("room actions and server responses consistently show toasts for participants", async ({ page }) => {
  await page.locator("#player-username").fill("Host");
  await receive(page, "join-error", { message: "Room not found." });
  await expect(page.locator(".feedback-toast").last()).toContainText("Room not found");
  await receive(page, "room-created", room);
  await receive(page, "ready-update", { ...room, changedPlayerId: "opponent", players: [players[0], { ...players[1], ready: true }] });
  await expect(page.locator(".feedback-toast").last()).toContainText("ChallengerMobile is ready!");
  await receive(page, "turn-duration-update", { turnDuration: 45 });
  await expect(page.locator(".feedback-toast").last()).toContainText("45 seconds");
  await receive(page, "round-limit-update", { roundLimit: 5 });
  await expect(page.locator(".feedback-toast").last()).toContainText("best of 5");
  await receive(page, "COLOR_DURATION_UPDATED", { code: room.code, colorDuration: 60 });
  await expect(page.locator(".feedback-toast").last()).toContainText("60 seconds");
  await receive(page, "COLOR_CARD_COUNT_UPDATED", { code: room.code, colorCardCount: 7 });
  await expect(page.locator(".feedback-toast").last()).toContainText("7 color cards");
  await receive(page, "COLOR_PLAYER_ACTION", { username: players[1].username, playerId: "opponent", action: "submitted" });
  await expect(page.locator(".feedback-toast").last()).toContainText("ChallengerMobile submitted a color");
  await receive(page, "game-start", game);
  await receive(page, "letter-result", { askerId: "opponent", askerName: players[1].username, letter: "A", hasLetter: true });
  await expect(page.locator(".feedback-toast").last()).toContainText("ChallengerMobile asked about A: yes");
});

for (const viewport of [{ width: 280, height: 653 }, { width: 390, height: 844 }, { width: 667, height: 320 }, { width: 1024, height: 768 }, { width: 1440, height: 900 }]) {
  test(`gameplay stays in one viewport at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await receive(page, "room-created", room);
    for (const mode of ["word-duel", "color-card"]) {
      const now = Date.now();
      await receive(page, mode === "word-duel" ? "game-start" : "START_GAME", {
        ...game, gameMode: mode, roundId: "viewport", phase: "picking", roundNumber: 1, totalRounds: 5,
        memorizeEndsAt: now - 5000, roundEndsAt: now + 60000, submittedPlayerIds: [],
      });
      await expect.poll(() => page.evaluate(() => ({
        scroll: scrollY,
        overflow: document.documentElement.scrollHeight > innerHeight,
        width: document.documentElement.scrollWidth > innerWidth,
      }))).toEqual({ scroll: 0, overflow: false, width: false });
      await page.mouse.wheel(0, 500);
      expect(await page.evaluate(() => scrollY)).toBe(0);
      const controls = mode === "word-duel" ? page.getByRole("button", { name: "Ask about A", exact: true }) : page.getByRole("button", { name: "Submit Color", exact: true });
      await expect(controls).toBeVisible();
      await controls.click();
      await expect(page.locator(".quit-room")).toBeVisible();
    }
  });
}
