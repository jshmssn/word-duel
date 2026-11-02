import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, players } from "./serverFixture.js";

const cast = ["knight", "wizard", "ninja", "robot", "alien", "pirate", "astronaut", "dino"];
const roster = players.map((player, index) => ({ ...player, connected: true, characterId: cast[index], lives: 3, isAlive: true }));
const finishRoom = { ...room, gameMode: "finish-word", players: roster, maxPlayers: 8 };

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.clock.install();
  await page.goto("/");
});

async function start(page, overrides = {}) {
  await receive(page, "room-created", finishRoom);
  const now = await page.evaluate(() => Date.now());
  const state = { ...finishRoom, status: "PLAYING", gameId: "word-match", currentPlayerId: roster[0].id, currentTurnIndex: 0,
    turnId: "turn-1", turnDuration: 10, turnEndsAt: now + 10000, serverNow: now, lastWord: null,
    requiredPrefix: "a", usedWords: [], successfulTurns: 0, hardModeAfter: 10, hardMode: false, typingText: "", history: [],
    ...overrides };
  await receive(page, "turn_start", state);
  return state;
}

test("Finish the Word is discoverable with its own preview, room option and instructions", async ({ page }) => {
  await page.getByRole("button", { name: /Finish the Word Link/ }).click();
  await expect(page.locator("#room-game-mode")).toHaveValue("finish-word");
  await expect(page.getByLabel("A sample word chain")).toBeVisible();
  await expect(page.locator(".mode-preview-heading")).toContainText("Finish the Word");
  await expect(page.getByRole("button", { name: /Create Finish the Word room/ })).toBeVisible();
  await page.getByRole("button", { name: "How to play", exact: true }).click();
  const rules = page.getByRole("dialog");
  await expect(rules).toContainText("Choose your character");
  await expect(rules).toContainText("Ten seconds. One word.");
  await expect(rules).toContainText("three hearts");
});

test("lobby selection locks occupied characters, releases switched characters and enables the host start", async ({ page }) => {
  const unselected = roster.map((player) => ({ ...player, characterId: null }));
  await receive(page, "room-created", { ...finishRoom, players: unselected });
  await expect(page.getByRole("button", { name: "Start Finish the Word" })).toBeDisabled();
  await page.getByTestId("character-knight").click();
  expect(await page.evaluate(() => window.testSocket.sent.find((entry) => entry.event === "select_character")?.data)).toEqual({ code: room.code, characterId: "knight" });
  await page.evaluate(() => window.testSocket.acknowledge("select_character", { success: true }));
  await receive(page, "character_selected", { ...finishRoom, players: roster });
  await expect(page.getByTestId("character-knight")).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByTestId("character-wizard")).toBeDisabled();
  await expect(page.getByTestId("character-wizard")).toContainText(roster[1].username);
  await expect(page.getByRole("button", { name: "Start Finish the Word" })).toBeEnabled();
  await page.getByTestId("character-robot").click();
  await page.evaluate(() => window.testSocket.acknowledge("select_character", { success: true }));
  await receive(page, "character_selected", { ...finishRoom, players: [{ ...roster[0], characterId: "robot" }, roster[1]] });
  await expect(page.getByTestId("character-knight")).toBeEnabled();
  await expect(page.getByTestId("character-robot")).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Start Finish the Word" }).click();
  expect(await page.evaluate(() => window.testSocket.sent.filter((entry) => entry.event === "start_game").map((entry) => entry.data))).toEqual([{ code: room.code }]);
});

test("active typing broadcasts, word submission is bound to the turn, and the camera follows the next player", async ({ page }) => {
  const state = await start(page);
  const input = page.getByRole("textbox", { name: "Your word" });
  await expect(input).toBeFocused();
  await expect(page.getByTestId("required-prefix")).toHaveText("A");
  const initialCamera = await page.getByTestId("finish-word-camera").getAttribute("style");
  await input.fill("Apple");
  await page.clock.fastForward(60);
  await expect.poll(() => page.evaluate(() => window.testSocket.sent.filter((entry) => entry.event === "player_typing").at(-1)?.data)).toEqual({ code: room.code, turnId: state.turnId, text: "Apple" });
  await expect(page.getByTestId("live-word-bubble")).toHaveText("Apple");
  await page.getByRole("button", { name: "Submit word", exact: true }).click();
  await expect(input).toBeDisabled();
  expect(await page.evaluate(() => window.testSocket.sent.find((entry) => entry.event === "submit_word")?.data)).toEqual({ code: room.code, turnId: state.turnId, word: "Apple" });
  await page.evaluate(() => window.testSocket.acknowledge("submit_word", { success: true, accepted: true }));
  const next = { ...state, turnId: "turn-2", currentPlayerId: roster[1].id, currentTurnIndex: 1, lastWord: "apple", requiredPrefix: "e", usedWords: ["apple"], successfulTurns: 1 };
  await receive(page, "turn_start", next);
  await expect(input).toBeDisabled();
  await expect(page.getByTestId("finish-word-camera")).toHaveAttribute("data-active-player", roster[1].id);
  expect(await page.getByTestId("finish-word-camera").getAttribute("style")).not.toBe(initialCamera);
  await receive(page, "player_typing", { code: room.code, gameId: state.gameId, turnId: next.turnId, playerId: roster[1].id, text: "Elephant" });
  await expect(page.getByTestId("live-word-bubble")).toContainText("Elephant");
  await receive(page, "player_typing", { code: room.code, gameId: state.gameId, turnId: state.turnId, playerId: roster[0].id, text: "stale" });
  await expect(page.getByTestId("live-word-bubble")).toContainText("Elephant");
});

