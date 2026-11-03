import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createServer as createTcpServer } from "node:net";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import { createServer } from "vite";

// Exercise two real browsers through React, Socket.IO, and the supplied SQLite
// dictionary. Both servers use temporary ports; production databases are untouched.
process.env.WORD_CHAIN_DB_PATH = ":memory:";
process.env.FINISH_WORD_DB_PATH = ":memory:";
process.env.FINISH_WORDS_FILE = fileURLToPath(new URL("../../../word-duel-server/clean-words.txt", import.meta.url));
const requireServer = createRequire(new URL("../../../word-duel-server/package.json", import.meta.url));
const { server, io } = requireServer("./index.js");
const vocabulary = readFileSync(process.env.FINISH_WORDS_FILE, "utf8").split(/\r?\n/).map((word) => word.trim().toLowerCase()).filter((word) => word.length >= 2);
let vite, browser;
try {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const endpoint = `http://127.0.0.1:${server.address().port}`;
  // Vite treats port 0 as its default, so reserve an OS-assigned free port.
  const portProbe = createTcpServer();
  await new Promise((resolve) => portProbe.listen(0, "127.0.0.1", resolve));
  const frontendPort = portProbe.address().port;
  await new Promise((resolve) => portProbe.close(resolve));
  vite = await createServer({
    root: fileURLToPath(new URL("../../", import.meta.url)),
    define: { "import.meta.env.VITE_SERVER_URL": JSON.stringify(endpoint) },
    server: { host: "127.0.0.1", port: frontendPort, strictPort: true },
    logLevel: "error",
  });
  await vite.listen();
  const url = `http://127.0.0.1:${vite.httpServer.address().port}`;
  browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH } : {});
  const host = await browser.newPage(), guest = await browser.newPage();
  const errors = [];
  for (const page of [host, guest]) {
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("https://fonts.googleapis.com/**", (route) => route.abort());
    await page.route("https://fonts.gstatic.com/**", (route) => route.abort());
  }
  await host.goto(url);
  await host.getByRole("button", { name: /Finish the Word Link/ }).click();
  await host.getByLabel("PLAYER NAME").fill("Host Warrior");
  await host.getByRole("button", { name: /Create Finish the Word room/ }).click();
  await expect(host.getByTestId("character-knight")).toBeVisible();
  const code = await host.locator(".room-code-chars").innerText();
  await guest.goto(url);
  await guest.getByLabel("PLAYER NAME").fill("Guest Warrior");
  await guest.getByRole("tab", { name: "Join room", exact: true }).click();
  await guest.getByLabel("8-CHARACTER ROOM CODE").fill(code);
  await guest.getByRole("button", { name: /^Join room/ }).click();
  await expect(guest.getByTestId("character-knight")).toBeVisible();
  await host.getByTestId("character-knight").click();
  await expect(guest.getByTestId("character-knight")).toBeDisabled();
  await guest.getByTestId("character-wizard").click();
  await expect(host.getByRole("button", { name: "Start Finish the Word" })).toHaveCount(0);
  await host.getByRole("button", { name: "I'm ready to battle", exact: true }).click();
  await guest.getByRole("button", { name: "I'm ready to battle", exact: true }).click();
  await expect(host.locator(".countdown-overlay")).toBeVisible();
  const hostInput = host.getByRole("textbox", { name: "Your word" });
  const guestInput = guest.getByRole("textbox", { name: "Your word" });
  await expect(hostInput).toBeVisible({ timeout: 12000 });
  await expect.poll(async () => await hostInput.isEnabled() || await guestInput.isEnabled()).toBe(true);
  const first = await hostInput.isEnabled() ? host : guest;
  const second = first === host ? guest : host;
  const firstInput = first.getByRole("textbox", { name: "Your word" });
  const secondInput = second.getByRole("textbox", { name: "Your word" });
  const firstName = first === host ? "Host Warrior" : "Guest Warrior";
  const secondName = first === host ? "Guest Warrior" : "Host Warrior";
  await expect(firstInput).toBeEnabled(); await expect(secondInput).toBeDisabled();
  const prefix = (await host.getByTestId("required-prefix").innerText()).toLowerCase();
  const word = vocabulary.find((candidate) => candidate.startsWith(prefix));
  assert.ok(word, `Dictionary must contain a playable word starting with ${prefix}`);
  await firstInput.fill(` ${word.split("").join(" ")} `);
  await expect(firstInput).toHaveValue(word);
  await expect(second.getByTestId("live-word-bubble")).toContainText(word);
  await first.getByRole("button", { name: "Submit word", exact: true }).click();
  await expect(secondInput).toBeEnabled(); await expect(firstInput).toBeDisabled();
  await expect(second.getByTestId("required-prefix")).toHaveText(word.slice(-1).toUpperCase());
  await secondInput.fill(`${word.slice(-1)}${"z".repeat(40)}`);
  await second.getByRole("button", { name: "Submit word", exact: true }).click();
  await expect(secondInput).toBeEnabled();
  await expect(second.locator("#finish-word-input-error")).toContainText("Try again");
  await expect(secondInput).toHaveValue("");
  await expect(first.getByTestId("live-word-bubble")).toContainText("Thinking");
  await expect(firstInput).toBeDisabled();
  await expect(first.getByRole("article", { name: `${secondName}, 3 lives, current turn`, exact: true })).toHaveCount(1);
  const nextWord = vocabulary.find((candidate) => candidate !== word && candidate.startsWith(word.slice(-1)));
  assert.ok(nextWord);
  await secondInput.fill(nextWord);
  await second.getByRole("button", { name: "Submit word", exact: true }).click();
  await expect(firstInput).toBeEnabled();
  await expect(first.getByRole("article", { name: `${secondName}, 3 lives`, exact: true })).toHaveCount(1);
  const draft = nextWord.slice(-1);
  await firstInput.fill(draft);
  await expect(second.getByTestId("live-word-bubble")).toContainText(draft);
  await first.reload();
  await expect(firstInput).toBeEnabled(); await expect(firstInput).toHaveValue(draft);
  await expect(second.locator(".room-pause-overlay")).toHaveCount(0);
  await expect(first.getByRole("article", { name: `${firstName}, 3 lives, current turn`, exact: true })).toHaveCount(1);
  assert.deepEqual(errors, [], "Both React clients should remain free of runtime errors");
  console.log("PASS: real two-browser character locking, explicit readiness, invalid-word retries, SQLite validation, typing, camera turns and full-room reload recovery.");
} finally {
  if (browser) await browser.close();
  if (vite) await vite.close();
  await new Promise((resolve) => io.close(resolve));
}
