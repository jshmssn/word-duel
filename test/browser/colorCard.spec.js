import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, players } from "./serverFixture.js";

const colorRoom = { ...room, gameMode: "color-card", maxPlayers: 8, colorDuration: 45, colorCardCount: 7 };
const result = {
  ...colorRoom, roundId: "color-round-1", targetColor: "#A34F2E", roundNumber: 1, totalRounds: 7,
  matchComplete: false, matchWinnerIds: [],
  winners: [{ id: "mobile-player", username: players[0].username }], winnerIds: ["mobile-player"],
  entries: [
    { ...players[0], submittedColor: "#A34F2E", distance: 0, accuracy: 100, autoSubmitted: true },
    { ...players[1], submittedColor: "#112233", distance: 350, accuracy: 7.71, autoSubmitted: false },
  ],
  standings: players.map((player, index) => ({ ...player, totalAccuracy: index ? 7.71 : 100, averageAccuracy: index ? 7.71 : 100 })),
};

async function startRound(page, roundNumber = 1) {
  const now = await page.evaluate(() => Date.now());
  const state = { ...colorRoom, roundId: `color-round-${roundNumber}`, targetColor: roundNumber === 1 ? "#A34F2E" : "#66CCCC", roundNumber, totalRounds: 7,
    phase: "memorizing", memorizeEndsAt: now + 5000, memorizeDuration: 5,
    roundEndsAt: now + 50000, roundDuration: 45, submittedPlayerIds: [] };
  await receive(page, "START_GAME", state);
  return state;
}

async function beginPicking(page, state, time = 5000) {
  await page.clock.fastForward(time);
  await expect(page.getByTestId("target-color")).toHaveCount(0);
  await receive(page, "COLOR_PICKING_STARTED", { code: state.code, roundId: state.roundId, phase: "picking", roundEndsAt: state.roundEndsAt });
}

async function setSlider(page, name, value) {
  await page.getByRole("slider", { name, exact: true }).evaluate((input, value) => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, String(value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }, value);
}

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.clock.install();
  await page.goto("/");
  await expect(page.locator("#player-username")).toBeVisible();
});

