import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, game } from "./serverFixture.js";

test.use({ viewport: { width: 390, height: 844 } });

test("eight-player Word Duel uses the assigned opponent and shows the current player's turn", async ({ page }) => {
  await installServerFixture(page);
  await page.goto("/");
  const players = Array.from({ length: 8 }, (_, index) => ({
    id: index === 3 ? "mobile-player" : `seat-${index}`,
    username: `Player ${index + 1}`, ready: false, wins: 0,
  }));
  const multiplayerRoom = { ...room, gameMode: "word-duel", maxPlayers: 8, players };
  await receive(page, "room-created", multiplayerRoom);
  await expect(page.locator(".player-capacity")).toHaveText("8 / 8 PLAYERS");
  await receive(page, "game-start", { ...game, ...multiplayerRoom, myWord: "PEACH", myWordLetterCount: 5, opponentLetterCount: 5, opponentId: "seat-4", currentTurn: "seat-0" });
  await expect(page.locator(".word-target-name")).toHaveText("Investigating Player 5’s word");
  await expect(page.locator(".turn-badge")).toContainText("Player 1 IS THINKING");
  await receive(page, "turn-change", { currentTurn: "seat-5" });
  await expect(page.locator(".turn-badge")).toContainText("Player 6 IS THINKING");
  await expect(page.locator(".waiting-msg")).toContainText("Player 6");
  await receive(page, "turn-change", { currentTurn: "mobile-player" });
  await page.getByRole("button", { name: "Ask about A", exact: true }).click();
  expect(await page.evaluate(() => window.testSocket.sent.some((item) => item.event === "ask-letter" && item.data.letter === "A"))).toBe(true);
  await receive(page, "game-over", {
    ...multiplayerRoom, winnerId: "mobile-player", winnerName: "Player 4",
    wordsByPlayer: { "seat-0": "APPLE", "mobile-player": "PEACH", "seat-4": "MANGO" },
    opponentsByPlayer: { "mobile-player": "seat-4" },
  });
  await expect(page.locator(".opp-word .reveal-tile-row")).toHaveAttribute("aria-label", "Opponent's Word: MANGO");
  await expect(page.locator(".gameover-scoreboard .score-row")).toHaveCount(8);
});
