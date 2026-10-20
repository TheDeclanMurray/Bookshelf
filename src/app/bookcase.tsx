import { React, SL, isRealTap, memo, noteTapStart } from './reactSetup';
import { SpineImage } from './art';
import { CASE_FRAMES } from './caseAsset';
import type { BookcaseProps, Placed, SpineButtonProps } from './types';

/**
 * bookcase.js
 * The carved bookcase screen: ornate crown with a brass plaque, fluted pilasters,
 * three shelves of generated spines, and a plinth. The wood theme comes from
 * the room's `theme` (set per genre in shelfLogic.js).
 */

// ----------------------------------------------------------------- constants
const CROWN_WOOD_CLIP = 'path("M 0 63 H 360 V 96 H 0 Z M 60 64 Q 60 20 180 18 Q 300 20 300 64 Z '
  + 'M 30 64 C 28 54 32 47 40 45 C 48 47 52 54 50 64 Z M 310 64 C 308 54 312 47 320 45 C 328 47 332 54 330 64 Z")';
const DENTIL_XS = Array.from({ length: 34 }, (_, i) => 9 + i * 10.2);   // x positions of the small blocks under the cornice
const STUD_YS = [34, 150, 266, 382, 498];                               // brass studs down each pilaster

/**
 * Brass and carved details drawn over the wooden crown.
 * @returns {React.ReactElement} SVG overlay for the crown
 */
function CrownTrim() {
  const trim = { stroke: 'var(--trim)', fill: 'none' };
  return (<svg viewBox="0 0 360 96" aria-hidden="true">
    <path d="M 0 63 H 360" {...trim} strokeWidth="1.6" opacity="0.85"  />
    <path d="M 0 68 H 360" {...trim} strokeWidth="0.8" opacity="0.5"  />
    <path d="M 74 63 Q 76 34 180 31 Q 284 34 286 63" {...trim} strokeWidth="1.4" opacity="0.7"  />
    <path d="M 60 64 C 40 66 34 50 46 48 C 54 47 56 56 50 58" {...trim} strokeWidth="1.8" opacity="0.8"  />
    <path d="M 300 64 C 320 66 326 50 314 48 C 306 47 304 56 310 58" {...trim} strokeWidth="1.8" opacity="0.8"  />
    <path d="M 180 18 V 8" {...trim} strokeWidth="2"  /><circle cx="180" cy="8" r="5" style={{ fill: 'var(--trim)' }}  />
    <circle cx="40" cy="40" r="4" style={{ fill: 'var(--trim)' }}  /><circle cx="320" cy="40" r="4" style={{ fill: 'var(--trim)' }}  />
    {DENTIL_XS.map((x, i) => <rect key={i} x={x} y="80" width="5.5" height="8" style={{ fill: 'var(--w3)' }} opacity="0.85"  />)}
  </svg>);
}

/**
 * One fluted side column with a cap, a foot, and brass studs.
 * @returns {React.ReactElement} Pilaster element
 */
function Pilaster() {
  return (<div className="pilaster wood"><span className="cap"  />
    {STUD_YS.map((y) => <span key={y} className="stud" style={{ top: y }}  />)}<span className="foot"  /></div>);
}

/**
 * A spine on a shelf. Tapping lifts the book out. Memoized so opening one
 * book does not redraw every spine.
 * @param {{placed: {book: Object, thickness: number, height: number}, onPick: function}} props
 * @returns {React.ReactElement} Button containing the spine picture
 */
const SpineButton = memo(function SpineButton({ placed, onPick }: SpineButtonProps) {
  const { book, thickness, height } = placed;
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isRealTap(event)) return;                        // ignore the touch that ends a swipe
    onPick(book, event.currentTarget);
  };
  return (<button className="spine" data-book-id={book.id} style={{ width: thickness, height }}
    aria-label={`${book.title} by ${book.author}`} onPointerDown={noteTapStart} onClick={handleClick}>
    <SpineImage book={book} width={thickness} height={height}  />
  </button>);
});

