import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, players } from "./serverFixture.js";

const modes = ["word-duel", "color-card", "finish-word"];
const roster = players.map((player, index) => ({ ...player, connected: true, characterId: index ? "wizard" : "knight" }));

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", { value: {
      writeText: async (code) => { window.copiedCode = code; },
    } });
  });
  await page.goto("/");
});

for (const mode of modes) {
  for (const width of [280, 390, 1440]) {
    test(`${mode}: shared ready room, invite and countdown work at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const match = { ...room, gameMode: mode, maxPlayers: 4, players: roster };
      await receive(page, "room-created", match);
      await expect(page.locator(".waiting-intro h1")).toHaveText("Prepare to play.");
      await expect(page.getByLabel("Match preparation progress")).toContainText("PLAYERS JOINED");
      await expect(page.locator(".player-card.filled")).toHaveCount(2);
      await expect(page.locator(".player-card.empty")).toHaveCount(2);
      await expect(page.locator(".ready-pill.no")).toHaveCount(2);
      const progress = page.getByRole("progressbar", { name: "Players ready" });
      await expect(progress).toHaveAttribute("aria-valuenow", "0");
      await expect(progress).toHaveAttribute("aria-valuemax", "2");

      await page.getByRole("button", { name: `Copy room code ${room.code}` }).click();
      expect(await page.evaluate(() => window.copiedCode)).toBe(room.code);
      await expect(page.locator(".copy-hint")).toContainText("Copied to clipboard!");
      await page.getByRole("button", { name: "I'm ready to battle", exact: true }).click();
      expect(await page.evaluate(() => window.testSocket.sent.filter((event) => event.event === "toggle-ready").map((event) => event.data))).toEqual([{ code: room.code }]);
      if (mode === "finish-word") await page.evaluate(() => window.testSocket.acknowledge("toggle-ready", { success: true, ready: true }));
      await receive(page, "ready-update", { ...match, players: roster.map((player) => ({ ...player, ready: true })) });
      const cancel = page.getByRole("button", { name: "You're ready — tap to cancel", exact: true });
      await expect(cancel).toHaveAttribute("aria-pressed", "true");
      await expect(page.locator(".ready-pill.yes")).toHaveCount(2);
      await expect(progress).toHaveAttribute("aria-valuenow", "2");
      await expect(page.locator(".journey-step").last()).toHaveClass(/done/);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
      if (mode === "finish-word") await page.screenshot({ path: `test-results/finish-word-ready-${width}.png`, fullPage: true, animations: "disabled" });

      await cancel.click();
      if (mode === "finish-word") await page.evaluate(() => window.testSocket.acknowledge("toggle-ready", { success: true, ready: false }));
      await receive(page, "ready-update", match);
      await expect(page.getByRole("button", { name: "I'm ready to battle", exact: true })).toHaveAttribute("aria-pressed", "false");
      await expect(progress).toHaveAttribute("aria-valuenow", "0");

      await receive(page, "ready-update", { ...match, players: roster.map((player) => ({ ...player, ready: true })) });
      await receive(page, "countdown", { count: 5 });
      await expect(page.locator(".countdown-num")).toHaveText("5");
      await expect(page.locator(".countdown-label-fun svg")).toBeVisible();
      await receive(page, "countdown-cancel", {});
      await expect(page.locator(".countdown-overlay")).toHaveCount(0);
      await receive(page, "countdown", { count: 0 });
      await expect(page.locator(".countdown-overlay")).toHaveCount(0);
    });
  }

  test(`${mode}: invite a second player before showing the ready action`, async ({ page }) => {
    await receive(page, "room-created", { ...room, gameMode: mode, maxPlayers: 4, players: [roster[0]] });
    await expect(page.locator(".invite-nudge")).toContainText("Invite someone to join your room.");
    await expect(page.locator(".btn-ready-fun")).toHaveCount(0);
    await expect(page.locator(".journey-step.done")).toHaveCount(1);
    await expect(page.getByRole("progressbar", { name: "Players ready" })).toHaveAttribute("aria-valuemax", "2");
  });
}

test("Finish the Word keeps readiness unconfirmed after a server rejection and allows retry", async ({ page }) => {
  await receive(page, "room-created", { ...room, gameMode: "finish-word", maxPlayers: 8, players: roster });
  await page.getByRole("button", { name: "I'm ready to battle", exact: true }).click();
  await expect(page.getByRole("button", { name: "Updating…", exact: true })).toBeDisabled();
  await expect(page.getByTestId("character-robot")).toBeDisabled();
  await page.evaluate(() => window.testSocket.acknowledge("toggle-ready", { success: false, message: "The room is paused while a player reconnects." }));
  await expect(page.locator(".player-panel").getByRole("alert")).toContainText("The room is paused");
  await expect(page.locator(".ready-pill.yes")).toHaveCount(0);
  const ready = page.getByRole("button", { name: "I'm ready to battle", exact: true });
  await expect(ready).toBeEnabled();
  await ready.click();
  await page.evaluate(() => window.testSocket.acknowledge("toggle-ready", { success: true, ready: true }));
  await receive(page, "ready-update", { players: [{ ...roster[0], ready: true }, roster[1]] });
  await expect(page.getByRole("button", { name: "You're ready — tap to cancel", exact: true })).toBeEnabled();
  await expect(page.locator(".player-panel").getByRole("alert")).toHaveCount(0);
});
