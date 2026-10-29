import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, game, result, players } from "./serverFixture.js";

async function checkLayout(page) {
  const expectedWidth = page.viewportSize().width;
  await expect.poll(() => page.evaluate(expectedWidth => {
    const visible = element => element.getClientRects().length && getComputedStyle(element).visibility !== "hidden";
    const content = [...document.querySelectorAll(".site-header *, .screen *, .floating-chat-wrap *")]
      .filter(element => visible(element) && !element.closest("svg, .confetti-layer, .reward-pop"));
    const overflow = content.filter(element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && (box.left < -1 || box.right > expectedWidth + 1);
    }).map(element => element.className || element.tagName);
    const smallTargets = content.filter(element => element.matches("button, input, select"))
      .filter(element => element.offsetWidth < 44 || element.offsetHeight < 44)
      .map(element => ({ name: element.className, width: element.offsetWidth, height: element.offsetHeight }));
    const smallInputs = content.filter(element => element.matches("input, select") && parseFloat(getComputedStyle(element).fontSize) < 16)
      .map(element => element.className);
    return {
      overflow, smallTargets, smallInputs,
      pageOverflow: document.documentElement.scrollWidth > expectedWidth,
      viewportMismatch: Math.abs(innerWidth - expectedWidth) > 1,
    };
  }, expectedWidth)).toEqual({ overflow: [], smallTargets: [], smallInputs: [], pageOverflow: false, viewportMismatch: false });
}

async function checkOverlay(page, selector) {
  const dialog = page.locator(selector);
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate(element => {
    const box = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const height = viewport?.height ?? innerHeight;
    return Math.abs(box.x + box.width / 2 - innerWidth / 2) < 2
      && Math.abs(box.y + box.height / 2 - top - height / 2) < 2
      && box.x >= 15 && box.y >= top + 15 && box.height <= Math.min(innerHeight * .85, height - 32) + 1
      && element.closest(".prompt-overlay").parentElement === document.body
      && getComputedStyle(document.body).overflowY === "hidden";
  })).toBe(true);
  await dialog.evaluate(element => { element.scrollTop = element.scrollHeight; });
}

async function checkChat(page) {
  const panel = page.getByRole("region", { name: "Room chat" });
  await expect.poll(() => panel.evaluate(element => {
    const box = element.getBoundingClientRect();
    const viewport = window.visualViewport;
    const top = viewport?.offsetTop ?? 0;
    const bottom = top + (viewport?.height ?? innerHeight);
    const input = element.querySelector("input").getBoundingClientRect();
    return box.top >= top + 15 && box.bottom <= bottom - 15
      && input.top >= box.top && input.bottom <= box.bottom
      && element.parentElement.parentElement === document.body;
  })).toBe(true);
  await checkLayout(page);
}

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.goto("/");
  await expect(page.locator("#player-username")).toBeVisible();
});

const viewports = [
  [280, 653], [320, 568], [360, 640], [390, 844], [430, 932],
  [667, 320], [681, 360], [844, 390], [768, 1024],
  [900, 700], [901, 700], [1024, 768], [1440, 900],
];

