import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room } from "./serverFixture.js";

const roster = [
  { id: "third", username: "ChallengerLongName", ready: false, wins: 8, previousMatchAverageAccuracy: 72.25, previousMatchCardCount: 4 },
  { id: "mobile-player", username: "ColorChampion", ready: false, wins: 3, previousMatchAverageAccuracy: 91.5, previousMatchCardCount: 4 },
  { id: "second", username: "SilverPainter", ready: false, wins: 5, previousMatchAverageAccuracy: 88.75, previousMatchCardCount: 4 },
  { id: "fourth", username: "AnotherPainter", ready: false, wins: 0, previousMatchAverageAccuracy: null, previousMatchCardCount: 0 },
];
const colorRoom = { ...room, gameMode: "color-card", maxPlayers: 4, players: roster };
const entries = [roster[1], roster[2], roster[0], roster[3]].map((player, index) => ({ ...player, accuracy: [99.5, 94.25, 89.75, 0][index], distance: [2, 25, 45, 440][index], submittedColor: "#66CCCC", timeConsumedMs: 1400 }));
const standings = [roster[2], roster[1], roster[0], roster[3]].map((player, index) => ({ ...player, averageAccuracy: [96.75, 91.5, 89.75, 0][index] }));
const result = { ...colorRoom, roundId: "podium-round", phase: "ranking", roundNumber: 4, totalRounds: 5, targetColor: "#A34F2E", matchComplete: false, entries, standings, winners: [roster[1]], winnerIds: ["mobile-player"], matchWinnerIds: [] };

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.goto("/");
});

for (const width of [280, 390, 1440]) {
  test(`top-three podium and waiting-room accuracy fit at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await receive(page, "room-created", colorRoom);
    await expect(page.locator(".player-accuracy-stat")).toHaveCount(4);
    await expect(page.locator(".player-accuracy-stat")).toContainText(["72.25%", "91.50%", "88.75%", "0.00%"]);
    await expect(page.locator(".player-meta-row")).not.toContainText(["WINS"]);
    await expect(page).toHaveTitle("Color Card · GamifyLuv");
    await receive(page, "COLOR_RANKINGS", result);
    const podium = page.getByRole("region", { name: "Card podium" });
    const original = page.getByRole("region", { name: "Given card color", exact: true });
    await expect(original).toBeVisible();
    await expect(original.getByTestId("target-color")).toHaveCSS("background-color", "rgb(163, 79, 46)");
    await expect(original).toContainText("#A34F2E");
    await expect(page.locator(".color-ranking-swatch").first()).toHaveCSS("background-color", "rgb(102, 204, 204)");
    await expect(page.locator(".color-rank-hex").first()).toHaveText("#66CCCC");
    expect(await original.evaluate((element) => Boolean(element.compareDocumentPosition(document.querySelector(".color-podium")) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(podium).toBeVisible();
    await expect(podium.locator("li")).toHaveCount(3);
    await expect(podium.locator(".place-1")).toContainText("ColorChampion");
    await expect(podium.locator(".place-1")).toContainText("99.50");
    await expect(podium.locator(".place-2")).toContainText("SilverPainter");
    await expect(podium.locator(".place-3")).toContainText("ChallengerLongName");
    await expect(podium).not.toContainText("AnotherPainter");
    await podium.screenshot({ path: testInfo.outputPath("card-podium.png"), animations: "disabled" });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.locator(".color-card-ranking li").last().scrollIntoViewIfNeeded();
    await expect(original).toBeInViewport();
    await receive(page, "COLOR_RANKINGS", { ...result, matchComplete: true, matchWinnerIds: ["second"], roundNumber: 5, targetColor: "#FFFFFF" });
    await expect(original.getByTestId("target-color")).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(original.getByTestId("target-color")).toHaveCSS("color", "rgb(16, 32, 29)");
    const finalPodium = page.getByRole("region", { name: "Match podium" });
    await expect(finalPodium.locator(".place-1")).toContainText("SilverPainter");
    await expect(finalPodium.locator(".place-1")).toContainText("96.75");
    await receive(page, "rematch-lobby", { ...colorRoom, players: roster.map((player) => ({ ...player, previousMatchAverageAccuracy: 85.55, previousMatchCardCount: 9 })) });
    await expect(page.locator(".player-accuracy-stat").first()).toContainText("85.55%");
    await expect(page.locator(".player-accuracy-stat").first()).toHaveAttribute("title", /previous completed match \(9 cards\)/);
  });
}

test("podiums handle two-player rooms and ties, and remain hidden during personal review", async ({ page }) => {
  await receive(page, "room-created", colorRoom);
  await receive(page, "ROUND_RESULTS", { ...result, phase: "review", entries: [entries[0]], winners: [], winnerIds: [], standings: [], reviewEndsAt: Date.now() + 5000 });
  await expect(page.locator(".color-podium")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "Given card color", exact: true })).toHaveCount(0);
  await receive(page, "COLOR_RANKINGS", { ...result, entries: [entries[0], { ...entries[1], accuracy: entries[0].accuracy, distance: entries[0].distance }] });
  await expect(page.locator(".color-podium li")).toHaveCount(2);
  await expect(page.locator(".podium-medal")).toHaveText(["Joint 1st", "Joint 1st"]);
  await receive(page, "rematch-lobby", { ...room, gameMode: "word-duel", maxPlayers: 4, players: roster });
  await expect(page.locator(".player-accuracy-stat")).toHaveCount(0);
  await expect(page.locator(".player-meta-row").first()).toContainText("8 WINS");
  await expect(page).toHaveTitle("Word Duel · GamifyLuv");
});

test("waiting-room percentages show only the previous match and reset after opponent disconnection", async ({ page }) => {
  await receive(page, "room-created", colorRoom);
  await expect(page.locator(".player-accuracy-stat").first()).toContainText("72.25%");
  await expect(page.locator(".player-accuracy-stat").first()).toContainText("LAST MATCH AVG.");
  await expect(page.locator(".player-accuracy-stat").first()).toHaveAttribute("title", "Average accuracy from the previous completed match (4 cards)");
  const resetPlayers = roster.map((player) => ({ ...player, previousMatchAverageAccuracy: 0, previousMatchCardCount: 0, connected: player.id !== "third" }));
  await receive(page, "ROOM_PAUSED", { code: room.code, pausedAt: Date.now(), players: resetPlayers, message: "Challenger is reconnecting." });
  await expect(page.locator(".player-accuracy-stat")).toContainText(["0.00%", "0.00%", "0.00%", "0.00%"]);
  await receive(page, "rematch-lobby", { ...colorRoom, players: resetPlayers.filter((player) => player.id !== "third"), departure: true });
  await expect(page.locator(".room-pause-overlay")).toHaveCount(0);
  await expect(page.locator(".player-accuracy-stat")).toHaveCount(3);
  await expect(page.locator(".player-accuracy-stat").first()).toContainText("0.00%");
  await expect(page.locator(".player-accuracy-stat").first()).toHaveAttribute("title", "No previous match recorded");
});
