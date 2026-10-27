import './fonts';
import * as ReactDOM from 'react-dom/client';
import './styles.css';
import { useBooks } from './useBooks';
import { BookForm } from './BookForm';
import { DragGuard, MotionConfig, SL, SeriesStyleContext, animate, motion, useCallback, useEffect, useMemo, useMotionValue, useRef, useState } from './reactSetup';
import { SpineCache } from './spineCache';
import { Bookcase } from './bookcase';
import { BOOK_REST_DEG, MarbleStand, STAND_TILT_X_DEG, STAND_TURN_Y_DEG } from './stand3d';
import { READING_BOOK_D, READING_BOOK_H, READING_BOOK_W, ReadingRoom, SCENE_ANCHOR_X, STAND_TOP_Y } from './readingRoom';
import { BookStage } from './bookStage';
import type { Book, Launch, PagerProps, Placed, ScreenFrameProps, SwipeTrackProps } from './types';

/**
 * app.js
 * The app shell: the horizontal swipe track of bookcases (To Be Read, Currently
 * Reading, genres, Youth, Did Not Finish), the page dots, and opening a book.
 */

// ----------------------------------------------------------------- constants
const FRAME_W = 360;                                      // logical width of every screen (a bookcase is 360px wide)
const FRAME_H = 700;                                      // logical height of every screen
const FRAME_SIDE_GUTTER = 16;                             // minimum space left and right of a screen
const PAGER_HEIGHT = 58;                                  // room kept at the bottom for the page dots
const MAX_FRAME_SCALE = 1.3;                              // do not blow screens up beyond this on large displays
const SNAP_SPRING = { type: 'spring', stiffness: 260, damping: 34 } as const;
const SWIPE_DISTANCE_FRACTION = 0.1;                      // dragging this fraction of the screen width changes screens
const SWIPE_MIN_DISTANCE_PX = 28;                         // ...but never less than this many pixels
const SWIPE_MAX_DISTANCE_PX = 56;                         // ...and never more than this, on wide screens
const SWIPE_FLICK_VELOCITY = 180;                         // a quicker flick (px/s) changes screens whatever the distance
const DRAG_GUARD_RESET_MS = 90;                           // taps right after a swipe are ignored for this long
const CASE_RENDER_MARGIN_PX = 60;                         // room around a bookcase when it is photographed (its shadow reaches outside it)
const HINT_VISIBLE_MS = 6000;                             // the swipe hint fades after this long

/**
 * Tracks the window size so layouts can rescale on rotation or resize.
 * @returns {{w: number, h: number}} Window width and height in px
 */
function useViewport() {
  const [vp, setVp] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return vp;
}

/**
 * One screen of the track: scales the 360px-wide design to fit the window.
 * @param {{vp: {w: number, h: number}, children: *}} props - Window size and the screen content
 * @returns {React.ReactElement} Scaled, centered frame
 */
function ScreenFrame({ vp, children }: ScreenFrameProps) {
  const scale = Math.min((vp.w - FRAME_SIDE_GUTTER * 2) / FRAME_W, (vp.h - PAGER_HEIGHT - 8) / FRAME_H, MAX_FRAME_SCALE);
  const top = Math.max(4, (vp.h - PAGER_HEIGHT - FRAME_H * scale) / 2);   // center vertically in the space above the dots
  return <div className="frame" style={{ width: FRAME_W, marginLeft: -FRAME_W / 2, top, transform: `scale(${scale})` }}>{children}</div>;
}

/**
 * Horizontal swipe track. Dragging snaps to whole screens; dots can jump.
 * @param {{count: number, index: number, onIndex: function, vp: Object, renderScreen: function}} props
 *   renderScreen(i) returns the content of screen i; only screens near the current one are drawn
 * @returns {React.ReactElement} Track element
 */
