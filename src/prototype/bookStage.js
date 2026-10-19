/**
 * bookStage.js
 * The overlay where a book is pulled out and opened. The book is a real CSS 3D
 * box (cover, spine, page edges, back) animated with Framer Motion:
 *   shelf spine -> pulled forward -> turned to show the cover -> cover swings open.
 * Closing plays the same steps backwards, ending exactly on the spine's slot.
 */

// ----------------------------------------------------------------- constants
const STAGE_ANCHOR_Y = 0.46;                              // vertical anchor of the stage, as a fraction of screen height
const BOOK_MIN_W = 150;                                   // smallest book width on the stage (px)
const BOOK_MAX_W = 240;                                   // largest book width on the stage (px)
const BOOK_ASPECT = 1.5;                                  // book height / width
const PULL_DEPTH_PX = 140;                                // how far the book comes toward you when pulled
const DISPLAY_TILT_Y = 22;                                // turn that keeps a little spine visible beside the cover
const DISPLAY_TILT_X = -4;
const OPEN_ANGLE_DEG = -180;                              // front cover swing
const SETTLE_SPRING = { type: 'spring', stiffness: 120, damping: 17, mass: 0.9 };
const OPEN_SPRING = { type: 'spring', stiffness: 110, damping: 20, mass: 1 };
const PULL_TWEEN = { duration: 0.34, ease: [0.2, 0.7, 0.3, 1] };

/**
 * Builds the position, scale and turn for each stage of the animation.
 * @param {Object} geo - {launch, W, H, anchorX, anchorY, scale0, openScale, displayScale}
 * @returns {Object} Framer Motion variants: launch, pulled, display, open
 */
function buildPoseVariants(geo) {
  const { launch, W, anchorX, anchorY, scale0, openScale, displayScale } = geo;
  const dx = launch.rect.cx - anchorX;                    // where the book starts, relative to the stage center
  const dy = launch.rect.cy - anchorY;
  return {
    launch: { x: dx, y: dy, z: 0, scale: scale0, rotateX: launch.rotateX, rotateY: launch.rotateY, transition: PULL_TWEEN },
    pulled: { x: dx, y: dy - 6, z: PULL_DEPTH_PX, scale: scale0 * 1.04, rotateX: launch.rotateX, rotateY: launch.rotateY, transition: PULL_TWEEN },
    display: { x: 0, y: 0, z: 0, scale: displayScale, rotateX: DISPLAY_TILT_X, rotateY: DISPLAY_TILT_Y, transition: SETTLE_SPRING },
    open: { x: (openScale * W) / 2, y: 0, z: 0, scale: openScale, rotateX: 0, rotateY: 0, transition: OPEN_SPRING },
  };
}

/**
 * Full-screen stage that shows one book coming off the shelf and opening.
 * @param {{book: Object, allBooks: Object[], today: string, launch: Object, vp: {w: number, h: number}, onClose: function}} props
 *   launch describes where the book starts: {kind: 'shelf'|'stand'|'desk', rect: {cx, cy, w, h}, thicknessPx, rotateX, rotateY};
 *   onClose runs once the book is back in place
 * @returns {React.ReactElement} Stage overlay
 */