for (const width of [280, 390, 1440]) {
  test.describe(`Color Card at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });
    test("memorizes, mixes HSV, edits answers, compares results and advances together", async ({ page }, testInfo) => {
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.locator("#player-username").fill("Painter");
      await page.getByRole("combobox", { name: "GAME MODE", exact: true }).selectOption("color-card");
      await page.getByRole("combobox", { name: "MAX NUMBER OF PLAYERS", exact: true }).selectOption("8");
      await page.getByRole("combobox", { name: "TIME TO ANSWER EACH CARD", exact: true }).selectOption("45");
      await page.getByRole("combobox", { name: "NUMBER OF COLOR CARDS", exact: true }).selectOption("7");
      await page.getByRole("button", { name: /Create Color Card room/ }).click();
      expect(await page.evaluate(() => window.testSocket.sent.find((item) => item.event === "CREATE_ROOM").data))
        .toEqual({ username: "Painter", gameMode: "color-card", maxPlayers: 8, colorDuration: 45, colorCardCount: 7 });
      await receive(page, "room-created", colorRoom);
      await expect(page.locator(".player-capacity")).toHaveText("2 / 8 PLAYERS");
      await page.getByRole("combobox", { name: "TIME TO ANSWER EACH CARD", exact: true }).selectOption("60");
      expect(await page.evaluate(() => window.testSocket.sent.find((item) => item.event === "SET_COLOR_DURATION").data.duration)).toBe(60);
      await receive(page, "COLOR_DURATION_UPDATED", { code: colorRoom.code, colorDuration: 60 });
      await expect(page.getByRole("combobox", { name: "TIME TO ANSWER EACH CARD", exact: true })).toHaveValue("60");
      await page.getByRole("combobox", { name: "NUMBER OF COLOR CARDS", exact: true }).selectOption("3");
      expect(await page.evaluate(() => window.testSocket.sent.find((item) => item.event === "SET_COLOR_CARD_COUNT").data.count)).toBe(3);
      await receive(page, "COLOR_CARD_COUNT_UPDATED", { code: colorRoom.code, colorCardCount: 3 });
      await expect(page.getByRole("combobox", { name: "NUMBER OF COLOR CARDS", exact: true })).toHaveValue("3");
      await receive(page, "COLOR_CARD_COUNT_UPDATED", { code: colorRoom.code, colorCardCount: 7 });

      const round = await startRound(page);
      await expect(page.getByTestId("target-color")).toHaveCSS("background-color", "rgb(163, 79, 46)");
      await expect(page.getByRole("timer")).toHaveAttribute("aria-label", "5 seconds to memorize");
      await expect(page.getByRole("slider")).toHaveCount(0);
      const cardBox = await page.getByTestId("target-color").boundingBox();
      const timerBox = await page.getByRole("timer").boundingBox();
      expect(timerBox.y - cardBox.y).toBeLessThan(25);
      expect(cardBox.x + cardBox.width - timerBox.x - timerBox.width).toBeLessThan(25);
      await page.locator(".color-memory-card").screenshot({ path: testInfo.outputPath("memorize.png") });
      await page.clock.fastForward(2000);
      await expect(page.getByRole("timer")).toHaveAttribute("aria-label", "3 seconds to memorize");
      await beginPicking(page, round, 3000);
      await expect(page.getByTestId("picked-color")).toHaveCSS("background-color", "rgb(255, 255, 255)");
      const rails = await page.getByRole("slider").evaluateAll((inputs) => inputs.map((input) => ({ name: input.getAttribute("aria-label"), x: input.getBoundingClientRect().x })));
      expect(rails.map((rail) => rail.name)).toEqual(["Hue", "Saturation", "Brightness"]);
      expect(rails[0].x).toBeLessThan(rails[1].x);
      expect(rails[1].x).toBeLessThan(rails[2].x);
      await setSlider(page, "Hue", 180);
      await setSlider(page, "Saturation", 50);
      await setSlider(page, "Brightness", 80);
      await expect(page.getByTestId("picked-color")).toHaveCSS("background-color", "rgb(102, 204, 204)");
      await expect(page.getByTestId("target-color")).toHaveCount(0);
      expect(await page.evaluate(() => window.testSocket.sent.filter((item) => item.event === "UPDATE_COLOR_DRAFT").at(-1).data.hex)).toBe("#66CCCC");
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.locator(".color-selection-frame").screenshot({ path: testInfo.outputPath("selection.png") });
      await page.getByRole("button", { name: "Submit Color", exact: true }).click();
      expect(await page.evaluate(() => window.testSocket.sent.find((item) => item.event === "SUBMIT_COLOR").data))
        .toEqual({ code: colorRoom.code, roundId: "color-round-1", hex: "#66CCCC" });
      await page.evaluate(() => window.testSocket.acknowledge("SUBMIT_COLOR", { success: true }));
      await receive(page, "SUBMISSION_UPDATE", { code: colorRoom.code, roundId: "color-round-1", submittedPlayerIds: ["mobile-player"] });
      await expect(page.getByRole("slider", { name: "Hue", exact: true })).toBeDisabled();
      await page.getByRole("button", { name: "Edit answer" }).click();
      await page.evaluate(() => window.testSocket.acknowledge("EDIT_COLOR", { success: true }));
      await receive(page, "SUBMISSION_UPDATE", { code: colorRoom.code, roundId: "color-round-1", submittedPlayerIds: [] });
      await expect(page.getByRole("slider", { name: "Hue", exact: true })).toBeEnabled();
      await setSlider(page, "Brightness", 60);
      expect(await page.evaluate(() => window.testSocket.sent.filter((item) => item.event === "UPDATE_COLOR_DRAFT").at(-1).data.hex)).toBe("#4D9999");
      const reviewNow = await page.evaluate(() => Date.now());
      await receive(page, "ROUND_RESULTS", { ...result, phase: "review", entries: [result.entries[0]], winnerIds: [], winners: [], standings: [], reviewEndsAt: reviewNow + 5000, serverNow: reviewNow });
      await expect(page.locator(".color-result-card")).toHaveCount(1);
      await expect(page.locator(".color-accuracy")).toContainText("100.00%");
      await expect(page.locator(".color-result-card")).toContainText("A perfect match");
      await expect(page.locator(".color-result-card")).toContainText("auto submitted");
      const reviewTimer = page.getByRole("group", { name: "Until rankings", exact: true });
      await expect(reviewTimer.locator(".timer-seconds")).toHaveText("5s");
      await expect(page.getByRole("timer")).toHaveAttribute("aria-label", "5 seconds until rankings");
      expect(await reviewTimer.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector(".color-personal-result")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await expect(page.getByTestId("target-color").first()).toHaveCSS("background-color", "rgb(163, 79, 46)");
      await page.locator(".color-result-comparison").first().screenshot({ path: testInfo.outputPath("results.png") });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await expect(page.getByRole("button", { name: /Next card/ })).toHaveCount(0);
      await page.clock.fastForward(2000);
      await expect(reviewTimer.locator(".timer-seconds")).toHaveText("3s");
      await expect.poll(() => reviewTimer.locator(".timer-bar-fill").evaluate((element) => element.getBoundingClientRect().width / element.parentElement.getBoundingClientRect().width)).toBeCloseTo(.6, 2);
      await page.clock.fastForward(3000);
      const rankNow = await page.evaluate(() => Date.now());
      await receive(page, "COLOR_RANKINGS", { ...result, phase: "ranking", rankingEndsAt: rankNow + 10000, serverNow: rankNow });
      await expect(page.locator(".color-card-ranking li")).toHaveCount(2);
      const rankingTimer = page.getByRole("group", { name: "Until next card", exact: true });
      await expect(rankingTimer.locator(".timer-seconds")).toHaveText("10s");
      expect(await rankingTimer.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector(".color-ranking-reference")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
      await expect(page.locator(".color-result-card")).toHaveCount(0);
      await page.clock.fastForward(4000);
      await expect(rankingTimer.locator(".timer-seconds")).toHaveText("6s");
      await expect.poll(() => rankingTimer.locator(".timer-bar-fill").evaluate((element) => element.getBoundingClientRect().width / element.parentElement.getBoundingClientRect().width)).toBeCloseTo(.6, 2);
      await page.clock.fastForward(6000);
      const next = await startRound(page, 2);
      await expect(page.locator(".color-card-progress")).toHaveText("2 / 7");
      await beginPicking(page, next);
      await expect(page.getByTestId("picked-color")).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await receive(page, "COLOR_RANKINGS", { ...result, phase: "ranking", roundId: "color-round-7", roundNumber: 7, matchComplete: true, matchWinnerIds: ["mobile-player"] });
      await expect(page.locator(".color-standings")).toContainText("Final standings");
      await page.getByRole("button", { name: "Play again", exact: true }).click();
      await receive(page, "rematch-lobby", colorRoom);
      await expect(page.locator(".waiting-screen")).toBeVisible();
      expect(errors).toEqual([]);
    });
  });
}

test("guest sees shared settings, keeps editing, and gets personal score feedback", async ({ page }) => {
  await receive(page, "room-joined", { ...colorRoom, creatorId: "opponent" });
  await expect(page.getByRole("combobox")).toHaveCount(0);
  await expect(page.locator(".room-settings-overview")).toContainText("45 seconds");
  const round = await startRound(page);
  await beginPicking(page, round);
  await page.getByRole("button", { name: "Submit Color", exact: true }).click();
  await page.evaluate(() => window.testSocket.acknowledge("SUBMIT_COLOR", { success: false, message: "Please try again." }));
  await expect(page.getByRole("alert")).toContainText("Please try again.");
  await expect(page.getByRole("slider", { name: "Hue", exact: true })).toBeEnabled();
  const now = await page.evaluate(() => Date.now());
  await receive(page, "ROUND_RESULTS", { ...result, phase: "review", entries: [{ ...result.entries[0], accuracy: 7.71 }], winnerIds: [], winners: [], standings: [], reviewEndsAt: now + 5000 });
  await expect(page.locator(".color-score-feedback")).toContainText("raccoon");
  await expect(page.getByRole("button", { name: /Next card/ })).toHaveCount(0);
  await expect(page.locator(".color-results-countdown")).toContainText("Everyone continues automatically");
});

test("server timestamps synchronize a different device clock, and sliders respond to dragging", async ({ page }) => {
  await receive(page, "room-created", colorRoom);
  await receive(page, "START_GAME", { ...colorRoom, roundId: "clock-test", targetColor: "#A34F2E", phase: "memorizing", serverNow: 1000000,
    memorizeEndsAt: 1005000, roundEndsAt: 1035000, submittedPlayerIds: [], roundNumber: 1, totalRounds: 5 });
  await expect(page.getByRole("timer")).toHaveAttribute("aria-label", "5 seconds to memorize");
  await page.clock.fastForward(5000);
  await receive(page, "COLOR_PICKING_STARTED", { code: colorRoom.code, roundId: "clock-test", phase: "picking", roundEndsAt: 1035000, serverNow: 1005000 });
  await expect(page.locator(".color-round-status")).not.toContainText(/\d+s to match/);
  await expect(page.getByRole("group", { name: "Time to match", exact: true }).locator(".timer-seconds")).toHaveText("30s");
  await expect(page.locator(".color-timer")).toHaveCount(1);
  const saturation = page.getByRole("slider", { name: "Saturation", exact: true });
  await saturation.scrollIntoViewIfNeeded();
  const box = await saturation.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height - 12);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2, box.y + 12, { steps: 10 });
  await page.mouse.up();
  expect(Number(await saturation.inputValue())).toBeGreaterThan(90);
  await expect(page.getByTestId("picked-color")).not.toHaveCSS("background-color", "rgb(255, 255, 255)");
});
