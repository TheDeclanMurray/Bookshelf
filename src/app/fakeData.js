import { ShelfLogic } from './shelfLogic';

/**
 * fakeData.js
 * Builds a believable, repeatable example library for the prototype: series,
 * standalones across the genres, a Youth shelf, TBR, DNF, and one book being read.
 * Horror and Self-Help are left empty on purpose to show that empty bookcases hide.
 * Titles and authors are invented; covers are drawn by the page, not fetched.
 */
const FakeData = (function () {
  'use strict';

  const SL = ShelfLogic;

  // ----------------------------------------------------------------- constants
  const FIRST_NAMES = ['Mira', 'Elias', 'Tessaly', 'Odalys', 'Ravi', 'Harriet', 'Poppy', 'Jonah', 'Cormac', 'Ines',
    'Dara', 'Wen', 'Lucian', 'Marguerite', 'Soren', 'Yara', 'Bram', 'Noor', 'Felix', 'Greta', 'Anselm', 'Priya',
    'Tomas', 'Linnea', 'Oren', 'Delphine', 'Kofi', 'Maren', 'Isidore', 'Saoirse'];
  const LAST_NAMES = ['Okonkwo', 'Varga', 'Brandt', 'Reyes', 'Menon', 'Lowe', 'Whitlow', 'Ferrin', 'Halloran',
    'Castellan', 'Ibarra', 'Zhou', 'Marchetti', 'Dufresne', 'Lindqvist', 'Haddad', 'Voss', 'Qureshi', 'Abernathy',
    'Sokolov', 'Thackeray', 'Nair', 'Oyelaran', 'Brandvold', 'Pemberton', 'Laurent', 'Mensah', 'Eriksen',
    'Fontaine', 'Gallagher'];
  const PLACES = ['the North', 'Ashmoor', 'the Drowned City', 'Low Harbor', 'the Verge', 'Calder Fen', 'the Last Season',
    'Eastmarch', 'the Salt Road', 'Winter Court', 'Hollowmere', 'the Far Shore'];

  // Per genre: title words, page range, and hue range (so sci-fi leans cool, romance leans warm)
  const GENRE_RECIPES = {
    fantasy: { adj: ['Gilded', 'Hollow', 'Silver', 'Forsaken', 'Last', 'Ember', 'Wintering', 'Thorned', 'Veiled', 'Sunken'],
      noun: ['Crown', 'Oath', 'Wyrm', 'Throne', 'Grove', 'Bell', 'Citadel', 'Ward', 'Lantern', 'Saga'], pages: [420, 980], hue: [0, 360] },
    scifi: { adj: ['Quiet', 'Fractured', 'Distant', 'Recursive', 'Pale', 'Orbital', 'Glass', 'Silent'],
      noun: ['Signal', 'Array', 'Horizon', 'Protocol', 'Drift', 'Relay', 'Engine', 'Archive'], pages: [280, 620], hue: [165, 290] },
    mystery: { adj: ['Crooked', 'Midnight', 'Borrowed', 'Quiet', 'Vanishing', 'Second', 'Locked', 'Gray'],
      noun: ['Alibi', 'Witness', 'Ledger', 'Key', 'Verdict', 'Stairwell', 'Telegram', 'Orchard'], pages: [260, 420], hue: [90, 200] },
    horror: { adj: ['Pale', 'Hungry', 'Buried', 'Whispering'], noun: ['House', 'Hollow', 'Choir', 'Cellar'], pages: [280, 480], hue: [330, 360] },
    romance: { adj: ['Sweet', 'Reckless', 'Summer', 'Borrowed', 'Slow', 'Golden', 'Wild', 'Midwinter'],
      noun: ['Promise', 'Letters', 'Season', 'Vow', 'Harbor', 'Waltz', 'Orchard', 'Proposal'], pages: [280, 420], hue: [320, 30] },
    historical: { adj: ['Lamplit', 'Silent', 'Iron', 'Distant', 'Winter', 'Gilded', 'Faithful', 'Crimson'],
      noun: ['Telegram', 'Harvest', 'Passage', 'Garrison', 'Ledger', 'Voyage', 'Estate', 'Cathedral'], pages: [380, 720], hue: [20, 60] },
    literary: { adj: ['Small', 'Ordinary', 'Late', 'Careful', 'Unfinished', 'Quiet', 'Tender', 'Plain'],
      noun: ['Weather', 'Rooms', 'Hours', 'Kindness', 'Inheritance', 'Gardens', 'Letters', 'Tide'], pages: [240, 420], hue: [0, 360] },
    nonfiction: { adj: ['Hidden', 'Rational', 'Long', 'Unseen', 'Modern', 'Slow', 'Common', 'Strange'],
      noun: ['Economics', 'Machines', 'Memory', 'Patterns', 'Weather', 'Cities', 'Sleep', 'Numbers'], pages: [220, 520], hue: [190, 260] },
    biography: { adj: ['Unlikely', 'Restless', 'Borrowed', 'Fearless', 'Ordinary', 'Brave', 'Quiet', 'Complicated'],
      noun: ['Life', 'Years', 'Journey', 'Legacy', 'Letters', 'Kitchen', 'Century', 'Home'], pages: [280, 640], hue: [0, 360] },
    selfhelp: { adj: ['Gentle', 'Daily', 'Better', 'Steady'], noun: ['Habits', 'Focus', 'Rituals', 'Mornings'], pages: [180, 320], hue: [30, 160] },
  };

  const SUMMARY_LINES = {
    fantasy: ['{h} inherits a debt older than the kingdom, and {p} has not forgotten it.',
      'When the old bells ring out of season, {h} has one winter to learn what the crown really costs.'],
    scifi: ['A dead signal from {p} wakes {h}, who is the only one aboard able to answer it.',
      'Forty years into the voyage, {h} finds the ship\'s logs disagree with the ship.'],
    mystery: ['Every guest at {p} has an alibi. {h} is paid to find the one that does not hold.',
      'A telegram arrives two days after its sender is buried, and {h} is left holding it.'],
    horror: ['{h} moves to {p} for the quiet. The house has other plans.'],
    romance: ['{h} came to {p} to forget the proposal. The letters keep arriving anyway.',
      'A summer job turns into something neither {h} nor the town planned for.'],
    historical: ['In the winter before the war, {h} carries a secret across {p}.',
      'A family estate, a missing ledger, and {h}, who is the last person who should read it.'],
    literary: ['Over one ordinary year, {h} learns how much of a life is spent waiting for weather.',
      'A quiet inheritance forces {h} to open rooms that were closed on purpose.'],
    nonfiction: ['A clear, argumentative walk through the systems we rely on and rarely look at.',
      'Years of research, distilled into the few patterns that actually matter.'],
    biography: ['The unlikely life of {h}, told through letters, kitchens, and one long century.',
      'A candid account of how {h} built a life out of other people\'s unfinished plans.'],
    selfhelp: ['Small, steady changes that add up, with no promises about overnight results.'],
  };
  const NOTE_LINES = ['Could not put it down.', 'Slow middle, wonderful ending.', 'Great on audio.', 'Worth a re-read.',
    'Pushed this on three friends.', 'Good, but it ran long.', 'The narrator carried it.', 'Finished it in two sittings.'];

  /**
   * Series in the example library. `statuses` has one entry per listed title.
   * `age` marks Youth books; `genre` picks spine font and cover motif.
   */
  const SERIES_DEFS = [
    { name: 'The Ashen Crown', author: 'Mira Okonkwo', genre: 'fantasy', age: 'adult', hue: 12, total: 7, pages: [640, 720, 780, 810, 860, 900],
      titles: ['Embers of the Throne', 'A Crown of Salt', 'The Hollow Heir', 'Ash and Oath', 'The Burning Court', 'The Salted Throne'],
      statuses: ['read', 'read', 'read', 'read', 'reading', 'tbr'] },
    { name: 'Wardens of the Tide', author: 'Elias Varga', genre: 'fantasy', age: 'adult', hue: 205, total: 4, pages: [520, 560, 610, 680],
      titles: ['The Drowned Bell', 'Low Water', 'Salt Debt', 'The Turning Tide'], statuses: ['read', 'read', 'read', 'read'] },
    { name: 'Thornmarch', author: 'Tessaly Brandt', genre: 'fantasy', age: 'adult', hue: 128, total: 6, pages: [480, 540, 600],
      titles: ['The Thorned Road', 'Marchwarden', 'A Wall of Briar'], statuses: ['read', 'read', 'read'] },
    { name: 'Kestrel Station', author: 'Ravi Menon', genre: 'scifi', age: 'adult', hue: 190, total: 5, pages: [340, 360, 410, 430],
      titles: ['Kestrel Station', 'The Long Relay', 'Cold Orbit', 'Dead Reckoning'], statuses: ['read', 'read', 'read', 'read'] },
    { name: 'The Long Dark Between', author: 'Odalys Reyes', genre: 'scifi', age: 'adult', hue: 275, total: 3, pages: [420, 460, 520],
      titles: ['The Long Dark Between', 'A Slow Light', 'Where the Signal Ends'], statuses: ['read', 'read', 'read'] },
    { name: 'Inspector Aldous Penn', author: 'Harriet Lowe', genre: 'mystery', age: 'adult', hue: 150, total: 9, pages: [300, 320, 310, 340, 330],
      titles: ['Penn and the Locked Orchard', 'The Gray Witness', 'A Verdict in Winter', 'The Borrowed Alibi', 'Penn at Low Harbor'],
      statuses: ['read', 'read', 'read', 'read', 'tbr'] },
    { name: 'The Lantern Club', author: 'Poppy Whitlow', genre: 'mystery', age: 'kids', hue: 45, total: 5, pages: [180, 190, 200, 210, 220],
      titles: ['The Lantern Club', 'The Clock in the Attic', 'The Secret Staircase', 'The Midnight Map', 'The Last Lantern'],
      statuses: ['read', 'read', 'read', 'read', 'read'] },
    { name: 'Skyhollow Academy', author: 'Jonah Ferrin', genre: 'fantasy', age: 'ya', hue: 300, total: 6, pages: [360, 400, 430, 460, 480],
      titles: ['Skyhollow', 'The Second Bell', 'Storm Term', 'The Glass Exam', 'The Hollow Hall'],
      statuses: ['read', 'read', 'read', 'read', 'dnf'] },
  ];

  /** Standalone books per genre and status; counts decide how full each bookcase is. */
  const STANDALONE_PLAN = [
    { genre: 'fantasy', count: 20, status: 'read', age: 'adult' },
    { genre: 'scifi', count: 5, status: 'read', age: 'adult' },
    { genre: 'mystery', count: 6, status: 'read', age: 'adult' },
    { genre: 'romance', count: 7, status: 'read', age: 'adult' },
    { genre: 'historical', count: 6, status: 'read', age: 'adult' },
    { genre: 'literary', count: 7, status: 'read', age: 'adult' },
    { genre: 'nonfiction', count: 9, status: 'read', age: 'adult' },
    { genre: 'biography', count: 5, status: 'read', age: 'adult' },
    { genre: 'fantasy', count: 3, status: 'read', age: 'ya' },
    { genre: 'literary', count: 2, status: 'read', age: 'kids' },
    { genre: 'historical', count: 2, status: 'tbr', age: 'adult' },
    { genre: 'nonfiction', count: 2, status: 'tbr', age: 'adult' },
    { genre: 'scifi', count: 2, status: 'tbr', age: 'adult' },
    { genre: 'literary', count: 1, status: 'tbr', age: 'adult' },
    { genre: 'romance', count: 2, status: 'dnf', age: 'adult' },
    { genre: 'nonfiction', count: 1, status: 'dnf', age: 'adult' },
    { genre: 'fantasy', count: 1, status: 'dnf', age: 'adult' },
    { genre: 'biography', count: 1, status: 'dnf', age: 'adult' },
  ];

  const FIRST_READ_DAY = Date.UTC(2023, 0, 1);            // earliest possible finish date
  const READ_SPAN_DAYS = 1380;                            // finish dates spread over this many days
  const MS_PER_DAY = 86400000;
  const CURRENT_BOOK_DAYS_AGO = 10;                       // how long ago the current book was started

  // ------------------------------------------------------------------- helpers
  /**
   * Picks one item from a list.
   * @param {function(): number} rand - Random generator from seededRandom
   * @param {Array} list - Non-empty list
   * @returns {*} One item
   */
  function pick(rand, list) {
    return list[Math.floor(rand() * list.length)];
  }

  /**
   * Formats a UTC millisecond timestamp as YYYY-MM-DD.
   * @param {number} ms - Milliseconds since the epoch
   * @returns {string} Date string
   */
  function isoFromMs(ms) {
    return new Date(ms).toISOString().slice(0, 10);
  }

  /**
   * Makes a unique, genre-flavored title.
   * @param {function(): number} rand - Random generator
   * @param {string} genre - Genre key
   * @param {Set<string>} used - Titles already taken (updated)
   * @returns {string} A new title
   */
  function makeTitle(rand, genre, used) {
    const recipe = GENRE_RECIPES[genre];
    const patterns = ['The {a} {n}', 'A {a} {n}', 'The {n} of {p}', '{a} {n}'];
    for (let attempt = 0; attempt < 50; attempt++) {
      const title = pick(rand, patterns)
        .replace('{a}', pick(rand, recipe.adj)).replace('{n}', pick(rand, recipe.noun)).replace('{p}', pick(rand, PLACES));
      if (!used.has(title)) { used.add(title); return title; }
    }
    const fallback = `${pick(rand, recipe.adj)} ${pick(rand, recipe.noun)} ${used.size}`;   // guarantees uniqueness
    used.add(fallback);
    return fallback;
  }

  /**
   * Writes a short summary for a book from templates.
   * @param {function(): number} rand - Random generator
   * @param {string} genre - Genre key
   * @returns {string} One or two sentences
   */
  function makeSummary(rand, genre) {
    return pick(rand, SUMMARY_LINES[genre] || SUMMARY_LINES.literary)
      .replace('{h}', pick(rand, FIRST_NAMES)).replace('{p}', pick(rand, PLACES));
  }

  /**
   * Builds read dates for a finished book.
   * @param {function(): number} rand - Random generator
   * @param {number} [finishMs] - Finish time; random when omitted
   * @returns {{startedAt: string, finishedAt: string}} YYYY-MM-DD dates
   */
  function makeReadDates(rand, finishMs) {
    const finished = finishMs !== undefined ? finishMs : FIRST_READ_DAY + Math.floor(rand() * READ_SPAN_DAYS) * MS_PER_DAY;
    const started = finished - (4 + Math.floor(rand() * 26)) * MS_PER_DAY;   // 4 to 29 days earlier
    return { startedAt: isoFromMs(started), finishedAt: isoFromMs(finished) };
  }

  // ------------------------------------------------------------------- builders
  /**
   * Builds the books of one series from its definition.
   * @param {Object} def - An entry of SERIES_DEFS
   * @param {number} seriesIndex - Position of the series, used for ids and dates
   * @param {string} today - YYYY-MM-DD, used for the book currently being read
   * @returns {Object[]} Books
   */
  function buildSeries(def, seriesIndex, today) {
    const rand = SL.seededRandom('series:' + def.name);
    const baseFinish = FIRST_READ_DAY + (200 + seriesIndex * 120) * MS_PER_DAY;   // first book's finish date
    return def.titles.map((title, i) => {
      const status = def.statuses[i];
      const book = {
        id: `s${seriesIndex}-${i + 1}`, title, author: def.author, series: def.name, seriesNumber: i + 1,
        seriesTotal: def.total, pages: def.pages[i], genre: def.genre, age: def.age, status,
        hue: (def.hue + (i % 2 === 0 ? 0 : 8)) % 360,    // same family, a slight shift between volumes
        summary: makeSummary(rand, def.genre), notes: '', rating: 0, startedAt: '', finishedAt: '',
      };
      if (status === 'read' || status === 'dnf') {
        const dates = makeReadDates(rand, baseFinish + i * 45 * MS_PER_DAY);    // about 45 days between volumes
        book.startedAt = dates.startedAt;
        if (status === 'read') {
          book.finishedAt = dates.finishedAt;
          book.rating = [3, 4, 4, 5, 5][Math.floor(rand() * 5)];
          book.notes = pick(rand, NOTE_LINES);
        }
      } else if (status === 'reading') {
        book.startedAt = SL.todayIso(new Date(Date.parse(today + 'T00:00:00Z') - CURRENT_BOOK_DAYS_AGO * MS_PER_DAY));
      }
      return book;
    });
  }

  /**
   * Builds standalone books from the plan.
   * @param {Set<string>} used - Titles already used (updated)
   * @returns {Object[]} Books
   */
  function buildStandalones(used) {
    const books = [];
    STANDALONE_PLAN.forEach((plan, planIndex) => {
      const rand = SL.seededRandom(`plan:${planIndex}:${plan.genre}:${plan.status}`);
      const recipe = GENRE_RECIPES[plan.genre];
      for (let i = 0; i < plan.count; i++) {
        const youth = plan.age !== 'adult';
        const book = {
          id: `p${planIndex}-${i}`, title: makeTitle(rand, plan.genre, used),
          author: `${pick(rand, FIRST_NAMES)} ${pick(rand, LAST_NAMES)}`, series: '', seriesNumber: 0, seriesTotal: 0,
          pages: youth ? 160 + Math.floor(rand() * 200) : recipe.pages[0] + Math.floor(rand() * (recipe.pages[1] - recipe.pages[0])),
          genre: plan.genre, age: plan.age, status: plan.status,
          hue: recipe.hue[0] + Math.floor(rand() * (recipe.hue[1] - recipe.hue[0])),
          summary: makeSummary(rand, plan.genre), notes: '', rating: 0, startedAt: '', finishedAt: '',
        };
        book.hue = ((book.hue % 360) + 360) % 360;
        if (plan.status === 'read') {
          Object.assign(book, makeReadDates(rand));
          book.rating = [2, 3, 3, 4, 4, 4, 5, 5, 5][Math.floor(rand() * 9)];
          book.notes = pick(rand, NOTE_LINES);
        } else if (plan.status === 'dnf') {
          book.startedAt = makeReadDates(rand).startedAt;
          book.notes = 'Stopped about a third of the way in.';
        }
        books.push(book);
      }
    });
    return books;
  }

  /**
   * Builds the whole example library.
   * @param {string} [today] - YYYY-MM-DD; the current book was started 10 days before this
   * @returns {Object[]} Every book in the example library
   */
  function buildFakeLibrary(today = SL.todayIso()) {
    const used = new Set();
    const series = SERIES_DEFS.flatMap((def, i) => buildSeries(def, i, today));
    series.forEach((book) => used.add(book.title));      // keep standalone titles from repeating series titles
    return series.concat(buildStandalones(used));
  }

  return { buildFakeLibrary };
})();

export { FakeData };