function SwipeTrack({ count, index, onIndex, vp, renderScreen }: SwipeTrackProps) {
  const x = useMotionValue(-index * vp.w);

  // Animate to the current screen whenever the index changes; jump (no animation) when the window resizes
  const lastWidth = useRef(vp.w);
  useEffect(() => {
    if (lastWidth.current !== vp.w) { lastWidth.current = vp.w; x.set(-index * vp.w); return; }
    const controls = animate(x, -index * vp.w, SNAP_SPRING);
    return () => controls.stop();
  }, [index, vp.w]);

  /** After a drag: a short drag or a quick flick moves one screen; otherwise it springs back. */
  const onDragEnd = (_event: PointerEvent, info: { offset: { x: number }; velocity: { x: number } }) => {
    const needed = SL.clamp(vp.w * SWIPE_DISTANCE_FRACTION, SWIPE_MIN_DISTANCE_PX, SWIPE_MAX_DISTANCE_PX);
    let direction = 0;                                    // +1 next screen, -1 previous
    if (info.offset.x < -needed || info.velocity.x < -SWIPE_FLICK_VELOCITY) direction = 1;
    else if (info.offset.x > needed || info.velocity.x > SWIPE_FLICK_VELOCITY) direction = -1;
    const target = SL.clamp(index + direction, 0, count - 1);
    if (target === index) animate(x, -index * vp.w, SNAP_SPRING);   // the index did not change, so snap back by hand
    onIndex(target);
    setTimeout(() => { DragGuard.dragging = false; }, DRAG_GUARD_RESET_MS);
  };

  return (<motion.div className="track" style={{ x, width: count * vp.w }} drag="x" dragDirectionLock dragElastic={0.12}
    dragConstraints={{ left: -(count - 1) * vp.w, right: 0 }} dragMomentum={false}
    onDragStart={() => { DragGuard.dragging = true; }} onDragEnd={onDragEnd}>
    {Array.from({ length: count }, (_, i) => (<div className="slot" key={i} style={{ width: vp.w }}>
      {Math.abs(i - index) <= 1 ? renderScreen(i) : null}</div>))}
  </motion.div>);
}

/**
 * Dots along the bottom; tap one to jump to that screen.
 * @param {{rooms: Object[], index: number, onIndex: function, showHint: boolean}} props - Screens, current index, jump handler, hint visibility
 * @returns {React.ReactElement} Pager element
 */
function Pager({ rooms, index, onIndex, showHint }: PagerProps) {
  return (<div className="pager">
    <div className={'hint' + (showHint ? '' : ' is-hidden')}>Swipe between bookcases</div>
    <div className="pips">{rooms.map((room, i) => (<button key={room.id} className={'pip' + (room.kind === 'reading' ? ' is-reading' : '')}
      aria-label={room.title} aria-current={i === index} onClick={() => onIndex(i)}  />))}</div>
  </div>);
}

/**
 * Describes where a tapped element is on screen so the stage can start the book there.
 * @param {string} kind - 'shelf' or 'stand'
 * @param {Element} element - The tapped spine or cover
 * @param {Object} extras - {rotateX, rotateY, thicknessPx} for this kind of launch
 * @returns {{kind: string, corners: number[][], rect: {cx: number, cy: number, w: number, h: number}}} Measured screen corners (top-left, top-right, bottom-right, bottom-left) plus the extras
 */
function launchFromElement(kind: string, element: Element, extras: Record<string, unknown>) {
  const box = element.getBoundingClientRect();
  // A stand book has four marker points on its cover; a spine is a flat rectangle, so its own corners are used
  const markers = Array.from(element.querySelectorAll('.corner')) as Element[];
  const corners = markers.length === 4
    ? markers.map((marker) => { const point = marker.getBoundingClientRect(); return [point.left, point.top]; })
    : [[box.left, box.top], [box.right, box.top], [box.right, box.bottom], [box.left, box.bottom]];
  return { kind, corners, rect: { cx: box.left + box.width / 2, cy: box.top + box.height / 2, w: box.width, h: box.height }, ...extras };
}

