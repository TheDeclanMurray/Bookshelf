/**
 * Tests for the prototype build: the real sources must build, and the duplicate-name
 * check must catch two files declaring the same top-level name.
 * Run with: npm test
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { buildPage, findDuplicateNames } from '../prototype/build.mjs';

const PROTOTYPE_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'prototype');

test('the real prototype sources build with no duplicate top-level names', () => {
  const page = buildPage(PROTOTYPE_DIR);
  assert.ok(page.includes('ReactDOM.createRoot'));
  assert.ok(!/\/\*INLINE:/.test(page), 'every marker should be replaced');
});

test('findDuplicateNames reports repeated declarations across files only', () => {
  assert.deepEqual(findDuplicateNames(['const A = 1;\nfunction f() {}', 'const B = 2;']), []);
  assert.deepEqual(findDuplicateNames(['const A = 1;', 'const A = 2;\nconst B = 3;', 'function B() {}']).sort(), ['A', 'B']);
});

test('indented declarations inside functions are not counted as top-level', () => {
  assert.deepEqual(findDuplicateNames(['function a() {\n  const x = 1;\n}', 'function b() {\n  const x = 2;\n}']), []);
});
