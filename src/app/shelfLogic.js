/**
 * shelfLogic.js
 * Pure, DOM-free helpers for the bookshelf: spine geometry, spine colors, sorting,
 * packing books onto shelves, and deciding which bookcases ("rooms") exist.
 *
 * Works two ways: `require()`d by the tests in src/tests/, and inlined into the
 * prototype page by build.mjs, where `ShelfLogic` becomes a global.
 */
const ShelfLogic = (function () {
  'use strict';

  // ----------------------------------------------------------------- constants
  const PAGES_PER_PX = 16;              // one pixel of spine thickness per this many pages
  const MIN_SPINE_PX = 15;              // thinnest spine drawn (novellas)
  const MAX_SPINE_PX = 46;              // thickest spine drawn (doorstoppers)
  const SPINE_BASE_HEIGHT_PX = 150;     // typical spine height
  const SPINE_HEIGHT_MIN_OFFSET = -10;  // shortest spine = base + this
  const SPINE_HEIGHT_MAX_OFFSET = 14;   // tallest spine = base + this
  const SPINE_GAP_PX = 1;               // space between neighbouring spines
  const SHELF_INNER_WIDTH_PX = 290;     // usable width of one shelf
  const SHELVES_PER_CASE = 3;           // shelves in one bookcase before it spills into a copy
  const LIGHT_TEXT = '#f3ead7';         // text color on dark spines
  const DARK_TEXT = '#1d140c';          // text color on light spines
  const ROMAN_NUMERALS = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X',
    'XI', 'XII', 'XIII', 'XIV', 'XV', 'XVI', 'XVII', 'XVIII', 'XIX', 'XX'];
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MS_PER_DAY = 86400000;
  const STICKER_MIN_PX = 11;            // smallest series number sticker (in 150px-spine units)
  const STICKER_MAX_PX = 17;            // largest series number sticker
  const STICKER_MARGIN_PX = 4;          // space kept between a sticker and the spine edges

  /** Reading statuses a book can have. */
  const STATUSES = ['reading', 'read', 'dnf', 'tbr'];

  /** Age groups; YA and kids books that are Read live in the Youth bookcase. */
  const AGES = ['adult', 'ya', 'kids'];

  /**
   * Starting genres. Each carries the spine font, a spine style, a font-size
   * multiplier (script fonts need to be bigger, wide fonts smaller), and the
   * bookcase theme used for its bookcase.
   */
  const GENRES = [
    { key: 'fantasy', name: 'Fantasy', font: "'Cinzel Decorative','Cinzel',Georgia,serif", fontScale: 0.9, spineStyle: 'gilt', theme: 'mahogany' },
    { key: 'scifi', name: 'Sci-Fi', font: "'Orbitron','Arial Narrow',sans-serif", fontScale: 0.82, spineStyle: 'stripe', theme: 'ebony' },
    { key: 'mystery', name: 'Mystery/Thriller', font: "'Special Elite','Courier New',monospace", fontScale: 0.95, spineStyle: 'label', theme: 'emerald' },
    { key: 'horror', name: 'Horror', font: "'Creepster','Impact',fantasy", fontScale: 1.05, spineStyle: 'plain', theme: 'blackcherry' },
    { key: 'romance', name: 'Romance', font: "'Great Vibes','Brush Script MT',cursive", fontScale: 1.3, spineStyle: 'gilt', theme: 'rosewood' },
    { key: 'historical', name: 'Historical Fiction', font: "'IM Fell English',Georgia,serif", fontScale: 1.0, spineStyle: 'gilt', theme: 'oak' },
    { key: 'literary', name: 'Literary Fiction', font: "'Playfair Display',Georgia,serif", fontScale: 0.95, spineStyle: 'plain', theme: 'walnut' },
    { key: 'nonfiction', name: 'Nonfiction', font: "'Oswald','Arial Narrow',sans-serif", fontScale: 1.05, spineStyle: 'block', theme: 'maple' },
    { key: 'biography', name: 'Biography/Memoir', font: "'Cormorant Garamond',Georgia,serif", fontScale: 1.12, spineStyle: 'gilt', theme: 'cherry' },
    { key: 'selfhelp', name: 'Self-Help', font: "'Josefin Sans','Helvetica Neue',sans-serif", fontScale: 1.0, spineStyle: 'block', theme: 'teak' },
  ];

  /** Bookcases that are not genres. */
  const SPECIAL_GROUPS = {
    tbr: { name: 'To Be Read', theme: 'bleached' },
    youth: { name: 'Youth', theme: 'painted' },
    dnf: { name: 'Did Not Finish', theme: 'ash' },
    uncategorized: { name: 'Uncategorized', theme: 'walnut' },
  };

  /** Ways to order a bookcase. The first is the default (real library order). */
  const SORT_MODES = [
    { key: 'library', label: 'By author' },
    { key: 'dateRead', label: 'Recently read' },
    { key: 'rating', label: 'Top rated' },
    { key: 'color', label: 'By color' },
    { key: 'title', label: 'Title A-Z' },
  ];
  const DEFAULT_SORT_MODE = SORT_MODES[0].key;

  // ------------------------------------------------------------------- randomness
  /**
   * Hashes a string to an unsigned 32-bit integer (FNV-1a).
   * @param {string} text - Any string
   * @returns {number} Unsigned 32-bit hash
   */
  function hashString(text) {
    let hash = 2166136261;                               // FNV offset basis
    for (let i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);                        // mix in the next character
      hash = Math.imul(hash, 16777619);                  // multiply by the FNV prime
    }
    return hash >>> 0;                                   // force unsigned
  }

  /**
   * Builds a repeatable random number generator, so a given book always gets
   * the same spine height and colors.
   * @param {string|number} seed - Same seed gives the same sequence
   * @returns {function(): number} Function returning floats in [0, 1)
   */
  function seededRandom(seed) {
    let state = hashString(String(seed));                // turn the seed into a 32-bit state
    return function nextRandom() {
      state = (state + 0x6D2B79F5) >>> 0;                // mulberry32 step
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;      // scale to [0, 1)
    };
  }

  // ------------------------------------------------------------------ spine geometry
  /**
   * Spine thickness in pixels from the page count, clamped to a believable range.
   * @param {number} pages - Page count, must be a positive finite number
   * @returns {number} Whole pixels between MIN_SPINE_PX and MAX_SPINE_PX
   * @throws {RangeError} If pages is not a positive finite number
   */
  function spineThickness(pages) {
    if (!Number.isFinite(pages) || pages <= 0) {
      throw new RangeError(`pages must be a positive number, got ${pages}`);
    }
    const raw = Math.round(pages / PAGES_PER_PX);        // proportional to page count
    return Math.min(MAX_SPINE_PX, Math.max(MIN_SPINE_PX, raw));
  }

  /**
   * Spine height in pixels: a small, repeatable variation per book.
   * @param {string} bookId - Non-empty book id, used as the random seed
   * @returns {number} Whole pixels around SPINE_BASE_HEIGHT_PX
   * @throws {TypeError} If bookId is not a non-empty string
   */
  function spineHeight(bookId) {
    if (typeof bookId !== 'string' || bookId === '') {
      throw new TypeError('bookId must be a non-empty string');
    }
    const span = SPINE_HEIGHT_MAX_OFFSET - SPINE_HEIGHT_MIN_OFFSET + 1;
    const roll = seededRandom('height:' + bookId)();     // repeatable roll for this book
    return SPINE_BASE_HEIGHT_PX + SPINE_HEIGHT_MIN_OFFSET + Math.floor(roll * span);
  }

  // ----------------------------------------------------------------------- color
  /**
   * Converts HSL to RGB.
   * @param {number} hue - Degrees; any number, wrapped into 0-360
   * @param {number} sat - Saturation, 0 to 1
   * @param {number} light - Lightness, 0 to 1
   * @returns {number[]} [r, g, b], each a whole number 0-255
   * @throws {RangeError} If sat or light is outside 0-1
   */
  function hslToRgb(hue, sat, light) {
    if (!(sat >= 0 && sat <= 1) || !(light >= 0 && light <= 1)) {
      throw new RangeError(`sat and light must be 0-1, got ${sat}, ${light}`);
    }
    const h = ((hue % 360) + 360) % 360;                 // wrap negative and large hues
    const chroma = (1 - Math.abs(2 * light - 1)) * sat;
    const x = chroma * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = light - chroma / 2;
    let rgb;                                             // pre-offset channels for this hue sector
    if (h < 60) rgb = [chroma, x, 0];
    else if (h < 120) rgb = [x, chroma, 0];
    else if (h < 180) rgb = [0, chroma, x];
    else if (h < 240) rgb = [0, x, chroma];
    else if (h < 300) rgb = [x, 0, chroma];
    else rgb = [chroma, 0, x];
    return rgb.map((channel) => Math.round((channel + m) * 255));
  }

  /**
   * WCAG relative luminance of a color.
   * @param {number[]} rgb - [r, g, b], each 0-255
   * @returns {number} 0 (black) to 1 (white)
   */
  function relativeLuminance(rgb) {
    const [r, g, b] = rgb.map((channel) => {
      const c = channel / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);  // sRGB to linear
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Picks light or dark text, whichever contrasts more with the background.
   * @param {number[]} rgb - Background [r, g, b]
   * @returns {string} LIGHT_TEXT or DARK_TEXT
   */
  function readableTextColor(rgb) {
    const lum = relativeLuminance(rgb);
    const lightContrast = (1.05) / (lum + 0.05);         // against near-white text
    const darkContrast = (lum + 0.05) / 0.06;            // against near-black text
    return lightContrast >= darkContrast ? LIGHT_TEXT : DARK_TEXT;
  }

  /**
   * Spine colors for a book, matched to its cover hue. In the real app the hue
   * comes from the cover image; here it comes from the generated cover.
   * @param {{id: string, hue: number}} book - Needs an id and a 0-360 hue
   * @returns {{bg: string, bgDark: string, accent: string, text: string, isLight: boolean}}
   */
  function spinePalette(book) {
    const roll = seededRandom('palette:' + book.id);
    const sat = 0.38 + roll() * 0.3;                     // 38-68% saturation
    const light = 0.2 + roll() * 0.3;                    // 20-50% lightness
    const rgb = hslToRgb(book.hue, sat, light);
    const isLight = relativeLuminance(rgb) > 0.22;       // used to pick gilt vs ink decoration
    return {
      bg: `hsl(${book.hue}, ${Math.round(sat * 100)}%, ${Math.round(light * 100)}%)`,
      bgDark: `hsl(${book.hue}, ${Math.round(sat * 100)}%, ${Math.max(6, Math.round(light * 100) - 11)}%)`,
      accent: isLight ? '#3a2814' : '#d9b865',
      text: readableTextColor(rgb),
      isLight,
    };
  }

  // ----------------------------------------------------------------------- sorting
  /**
   * Sort key that ignores a leading "The", "A" or "An", as libraries do.
   * @param {string} text - Title or series name
   * @returns {string} Lowercase key
   */
  function titleSortKey(text) {
    return String(text).toLowerCase().replace(/^(the|a|an)\s+/, '');
  }

  /**
   * Sort key that puts the surname first: "Mira Okonkwo" becomes "okonkwo mira".
   * @param {string} author - Non-empty full name
   * @returns {string} Lowercase key
   * @throws {TypeError} If author is empty
   */
  function authorSortKey(author) {
    if (typeof author !== 'string' || author.trim() === '') {
      throw new TypeError('author must be a non-empty string');
    }
    const parts = author.trim().split(/\s+/);
    const surname = parts.pop();                         // last word is the surname
    return (surname + ' ' + parts.join(' ')).toLowerCase().trim();
  }

  /**
   * Real library order: author surname, then series name (or title for standalones),
   * then number within the series, then title.
   * @param {Object} a - Book
   * @param {Object} b - Book
   * @returns {number} Negative if a sorts first
   */
  function compareLibraryOrder(a, b) {
    const byAuthor = authorSortKey(a.author).localeCompare(authorSortKey(b.author));
    if (byAuthor !== 0) return byAuthor;
    const byGroup = titleSortKey(a.series || a.title).localeCompare(titleSortKey(b.series || b.title));
    if (byGroup !== 0) return byGroup;
    const byNumber = (a.seriesNumber || 0) - (b.seriesNumber || 0);
    if (byNumber !== 0) return byNumber;
    return titleSortKey(a.title).localeCompare(titleSortKey(b.title));
  }

  /**
   * Returns a sorted copy of the books.
   * @param {Object[]} books - Books to sort (not modified)
   * @param {string} [mode] - One of SORT_MODES keys; defaults to library order
   * @returns {Object[]} New sorted array
   * @throws {RangeError} If mode is not a known sort mode
   */
  function sortBooks(books, mode = DEFAULT_SORT_MODE) {
    const comparers = {
      library: compareLibraryOrder,
      // newest finish date first; books without a date go last
      dateRead: (a, b) => (b.finishedAt || '').localeCompare(a.finishedAt || '') || compareLibraryOrder(a, b),
      rating: (a, b) => (b.rating || 0) - (a.rating || 0) || compareLibraryOrder(a, b),
      // rainbow order by hue, then by title so ties are stable
      color: (a, b) => a.hue - b.hue || titleSortKey(a.title).localeCompare(titleSortKey(b.title)),
      title: (a, b) => titleSortKey(a.title).localeCompare(titleSortKey(b.title)),
    };
    if (!comparers[mode]) throw new RangeError(`Unknown sort mode: ${mode}`);
    return books.slice().sort(comparers[mode]);
  }

  /**
   * The sort mode after the given one, wrapping around.
   * @param {string} mode - Current SORT_MODES key
   * @returns {string} Next key
   */
  function nextSortMode(mode) {
    const at = SORT_MODES.findIndex((m) => m.key === mode);
    return SORT_MODES[(at + 1) % SORT_MODES.length].key;   // unknown mode (-1) restarts at the first
  }

  // ------------------------------------------------------------------------ packing
  /**
   * Lays books left to right onto shelves, starting a new shelf when one is full
   * and a new bookcase when the last shelf of a case is full.
   * @param {Object[]} books - Already sorted; each needs id and pages
   * @param {{shelfWidth?: number, shelvesPerCase?: number}} [options] - Shelf size overrides
   * @returns {Array<{shelves: Array<Array<{book: Object, thickness: number, height: number}>>}>}
   *          Bookcases, each holding shelves of placed books
   * @throws {RangeError} If an option is not positive
   */
  function packIntoCases(books, options = {}) {
    const shelfWidth = options.shelfWidth || SHELF_INNER_WIDTH_PX;
    const shelvesPerCase = options.shelvesPerCase || SHELVES_PER_CASE;
    if (shelfWidth <= 0 || shelvesPerCase < 1) {
      throw new RangeError('shelfWidth and shelvesPerCase must be positive');
    }
    const cases = [];
    let used = 0;                                        // width used on the current shelf
    for (const book of books) {
      const thickness = spineThickness(book.pages);
      const needed = thickness + SPINE_GAP_PX;
      // Start a fresh case when there is none yet
      if (cases.length === 0) cases.push({ shelves: [[]] });
      let current = cases[cases.length - 1];
      // The shelf is full: move to the next shelf, or the next case if that was the last shelf
      if (used + needed > shelfWidth && current.shelves[current.shelves.length - 1].length > 0) {
        if (current.shelves.length >= shelvesPerCase) {
          current = { shelves: [[]] };
          cases.push(current);
        } else {
          current.shelves.push([]);
        }
        used = 0;
      }
      current.shelves[current.shelves.length - 1].push({ book, thickness, height: spineHeight(book.id) });
      used += needed;
    }
    return cases;
  }

  // ------------------------------------------------------------------------- rooms
  /**
   * Roman numeral, for copies of a full bookcase.
   * @param {number} n - 1 to 20
   * @returns {string} Numeral, or the plain number as text past 20
   */
  function toRoman(n) {
    return ROMAN_NUMERALS[n] || String(n);
  }

  /**
   * Name shown on a bookcase. The first is plain; copies get a numeral.
   * @param {string} name - Group name, such as "Fantasy"
   * @param {number} index - 0 for the first bookcase of the group
   * @returns {string} "Fantasy" or "Fantasy II"
   */
  function caseTitle(name, index) {
    return index === 0 ? name : `${name} ${toRoman(index + 1)}`;
  }

  /**
   * Splits the library into the groups that each get bookcases.
   * Read + adult goes to its genre; Read + YA/kids goes to Youth; TBR and DNF
   * stay mixed. Currently Reading is kept separately.
   * @param {Object[]} books - All books
   * @param {Array<{key: string}>} genres - Known genres
   * @returns {{reading: Object[], tbr: Object[], dnf: Object[], youth: Object[], byGenre: Object}}
   */
  function groupBooks(books, genres) {
    const known = new Set(genres.map((g) => g.key));
    const groups = { reading: [], tbr: [], dnf: [], youth: [], byGenre: {} };
    for (const book of books) {
      if (book.status === 'reading') groups.reading.push(book);
      else if (book.status === 'tbr') groups.tbr.push(book);
      else if (book.status === 'dnf') groups.dnf.push(book);
      else if (book.status === 'read') {
        if (book.age === 'ya' || book.age === 'kids') groups.youth.push(book);
        else {
          const key = known.has(book.genre) ? book.genre : 'uncategorized';   // never lose a book
          (groups.byGenre[key] = groups.byGenre[key] || []).push(book);
        }
      }
    }
    return groups;
  }

  /**
   * Builds the ordered list of screens: TBR, Currently Reading, one or more
   * bookcases per genre, Youth, then DNF. Empty groups produce no bookcase.
   * @param {Object[]} books - All books
   * @param {{genres?: Object[], sortModes?: Object}} [options] - Genre list and a sort mode per group key
   * @returns {Object[]} Rooms: {id, kind: 'case'|'reading', title, theme, ...}
   */
  function buildRooms(books, options = {}) {
    const genres = options.genres || GENRES;
    const sortModes = options.sortModes || {};
    const groups = groupBooks(books, genres);
    const rooms = [];

    // Adds one room per bookcase needed to hold a group's books
    const addGroup = (groupKey, name, theme, groupBooksList) => {
      if (groupBooksList.length === 0) return;           // empty groups are hidden
      const sorted = sortBooks(groupBooksList, sortModes[groupKey] || DEFAULT_SORT_MODE);
      const cases = packIntoCases(sorted);
      cases.forEach((bookcase, i) => rooms.push({
        id: `${groupKey}-${i}`, kind: 'case', groupKey, title: caseTitle(name, i), theme,
        shelves: bookcase.shelves, bookCount: groupBooksList.length, caseIndex: i, caseCount: cases.length,
        sortMode: sortModes[groupKey] || DEFAULT_SORT_MODE,
      }));
    };

    addGroup('tbr', SPECIAL_GROUPS.tbr.name, SPECIAL_GROUPS.tbr.theme, groups.tbr);
    // The reading room always exists, even with nothing on the stand
    const current = groups.reading.slice().sort((a, b) => (b.startedAt || '').localeCompare(a.startedAt || ''))[0] || null;
    rooms.push({ id: 'reading', kind: 'reading', title: 'Currently Reading', theme: 'mahogany', book: current });
    genres.forEach((genre) => addGroup(genre.key, genre.name, genre.theme, groups.byGenre[genre.key] || []));
    addGroup('uncategorized', SPECIAL_GROUPS.uncategorized.name, SPECIAL_GROUPS.uncategorized.theme, groups.byGenre.uncategorized || []);
    addGroup('youth', SPECIAL_GROUPS.youth.name, SPECIAL_GROUPS.youth.theme, groups.youth);
    addGroup('dnf', SPECIAL_GROUPS.dnf.name, SPECIAL_GROUPS.dnf.theme, groups.dnf);
    return rooms;
  }

  /**
   * A short text that changes only when what a room shows changes (its books, their order, its sort).
   * Used to reuse the same room object between renders so unchanged bookcases are not redrawn.
   * @param {Object} room - A room from buildRooms
   * @returns {string} Signature
   */
  function roomSignature(room) {
    if (room.kind === 'reading') return `reading:${room.book ? room.book.id : ''}`;
    const layout = room.shelves.map((shelf) => shelf.map((placed) => placed.book.id).join(',')).join('/');
    return `${room.id}|${room.sortMode}|${room.bookCount}|${room.title}|${layout}`;
  }

  // -------------------------------------------------------------------- book facts
  /**
   * Looks up the genre record for a book.
   * @param {Object} book - Book with a genre key
   * @param {Object[]} [genres] - Genre list to search
   * @returns {Object} Genre, or the first genre if the key is unknown
   */
  function genreOf(book, genres = GENRES) {
    return genres.find((g) => g.key === book.genre) || genres[0];
  }

  /**
   * "Book 3 of 7" style text for a series book.
   * @param {Object} book - Book, possibly in a series
   * @returns {string} Label, or '' for a standalone
   */
  function seriesLabel(book) {
    if (!book.series || !book.seriesNumber) return '';
    return book.seriesTotal ? `Book ${book.seriesNumber} of ${book.seriesTotal}` : `Book ${book.seriesNumber}`;
  }

  /**
   * Whole days from one date to another.
   * @param {string} fromIso - YYYY-MM-DD
   * @param {string} toIso - YYYY-MM-DD
   * @returns {number} Days; negative if toIso is earlier
   * @throws {TypeError} If either date is not YYYY-MM-DD
   */
  function daysBetween(fromIso, toIso) {
    const pattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!pattern.test(fromIso) || !pattern.test(toIso)) {
      throw new TypeError(`dates must be YYYY-MM-DD, got ${fromIso} and ${toIso}`);
    }
    return Math.round((Date.parse(toIso + 'T00:00:00Z') - Date.parse(fromIso + 'T00:00:00Z')) / MS_PER_DAY);
  }

  /**
   * "Oct 10, 2026" from YYYY-MM-DD, without time zone surprises.
   * @param {string} iso - YYYY-MM-DD
   * @returns {string} Short date, or '' for an empty value
   */
  function formatShortDate(iso) {
    if (!iso) return '';
    const [year, month, day] = iso.split('-').map(Number);
    return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
  }

  /**
   * Today as YYYY-MM-DD in local time.
   * @param {Date} [now] - Date to format
   * @returns {string} YYYY-MM-DD
   */
  function todayIso(now = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  }

  /**
   * Keeps a number inside a range.
   * @param {number} value - Number to limit
   * @param {number} min - Lower bound
   * @param {number} max - Upper bound
   * @returns {number} value limited to [min, max]
   */
  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  /**
   * One sticker style per series, so every volume carries the same number sticker:
   * same size, same background, same number color. The size fits the thinnest
   * volume in the series, so it fits all of them. Standalones get no entry.
   * @param {Object[]} books - Every book in the library
   * @returns {Object<string, {size: number, bg: string, text: string, ring: string}>} Style by series name
   */
  function buildSeriesStyles(books) {
    const bySeries = {};
    for (const book of books) {
      if (!book.series || !book.seriesNumber) continue;   // only numbered series books get stickers
      (bySeries[book.series] = bySeries[book.series] || []).push(book);
    }
    const styles = {};
    for (const [name, volumes] of Object.entries(bySeries)) {
      const thinnest = Math.min(...volumes.map((b) => spineThickness(b.pages)));
      const first = volumes.reduce((a, b) => (b.seriesNumber < a.seriesNumber ? b : a));   // volume 1 sets the color
      const complement = (first.hue + 180) % 360;         // opposite hue stands out against the spines
      styles[name] = {
        size: clamp(thinnest - STICKER_MARGIN_PX, STICKER_MIN_PX, STICKER_MAX_PX),
        bg: `hsl(${complement}, 45%, 84%)`,
        text: `hsl(${first.hue}, 55%, 14%)`,
        ring: `hsl(${complement}, 40%, 36%)`,
      };
    }
    return styles;
  }

  return {
    // constants other files read
    GENRES, SPECIAL_GROUPS, SORT_MODES, STATUSES, AGES,
    SPINE_BASE_HEIGHT_PX, SHELF_INNER_WIDTH_PX, SHELVES_PER_CASE, MIN_SPINE_PX, MAX_SPINE_PX,
    // functions
    hashString, seededRandom, spineThickness, spineHeight, hslToRgb, relativeLuminance,
    readableTextColor, spinePalette, titleSortKey, authorSortKey, compareLibraryOrder, sortBooks,
    nextSortMode, packIntoCases, toRoman, caseTitle, groupBooks, buildRooms, roomSignature, genreOf, seriesLabel,
    daysBetween, formatShortDate, todayIso, clamp, buildSeriesStyles,
  };
})();

export { ShelfLogic };
