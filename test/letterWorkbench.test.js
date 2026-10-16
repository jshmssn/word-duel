import test from 'node:test';
import assert from 'node:assert/strict';
import { reconcileSlots } from '../src/logic/letterWorkbench.js';

test('adds unordered confirmed clues to available slots', () => {
  assert.deepEqual(reconcileSlots([], ['E', 'A', 'R'], 6), ['E', 'A', 'R', null, null, null]);
});

test('preserves player arrangements after new clues arrive', () => {
  assert.deepEqual(reconcileSlots(['A', null, 'E', null], ['E', 'A', 'T'], 4), ['A', 'T', 'E', null]);
});

test('preserves duplicate letter counts without inventing positions', () => {
  assert.deepEqual(reconcileSlots(['O', null, 'A', null, null], ['O', 'O', 'A'], 5), ['O', 'O', 'A', null, null]);
});

test('reconciles corrected counts and removes invalid hypotheses', () => {
  assert.deepEqual(reconcileSlots(['A', 'O', 'O', 'E'], ['O', 'E'], 4), [null, 'O', null, 'E']);
});

test('handles empty and short words safely', () => {
  assert.deepEqual(reconcileSlots([], [], 0), []);
  assert.deepEqual(reconcileSlots([], ['A', 'B', 'C'], 2), ['A', 'B']);
});