/**
 * Whether the bookcase frames have been photographed yet.
 * @returns {boolean} True when CASE_FRAMES holds pictures
 */
function hasCaseFrames() {
  return typeof CASE_FRAMES !== 'undefined' && CASE_FRAMES !== null;
}

/**
 * The photographed frame of a bookcase (crown, columns, shelf boards, base) in the wood of its theme.
 * @param {{theme: string}} props - Wood theme
 * @returns {React.ReactElement} Image placed behind the shelves
 */
function CaseFrameImage({ theme }: { theme: string }) {
  const place = CASE_FRAMES.placement;
  return (<img className="case-frame" alt="" draggable="false" src={CASE_FRAMES.images[theme] || CASE_FRAMES.images.mahogany}
    style={{ left: place.left, top: place.top, width: place.width, height: place.height }}  />);
}

/**
 * One carved bookcase screen. Memoized: picking a book does not redraw it (the picked spine is hidden
 * by toggling a class from app.js). The frame is a photograph (renderStatic.mjs) with only the plaque, the
 * sort button and the spines drawn live; `frame="live"` draws the frame from elements instead, which is how
 * it gets photographed.
 * @param {{room: Object, onPick: function, onCycleSort: function, frame?: string, labels?: boolean}} props
 *   room is a bookcase room from buildRooms; onPick(book, element) opens a book; onCycleSort(groupKey) switches
 *   this group's sort order; frame is "auto" (photo when available), "photo" or "live"; labels false leaves out
 *   the plaque and sort button (so they are not photographed)
 * @returns {React.ReactElement} Bookcase element
 */
const Bookcase = memo(function Bookcase({ room, onPick, onCycleSort, frame = 'auto', labels = true }: BookcaseProps) {
  const photo = frame === 'photo' || (frame === 'auto' && hasCaseFrames());
  const sortLabel = SL.SORT_MODES.find((m) => m.key === room.sortMode).label;
  // Pad to a full set of shelves so a nearly empty case still looks like furniture
  const shelves = room.shelves.concat(Array.from({ length: SL.SHELVES_PER_CASE - room.shelves.length }, (): Placed[] => []));
  return (<div className={'case' + (photo ? ' is-photo' : '')} data-theme={room.theme}>
    {photo && <CaseFrameImage theme={room.theme}  />}
    <div className="crown">
      {!photo && (<React.Fragment><div className="wood" style={{ position: 'absolute', inset: 0, clipPath: CROWN_WOOD_CLIP, WebkitClipPath: CROWN_WOOD_CLIP,
        backgroundImage: 'var(--grain), linear-gradient(180deg, rgba(255,255,255,.2), rgba(0,0,0,.05) 45%, rgba(0,0,0,.45))' }}  /><CrownTrim  /></React.Fragment>)}
      {labels && (<React.Fragment><div className="plaque"><div className="plaque-title">{room.title}</div>
        <div className="plaque-sub">{room.bookCount} {room.bookCount === 1 ? 'book' : 'books'} · {sortLabel}</div></div>
      <button className="sort-btn" aria-label={`Change order. Now: ${sortLabel}`} onClick={() => onCycleSort(room.groupKey)}>⇅</button></React.Fragment>)}
    </div>
    <div className="case-body">
      {photo ? <div className="pilaster-space"  /> : <Pilaster  />}
      <div className="interior">
        {shelves.map((shelf, i) => (<div className="shelf" key={i}>
          <div className="books">{shelf.map((placed) => <SpineButton key={placed.book.id} placed={placed} onPick={onPick}  />)}</div>
          {photo ? <div className="board-space"  /> : <div className="board"  />}
        </div>))}
      </div>
      {photo ? <div className="pilaster-space"  /> : <Pilaster  />}
    </div>
    <div className={photo ? 'plinth-space' : 'plinth'}  />
  </div>);});

export { CROWN_WOOD_CLIP, DENTIL_XS, STUD_YS, CrownTrim, Pilaster, SpineButton, hasCaseFrames, CaseFrameImage, Bookcase };
