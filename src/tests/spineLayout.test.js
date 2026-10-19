/**
 * Unit tests for src/prototype/spineLayout.js (spine layout and cache keys).
 * Run with: npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const SL = require('../prototype/shelfLogic');
const Layout = require('../prototype/spineLayout');
const { buildFakeLibrary } = require('../prototype/fakeData');

const sticker = { size: 15, bg: 'hsl(1,1%,1%)', text: 'black', ring: 'grey' };
/** Builds a layout for a test book with sensible defaults. */
function layoutFor(overrides = {}, extra = {}) {
  const book = Object.assign({ id: 'b', title: 'The Burning Court', author: 'Mira Okonkwo', genre: 'fantasy', hue: 12, pages: 800, series: '', seriesNumber: 0 }, overrides);
  const width = SL.spineThickness(book.pages), height = 150;
  return Layout.computeLayout({ book, width, height, isLight: false, ...extra });
}

test('the title and author fit inside the spine, in order from the top', () => {
  const l = layoutFor({ title: 'Low Water' });
  assert.ok(l.title.top >= 0 && l.title.top + l.title.height <= l.height);
  assert.ok(l.author && l.author.top >= l.title.top + l.title.height);
  assert.ok(l.author.top + l.author.height <= l.height);
});

test('a thin spine leaves the author off, and a long title on a short spine does too', () => {
  assert.equal(layoutFor({ pages: 100 }).author, null);                          // 15 px wide
  assert.equal(layoutFor({ title: 'A Very Long Title That Will Not Fit Beside An Author' }).author, null);
});

test('type size stays between the smallest and largest allowed', () => {
  for (const title of ['Hi', 'The Burning Court', 'A Very Long Title That Will Not Fit Beside An Author']) {
    const f = layoutFor({ title }).title.fontSize;
    assert.ok(f >= 7.5 && f <= 17 * 1.3, `font ${f} for "${title}"`);
  }
});

test('a series sticker takes room at the bottom, keeps its size, and shows the number', () => {
  const withSticker = layoutFor({ series: 'S', seriesNumber: 3 }, { sticker });
  const without = layoutFor();
  assert.equal(withSticker.sticker.size, 15);
  assert.equal(withSticker.sticker.number, 3);
  assert.ok(withSticker.title.height < without.title.height + 1e-9, 'the sticker leaves less room for the title');
  assert.equal(without.sticker, null);
});

test('bands and label depend on the genre style', () => {
  assert.equal(layoutFor({ genre: 'fantasy' }).bands.length, 4);                 // gilt
  assert.equal(layoutFor({ genre: 'scifi' }).bands[0].kind, 'stripe');
  assert.ok(layoutFor({ genre: 'mystery' }).label);                              // paper label
  assert.equal(layoutFor({ genre: 'literary' }).bands.length, 0);                // plain
  assert.equal(layoutFor({ genre: 'nonfiction' }).bands[0].kind, 'block');
});

test('gilt titles use gold on dark spines and ink on light ones', () => {
  assert.equal(layoutFor({ genre: 'fantasy' }, { isLight: false }).title.colorKind, 'accent');
  assert.equal(layoutFor({ genre: 'fantasy' }, { isLight: true }).title.colorKind, 'text');
  assert.equal(layoutFor({ genre: 'mystery' }).title.colorKind, 'ink');
});

test('drawing the same spine larger keeps the same proportions (unit scales everything)', () => {
  const small = layoutFor();
  const big = layoutFor({}, { width: small.width * 2, height: 300, unit: 2 });
  assert.ok(Math.abs(big.title.top / 2 - small.title.top) < 1e-9);
  assert.ok(Math.abs(big.title.fontSize / 2 - small.title.fontSize) < 1e-9);
});

test('bad sizes are rejected', () => {
  assert.throws(() => layoutFor({}, { width: 0 }), RangeError);
  assert.throws(() => layoutFor({}, { unit: -1 }), RangeError);
});

test('every book in the example library lays out cleanly', () => {
  const books = buildFakeLibrary('2026-10-19');
  const styles = SL.buildSeriesStyles(books);
  for (const book of books) {
    const l = Layout.computeLayout({ book, width: SL.spineThickness(book.pages), height: SL.spineHeight(book.id), sticker: styles[book.series], isLight: false });
    assert.ok(l.title.height > 0 && l.title.top + l.title.height <= l.height, book.id);
  }
});

test('the cache key changes when anything that affects the picture changes, and not otherwise', () => {
  const book = { id: 'x', title: 'T', author: 'A B', genre: 'fantasy', hue: 10, series: '', seriesNumber: 0 };
  const base = { book, width: 20, height: 150, unit: 1, sticker: undefined, ratio: 3 };
  const key = Layout.cacheKey(base);
  assert.equal(Layout.cacheKey({ ...base }), key);
  assert.notEqual(Layout.cacheKey({ ...base, book: { ...book, title: 'T2' } }), key);
  assert.notEqual(Layout.cacheKey({ ...base, book: { ...book, hue: 11 } }), key);
  assert.notEqual(Layout.cacheKey({ ...base, ratio: 2 }), key);
  assert.notEqual(Layout.cacheKey({ ...base, width: 21 }), key);
  assert.notEqual(Layout.cacheKey({ ...base, sticker }), key);
  assert.equal(Layout.cacheKey({ ...base, book: { ...book, pages: 10 } }), key, 'pages only matter through the width given');
});
