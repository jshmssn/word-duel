import { test, expect } from "@playwright/test";
import { installServerFixture, receive, room, players } from "./serverFixture.js";

const roster = [...players, { id: "third", username: "Third player", ready: false, wins: 0 }];
const colorRoom = { ...room, gameMode: "color-card", colorDuration: 30, maxPlayers: 3, players: roster };
async function start(page, phase = "picking") {
  await receive(page, "room-created", colorRoom);
  const now = await page.evaluate(() => Date.now());
  const state = { ...colorRoom, roundId: "vote-round", phase, targetColor: "#A34F2E", roundNumber: 1, totalRounds: 5,
    serverNow: now, roundDuration: 30, memorizeEndsAt: phase === "picking" ? now : now + 5000,
    roundEndsAt: now + (phase === "picking" ? 30000 : 35000), submittedPlayerIds: [] };
  await receive(page, "START_GAME", state);
  return state;
}
async function openVote(page, state) {
  const vote = { id: "poll-1", status: "active", endsAt: state.roundEndsAt - 10000, requiredYes: 2, totalPlayers: 3, yesPlayerIds: [], noPlayerIds: [] };
  await receive(page, "SUBMISSION_UPDATE", { code: room.code, roundId: state.roundId, submittedPlayerIds: roster.map((player) => player.id) });
  await receive(page, "COLOR_SKIP_VOTE", { code: room.code, roundId: state.roundId, vote });
  return vote;
}
async function acknowledge(page, event, response) { await page.evaluate(({ event, response }) => window.testSocket.acknowledge(event, response), { event, response }); }

test.beforeEach(async ({ page }) => {
  await installServerFixture(page);
  await page.clock.install();
  await page.goto("/");
});

