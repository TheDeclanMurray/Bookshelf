/**
 * Tests for the example library in src/app/fakeData.js: it should be valid,
 * repeatable, and exercise the features the prototype demonstrates.
 * Run with: npm test
 */
import { test } from 'vitest';
import assert from 'node:assert/strict';
import { ShelfLogic as SL } from '../../app/shelfLogic';
import { FakeData } from '../../app/fakeData';
const { buildFakeLibrary } = FakeData;

const TODAY = '2026-10-19';

test('every book is valid: unique id, positive pages, known status, age and genre, hue in range', () => {
  const books = buildFakeLibrary(TODAY);
  const genreKeys = SL.GENRES.map((g) => g.key);
  assert.equal(new Set(books.map((b) => b.id)).size, books.length);
  for (const b of books) {
    assert.ok(b.title && b.author, b.id);
    assert.ok(b.pages > 0, b.id);
    assert.ok(SL.STATUSES.includes(b.status), b.id);
    assert.ok(SL.AGES.includes(b.age), b.id);
    assert.ok(genreKeys.includes(b.genre), b.id);
    assert.ok(b.hue >= 0 && b.hue < 360, `${b.id} hue ${b.hue}`);
  }
});

test('the library is repeatable and titles are unique', () => {
  assert.deepEqual(buildFakeLibrary(TODAY), buildFakeLibrary(TODAY));
  const titles = buildFakeLibrary(TODAY).map((b) => b.title);
  assert.equal(new Set(titles).size, titles.length);
});

test('exactly one book is being read, started 10 days before today', () => {
  const reading = buildFakeLibrary(TODAY).filter((b) => b.status === 'reading');
  assert.equal(reading.length, 1);
  assert.equal(SL.daysBetween(reading[0].startedAt, TODAY), 10);
});

test('finished books have a rating and dates in order', () => {
  for (const b of buildFakeLibrary(TODAY).filter((x) => x.status === 'read')) {
    assert.ok(b.rating >= 1 && b.rating <= 5, b.id);
    assert.ok(b.startedAt <= b.finishedAt, `${b.id} ${b.startedAt} > ${b.finishedAt}`);
  }
});

test('series books carry a number and a total', () => {
  for (const b of buildFakeLibrary(TODAY).filter((x) => x.series)) {
    assert.ok(b.seriesNumber >= 1 && b.seriesNumber <= b.seriesTotal, b.id);
  }
});

test('the demo shows what it should: fantasy overflows, horror and self-help hide, youth, TBR and DNF exist', () => {
  const rooms = SL.buildRooms(buildFakeLibrary(TODAY));
  const ids = rooms.map((r) => r.id);
  assert.ok(rooms.filter((r) => r.groupKey === 'fantasy').length >= 2, 'fantasy should need two bookcases');
  assert.ok(!ids.some((id) => id.startsWith('horror') || id.startsWith('selfhelp')));
  for (const key of ['tbr', 'youth', 'dnf']) assert.ok(ids.includes(key + '-0'), key);
  assert.equal(rooms.find((r) => r.kind === 'reading').book.title, 'The Burning Court');
});
