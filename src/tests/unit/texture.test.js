/**
 * Tests for the marble vein math in src/app/texture.js (pure functions; the bitmap itself is browser-only).
 * Run with: npm test
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { veinStrength, smoothStep, fractalNoise } from '../../app/texture';

test('smoothStep ramps between its edges in either direction and clamps outside them', () => {
  assert.equal(smoothStep(0, 1, -5), 0);
  assert.equal(smoothStep(0, 1, 5), 1);
  assert.equal(smoothStep(0, 1, 0.5), 0.5);
  assert.equal(smoothStep(0.1, 0, 0.0), 1);      // reversed edges: 1 at the near edge
  assert.equal(smoothStep(0.1, 0, 0.2), 0);
});

test('veinStrength stays between 0 and 0.7 and has both veins and clear marble', () => {
  let min = 1, max = 0, veined = 0;
  const samples = 64 * 64;
  for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
    const value = veinStrength(x / 64, y / 64);
    min = Math.min(min, value); max = Math.max(max, value);
    if (value > 0.3) veined++;
  }
  assert.ok(min >= 0 && max <= 0.7, `range ${min}..${max}`);
  assert.ok(veined / samples > 0.01 && veined / samples < 0.35, `veined share ${veined / samples}`);
});

test('the texture tiles: the right edge continues into the left edge and the bottom into the top', () => {
  for (const t of [0, 0.13, 0.5, 0.87]) {
    assert.ok(Math.abs(veinStrength(0, t) - veinStrength(1, t)) < 1e-9);
    assert.ok(Math.abs(veinStrength(t, 0) - veinStrength(t, 1)) < 1e-9);
  }
});

test('fractalNoise is repeatable and within 0 to 1', () => {
  assert.equal(fractalNoise(0.3, 0.7, 3, 5), fractalNoise(0.3, 0.7, 3, 5));
  for (let i = 0; i < 200; i++) { const v = fractalNoise(i / 37, i / 53, 3, 5); assert.ok(v >= 0 && v <= 1); }
});