for (const [width, height] of viewports) {
  test.describe(`${width}x${height}`, () => {
    test.use({ viewport: { width, height }, hasTouch: true, isMobile: width <= 844 });

    test("all screens and touch controls fit", async ({ page }) => {
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await checkLayout(page);

      await page.getByRole("tab", { name: "Join room" }).tap();
      await page.locator("#room-join-code").fill("ABCD1234");
      await checkLayout(page);
      await page.getByRole("tab", { name: "Create room" }).tap();
      await page.locator("#player-username").fill(players[0].username);
      await page.getByRole("button", { name: "Create a duel" }).tap();
      await receive(page, "room-created", room);
      await expect(page.locator(".waiting-screen")).toBeVisible();
      await checkLayout(page);
      await expect(page.locator(".timer-select").first()).toHaveCSS("appearance", "none");
      await page.locator(".timer-select").first().selectOption("45");
      await expect(page.locator(".timer-select").first()).toHaveValue("45");

      await page.getByRole("button", { name: /I'm ready to battle/ }).tap();
      await expect.poll(() => page.evaluate(() => window.testSocket.sent.some(item => item.event === "toggle-ready"))).toBe(true);
      await receive(page, "countdown", { count: 3 });
      await checkOverlay(page, ".countdown-card");
      await receive(page, "countdown-cancel", {});
      await expect(page.locator(".countdown-card")).toHaveCount(0);

      await page.getByRole("button", { name: "Open chat" }).tap();
      await checkChat(page);
      await page.locator(".btn-close-chat").tap();

      await receive(page, "category-selected", { category: "Animals" });
      await checkOverlay(page, ".slot-dialog");
      await page.getByRole("button", { name: /Skip intro/ }).tap();
      await receive(page, "game-start", game);
      await expect(page.locator(".game-screen")).toBeVisible();
      await checkLayout(page);
      await page.getByRole("button", { name: "Ask about A", exact: true }).tap();
      await expect.poll(() => page.evaluate(() => window.testSocket.sent.some(item => item.event === "ask-letter" && item.data.letter === "A"))).toBe(true);
      await receive(page, "letter-result", {
        askerId: "mobile-player", askerName: players[0].username,
        letter: "A", hasLetter: true, confirmedLetters: ["C", "A", "T"],
      });
      await expect(page.locator(".workbench-tile").first()).toHaveText("C");
      await page.locator(".workbench-tile").first().tap();
      await page.locator(".workbench-tile").nth(12).tap();
      await expect(page.locator(".workbench-tile").nth(12)).toHaveText("C");

      await page.getByRole("button", { name: "Letter Count", exact: true }).tap();
      await checkLayout(page);
      await page.getByRole("button", { name: "Guess Word!", exact: true }).tap();
      await page.getByRole("textbox", { name: "Your word guess" }).fill("hippopotamus");
      await checkLayout(page);
      await page.getByRole("button", { name: "Guess!", exact: true }).tap();
      await expect.poll(() => page.evaluate(() => window.testSocket.sent.some(item => item.event === "guess-word" && item.data.guess === "hippopotamus"))).toBe(true);

      await receive(page, "turn-change", { currentTurn: "opponent" });
      await checkLayout(page);
      await receive(page, "letter-ask-prompt", { askerName: players[1].username, letter: "A" });
      await checkOverlay(page, ".prompt-modal");
      await page.getByRole("button", { name: "Yes", exact: true }).tap();
      await receive(page, "letter-count-prompt", { askerName: players[1].username, letter: "A" });
      await checkOverlay(page, ".prompt-modal");
      await page.getByRole("spinbutton", { name: "Letter count" }).fill("2");
      await page.getByRole("button", { name: "Submit", exact: true }).tap();
      await expect(page.locator(".prompt-overlay")).toHaveCount(0);
      await receive(page, "player-left", { username: players[1].username, disconnected: true });
      await expect(page.locator(".disconnect-banner")).toBeVisible();
      await checkLayout(page);

      await receive(page, "game-over", result);
      await expect(page.locator(".gameover-title-fun")).toHaveText("ROUND OVER");
      await checkLayout(page);
      await page.getByRole("button", { name: "Open chat" }).tap();
      await checkChat(page);
      await page.locator(".btn-close-chat").tap();
      await page.getByRole("button", { name: "Rematch Series!" }).tap();
      await receive(page, "rematch-lobby", room);
      await expect(page.locator(".waiting-screen")).toBeVisible();
      await receive(page, "game-start", game);
      await expect(page.locator(".game-screen")).toBeVisible();
      await receive(page, "game-over", { ...result, winnerId: "mobile-player", winnerName: players[0].username });
      await expect(page.locator(".gameover-title-fun")).toHaveText("VICTORY!");
      await checkLayout(page);
      expect(errors).toEqual([]);
    });
  });
}

test.describe("mobile viewport changes and long content", () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test("chat scrolls internally, survives rotation and keyboard resizing, and restores focus", async ({ page }) => {
    await receive(page, "room-created", room);
    await expect(page.locator(".waiting-screen")).toBeVisible();
    await page.evaluate(() => window.scrollTo({ top: 240, behavior: "instant" }));
    const initialScroll = await page.evaluate(() => scrollY);
    await page.getByRole("button", { name: "Open chat" }).tap();
    await checkChat(page);
    await receive(page, "chat-history", {
      messages: Array.from({ length: 40 }, (_, index) => ({
        id: index, playerId: "opponent", username: "VeryLongChallengerName",
        text: "Averylongunbrokenmessage".repeat(5), timestamp: 1793232000000 + index,
      })),
    });
    await expect(page.locator(".chat-bubble")).toHaveCount(40);
    await expect.poll(() => page.locator(".chat-messages").evaluate(element => element.scrollHeight > element.clientHeight && element.scrollTop > 0)).toBe(true);
    // WebKit can round the page position by a couple of pixels after focus.
    expect(Math.abs(await page.evaluate(() => scrollY) - initialScroll)).toBeLessThanOrEqual(2);
    await checkChat(page);
    await page.setViewportSize({ width: 667, height: 320 });
    await checkChat(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await checkChat(page);

    // Model a keyboard that shrinks only the visual viewport, as on iOS.
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 280 });
      window.visualViewport.dispatchEvent(new Event("resize"));
    });
    await checkChat(page);
    await page.getByRole("textbox", { name: "Chat message" }).fill("Hello from mobile");
    await page.getByRole("button", { name: "Send message" }).tap();
    await expect.poll(() => page.evaluate(() => window.testSocket.sent.some(item => item.event === "chat-message" && item.data.text === "Hello from mobile"))).toBe(true);
    await page.evaluate(() => {
      delete window.visualViewport.height;
      window.visualViewport.dispatchEvent(new Event("resize"));
    });
    await page.getByRole("textbox", { name: "Chat message" }).press("Escape");
    await expect(page.getByRole("region", { name: "Room chat" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Open chat" })).toBeFocused();
  });

  test("guest settings, connection errors, and overlapping dialogs remain usable", async ({ page }) => {
    await receive(page, "disconnect", {});
    await expect(page.locator(".connection-notice")).toBeVisible();
    await expect(page.getByRole("button", { name: "Create a duel" })).toBeDisabled();
    await receive(page, "connect", {});
    await page.getByRole("tab", { name: "Join room" }).tap();
    await receive(page, "join-error", { message: "This room is full. Please try another code." });
    await expect(page.getByRole("alert")).toContainText("room is full");
    await checkLayout(page);
    await receive(page, "room-joined", { ...room, creatorId: "opponent" });
    await expect(page.locator(".room-settings-overview")).toBeVisible();
    await checkLayout(page);
    await receive(page, "game-start", game);
    await expect(page.locator(".game-screen")).toBeVisible();
    await receive(page, "letter-ask-prompt", { askerName: players[1].username, letter: "A" });
    await checkOverlay(page, ".prompt-modal");
    // Programmatic click opens instructions while the game prompt is active.
    await page.locator(".howto-link").evaluate(button => button.click());
    await checkOverlay(page, ".rules-dialog");
    await page.setViewportSize({ width: 667, height: 320 });
    await checkOverlay(page, ".rules-dialog");
    await page.getByRole("button", { name: "Close instructions" }).tap();
    expect(await page.evaluate(() => getComputedStyle(document.body).overflowY)).toBe("hidden");
    await page.getByRole("button", { name: "Yes", exact: true }).tap();
    await expect.poll(() => page.evaluate(() => getComputedStyle(document.body).overflowY)).not.toBe("hidden");
  });

  test("letter count prompt fits a keyboard that resizes and pans the visual viewport", async ({ page }) => {
    await receive(page, "room-created", room);
    await expect(page.locator(".waiting-screen")).toBeVisible();
    await receive(page, "game-start", game);
    await expect(page.locator(".game-screen")).toBeVisible();
    await receive(page, "letter-count-prompt", { askerName: players[1].username, letter: "A" });
    await checkOverlay(page, ".prompt-modal");
    await page.evaluate(() => {
      Object.defineProperty(window.visualViewport, "height", { configurable: true, value: 280 });
      Object.defineProperty(window.visualViewport, "offsetTop", { configurable: true, value: 120 });
      window.visualViewport.dispatchEvent(new Event("resize"));
      window.visualViewport.dispatchEvent(new Event("scroll"));
    });
    await checkOverlay(page, ".prompt-modal");
    await page.getByRole("spinbutton", { name: "Letter count" }).fill("2");
    await page.getByRole("button", { name: "Submit", exact: true }).tap();
    await expect(page.locator(".prompt-overlay")).toHaveCount(0);
    await expect.poll(() => page.evaluate(() => window.testSocket.sent.some(item => item.event === "answer-letter-count" && item.data.count === 2))).toBe(true);
  });
});
