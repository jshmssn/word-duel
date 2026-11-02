import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, game, players } from "./serverFixture.js";

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.clock.install();
  await page.goto("/");
});

async function colorGame(page, roundId = "draft-card") {
  const now = await page.evaluate(() => Date.now());
  return { ...room, gameMode: "color-card", roundId, phase: "picking", roundNumber: 1, totalRounds: 2,
    memorizeEndsAt: now, roundEndsAt: now + 60000, roundDuration: 60, submittedPlayerIds: [], serverNow: now };
}

test("a chat draft and open state survive closing, cards, results, prompts and room restoration", async ({ page }) => {
  await receive(page, "room-created", room);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Chat message" });
  await input.fill("An unfinished message");
  await input.press("Escape");
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await expect(input).toHaveValue("An unfinished message");
  const state = await colorGame(page);
  await receive(page, "START_GAME", state);
  await expect(input).toHaveValue("An unfinished message");
  const vote = { id: "draft-vote", status: "active", endsAt: state.roundEndsAt - 10000, requiredYes: 2, totalPlayers: 2, yesPlayerIds: [], noPlayerIds: [] };
  await receive(page, "COLOR_SKIP_VOTE", { code: room.code, roundId: state.roundId, vote });
  await expect(input).toHaveValue("An unfinished message");
  await page.getByRole("button", { name: "Back to my color" }).click();
  const result = { ...room, gameMode: "color-card", roundId: state.roundId, phase: "review", roundNumber: 1, totalRounds: 2,
    reviewEndsAt: state.roundEndsAt + 5000, rankingEndsAt: state.roundEndsAt + 15000, entries: [], winners: [], winnerIds: [], standings: [], matchWinnerIds: [] };
  await receive(page, "ROUND_RESULTS", result);
  await expect(input).toHaveValue("An unfinished message");
  await receive(page, "COLOR_RANKINGS", { ...result, phase: "ranking" });
  await expect(input).toHaveValue("An unfinished message");
  await receive(page, "START_GAME", { ...state, roundId: "second-card", roundNumber: 2 });
  await expect(input).toHaveValue("An unfinished message");
  await receive(page, "room-restored", { ...room, gameMode: "color-card", playerId: players[0].id, screen: "game", pausedAt: null, serverNow: state.serverNow,
    gameState: { ...state, roundId: "second-card" }, chatMessages: [] });
  await expect(input).toHaveValue("An unfinished message");
  await page.getByRole("button", { name: "Send message", exact: true }).click();
  await expect(input).toHaveValue("");
  expect(await page.evaluate(() => window.testSocket.sent.filter((entry) => entry.event === "chat-message").length)).toBe(1);
});

test("Word Duel interaction prompts preserve the chat draft", async ({ page }) => {
  await receive(page, "room-created", room);
  await receive(page, "game-start", game);
  await page.getByRole("button", { name: "Open chat", exact: true }).click();
  await page.getByRole("textbox", { name: "Chat message" }).fill("Still typing");
  await receive(page, "letter-ask-prompt", { askerName: players[1].username, letter: "A" });
  await expect(page.getByRole("textbox", { name: "Chat message" })).toHaveValue("Still typing");
});

for (const device of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, mobile: false },
  { name: "narrow desktop window", viewport: { width: 390, height: 844 }, mobile: false },
  { name: "phone portrait", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "phone landscape", viewport: { width: 844, height: 390 }, mobile: true },
  { name: "tablet", viewport: { width: 1024, height: 768 }, mobile: true },
]) {
  test.describe(device.name, () => {
    test.use({ viewport: device.viewport, hasTouch: device.mobile, isMobile: device.mobile });
    test("new color cards close mobile chat while preserving the draft and desktop open state", async ({ page }) => {
      await receive(page, "room-created", { ...room, gameMode: "color-card" });
      await page.getByRole("button", { name: "Open chat", exact: true }).click();
      const input = page.getByRole("textbox", { name: "Chat message" });
      await input.fill("Keep this draft between cards");
      const base = await colorGame(page);
      const state = { ...base, phase: "memorizing", targetColor: "#123456", memorizeEndsAt: base.serverNow + 5000 };
      for (const roundId of ["first-mobile-card", "next-mobile-card"]) {
        await receive(page, "START_GAME", { ...state, roundId });
        if (device.mobile) {
          await expect(page.getByRole("region", { name: "Room chat" })).toHaveCount(0);
          await expect(page.getByTestId("target-color")).toBeVisible();
          await page.getByRole("button", { name: "Open chat", exact: true }).click();
        }
        await expect(input).toHaveValue("Keep this draft between cards");
        // A duplicate start or reconnection snapshot for this card must not
        // close a chat the player deliberately reopened during the card.
        await receive(page, "START_GAME", { ...state, roundId });
        await receive(page, "room-restored", { ...room, gameMode: "color-card", playerId: players[0].id, screen: "game", pausedAt: null,
          serverNow: state.serverNow, gameState: { ...state, roundId }, chatMessages: [] });
        await expect(input).toHaveValue("Keep this draft between cards");
      }
    });
  });
}

