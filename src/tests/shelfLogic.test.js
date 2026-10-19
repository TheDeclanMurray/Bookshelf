/**
 * Unit tests for src/prototype/shelfLogic.js (pure logic: spines, sorting, packing, rooms).
 * Run with: npm test
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const SL = require('../prototype/shelfLogic');

/** Builds a minimal book for tests. */
function book(overrides) {
  return Object.assign({ id: 'x', title: 'Title', author: 'Ann Smith', series: '', seriesNumber: 0, pages: 300,
    genre: 'fantasy', age: 'adult', status: 'read', hue: 100, rating: 4, finishedAt: '2024-01-01' }, overrides);
}

// ------------------------------------------------------------------- randomness
test('seededRandom repeats for the same seed and differs between seeds', () => {
  const a = SL.seededRandom('abc'); const b = SL.seededRandom('abc'); const c = SL.seededRandom('abd');
  assert.equal(a(), b());
  assert.notEqual(SL.seededRandom('abc')(), c());
});

test('seededRandom stays in [0, 1)', () => {
  const r = SL.seededRandom('range');
  for (let i = 0; i < 500; i++) { const v = r(); assert.ok(v >= 0 && v < 1); }
});

// --------------------------------------------------------------- spine geometry
test('spineThickness scales with pages and clamps at both ends', () => {
  assert.equal(SL.spineThickness(400), 25);
  assert.equal(SL.spineThickness(10), SL.MIN_SPINE_PX);
  assert.equal(SL.spineThickness(5000), SL.MAX_SPINE_PX);
});

test('spineThickness rejects bad page counts', () => {
  for (const bad of [0, -5, NaN, Infinity, '300', undefined]) assert.throws(() => SL.spineThickness(bad), RangeError);
});

test('spineHeight is repeatable and within the allowed band', () => {
  assert.equal(SL.spineHeight('book-1'), SL.spineHeight('book-1'));
  for (let i = 0; i < 200; i++) {
    const h = SL.spineHeight('book-' + i);
    assert.ok(h >= SL.SPINE_BASE_HEIGHT_PX - 10 && h <= SL.SPINE_BASE_HEIGHT_PX + 14, `height ${h}`);
  }
});

test('spineHeight rejects an empty or non-string id', () => {
  assert.throws(() => SL.spineHeight(''), TypeError);
  assert.throws(() => SL.spineHeight(5), TypeError);
});

// ------------------------------------------------------------------------ color
test('hslToRgb gives known primaries and wraps hue', () => {
  assert.deepEqual(SL.hslToRgb(0, 1, 0.5), [255, 0, 0]);
  assert.deepEqual(SL.hslToRgb(120, 1, 0.5), [0, 255, 0]);
  assert.deepEqual(SL.hslToRgb(240, 1, 0.5), [0, 0, 255]);
  assert.deepEqual(SL.hslToRgb(360, 1, 0.5), [255, 0, 0]);
  assert.deepEqual(SL.hslToRgb(-120, 1, 0.5), [0, 0, 255]);
});

test('hslToRgb rejects out-of-range saturation or lightness', () => {
  assert.throws(() => SL.hslToRgb(0, 1.2, 0.5), RangeError);
  assert.throws(() => SL.hslToRgb(0, 0.5, -0.1), RangeError);
});

test('readableTextColor picks light text on dark and dark text on light', () => {
  assert.equal(SL.readableTextColor([10, 10, 10]), '#f3ead7');
  assert.equal(SL.readableTextColor([240, 235, 220]), '#1d140c');
});

