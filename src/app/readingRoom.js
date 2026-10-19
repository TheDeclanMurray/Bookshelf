import { SL, html, isRealTap, memo, useCallback } from './reactSetup';
import { MarbleStand, StandImage, hasStandImage } from './stand3d';

/**
 * readingRoom.js
 * The start screen: the book you are reading, resting on a carved marble column capital
 * (built in 3D in stand3d.js). Tapping the book lifts it onto the stage.
 */

// ----------------------------------------------------------------- constants
const READING_BOOK_W = 112;                               // size of the book on the stand, in frame px
const READING_BOOK_H = 168;
const READING_BOOK_D = 26;                                // thickness on the stand (a typical novel)
const SCENE_ANCHOR_X = 180;                               // horizontal center of the stand inside the scene
const STAND_TOP_Y = 218;                                  // where the abacus' top surface sits inside the scene

/**
 * The reading screen.
 * Memoized: picking the book does not redraw the stand.
 * @param {{room: Object, onPickReading: function, today: string}} props
 *   room.book is the current book or null; onPickReading(book, element) opens the book;
 *   today is YYYY-MM-DD for the day count
 * @returns {React.ReactElement} Reading room element
 */
const ReadingRoom = memo(function ReadingRoom({ room, onPickReading, today }) {
  const book = room.book;
  const days = book && book.startedAt ? SL.daysBetween(book.startedAt, today) : 0;
  const handleClick = useCallback((event) => {
    if (!isRealTap(event)) return;                         // ignore the touch that ends a swipe
    onPickReading(book, event.currentTarget);
  }, [book, onPickReading]);
  return html`<div className="reading case" data-theme="mahogany">
    <div className="reading-label">Currently Reading</div>
    <div className="scene">
      <div className="stand-glow" />
      ${hasStandImage() && html`<${StandImage} />`}
      <div className="stand-anchor" style=${{ left: SCENE_ANCHOR_X, top: STAND_TOP_Y }}>
        <${MarbleStand} book=${book} W=${READING_BOOK_W} H=${READING_BOOK_H} D=${READING_BOOK_D} onBookClick=${handleClick} />
      </div>
    </div>
    ${book ? html`<div className="reading-info">
      <div className="reading-title">${book.title}</div>
      <div className="reading-author">${book.author}</div>
      <div className="reading-meta">Day ${days + 1} · started ${SL.formatShortDate(book.startedAt)}${book.series ? ' · ' + SL.seriesLabel(book) : ''}</div>
    </div>` : html`<div className="reading-empty">The stand is empty. Pull something from your To Be Read shelf.</div>`}
  </div>`;});

export { READING_BOOK_W, READING_BOOK_H, READING_BOOK_D, SCENE_ANCHOR_X, STAND_TOP_Y, ReadingRoom };
