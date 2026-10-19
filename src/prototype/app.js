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
const SNAP_SPRING = { type: 'spring', stiffness: 260, damping: 34 };
const SWIPE_DISTANCE_FRACTION = 0.1;                      // dragging this fraction of the screen width changes screens
const SWIPE_MIN_DISTANCE_PX = 28;                         // ...but never less than this many pixels
const SWIPE_MAX_DISTANCE_PX = 56;                         // ...and never more than this, on wide screens
const SWIPE_FLICK_VELOCITY = 180;                         // a quicker flick (px/s) changes screens whatever the distance
const DRAG_GUARD_RESET_MS = 90;                           // taps right after a swipe are ignored for this long
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
function ScreenFrame({ vp, children }) {
  const scale = Math.min((vp.w - FRAME_SIDE_GUTTER * 2) / FRAME_W, (vp.h - PAGER_HEIGHT - 8) / FRAME_H, MAX_FRAME_SCALE);
  const top = Math.max(4, (vp.h - PAGER_HEIGHT - FRAME_H * scale) / 2);   // center vertically in the space above the dots
  return html`<div className="frame" style=${{ width: FRAME_W, marginLeft: -FRAME_W / 2, top, transform: `scale(${scale})` }}>${children}</div>`;
}

/**
 * Horizontal swipe track. Dragging snaps to whole screens; dots can jump.
 * @param {{count: number, index: number, onIndex: function, vp: Object, renderScreen: function}} props
 *   renderScreen(i) returns the content of screen i; only screens near the current one are drawn
 * @returns {React.ReactElement} Track element
 */
function SwipeTrack({ count, index, onIndex, vp, renderScreen }) {
  const x = useMotionValue(-index * vp.w);

  // Animate to the current screen whenever the index changes; jump (no animation) when the window resizes
  const lastWidth = useRef(vp.w);
  useEffect(() => {
    if (lastWidth.current !== vp.w) { lastWidth.current = vp.w; x.set(-index * vp.w); return; }
    const controls = animate(x, -index * vp.w, SNAP_SPRING);
    return () => controls.stop();
  }, [index, vp.w]);

  /** After a drag: a short drag or a quick flick moves one screen; otherwise it springs back. */
  const onDragEnd = (event, info) => {
    const needed = SL.clamp(vp.w * SWIPE_DISTANCE_FRACTION, SWIPE_MIN_DISTANCE_PX, SWIPE_MAX_DISTANCE_PX);
    let direction = 0;                                    // +1 next screen, -1 previous
    if (info.offset.x < -needed || info.velocity.x < -SWIPE_FLICK_VELOCITY) direction = 1;
    else if (info.offset.x > needed || info.velocity.x > SWIPE_FLICK_VELOCITY) direction = -1;
    const target = SL.clamp(index + direction, 0, count - 1);
    if (target === index) animate(x, -index * vp.w, SNAP_SPRING);   // the index did not change, so snap back by hand
    onIndex(target);
    setTimeout(() => { DragGuard.dragging = false; }, DRAG_GUARD_RESET_MS);
  };

  return html`<${motion.div} className="track" style=${{ x, width: count * vp.w }} drag="x" dragDirectionLock dragElastic=${0.12}
    dragConstraints=${{ left: -(count - 1) * vp.w, right: 0 }} dragMomentum=${false}
    onDragStart=${() => { DragGuard.dragging = true; }} onDragEnd=${onDragEnd}>
    ${Array.from({ length: count }, (_, i) => html`<div className="slot" key=${i} style=${{ width: vp.w }}>
      ${Math.abs(i - index) <= 1 ? renderScreen(i) : null}</div>`)}
  <//>`;
}

/**
 * Dots along the bottom; tap one to jump to that screen.
 * @param {{rooms: Object[], index: number, onIndex: function, showHint: boolean}} props - Screens, current index, jump handler, hint visibility
 * @returns {React.ReactElement} Pager element
 */
function Pager({ rooms, index, onIndex, showHint }) {
  return html`<div className="pager">
    <div className=${'hint' + (showHint ? '' : ' is-hidden')}>Swipe between bookcases</div>
    <div className="pips">${rooms.map((room, i) => html`<button key=${room.id} className=${'pip' + (room.kind === 'reading' ? ' is-reading' : '')}
      aria-label=${room.title} aria-current=${i === index} onClick=${() => onIndex(i)} />`)}</div>
  </div>`;
}