test("the waiting room uses a reconnecting name tag and never shows the pause modal", async ({ page }) => {
  await receive(page, "room-session", { code: room.code, playerId: players[0].id, token: "waiting-token" });
  await receive(page, "room-created", room);
  await receive(page, "ready-update", { ...room, players: [players[0], { ...players[1], connected: false, connectionStatus: "reconnecting" }] });
  const row = page.locator(".player-card").filter({ hasText: players[1].username });
  await expect(row.locator(".player-name-fun")).toContainText("Reconnecting");
  await expect(page.locator(".room-pause-overlay")).toHaveCount(0);
  await receive(page, "disconnect", {});
  await expect(page.locator(".room-pause-overlay")).toHaveCount(0);
  await expect(page.locator(".player-card").filter({ hasText: players[0].username }).locator(".player-name-fun")).toContainText("Reconnecting");
});

test("the pause dialog lists every connection and offers a kick vote after 45 seconds", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await receive(page, "room-created", room);
  const state = await colorGame(page);
  await receive(page, "START_GAME", state);
  const roster = [players[0], { ...players[1], connected: false, connectionStatus: "reconnecting", kickEligibleAt: state.serverNow + 45000 },
    { id: "third", username: "Third player", connected: false, connectionStatus: "disconnected", kickEligibleAt: state.serverNow + 45000 }];
  await receive(page, "ROOM_PAUSED", { code: room.code, players: roster, pausedAt: state.serverNow, serverNow: state.serverNow, kickVotes: [] });
  const dialog = page.getByRole("dialog", { name: "Room paused" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("Player connections")).toContainText(players[0].username);
  await expect(dialog.getByText("Connected", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Reconnecting", { exact: true })).toBeVisible();
  await expect(dialog.getByText("Disconnected", { exact: true })).toBeVisible();
  await expect(dialog.getByRole("button", { name: `Vote to kick ${players[1].username}` })).toHaveCount(0);
  await page.clock.fastForward(45000);
  const vote = { id: "kick-poll", playerId: players[1].id, totalPlayers: 1, requiredYes: 1, yesPlayerIds: [], noPlayerIds: [] };
  await receive(page, "ROOM_KICK_VOTES", { code: room.code, players: roster, kickVotes: [vote], serverNow: state.serverNow + 45000 });
  const kick = dialog.getByRole("button", { name: `Vote to kick ${players[1].username}` });
  await kick.click();
  await expect(kick).toBeDisabled();
  expect(await page.evaluate(() => window.testSocket.sent.filter((entry) => entry.event === "VOTE_ROOM_KICK").map((entry) => entry.data))).toEqual([
    { code: room.code, playerId: players[1].id, voteId: vote.id, choice: "yes" },
  ]);
  await page.evaluate(() => window.testSocket.acknowledge("VOTE_ROOM_KICK", { success: true }));
  await receive(page, "ROOM_RESUMED", { code: room.code, players: [players[0]], message: "The game has resumed." });
  await expect(dialog).toHaveCount(0);
});

test("duplicate skip-vote events and acknowledgements produce one confirmation toast", async ({ page }) => {
  await receive(page, "room-created", room);
  const state = await colorGame(page);
  await receive(page, "START_GAME", state);
  const vote = { id: "single-notice", status: "active", endsAt: state.roundEndsAt - 10000, requiredYes: 2, totalPlayers: 2, yesPlayerIds: [], noPlayerIds: [] };
  const event = { code: room.code, roundId: state.roundId, vote };
  await receive(page, "COLOR_SKIP_VOTE", event);
  const dialog = page.getByRole("dialog", { name: "Vote to skip time" });
  await expect(dialog).toBeVisible();
  const yes = dialog.getByRole("button", { name: "Yes, show results", exact: true });
  await yes.click();
  await page.evaluate(() => {
    window.testSocket.acknowledge("VOTE_COLOR_SKIP", { success: true });
    window.testSocket.acknowledge("VOTE_COLOR_SKIP", { success: true });
  });
  await receive(page, "COLOR_SKIP_VOTE", { ...event, vote: { ...vote, yesPlayerIds: [players[0].id] } });
  await receive(page, "COLOR_SKIP_VOTE", { ...event, vote: { ...vote, yesPlayerIds: [players[0].id] } });
  await expect(yes).toBeDisabled();
  await expect(page.locator(".feedback-toast").filter({ hasText: "Vote recorded:" })).toHaveCount(1);
  expect(await page.evaluate(() => window.testSocket.sent.filter((entry) => entry.event === "VOTE_COLOR_SKIP").length)).toBe(1);
  await page.clock.fastForward(6000);
  await expect(page.locator(".feedback-toast").filter({ hasText: "Vote recorded:" })).toHaveCount(0);
});
