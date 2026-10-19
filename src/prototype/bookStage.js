/**
 * bookStage.js
 * The overlay where a book is pulled out and opened. The book is a real CSS 3D
 * box (cover, spine, page edges, back) animated with Framer Motion:
 *   shelf spine -> (one quick motion) -> turned to show the cover -> cover swings open.
 * The rest of the screen fades at the same time. Closing is one quick motion back
 * to the spine's slot.
 */

// ----------------------------------------------------------------- constants
const STAGE_ANCHOR_Y = 0.46;                              // vertical anchor of the stage, as a fraction of screen height
const BOOK_MIN_W = 150;                                   // smallest book width on the stage (px)
const BOOK_MAX_W = 240;                                   // largest book width on the stage (px)
const BOOK_ASPECT = 1.5;                                  // book height / width
const PULL_DEPTH_PX = 110;                                // how far the book swings toward you on the way out
const DISPLAY_TILT_Y = 22;                                // turn that keeps a little spine visible beside the cover
const DISPLAY_TILT_X = -4;
const DIM_FADE_S = 0.3;                                   // the rest of the screen fades while the book moves
// One motion from the slot to the display pose; z arcs forward and back so it reads as pulling out
const PULL_OUT = { type: 'spring', stiffness: 155, damping: 19.5, mass: 0.85, z: { duration: 0.44, times: [0, 0.4, 1], ease: 'easeOut' }, opacity: { duration: 0.14 } };
const PUT_BACK = { duration: 0.24, ease: [0.4, 0, 0.2, 1], opacity: { duration: 0.24, ease: 'easeIn' } };
const OPEN_SPRING = { type: 'spring', stiffness: 240, damping: 25, mass: 0.9 };

/**
 * Builds the position, scale and turn for each stage of the animation.
 * @param {Object} geo - {launch, W, H, anchorX, anchorY, scale0, openScale, displayScale}
 * @returns {Object} Framer Motion variants: launch (in the slot), display (cover showing), open (spread).
 *          From a stand the book fades in and out, because the stand's perspective cannot be matched exactly.
 */
function buildPoseVariants(geo) {
  const { launch, W, anchorX, anchorY, scale0, openScale, displayScale } = geo;
  const dx = launch.rect.cx - anchorX;                    // where the book starts, relative to the stage center
  const dy = launch.rect.cy - anchorY;
  return {
    launch: { x: dx, y: dy, z: 0, opacity: launch.kind === 'shelf' ? 1 : 0, scale: scale0, rotateX: launch.rotateX, rotateY: launch.rotateY, transition: PUT_BACK },
    display: { x: 0, y: 0, z: [null, PULL_DEPTH_PX, 0], opacity: 1, scale: displayScale, rotateX: DISPLAY_TILT_X, rotateY: DISPLAY_TILT_Y, transition: PULL_OUT },
    open: { x: (openScale * W) / 2, y: 0, z: 0, opacity: 1, scale: openScale, rotateX: 0, rotateY: 0, transition: OPEN_SPRING },
  };
}

/**
 * Full-screen stage that shows one book coming off the shelf and opening.
 * @param {{book: Object, allBooks: Object[], today: string, launch: Object, vp: {w: number, h: number}, onClose: function}} props
 *   launch describes where the book starts: {kind: 'shelf'|'stand', rect: {cx, cy, w, h}, thicknessPx, rotateX, rotateY};
 *   onReturning runs when the put-back motion starts (the stand shows its book again); onClose runs once the book is back in place
 * @returns {React.ReactElement} Stage overlay
 */
function BookStage({ book, allBooks, today, launch, vp, onReturning, onClose }) {
  const isShelf = launch.kind === 'shelf';
  const [phase, setPhase] = useState('display');          // pose the book is animating toward; it starts at 'launch' and heads out immediately
  const [coverOpen, setCoverOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const [dim, setDim] = useState(true);
  const closingRef = useRef(false);
  const movedBackRef = useRef(false);

  // Book size on the stage, depth from the real spine width, and the display scales
  const W = SL.clamp((vp.w - 24) / 2, BOOK_MIN_W, BOOK_MAX_W);
  const H = Math.round(W * BOOK_ASPECT);
  // Size at the start: a spine is as tall as the book; from the stand, match the book's real on-screen scale
  const scale0 = isShelf ? launch.rect.h / H : (launch.designScale * launch.designW) / W;
  const D = Math.max(16, launch.thicknessPx / scale0);
  const displayScale = Math.min(1.45, (vp.w - 48) / (W + D * 0.5), (vp.h * 0.6) / H);
  const openScale = Math.min(1.25, (vp.w - 16) / (2 * W), (vp.h * 0.8) / H);
  const variants = useMemo(() => buildPoseVariants({ launch, W, H, anchorX: vp.w / 2, anchorY: vp.h * STAGE_ANCHOR_Y, scale0, openScale, displayScale }),
    [launch, W, H, vp.w, vp.h, scale0, openScale, displayScale]);

  /** When the put-back motion reaches the slot, hand control back to the shelf. */
  const onPoseDone = (name) => {
    if (closingRef.current && name === 'launch') onClose();
  };

  /** Second half of closing: the cover is shut, so the screen fades and the book returns to its slot. */
  const moveBack = () => {
    if (movedBackRef.current) return;
    movedBackRef.current = true;
    setDim(false);
    if (!isShelf) onReturning();                          // the stand's book fades back in while this one fades out
    setPhase('launch');
  };

  /** Closing: shut the cover first (quickly) if it is open, then move the book. */
  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    if (coverOpen) setCoverOpen(false);                   // moveBack runs when the cover finishes closing
    else moveBack();
  };

  /** Runs whenever the cover finishes swinging; during closing that means it is shut. */
  const onCoverSettled = () => {
    if (closingRef.current && !coverOpen) moveBack();
  };

  /** Opens the cover, but only once the book is showing its front. */
  const openCover = (event) => {
    event.stopPropagation();
    if (phase !== 'display' || closingRef.current) return;
    setCoverOpen(true);
    setPhase('open');
  };

  return html`<div className="stage" onClick=${requestClose}>
    <${motion.div} className="stage-dim" initial=${{ opacity: 0 }} animate=${{ opacity: dim ? 1 : 0 }} transition=${{ duration: DIM_FADE_S }} />
    <button className="stage-close" aria-label="Put the book back" onClick=${(e) => { e.stopPropagation(); requestClose(); }}>×</button>
    <div className="stage-anchor" onClick=${(e) => e.stopPropagation()}>
      <${motion.div} className="book3d" style=${{ left: -W / 2, top: -H / 2, width: W, height: H }}
        variants=${variants} initial="launch" animate=${phase} onAnimationComplete=${onPoseDone}>
        <${BookBox} book=${book} allBooks=${allBooks} today=${today} W=${W} H=${H} D=${D} spineUnit=${isShelf ? 1 / scale0 : undefined} coverOpen=${coverOpen} closing=${closing}
          onCoverClick=${openCover} onCoverSettled=${onCoverSettled} withPages=${true} />
      <//>
    </div>
    <div className="stage-hint">${closing ? '' : phase === 'display' && !coverOpen ? 'Tap the cover to open' : phase === 'open' ? 'Tap outside to put it back' : ''}</div>
  </div>`;
}