test('spinePalette is repeatable and readable', () => {
  const b = book({ id: 'pal', hue: 210 });
  assert.deepEqual(SL.spinePalette(b), SL.spinePalette(b));
  const p = SL.spinePalette(b);
  assert.match(p.bg, /^hsl\(210,/);
  assert.ok([p.text].every((t) => t === '#f3ead7' || t === '#1d140c'));
});

// ---------------------------------------------------------------------- sorting
test('authorSortKey puts the surname first and rejects empty names', () => {
  assert.equal(SL.authorSortKey('Mira Okonkwo'), 'okonkwo mira');
  assert.equal(SL.authorSortKey('Madonna'), 'madonna');
  assert.throws(() => SL.authorSortKey('  '), TypeError);
});

test('library order: author, then series in number order, then standalone titles', () => {
  const list = [
    book({ id: '1', title: 'Zeta', author: 'Ann Brown' }),
    book({ id: '2', title: 'Book Two', author: 'Ann Adams', series: 'The Saga', seriesNumber: 2 }),
    book({ id: '3', title: 'Book One', author: 'Ann Adams', series: 'The Saga', seriesNumber: 1 }),
    book({ id: '4', title: 'Alpha', author: 'Ann Adams' }),
  ];
  assert.deepEqual(SL.sortBooks(list).map((b) => b.id), ['4', '3', '2', '1']);
});

test('library order ignores a leading "The" in titles', () => {
  const list = [book({ id: 'a', title: 'The Zebra' }), book({ id: 'b', title: 'Apple' })];
  assert.deepEqual(SL.sortBooks(list, 'title').map((b) => b.id), ['b', 'a']);
});

test('sortBooks supports every mode and does not mutate the input', () => {
  const list = [
    book({ id: 'a', rating: 3, finishedAt: '2023-05-01', hue: 300, title: 'A' }),
    book({ id: 'b', rating: 5, finishedAt: '2025-05-01', hue: 10, title: 'B' }),
    book({ id: 'c', rating: 4, finishedAt: '', hue: 200, title: 'C' }),
  ];
  const copy = list.slice();
  assert.deepEqual(SL.sortBooks(list, 'dateRead').map((b) => b.id), ['b', 'a', 'c']);
  assert.deepEqual(SL.sortBooks(list, 'rating').map((b) => b.id), ['b', 'c', 'a']);
  assert.deepEqual(SL.sortBooks(list, 'color').map((b) => b.id), ['b', 'c', 'a']);
  assert.deepEqual(list, copy);
});

test('sortBooks rejects an unknown mode', () => {
  assert.throws(() => SL.sortBooks([], 'banana'), RangeError);
});

test('nextSortMode cycles and wraps', () => {
  assert.equal(SL.nextSortMode('library'), 'dateRead');
  assert.equal(SL.nextSortMode('title'), 'library');
  assert.equal(SL.nextSortMode('nonsense'), 'library');
});

// ---------------------------------------------------------------------- packing
test('packIntoCases keeps every book and never overflows a shelf', () => {
  const books = Array.from({ length: 60 }, (_, i) => book({ id: 'b' + i, pages: 200 + (i % 7) * 100 }));
  const cases = SL.packIntoCases(books);
  const placed = cases.flatMap((c) => c.shelves.flat());
  assert.equal(placed.length, 60);
  for (const c of cases) {
    assert.ok(c.shelves.length <= SL.SHELVES_PER_CASE);
    for (const shelf of c.shelves) {
      const width = shelf.reduce((sum, p) => sum + p.thickness + 1, 0);
      assert.ok(width <= SL.SHELF_INNER_WIDTH_PX, `shelf width ${width}`);
    }
  }
});

test('packIntoCases spills into a second case when the first is full', () => {
  const books = Array.from({ length: 12 }, (_, i) => book({ id: 'b' + i, pages: 5000 }));   // 46px each
  const cases = SL.packIntoCases(books, { shelfWidth: 100, shelvesPerCase: 2 });              // 2 books per shelf
  assert.equal(cases.length, 3);
  assert.equal(cases[0].shelves.flat().length, 4);
});

test('packIntoCases handles no books and rejects bad options', () => {
  assert.deepEqual(SL.packIntoCases([]), []);
  assert.throws(() => SL.packIntoCases([], { shelfWidth: -1 }), RangeError);
  assert.throws(() => SL.packIntoCases([], { shelvesPerCase: -1 }), RangeError);
});

// ------------------------------------------------------------------------ rooms
test('caseTitle and toRoman name copies of a full bookcase', () => {
  assert.equal(SL.caseTitle('Fantasy', 0), 'Fantasy');
  assert.equal(SL.caseTitle('Fantasy', 1), 'Fantasy II');
  assert.equal(SL.caseTitle('Fantasy', 3), 'Fantasy IV');
  assert.equal(SL.toRoman(99), '99');
});

test('buildRooms orders TBR, reading, genres, youth, DNF and hides empty groups', () => {
  const books = [
    book({ id: '1', status: 'tbr' }),
    book({ id: '2', status: 'reading', startedAt: '2026-10-01' }),
    book({ id: '3', genre: 'scifi' }),
    book({ id: '4', genre: 'fantasy' }),
    book({ id: '5', age: 'ya' }),
    book({ id: '6', status: 'dnf' }),
  ];
  const rooms = SL.buildRooms(books);
  assert.deepEqual(rooms.map((r) => r.id), ['tbr-0', 'reading', 'fantasy-0', 'scifi-0', 'youth-0', 'dnf-0']);
  assert.ok(!rooms.some((r) => r.groupKey === 'horror' || r.groupKey === 'selfhelp'));
});

test('buildRooms always keeps the reading room, even with no books and no current read', () => {
  const rooms = SL.buildRooms([]);
  assert.deepEqual(rooms.map((r) => r.id), ['reading']);
  assert.equal(rooms[0].book, null);
});

test('buildRooms puts the most recently started book on the stand', () => {
  const rooms = SL.buildRooms([
    book({ id: 'old', status: 'reading', startedAt: '2026-01-01' }),
    book({ id: 'new', status: 'reading', startedAt: '2026-09-01' }),
  ]);
  assert.equal(rooms.find((r) => r.kind === 'reading').book.id, 'new');
});

test('buildRooms keeps TBR and DNF mixed across genres, and YA/kids reads in Youth only', () => {
  const rooms = SL.buildRooms([
    book({ id: 'a', status: 'tbr', genre: 'scifi' }), book({ id: 'b', status: 'tbr', genre: 'romance' }),
    book({ id: 'c', status: 'dnf', genre: 'fantasy', age: 'ya' }),
    book({ id: 'd', status: 'read', genre: 'fantasy', age: 'kids' }),
  ]);
  const tbr = rooms.find((r) => r.groupKey === 'tbr');
  assert.equal(tbr.shelves.flat().length, 2);
  assert.equal(rooms.find((r) => r.groupKey === 'dnf').shelves.flat().length, 1);   // a YA DNF stays in DNF
  assert.equal(rooms.find((r) => r.groupKey === 'youth').shelves.flat()[0].book.id, 'd');
  assert.ok(!rooms.some((r) => r.groupKey === 'fantasy'));
});

test('buildRooms adds a custom genre and never loses a book with an unknown genre', () => {
  const genres = SL.GENRES.concat([{ key: 'western', name: 'Western', font: 'serif', fontScale: 1, spineStyle: 'plain', theme: 'oak' }]);
  const rooms = SL.buildRooms([book({ id: 'w', genre: 'western' }), book({ id: 'q', genre: 'mystery-typo' })], { genres });
  assert.ok(rooms.some((r) => r.title === 'Western'));
  assert.ok(rooms.some((r) => r.title === 'Uncategorized'));
});

test('buildRooms names overflow copies and honors a per-group sort mode', () => {
  const many = Array.from({ length: 40 }, (_, i) => book({ id: 'f' + i, pages: 900, title: 'T' + String(i).padStart(2, '0'), rating: i % 5 }));
  const rooms = SL.buildRooms(many, { sortModes: { fantasy: 'title' } }).filter((r) => r.groupKey === 'fantasy');
  assert.ok(rooms.length >= 2);
  assert.equal(rooms[1].title, 'Fantasy II');
  assert.equal(rooms[0].shelves[0][0].book.title, 'T00');
});

// ------------------------------------------------------------------ book facts
test('seriesLabel handles series, partial info and standalones', () => {
  assert.equal(SL.seriesLabel(book({ series: 'S', seriesNumber: 3, seriesTotal: 7 })), 'Book 3 of 7');
  assert.equal(SL.seriesLabel(book({ series: 'S', seriesNumber: 3 })), 'Book 3');
  assert.equal(SL.seriesLabel(book({})), '');
});

test('daysBetween counts whole days and validates input', () => {
  assert.equal(SL.daysBetween('2026-10-10', '2026-10-19'), 9);
  assert.equal(SL.daysBetween('2026-10-19', '2026-10-10'), -9);
  assert.equal(SL.daysBetween('2024-02-28', '2024-03-01'), 2);   // leap year
  assert.throws(() => SL.daysBetween('10/10/2026', '2026-10-19'), TypeError);
});

test('formatShortDate formats and tolerates empty values', () => {
  assert.equal(SL.formatShortDate('2026-10-10'), 'Oct 10, 2026');
  assert.equal(SL.formatShortDate(''), '');
});

test('genreOf falls back to the first genre for unknown keys', () => {
  assert.equal(SL.genreOf(book({ genre: 'scifi' })).key, 'scifi');
  assert.equal(SL.genreOf(book({ genre: 'nope' })).key, 'fantasy');
});

test('clamp limits a value to a range', () => {
  assert.equal(SL.clamp(5, 0, 3), 3);
  assert.equal(SL.clamp(-1, 0, 3), 0);
  assert.equal(SL.clamp(2, 0, 3), 2);
});

// ---------------------------------------------------------------- series stickers
test('buildSeriesStyles gives every volume of a series the same sticker, sized to the thinnest volume', () => {
  const books = [
    book({ id: 'a1', series: 'Saga', seriesNumber: 1, pages: 900, hue: 20 }),
    book({ id: 'a2', series: 'Saga', seriesNumber: 2, pages: 300, hue: 28 }),   // 19px thick
    book({ id: 'b1', series: 'Other', seriesNumber: 1, pages: 900, hue: 200 }),
    book({ id: 'c', pages: 500 }),                                               // standalone
  ];
  const styles = SL.buildSeriesStyles(books);
  assert.deepEqual(Object.keys(styles).sort(), ['Other', 'Saga']);
  assert.equal(styles.Saga.size, 15);                  // 19px thinnest minus 4px margin
  assert.equal(styles.Other.size, 17);                 // capped at the maximum
  assert.notEqual(styles.Saga.bg, styles.Other.bg);    // different series can differ
});

test('buildSeriesStyles takes the color from volume 1 whatever the order, and is repeatable', () => {
  const list = [book({ id: '2', series: 'S', seriesNumber: 2, hue: 90 }), book({ id: '1', series: 'S', seriesNumber: 1, hue: 10 })];
  const styles = SL.buildSeriesStyles(list);
  assert.match(styles.S.bg, /^hsl\(190,/);              // complement of volume 1's hue (10)
  assert.deepEqual(SL.buildSeriesStyles(list.slice().reverse()), styles);
});

test('buildSeriesStyles clamps tiny spines to the minimum and ignores unnumbered series books', () => {
  const styles = SL.buildSeriesStyles([book({ id: 'x', series: 'Tiny', seriesNumber: 1, pages: 50 }), book({ id: 'y', series: 'NoNumber', seriesNumber: 0 })]);
  assert.equal(styles.Tiny.size, 11);
  assert.equal(styles.NoNumber, undefined);
});

test('every volume of every series in the example library fits its sticker', () => {
  const { buildFakeLibrary } = require('../prototype/fakeData');
  const books = buildFakeLibrary('2026-10-19');
  const styles = SL.buildSeriesStyles(books);
  for (const b of books.filter((x) => x.series)) {
    assert.ok(styles[b.series].size <= SL.spineThickness(b.pages) - 4 || styles[b.series].size === 11, b.id);
  }
});