for (const viewport of [{ width: 280, height: 653 }, { width: 320, height: 568 }, { width: 390, height: 844 }, { width: 667, height: 320 }, { width: 1440, height: 900 }]) {
  test(`skip voting remains usable without page scrolling at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    const state = await start(page);
    const vote = await openVote(page, state);
    const panel = page.getByRole("dialog", { name: "Vote to skip time" });
    await expect(panel).toContainText("2 of 3 players must vote Yes");
    await expect(page.getByRole("timer", { name: "20 seconds to vote" })).toBeVisible();
    await page.clock.fastForward(5000);
    await expect(page.getByRole("timer", { name: "15 seconds to vote" })).toBeVisible();
    await expect.poll(() => panel.evaluate((element) => {
      const frame = element.getBoundingClientRect();
      return frame.top >= 0 && frame.bottom <= innerHeight && frame.left >= 0 && frame.right <= innerWidth;
    })).toBe(true);
    await expect(page.locator(".color-timer .timer-seconds")).toHaveText("25s");
    const yes = page.getByRole("button", { name: "Yes, show results", exact: true });
    await yes.click();
    expect(await page.evaluate(() => window.testSocket.sent.find((item) => item.event === "VOTE_COLOR_SKIP").data)).toEqual({ code: room.code, roundId: state.roundId, voteId: vote.id, choice: "yes" });
    await acknowledge(page, "VOTE_COLOR_SKIP", { success: true });
    await receive(page, "COLOR_SKIP_VOTE", { code: room.code, roundId: state.roundId, vote: { ...vote, yesPlayerIds: ["mobile-player"] } });
    await expect(yes).toHaveAttribute("aria-pressed", "true");
    await expect(yes).toBeDisabled();
    await expect(panel).toContainText("You voted Yes");
    await expect(page.getByRole("button", { name: "No, keep the time" })).toBeDisabled();
    expect(await page.evaluate(() => ({ scroll: scrollY, overflow: document.documentElement.scrollHeight > innerHeight, width: document.documentElement.scrollWidth > innerWidth }))).toEqual({ scroll: 0, overflow: false, width: false });
    await expect(page.getByRole("button", { name: "How to play", exact: true })).toBeVisible();
    expect(await page.locator(".site-header .howto-link").count()).toBe(0);
  });
}

test("No votes, rejected votes, expired polls and stale rounds keep the timer intact", async ({ page }) => {
  const state = await start(page);
  const vote = await openVote(page, state);
  const no = page.getByRole("button", { name: "No, keep the time" });
  await no.click();
  await acknowledge(page, "VOTE_COLOR_SKIP", { success: false, message: "Try again." });
  await expect(page.locator(".color-vote-error")).toHaveText("Try again.");
  await expect(no).toBeEnabled();
  await no.click(); await acknowledge(page, "VOTE_COLOR_SKIP", { success: true });
  await receive(page, "COLOR_SKIP_VOTE", { code: room.code, roundId: state.roundId, vote: { ...vote, noPlayerIds: ["mobile-player", "opponent"], status: "declined" } });
  await expect(page.locator(".color-vote-resolved")).toContainText("No majority");
  await expect(page.locator(".color-timer .timer-seconds")).toHaveText("30s");
  await expect(page.getByRole("button", { name: "Edit answer" })).toBeVisible();
  await receive(page, "COLOR_SKIP_VOTE", { code: room.code, roundId: "stale", vote: { ...vote, id: "stale" } });
  await expect(page.getByRole("dialog", { name: "Vote to skip time" })).toHaveCount(0);
});

test("all answers arriving below 20 seconds do not display or request a skip vote", async ({ page }) => {
  const state = await start(page);
  await page.clock.fastForward(11000);
  await receive(page, "SUBMISSION_UPDATE", { code: room.code, roundId: state.roundId, submittedPlayerIds: roster.map((player) => player.id) });
  await expect(page.locator(".color-timer .timer-seconds")).toHaveText("19s");
  await expect(page.getByRole("dialog", { name: "Vote to skip time" })).toHaveCount(0);
  expect(await page.evaluate(() => window.testSocket.sent.some((entry) => entry.event === "VOTE_COLOR_SKIP"))).toBe(false);
});

test("Color Card sounds play for actions, voting and results, and the sound toggle mutes them", async ({ page }) => {
  await page.evaluate(() => {
    window.playedTones = [];
    window.wordDuelAudio.SFX.colorSubmit();
  });
  // Observe the real synthesis engine through its audio context, not UI labels.
  await page.addInitScript(() => {
    window.playedTones = [];
    window.AudioContext = class {
      state = "running"; currentTime = 0; destination = {};
      resume() { return Promise.resolve(); }
      createOscillator() { return { type: "sine", connect() {}, start() {}, stop() {}, frequency: { setValueAtTime(value) { window.playedTones.push(value); } } }; }
      createGain() { return { connect() {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } }; }
    };
  });
  await page.reload();
  const count = () => page.evaluate(() => window.playedTones.length);
  await page.evaluate(() => window.wordDuelAudio.SFX.colorSubmit());
  expect(await count()).toBe(0);
  await page.getByRole("button", { name: "Turn sound on" }).click();
  let before = await count();
  const state = await start(page, "memorizing");
  expect(await count()).toBeGreaterThan(before);
  before = await count();
  await page.clock.fastForward(5000);
  await receive(page, "COLOR_PICKING_STARTED", { code: room.code, roundId: state.roundId, phase: "picking", roundEndsAt: state.roundEndsAt });
  expect(await count()).toBeGreaterThan(before);
  before = await count();
  await page.getByRole("slider", { name: "Hue", exact: true }).fill("120");
  expect(await count()).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Submit Color", exact: true }).click();
  before = await count();
  await acknowledge(page, "SUBMIT_COLOR", { success: true });
  expect(await count()).toBeGreaterThan(before);
  before = await count();
  const vote = await openVote(page, state);
  expect(await count()).toBeGreaterThan(before);
  before = await count();
  await page.getByRole("button", { name: "No, keep the time" }).click();
  expect(await count()).toBeGreaterThan(before);
  await acknowledge(page, "VOTE_COLOR_SKIP", { success: true });
  before = await count();
  await receive(page, "COLOR_SKIP_VOTE", { code: room.code, roundId: state.roundId, vote: { ...vote, status: "declined", noPlayerIds: ["mobile-player", "opponent"] } });
  expect(await count()).toBeGreaterThan(before);
  before = await count();
  const result = { ...colorRoom, roundId: state.roundId, phase: "review", roundNumber: 1, totalRounds: 5, targetColor: "#123456", reviewEndsAt: state.roundEndsAt + 5000,
    entries: [{ ...players[0], submittedColor: "#112233", distance: 7, accuracy: 90, timeConsumedMs: 5432 }], winners: [], winnerIds: [], standings: [], matchWinnerIds: [] };
  await receive(page, "ROUND_RESULTS", result);
  expect(await count()).toBeGreaterThan(before);
  await expect(page.locator(".color-result-time")).toContainText("5.43s");
  before = await count();
  await receive(page, "COLOR_RANKINGS", { ...result, phase: "ranking", winners: [players[0]], winnerIds: ["mobile-player"], rankingEndsAt: state.roundEndsAt + 15000 });
  expect(await count()).toBeGreaterThan(before);
  await page.getByRole("button", { name: "Turn sound off" }).click();
  before = await count();
  await page.evaluate(() => { const sfx = window.wordDuelAudio.SFX; sfx.colorAdjust("h", 180); sfx.colorSubmit(); sfx.voteOpen(); sfx.voteSelect("yes"); sfx.votePassed(); sfx.colorReview(); sfx.win(); });
  expect(await count()).toBe(before);
});