test("hard mode, heart loss, elimination, results and rematch use authoritative snapshots", async ({ page }) => {
  const state = await start(page, { requiredPrefix: "le", hardMode: true, successfulTurns: 10, lastWord: "apple" });
  await expect(page.getByTestId("required-prefix")).toHaveText("LE");
  await expect(page.locator(".finish-word-difficulty")).toContainText("HARD MODE");
  const damaged = [{ ...roster[0], lives: 2 }, roster[1]];
  await receive(page, "turn_start", { ...state, turnId: "turn-2", players: damaged, currentPlayerId: roster[1].id });
  await expect(page.getByRole("article", { name: `${roster[0].username}, 2 lives`, exact: true }).getByRole("img", { name: "2 lives remaining" })).toHaveCount(1);
  const eliminated = [{ ...roster[0], lives: 0, isAlive: false }, roster[1]];
  await receive(page, "game_state", { ...state, turnId: "turn-3", players: eliminated, currentPlayerId: roster[1].id });
  await expect(page.getByRole("textbox", { name: "Your word" })).toBeDisabled();
  await expect(page.locator(".finish-word-actor.eliminated")).toHaveCount(1);
  await receive(page, "game_over", { ...state, status: "ENDED", currentPlayerId: null, turnId: null, turnEndsAt: null,
    players: eliminated, winnerId: roster[1].id, winnerName: roster[1].username });
  await expect(page.locator(".finish-word-winner")).toContainText(roster[1].username);
  await page.getByRole("button", { name: /Back to character lobby/ }).click();
  expect(await page.evaluate(() => window.testSocket.sent.some((entry) => entry.event === "rematch"))).toBe(true);
  await receive(page, "rematch-lobby", finishRoom);
  await expect(page.getByRole("button", { name: "Start Finish the Word" })).toBeEnabled();
});

test("restoration keeps the active word and a paused clock does not consume the turn", async ({ page }) => {
  const state = await start(page, { typingText: "appl" });
  const input = page.getByRole("textbox", { name: "Your word" });
  await expect(input).toHaveValue("appl");
  await page.clock.fastForward(3000);
  await expect(page.getByRole("timer")).toContainText("7");
  await receive(page, "ROOM_PAUSED", { code: room.code, players: roster, pausedAt: state.serverNow + 3000, serverNow: state.serverNow + 3000, kickVotes: [] });
  await page.clock.fastForward(30000);
  await expect(page.getByRole("timer")).toContainText("7");
  await receive(page, "room-restored", { ...finishRoom, playerId: roster[0].id, screen: "game", pausedAt: null, serverNow: state.serverNow + 33000,
    gameState: { ...state, turnEndsAt: state.turnEndsAt + 30000, typingText: "apple" }, chatMessages: [] });
  await expect(input).toHaveValue("apple");
  await expect(input).toBeEnabled();
  await expect(page.getByRole("timer")).toContainText("7");
});

for (const height of [380, 300]) {
  test(`mobile keyboard leaves the word input reachable with ${height}px available`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height });
    await start(page);
    const input = page.getByRole("textbox", { name: "Your word" });
    await input.fill("apple");
    const frame = await input.boundingBox();
    expect(frame.y).toBeGreaterThan(60);
    expect(frame.y + frame.height).toBeLessThanOrEqual(height);
    const arena = await page.getByTestId("finish-word-stage").boundingBox();
    const controls = await page.getByLabel("Word controls").boundingBox();
    expect(arena.y + arena.height).toBeLessThanOrEqual(controls.y + 1);
    await page.getByRole("button", { name: "Submit word", exact: true }).click();
    expect(await page.evaluate(() => window.testSocket.sent.some((entry) => entry.event === "submit_word"))).toBe(true);
  });
}

for (const viewport of [{ width: 280, height: 653 }, { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 320 }, { width: 1440, height: 900 }]) {
  test(`the focused character, speech bubble and controls fit at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const eightPlayers = cast.map((characterId, index) => ({ id: index ? `guest-${index}` : players[0].id,
      username: index ? `WordWarriorNumber${index}` : players[0].username, characterId, lives: 3, isAlive: true }));
    await start(page, { players: eightPlayers });
    const input = page.getByRole("textbox", { name: "Your word" });
    await input.fill("antelope");
    await page.clock.fastForward(60);
    await expect(page.getByTestId("live-word-bubble")).toContainText("antelope");
    const elements = [page.locator(".finish-word-actor.active .finish-word-character"), page.locator(".finish-word-actor.active .finish-word-nametag"), page.getByTestId("live-word-bubble"), input, page.getByRole("button", { name: "Submit word", exact: true })];
    for (const locator of elements) {
      await expect(locator).toBeVisible();
      const frame = await locator.boundingBox();
      expect(frame.x).toBeGreaterThanOrEqual(-1);
      expect(frame.y).toBeGreaterThanOrEqual(-1);
      expect(frame.x + frame.width).toBeLessThanOrEqual(viewport.width + 1);
      expect(frame.y + frame.height).toBeLessThanOrEqual(viewport.height + 1);
    }
    const bubbleFrame = await page.getByTestId("live-word-bubble").boundingBox();
    const arenaFrame = await page.getByTestId("finish-word-stage").boundingBox();
    expect(bubbleFrame.y).toBeGreaterThanOrEqual(arenaFrame.y);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
    await page.screenshot({ path: `test-results/finish-word-${viewport.width}x${viewport.height}.png`, animations: "disabled" });
  });
}
