import { ShelfLogic } from './shelfLogic';

/**
 * spineLayout.js
 * Pure layout for one book spine: where the bands, label, title, author and series sticker go,
 * and how big the type is. It has no drawing code, so it can be unit tested; spineCanvas.js
 * turns the result into pixels. Also makes the cache key that identifies a drawn spine.
 * All sizes are in px of the final spine; `unit` is how many px one design unit is (1 for
 * a spine on a shelf, larger for the same spine drawn bigger on the 3D book).
 */
const SpineLayout = (function () {
  'use strict';

  // ----------------------------------------------------------------- constants
  const SL_LOCAL = (typeof module !== 'undefined' && module.exports) ? require('./shelfLogic') : ShelfLogic;
  const MIN_AUTHOR_WIDTH = 24;                            // thinner spines (in units) leave the author off
  const TOP_SPACE = { gilt: 17, block: 23, stripe: 15, label: 10, plain: 10 };            // room above the title, in units
  const BOTTOM_SPACE = { gilt: 17, default: 11 };                                         // room below, in units, without a sticker
  const STICKER_CLEARANCE = 21;                           // units between the sticker's size and the bottom edge, with a sticker
  const AUTHOR_SHARE = 0.34;                              // most of the free height the author may use
  const AUTHOR_CHAR_UNITS = 7.2;                          // height one author letter needs, in units
  const MIN_TITLE_FONT = 7.5;                             // smallest title type, in units
  const READABLE_TITLE_FONT = 8.5;                        // drop the author if the title would need to be smaller than this
  const TITLE_CHAR_WIDTH = 0.6;                           // average letter length as a share of the font size
  const MAX_TITLE_FONT = 17;                              // largest title type, in units
  const DESIGN_VERSION = 1;                               // bump when the spine design changes, so old pictures are not reused

  /**
   * Works out the layout of a spine.
   * @param {{book: Object, width: number, height: number, unit?: number, sticker?: Object, isLight: boolean}} input
   *   book needs title, author and genre; sticker is the series sticker style ({size, ...}) or undefined;
   *   isLight says whether the spine color is light (gilt then uses ink, not gold)
   * @returns {Object} Layout: style, bands, label, title, author, sticker (each null when absent)
   * @throws {RangeError} If width, height or unit is not positive
   */
  function computeLayout({ book, width, height, unit = 1, sticker, isLight }) {
    if (!(width > 0) || !(height > 0) || !(unit > 0)) throw new RangeError(`bad spine size ${width}x${height} (unit ${unit})`);
    const genre = SL_LOCAL.genreOf(book);
    const style = genre.spineStyle;
    const u = unit;
    const widthUnits = width / u;
    const hasAuthor = widthUnits >= MIN_AUTHOR_WIDTH;

    // Vertical budget: decoration at the top, the title, the author, then sticker and bottom decoration
    const top = (TOP_SPACE[style] || TOP_SPACE.plain) * u;
    const bottom = (sticker ? sticker.size + STICKER_CLEARANCE : (BOTTOM_SPACE[style] || BOTTOM_SPACE.default)) * u;
    const region = height - top - bottom;
    const surname = book.author.split(' ').pop();
    const titleFit = (titleHeight) => titleHeight / (book.title.length * TITLE_CHAR_WIDTH);   // largest type that keeps the title on one line

    // Show the author only if the title still fits at a readable size next to it
    let authorH = hasAuthor ? Math.min(region * AUTHOR_SHARE, surname.length * AUTHOR_CHAR_UNITS * u) : 0;
    let titleH = region - authorH - (authorH ? 4 * u : 0);
    if (authorH && titleFit(titleH) < READABLE_TITLE_FONT * u) { authorH = 0; titleH = region; }   // the title needs the room more

    let titleFont = Math.min(width * 0.44, MAX_TITLE_FONT * u) * genre.fontScale;
    titleFont = Math.min(titleFont, titleFit(titleH));
    titleFont = Math.max(titleFont, MIN_TITLE_FONT * u);

    const onLabel = style === 'label';
    const bands = [];                                     // horizontal strips across the spine
    if (style === 'gilt') {
      bands.push({ kind: 'gilt', y: 6 * u, h: 2 * u }, { kind: 'gilt', y: 10.5 * u, h: 1 * u },
        { kind: 'gilt', y: height - 8 * u, h: 2 * u }, { kind: 'gilt', y: height - 12.5 * u, h: 1 * u });
    } else if (style === 'stripe') {
      bands.push({ kind: 'stripe', y: 7 * u, h: 3 * u, glow: 6 * u }, { kind: 'stripe', y: height - 9 * u, h: 1.5 * u, glow: 0, alpha: 0.8 });
    } else if (style === 'block') {
      bands.push({ kind: 'block', y: 0, h: 19 * u, alpha: 0.92 });
    }
    return {
      style, bands, width, height, unit: u,
      label: onLabel ? { y: top - 2 * u, h: titleH + 4 * u, w: width - 6 * u } : null,
      title: { text: book.title, top, height: titleH, fontSize: titleFont, font: genre.font,
        colorKind: onLabel ? 'ink' : (style === 'gilt' && !isLight ? 'accent' : 'text'), shadow: !onLabel },
      author: authorH > 0 ? { text: surname, top: top + titleH + 4 * u, height: authorH,
        fontSize: Math.min(width * 0.3, 9.5 * u, authorH / (surname.length * 0.85)) } : null,
      sticker: sticker ? { size: sticker.size * u, centerFromBottom: ((style === 'gilt' ? 16 : 11) * u) + (sticker.size * u) / 2, number: book.seriesNumber,
        bg: sticker.bg, text: sticker.text, ring: sticker.ring } : null,
    };
  }

  /**
   * Cache key for a drawn spine. It changes whenever anything that affects the picture changes.
   * @param {{book: Object, width: number, height: number, unit: number, sticker?: Object, ratio: number}} input - What the picture depends on
   * @returns {string} Key
   */
  function cacheKey({ book, width, height, unit, sticker, ratio }) {
    const content = JSON.stringify([book.title, book.author, book.genre, book.hue, book.series || '', book.seriesNumber || 0, sticker || null]);
    return `v${DESIGN_VERSION}|${book.id}|${width.toFixed(2)}x${height.toFixed(2)}@${unit.toFixed(3)}x${ratio}|${SL_LOCAL.hashString(content).toString(36)}`;
  }

  return { computeLayout, cacheKey, DESIGN_VERSION };
})();

export { SpineLayout };