/**
 * Describes where a tapped element is on screen so the stage can start the book there.
 * @param {string} kind - 'shelf' or 'stand'
 * @param {Element} element - The tapped spine or cover
 * @param {Object} extras - {rotateX, rotateY, thicknessPx} for this kind of launch
 * @returns {{kind: string, rect: {cx: number, cy: number, w: number, h: number}, rotateX: number, rotateY: number, thicknessPx: number}}
 */
function launchFromElement(kind, element, extras) {
  const box = element.getBoundingClientRect();
  return { kind, rect: { cx: box.left + box.width / 2, cy: box.top + box.height / 2, w: box.width, h: box.height }, ...extras };
}

/**
 * Hides or shows the spine or stand book that is currently on the stage. Done on the element
 * directly so the screens do not re-render (a re-render at that moment would stutter the pull-out).
 * @param {string} bookId - Book id
 * @param {boolean} hidden - True to hide, false to show
 */
function setSceneBookHidden(bookId, hidden) {
  document.querySelectorAll(`[data-book-id="${bookId}"]`).forEach((element) => element.classList.toggle('is-out', hidden));
}

/**
 * The whole prototype.
 * @returns {React.ReactElement} App element
 */
function App() {
  const vp = useViewport();
  const today = useMemo(() => SL.todayIso(), []);
  const books = useMemo(() => FakeData.buildFakeLibrary(today), [today]);
  const [sortModes, setSortModes] = useState({});         // sort mode per group key
  const rooms = useMemo(() => SL.buildRooms(books, { sortModes }), [books, sortModes]);
  const readingAt = rooms.findIndex((r) => r.kind === 'reading');
  const [index, setIndex] = useState(readingAt);           // start on Currently Reading
  const [picked, setPicked] = useState(null);              // {book, launch} while the stage is open
  const [showHint, setShowHint] = useState(true);
  const safeIndex = SL.clamp(index, 0, rooms.length - 1);

  useEffect(() => { const id = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS); return () => clearTimeout(id); }, []);

  const cycleSort = useCallback((groupKey) => setSortModes((current) => ({ ...current, [groupKey]: SL.nextSortMode(current[groupKey] || 'library') })), []);
  const pickFromShelf = useCallback((book, element) => {
    const launch = launchFromElement('shelf', element, { rotateX: 0, rotateY: 90, thicknessPx: element.getBoundingClientRect().width });
    setSceneBookHidden(book.id, true);
    setPicked({ book, launch });
  }, []);
  const pickReading = useCallback((book, element) => {
    const box = element.getBoundingClientRect();
    const turn = Math.cos((STAND_TURN_Y_DEG * Math.PI) / 180);
    const onScreenScale = box.width / (READING_BOOK_W * turn);   // how big the book is on screen compared with its design size
    setSceneBookHidden(book.id, true);
    setPicked({ book, launch: launchFromElement('stand', element, {
      rotateX: BOOK_REST_DEG + STAND_TILT_X_DEG, rotateY: STAND_TURN_Y_DEG, thicknessPx: READING_BOOK_D * onScreenScale,
      designScale: onScreenScale, designW: READING_BOOK_W }) });
  }, []);
  const seriesStyles = useMemo(() => SL.buildSeriesStyles(books), [books]);

  /** Draws screen i: the reading room or a bookcase. */
  const renderScreen = (i) => {
    const room = rooms[i];
    const content = room.kind === 'reading'
      ? html`<${ReadingRoom} room=${room} onPickReading=${pickReading} today=${today} />`
      : html`<${Bookcase} room=${room} onPick=${pickFromShelf} onCycleSort=${cycleSort} />`;
    return html`<${ScreenFrame} vp=${vp}>${content}<//>`;
  };

  return html`<${MotionConfig} reducedMotion="user"><${SeriesStyleContext.Provider} value=${seriesStyles}><div id="app-inner" style=${{ height: '100%' }}>
    <${SwipeTrack} count=${rooms.length} index=${safeIndex} onIndex=${setIndex} vp=${vp} renderScreen=${renderScreen} />
    <${Pager} rooms=${rooms} index=${safeIndex} onIndex=${setIndex} showHint=${showHint} />
    ${picked && html`<${BookStage} key=${picked.book.id} book=${picked.book} allBooks=${books} today=${today} launch=${picked.launch} vp=${vp}
      onReturning=${() => setSceneBookHidden(picked.book.id, false)} onClose=${() => { setSceneBookHidden(picked.book.id, false); setPicked(null); }} />`}
  </div><//><//>`;
}

ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`);