function BookStage({ book, allBooks, today, launch, vp, onClose }) {
  const isShelf = launch.kind === 'shelf';
  const [phase, setPhase] = useState('launch');           // which pose the book is animating toward
  const [coverOpen, setCoverOpen] = useState(false);
  const [dim, setDim] = useState(true);
  const closingRef = useRef(false);

  // Book size on the stage, depth from the real spine width, and the three display scales
  const W = SL.clamp((vp.w - 24) / 2, BOOK_MIN_W, BOOK_MAX_W);
  const H = Math.round(W * BOOK_ASPECT);
  const scale0 = isShelf ? launch.rect.h / H : launch.rect.w / W;
  const D = Math.max(16, launch.thicknessPx / scale0);
  const displayScale = Math.min(1.45, (vp.w - 48) / (W + D * 0.5), (vp.h * 0.6) / H);
  const openScale = Math.min(1.25, (vp.w - 16) / (2 * W), (vp.h * 0.8) / H);
  const variants = useMemo(() => buildPoseVariants({ launch, W, H, anchorX: vp.w / 2, anchorY: vp.h * STAGE_ANCHOR_Y, scale0, openScale, displayScale }),
    [launch, W, H, vp.w, vp.h, scale0, openScale, displayScale]);

  // Start the pull-out on the frame after mount, so the first paint is the book sitting in its slot
  useEffect(() => {
    let second = 0;
    const first = requestAnimationFrame(() => { second = requestAnimationFrame(() => setPhase(isShelf ? 'pulled' : 'display')); });
    return () => { cancelAnimationFrame(first); cancelAnimationFrame(second); };
  }, []);

  /** Chains the animation steps: pulled leads to display; while closing, each step leads to the previous one. */
  const onPoseDone = (name) => {
    if (!closingRef.current) { if (name === 'pulled') setPhase('display'); return; }
    if (name === 'display') setPhase(isShelf ? 'pulled' : 'launch');
    else if (name === 'pulled') setPhase('launch');
    else if (name === 'launch') onClose();
  };

  /** Starts putting the book back, from whatever step it is on. */
  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;
    setDim(false);
    setCoverOpen(false);
    if (phase === 'open') setPhase('display');
    else if (phase === 'display') setPhase(isShelf ? 'pulled' : 'launch');
    else if (phase === 'pulled') setPhase('launch');
    else onClose();                                       // never left its slot
  };

  /** Opens the cover, but only once the book is showing its front. */
  const openCover = (event) => {
    event.stopPropagation();
    if (phase !== 'display' || closingRef.current) return;
    setCoverOpen(true);
    setPhase('open');
  };

  const faceBox = { left: 0, top: 0, width: W, height: H };
  const pageFontSize = W * 0.068;                         // page text scales with the book
  return html`<div className="stage" onClick=${requestClose}>
    <${motion.div} className="stage-dim" initial=${{ opacity: 0 }} animate=${{ opacity: dim ? 1 : 0 }} transition=${{ duration: 0.4 }} />
    <button className="stage-close" aria-label="Put the book back" onClick=${(e) => { e.stopPropagation(); requestClose(); }}>×</button>
    <div className="stage-anchor" onClick=${(e) => e.stopPropagation()}>
      <${motion.div} className="book3d" style=${{ left: -W / 2, top: -H / 2, width: W, height: H }}
        variants=${variants} initial="launch" animate=${phase} onAnimationComplete=${onPoseDone}>
        <div className="face page-edge" style=${{ ...faceBox, transform: `translateZ(${-D / 2}px) rotateY(180deg)`, background: '#2a1a10' }}>
          <${CoverArt} book=${book} width=${W} height=${H} /></div>
        <div className="face" style=${{ left: (W - D) / 2, top: 0, width: D, height: H, transform: `translateX(${-W / 2}px) rotateY(-90deg)` }}>
          <${SpineArt} book=${book} width=${D} height=${H} /></div>
        <div className="face page-edge" style=${{ left: (W - D) / 2, top: 0, width: D, height: H, transform: `translateX(${W / 2}px) rotateY(90deg)` }} />
        <div className="face page-edge h" style=${{ left: 0, top: (H - D) / 2, width: W, height: D, transform: `translateY(${-H / 2}px) rotateX(90deg)` }} />
        <div className="face page-edge h" style=${{ left: 0, top: (H - D) / 2, width: W, height: D, transform: `translateY(${H / 2}px) rotateX(-90deg)` }} />
        <div className="face" style=${{ ...faceBox, transform: `translateZ(${D / 2 - 1}px)`, fontSize: pageFontSize }}>
          <${StatsPage} book=${book} allBooks=${allBooks} today=${today} /></div>
        <div style=${{ ...faceBox, position: 'absolute', transformStyle: 'preserve-3d', transform: `translateZ(${D / 2}px)` }}>
          <${motion.div} style=${{ position: 'absolute', inset: 0, transformOrigin: '0% 50%', transformStyle: 'preserve-3d' }}
            animate=${{ rotateY: coverOpen ? OPEN_ANGLE_DEG : 0 }} transition=${OPEN_SPRING}>
            <div className="face cover-face" style=${faceBox} onClick=${openCover}>
              <${CoverArt} book=${book} width=${W} height=${H} /><div className="cover-sheen" /><div className="cover-crease" /></div>
            <div className="face" style=${{ ...faceBox, transform: 'rotateY(180deg)', fontSize: pageFontSize }}><${SummaryPage} book=${book} /></div>
          <//>
        </div>
      <//>
    </div>
    <div className="stage-hint">${phase === 'display' && !coverOpen ? 'Tap the cover to open' : phase === 'open' ? 'Tap outside to put it back' : ''}</div>
  </div>`;
}
