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
const SWIPE_VELOCITY_WEIGHT = 0.18;                       // how much a flick counts toward the target screen
const DRAG_GUARD_RESET_MS = 90;                           // taps right after a swipe are ignored for this long
const HINT_VISIBLE_MS = 6000;                             // the swipe hint fades after this long
const STYLE_STORAGE_KEY = 'bookshelf.readingStyle';       // remembered stand/desk choice (a per-viewer convenience)
const DEFAULT_READING_STYLE = 'stand';

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
 * Reads the remembered reading style; storage can be blocked, so failures fall back.
 * @returns {string} 'stand' or 'desk'
 */
function readSavedStyle() {
  try { const saved = localStorage.getItem(STYLE_STORAGE_KEY); return saved === 'desk' ? 'desk' : DEFAULT_READING_STYLE; }
  catch (error) { return DEFAULT_READING_STYLE; }
}

/**
 * Remembers the reading style; ignores blocked storage.
 * @param {string} style - 'stand' or 'desk'
 */
function saveStyle(style) {
  try { localStorage.setItem(STYLE_STORAGE_KEY, style); } catch (error) { /* storage unavailable: the choice just won't persist */ }
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

  /** After a drag, picks the nearest screen, nudged by flick speed. */
  const onDragEnd = (event, info) => {
    const projected = x.get() + info.velocity.x * SWIPE_VELOCITY_WEIGHT;
    const target = SL.clamp(Math.round(-projected / vp.w), 0, count - 1);
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
 * @param {string} kind - 'shelf', 'stand' or 'desk'
 * @param {Element} element - The tapped spine or cover
 * @param {Object} extras - {rotateX, rotateY, thicknessPx} for this kind of launch
 * @returns {{kind: string, rect: {cx: number, cy: number, w: number, h: number}, rotateX: number, rotateY: number, thicknessPx: number}}
 */
function launchFromElement(kind, element, extras) {
  const box = element.getBoundingClientRect();
  return { kind, rect: { cx: box.left + box.width / 2, cy: box.top + box.height / 2, w: box.width, h: box.height }, ...extras };
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
  const [readingStyle, setReadingStyle] = useState(readSavedStyle);
  const [picked, setPicked] = useState(null);              // {book, launch} while the stage is open
  const [showHint, setShowHint] = useState(true);
  const safeIndex = SL.clamp(index, 0, rooms.length - 1);

  useEffect(() => { const id = setTimeout(() => setShowHint(false), HINT_VISIBLE_MS); return () => clearTimeout(id); }, []);

  const cycleSort = useCallback((groupKey) => setSortModes((current) => ({ ...current, [groupKey]: SL.nextSortMode(current[groupKey] || 'library') })), []);
  const pickFromShelf = useCallback((book, element) => {
    const launch = launchFromElement('shelf', element, { rotateX: 0, rotateY: 90, thicknessPx: element.getBoundingClientRect().width });
    setPicked({ book, launch });
  }, []);
  const pickReading = useCallback((book, element, kind) => {
    const box = element.getBoundingClientRect();
    const thicknessPx = SL.spineThickness(book.pages) * (box.width / READING_COVER_W);   // thickness at the same scale as the cover
    setPicked({ book, launch: launchFromElement(kind, element, { rotateX: kind === 'desk' ? DESK_TILT_DEG : STAND_TILT_DEG, rotateY: 0, thicknessPx }) });
  }, []);
  const changeStyle = useCallback((style) => { setReadingStyle(style); saveStyle(style); }, []);

  /** Draws screen i: the reading room or a bookcase. */
  const renderScreen = (i) => {
    const room = rooms[i];
    const content = room.kind === 'reading'
      ? html`<${ReadingRoom} room=${room} style=${readingStyle} onStyle=${changeStyle} pickedId=${picked && picked.book.id} onPickReading=${pickReading} today=${today} />`
      : html`<${Bookcase} room=${room} pickedId=${picked && picked.book.id} onPick=${pickFromShelf} onCycleSort=${cycleSort} />`;
    return html`<${ScreenFrame} vp=${vp}>${content}<//>`;
  };

  return html`<${MotionConfig} reducedMotion="user"><div id="app-inner" style=${{ height: '100%' }}>
    <${SwipeTrack} count=${rooms.length} index=${safeIndex} onIndex=${setIndex} vp=${vp} renderScreen=${renderScreen} />
    <${Pager} rooms=${rooms} index=${safeIndex} onIndex=${setIndex} showHint=${showHint} />
    ${picked && html`<${BookStage} key=${picked.book.id} book=${picked.book} allBooks=${books} today=${today} launch=${picked.launch} vp=${vp}
      onClose=${() => setPicked(null)} />`}
  </div><//>`;
}

ReactDOM.createRoot(document.getElementById('app')).render(html`<${App} />`);