/**
 * Hides or shows the spine or stand book that is currently on the stage. Done on the element
 * directly so the screens do not re-render (a re-render at that moment would stutter the pull-out).
 * @param {string} bookId - Book id
 * @param {boolean} hidden - True to hide, false to show
 */
function setSceneBookHidden(bookId: string, hidden: boolean) {
  document.querySelectorAll(`[data-book-id="${bookId}"]`).forEach((element) => element.classList.toggle('is-out', hidden));
}

/**
 * The whole prototype.
 * @returns {React.ReactElement} App element
 */
function App() {
  const vp = useViewport();
  const today = useMemo(() => SL.todayIso(), []);
  const { books, ready, saveBook, deleteBook } = useBooks();
  const [sortModes, setSortModes] = useState<Record<string, string>>({});   // sort mode per group key
  const [formBook, setFormBook] = useState<import('./types').Book | null | undefined>(undefined); // undefined = closed, null = new
  const roomCache = useRef(new Map());                 // room id -> {signature, room}: unchanged rooms keep the same object, so their bookcases are not redrawn
  const rooms = useMemo(() => SL.buildRooms(books, { sortModes }).map((room) => {
    const signature = SL.roomSignature(room);
    const cached = roomCache.current.get(room.id);
    if (cached && cached.signature === signature) return cached.room;
    roomCache.current.set(room.id, { signature, room });
    return room;
  }), [books, sortModes]);
  const readingAt = rooms.findIndex((r) => r.kind === 'reading');
  const [index, setIndex] = useState(readingAt);           // start on Currently Reading
  const [picked, setPicked] = useState(null);              // {book, launch} while the stage is open
  const [showHint, setShowHint] = useState(true);
  const safeIndex = SL.clamp(index, 0, rooms.length - 1);

  useEffect(() => { const id = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS); return () => clearTimeout(id); }, []);

  const cycleSort = useCallback((groupKey: string) => setSortModes((current) => ({ ...current, [groupKey]: SL.nextSortMode(current[groupKey] || 'library') })), []);
  const pickFromShelf = useCallback((book: Book, element: Element) => {
    const launch = launchFromElement('shelf', element, { rotateX: 0, rotateY: 90, thicknessPx: element.getBoundingClientRect().width });
    setSceneBookHidden(book.id, true);
    setPicked({ book, launch });
  }, []);
  const pickReading = useCallback((book: Book, element: Element) => {
    const box = element.getBoundingClientRect();
    const turn = Math.cos((STAND_TURN_Y_DEG * Math.PI) / 180);
    const onScreenScale = box.width / (READING_BOOK_W * turn);   // how big the book is on screen compared with its design size
    // Measure first and hide second: fading a 3D element flattens it, which would move the points being measured
    const launch = launchFromElement('stand', element, {
      rotateX: BOOK_REST_DEG + STAND_TILT_X_DEG, rotateY: STAND_TURN_Y_DEG, thicknessPx: READING_BOOK_D * onScreenScale,
      designScale: onScreenScale, designW: READING_BOOK_W, depthRatio: READING_BOOK_D / READING_BOOK_W });
    setSceneBookHidden(book.id, true);
    setPicked({ book, launch });
  }, []);
  const seriesStyles = useMemo(() => SL.buildSeriesStyles(books), [books]);

  /** Draws screen i: the reading room or a bookcase. */
  const renderScreen = (i: number) => {
    const room = rooms[i];
    const content = room.kind === 'reading'
      ? <ReadingRoom room={room} onPickReading={pickReading} today={today}  />
      : <Bookcase room={room} onPick={pickFromShelf} onCycleSort={cycleSort}  />;
    return <ScreenFrame vp={vp}>{content}</ScreenFrame>;
  };

  return (<MotionConfig reducedMotion="user"><SeriesStyleContext.Provider value={seriesStyles}><div id="app-inner" style={{ height: '100%' }}>
    <SwipeTrack count={rooms.length} index={safeIndex} onIndex={setIndex} vp={vp} renderScreen={renderScreen}  />
    <Pager rooms={rooms} index={safeIndex} onIndex={setIndex} showHint={showHint}  />
    {picked && (<BookStage key={picked.book.id} book={picked.book} allBooks={books} today={today} launch={picked.launch} vp={vp}
      onReturning={() => setSceneBookHidden(picked.book.id, false)}
      onClose={() => { setSceneBookHidden(picked.book.id, false); setPicked(null); }}
      onEdit={() => setFormBook(picked.book)}  />)}
    {ready && !picked && (
      <button className="bf-fab" aria-label="Add a book" onClick={() => setFormBook(null)}>+</button>
    )}
    {formBook !== undefined && (
      <BookForm
        book={formBook ?? undefined}
        onSave={saveBook}
        onDelete={formBook ? (id) => deleteBook(id) : undefined}
        onClose={() => setFormBook(undefined)}
      />
    )}
  </div></SeriesStyleContext.Provider></MotionConfig>);
}

