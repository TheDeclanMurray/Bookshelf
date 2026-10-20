/**
 * Unit tests for src/app/poseSolver.js (projecting a 3D face and solving for a pose).
 * Run with: npm test
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { PoseSolver as PS } from '../../app/poseSolver';

const PERSPECTIVE = 1300;
const W = 183, H = 275, D = 42;
const COVER = [[-W / 2, -H / 2, D / 2], [W / 2, -H / 2, D / 2], [W / 2, H / 2, D / 2], [-W / 2, H / 2, D / 2]];
const SPINE = [[-W / 2, -H / 2, -D / 2], [-W / 2, -H / 2, D / 2], [-W / 2, H / 2, D / 2], [-W / 2, H / 2, -D / 2]];

test('projectPoint with no turn is a plain scale and move (plus a small perspective effect for z)', () => {
  const [x, y] = PS.projectPoint([10, 20, 0], { x: 5, y: -5, scale: 2, rotateX: 0, rotateY: 0 }, PERSPECTIVE);
  assert.ok(Math.abs(x - 25) < 1e-9 && Math.abs(y - 35) < 1e-9);
});

test('points nearer the viewer look bigger, points farther look smaller', () => {
  const pose = { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0 };
  const near = PS.projectPoint([100, 0, 200], pose, PERSPECTIVE)[0];
  const far = PS.projectPoint([100, 0, -200], pose, PERSPECTIVE)[0];
  assert.ok(near > 100 && far < 100);
});

test('a quarter turn about Y puts the left edge toward the viewer (the spine shows)', () => {
  const pose = { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 90 };
  const [x, , ] = PS.projectPoint([-W / 2, 0, 0], pose, PERSPECTIVE);
  assert.ok(Math.abs(x) < 1e-6, 'the spine plane faces the viewer, so it sits at x = 0');
});

test('solvePose recovers a known pose from a rough starting guess (cover, all fields free)', () => {
  const truth = { x: -37, y: 28, scale: 0.8, rotateX: 36, rotateY: -14 };
  const targets = PS.projectCorners(COVER, truth, PERSPECTIVE);
  const { pose, rms } = PS.solvePose({ corners: COVER, targets, perspective: PERSPECTIVE,
    initial: { x: 0, y: 0, scale: 0.7, rotateX: 30, rotateY: 5 }, free: ['x', 'y', 'scale', 'rotateX', 'rotateY'] });
  assert.ok(rms < 0.05, `rms ${rms}`);
  for (const key of Object.keys(truth)) assert.ok(Math.abs(pose[key] - truth[key]) < 0.2, `${key}: ${pose[key]} vs ${truth[key]}`);
});

test('solvePose recovers a pose that includes a roll (stacked turns), which plain X and Y turns cannot express', () => {
  const truth = { x: 12, y: -20, scale: 0.9, rotateX: 38, rotateY: 16, rotateZ: -9 };
  const targets = PS.projectCorners(COVER, truth, PERSPECTIVE);
  const { pose, rms } = PS.solvePose({ corners: COVER, targets, perspective: PERSPECTIVE,
    initial: { x: 0, y: 0, scale: 0.8, rotateX: 38, rotateY: 16, rotateZ: 0 }, free: ['x', 'y', 'scale', 'rotateX', 'rotateY', 'rotateZ'] });
  assert.ok(rms < 0.1, `rms ${rms}`);
  assert.ok(Math.abs(pose.rotateZ - truth.rotateZ) < 0.5, `rotateZ ${pose.rotateZ}`);
});

test('solvePose lands a spine on its slot with rotations fixed, compensating for perspective', () => {
  const truth = { x: -120, y: 90, scale: 0.55, rotateX: 0, rotateY: 90 };   // a pose whose spine looks like a shelf spine
  const targets = PS.projectCorners(SPINE, truth, PERSPECTIVE);
  const naive = { x: targets[0] / 2 + targets[4] / 2, y: targets[1] / 2 + targets[5] / 2, scale: 0.5, rotateX: 0, rotateY: 90 };   // centered on the slot, perspective ignored
  const { pose, rms } = PS.solvePose({ corners: SPINE, targets, perspective: PERSPECTIVE, initial: naive, free: ['x', 'y', 'scale'] });
  assert.ok(rms < 0.05, `rms ${rms}`);
  assert.ok(Math.abs(pose.scale - truth.scale) < 0.002 && Math.abs(pose.x - truth.x) < 0.2 && Math.abs(pose.y - truth.y) < 0.2);
  // Perspective makes a near face look bigger, so the pose that matches has a slightly smaller x/y than the on-screen center
  const centerX = (targets[0] + targets[4]) / 2;
  assert.ok(Math.abs(pose.x) < Math.abs(centerX), 'the pose offset is pulled toward the origin');
});

test('solvePose rejects mismatched input and an empty free list', () => {
  assert.throws(() => PS.solvePose({ corners: COVER, targets: [1, 2], initial: { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0 }, free: ['x'], perspective: PERSPECTIVE }), RangeError);
  assert.throws(() => PS.solvePose({ corners: COVER, targets: new Array(8).fill(0), initial: { x: 0, y: 0, scale: 1, rotateX: 0, rotateY: 0 }, free: [], perspective: PERSPECTIVE }), RangeError);
});
