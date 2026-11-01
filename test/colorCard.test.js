import test from "node:test";
import assert from "node:assert/strict";
import { hsvToHex, hexToHsv, cardInk, scoreFeedback } from "../src/logic/colorCard.js";

test("HSV picker converts primary hues, saturation, and brightness to HEX", () => {
  assert.equal(hsvToHex({ h: 0, s: 100, v: 100 }), "#FF0000");
  assert.equal(hsvToHex({ h: 120, s: 100, v: 100 }), "#00FF00");
  assert.equal(hsvToHex({ h: 240, s: 100, v: 100 }), "#0000FF");
  assert.equal(hsvToHex({ h: 169, s: 54, v: 87 }), "#66DEC8");
  assert.equal(hsvToHex({ h: 360, s: 0, v: 100 }), "#FFFFFF");
  assert.equal(hsvToHex({ h: 180, s: 100, v: 0 }), "#000000");
});

test("result metadata round-trips colors and chooses readable card text", () => {
  for (const color of ["#A34F2E", "#000000", "#FFFFFF", "#66DECA", "#FF00FF"]) assert.equal(hsvToHex(hexToHsv(color)), color);
  assert.equal(cardInk("#000000"), "#FFFFFF");
  assert.equal(cardInk("#FFFFFF"), "#10201D");
});

test("score feedback progresses from absurd roasts to high praise", () => {
  assert.match(scoreFeedback(7.71), /raccoon/);
  assert.match(scoreFeedback(55), /sketchy website/);
  assert.match(scoreFeedback(99), /color printer/);
  assert.match(scoreFeedback(100), /perfect match/);
  assert.match(scoreFeedback(null), /No color/);
});