/**
 * Page used only by renderStand.mjs: the column alone, on a transparent background, in the same
 * place and camera as the reading screen, so a photograph of it lines up with the live book.
 * Open the built page with #render-stand to see it.
 * @returns {React.ReactElement} The static part of the stand
 */
function StandRenderPage() {
  return (<div className="reading case" data-theme="mahogany" style={{ position: 'absolute', left: FRAME_SIDE_GUTTER, top: 0 }}>
    <div className="scene"><div className="stand-anchor" style={{ left: SCENE_ANCHOR_X, top: STAND_TOP_Y }}>
      <MarbleStand book={null} W={READING_BOOK_W} H={READING_BOOK_H} D={READING_BOOK_D} onBookClick={null} staticOnly={true}  />
    </div></div>
  </div>);
}

/**
 * Page used only by renderStatic.mjs: an empty bookcase frame (no plaque, no spines) on a transparent
 * background, in the wood theme named in the address (#render-case=oak).
 * @param {{theme: string}} props - Wood theme
 * @returns {React.ReactElement} The frame, drawn live so it can be photographed
 */
function CaseRenderPage({ theme }: { theme: string }) {
  const room = { id: 'render', kind: 'case', groupKey: 'render', title: '', theme, shelves: [] as Placed[][], bookCount: 0, sortMode: 'library' };
  return (<div style={{ position: 'absolute', left: CASE_RENDER_MARGIN_PX, top: CASE_RENDER_MARGIN_PX }}>
    <Bookcase room={room} frame="live" labels={false} onPick={null} onCycleSort={null}  />
  </div>);
}

/**
 * Starts the page: first the saved spine pictures and the fonts are made ready (a short, limited wait),
 * then the first screen is drawn, so spines appear finished instead of popping in. The #render-stand and
 * #render-case=<theme> addresses draw the pieces renderStatic.mjs photographs instead of the app.
 * @returns {Promise<void>}
 */
async function startPage() {
  const hash = window.location.hash;
  const caseTheme = hash.startsWith('#render-case=') ? hash.slice('#render-case='.length) : null;
  const rendering = hash === '#render-stand' || caseTheme !== null;
  if (rendering) document.documentElement.classList.add('render-static');
  else await SpineCache.prepare();
  const content = caseTheme !== null ? <CaseRenderPage theme={caseTheme}  /> : hash === '#render-stand' ? <StandRenderPage  /> : <App  />;
  ReactDOM.createRoot(document.getElementById('app')).render(content);
}

startPage();

export { FRAME_W, FRAME_H, FRAME_SIDE_GUTTER, PAGER_HEIGHT, MAX_FRAME_SCALE, SNAP_SPRING, SWIPE_DISTANCE_FRACTION, SWIPE_MIN_DISTANCE_PX, SWIPE_MAX_DISTANCE_PX, SWIPE_FLICK_VELOCITY, DRAG_GUARD_RESET_MS, CASE_RENDER_MARGIN_PX, HINT_VISIBLE_MS, useViewport, ScreenFrame, SwipeTrack, Pager, launchFromElement, setSceneBookHidden, App, StandRenderPage, CaseRenderPage };
