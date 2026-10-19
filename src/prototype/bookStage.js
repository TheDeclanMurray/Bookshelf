/**
 * bookStage.js
 * The overlay where a book is pulled out and opened. The book is a real CSS 3D
 * box (cover, spine, page edges, back) animated with the Web Animations API:
 *   shelf spine -> (one smooth motion) -> turned to show the cover -> cover swings open.
 * The rest of the screen fades at the same time. Closing shuts the cover, then slides
 * the book back to the spine's slot in one smooth motion.
 */

// ----------------------------------------------------------------- constants
const STAGE_ANCHOR_Y = 0.46;                              // vertical anchor of the stage, as a fraction of screen height
const STAGE_PERSPECTIVE_PX = 1300;                        // how strongly the 3D book converges; the pose solver uses the same number
const SOLVE_PASSES = 3;                                   // shelf launches refine the book's thickness this many times
const BOOK_MIN_W = 150;                                   // smallest book width on the stage (px)
const BOOK_MAX_W = 240;                                   // largest book width on the stage (px)
const BOOK_ASPECT = 1.5;                                  // book height / width
const PULL_DEPTH_PX = 90;                                 // how far the book swings toward you on the way out
const DISPLAY_TILT_Y = 22;                                // turn that keeps a little spine visible beside the cover
const DISPLAY_TILT_X = -4;
const PULL_OUT_MS = 520;                                  // slot -> display pose
const OPEN_MS = 560;                                      // cover swing and recentering
const COVER_CLOSE_MS = 240;                               // closing the cover before the book moves
const COVER_CLOSE_OVERLAP = 0.7;                          // the book starts moving when the cover is this far through closing
const PUT_BACK_MS = 380;                                  // display (or open) pose -> slot
const HINT_OPEN = 'Tap the cover to open';
const HINT_CLOSE = 'Tap outside to put it back';
const COVER_CLOSED = 'rotateY(0deg)';
const COVER_OPEN = 'rotateY(-180deg)';
const LIFT_FLAT = 'translateZ(0px)';

/**
 * The four corners (book-center coordinates, y down, z toward the viewer) of the part of the
 * 3D book that sits on the real object: the spine for a shelf book, the front cover for a stand book.
 * Listed top-left, top-right, bottom-right, bottom-left as seen on screen.
 * @param {string} kind - 'shelf' or 'stand'
 * @param {number} W - Book width
 * @param {number} H - Book height
 * @param {number} D - Book thickness
 * @returns {number[][]} Four [x, y, z] corners
 */
function launchFaceCorners(kind, W, H, D) {
  if (kind === 'shelf') return [[-W / 2, -H / 2, -D / 2], [-W / 2, -H / 2, D / 2], [-W / 2, H / 2, D / 2], [-W / 2, H / 2, -D / 2]];
  return [[-W / 2, -H / 2, D / 2], [W / 2, -H / 2, D / 2], [W / 2, H / 2, D / 2], [-W / 2, H / 2, D / 2]];
}

/**
 * Finds the pose (and thickness) that puts the 3D book exactly over the real spine or stand book,
 * including the effect of perspective, so nothing jumps when the stage opens or closes.
 * @param {{launch: Object, W: number, H: number, anchorX: number, anchorY: number}} input
 *   launch holds the measured screen corners of the real object ({corners, rect, rotateX, rotateY, ...})
 * @returns {{pose: Object, D: number}} Launch pose for poseTransform() and the book thickness to build with
 */
function solveLaunchPose({ launch, W, H, anchorX, anchorY }) {
  const targets = launch.corners.flatMap(([x, y]) => [x - anchorX, y - anchorY]);   // relative to the perspective origin
  const isShelf = launch.kind === 'shelf';
  const solve = (D, initial, free) => PoseSolver.solvePose({ corners: launchFaceCorners(launch.kind, W, H, D), targets, initial, free, perspective: STAGE_PERSPECTIVE_PX });
  const center = { x: launch.rect.cx - anchorX, y: launch.rect.cy - anchorY };
  if (!isShelf) {
    const D = W * launch.depthRatio;                      // same proportions as the book on the stand
    const initial = { ...center, scale: (launch.designScale * launch.designW) / W, rotateX: launch.rotateX, rotateY: launch.rotateY };
    return { pose: solve(D, { ...initial, rotateZ: 0 }, ['x', 'y', 'scale', 'rotateX', 'rotateY', 'rotateZ']).pose, D };   // the stand's stacked turns need a roll too
  }
  // A spine: height and position fix the scale; its on-screen width then fixes the book's thickness
  let D = Math.max(16, launch.thicknessPx / (launch.rect.h / H));
  let pose = { ...center, scale: launch.rect.h / H, rotateX: launch.rotateX, rotateY: launch.rotateY };
  for (let pass = 0; pass < SOLVE_PASSES; pass++) {
    pose = solve(D, pose, ['x', 'y', 'scale']).pose;
    const projected = PoseSolver.projectCorners(launchFaceCorners('shelf', W, H, D), pose, STAGE_PERSPECTIVE_PX);
    D = Math.max(16, D * (targets[2] - targets[0]) / (projected[2] - projected[0]));
  }
  return { pose: solve(D, pose, ['x', 'y', 'scale']).pose, D };
}

/**
 * The three resting poses of the book on the stage.
 * @param {Object} geo - {launchPose, W, openScale, displayScale}
 * @returns {{launch: Object, display: Object, open: Object}} Poses for poseTransform()
 */
function buildPoses(geo) {
  const { launchPose, W, openScale, displayScale } = geo;
  return {
    launch: launchPose,
    display: { x: 0, y: 0, scale: displayScale, rotateX: DISPLAY_TILT_X, rotateY: DISPLAY_TILT_Y },
    open: { x: (openScale * W) / 2, y: 0, scale: openScale, rotateX: 0, rotateY: 0 },
  };
}

/**
 * Full-screen stage that shows one book coming off the shelf and opening.
 * All movement is played with the Web Animations API (see stageMotion.js), so it keeps
 * running smoothly even if the page is busy.
 * @param {{book: Object, allBooks: Object[], today: string, launch: Object, vp: {w: number, h: number}, onReturning: function, onClose: function}} props
 *   launch describes where the book starts: {kind: 'shelf'|'stand', rect: {cx, cy, w, h}, thicknessPx, rotateX, rotateY, ...};
 *   onReturning runs when the put-back motion starts (the stand shows its book again); onClose runs once the book is back in place
 * @returns {React.ReactElement} Stage overlay
 */
function BookStage({ book, allBooks, today, launch, vp, onReturning, onClose }) {
  const isShelf = launch.kind === 'shelf';
  const [hint, setHint] = useState('');
  const [pagesReady, setPagesReady] = useState(false);    // the printed pages mount after the pull-out, so they cost nothing during it
  const phaseRef = useRef('launching');                   // launching | display | opening | open | closing
  const poseRef = useRef(null);                           // moves, scales and turns the whole book
  const liftRef = useRef(null);                           // swings the book toward you and back
  const hingeRef = useRef(null);                          // swings the front cover
  const dimRef = useRef(null);

  // Book size on the stage; the launch pose and thickness are solved so the book lands exactly on the real object
  const W = SL.clamp((vp.w - 24) / 2, BOOK_MIN_W, BOOK_MAX_W);
  const H = Math.round(W * BOOK_ASPECT);
  const anchorX = vp.w / 2;
  const anchorY = vp.h * STAGE_ANCHOR_Y;
  const { pose: launchPose, D } = useMemo(() => solveLaunchPose({ launch, W, H, anchorX, anchorY }), [launch, W, H, anchorX, anchorY]);
  const scale0 = launch.rect.h / H;                       // nominal size at the start, used for the spine's decoration scale
  const displayScale = Math.min(1.45, (vp.w - 48) / (W + D * 0.5), (vp.h * 0.6) / H);
  const openScale = Math.min(1.25, (vp.w - 16) / (2 * W), (vp.h * 0.8) / H);
  const poses = useMemo(() => buildPoses({ launchPose, W, openScale, displayScale }), [launchPose, W, openScale, displayScale]);
  const launchT = poseTransform(poses.launch);
  const displayT = poseTransform(poses.display);
  const openT = poseTransform(poses.open);

  // Pull the book out as soon as the stage exists
  useLayoutEffect(() => {
    const dim = dimRef.current;
    const book = poseRef.current;
    if (isShelf) book.classList.add('in-slot');           // page edges start in the shelf's shadow (see styles.css)
    requestAnimationFrame(() => { dim.classList.add('is-on'); book.classList.remove('in-slot'); });   // ...and brighten as the book comes out
    const hump = [   // out toward you and back: slows to a stop at the peak, so there is no kink
      { transform: LIFT_FLAT, easing: 'cubic-bezier(0.3, 0, 0.5, 1)' },
      { transform: `translateZ(${PULL_DEPTH_PX}px)`, offset: 0.4, easing: 'cubic-bezier(0.5, 0, 0.7, 1)' },
      { transform: LIFT_FLAT },
    ];
    poseRef.current.style.transform = launchT;            // in place before the first paint
    Promise.all([
      playMotion(poseRef.current, [{ transform: launchT }, { transform: displayT }], { duration: PULL_OUT_MS, easing: EASE_OUT }),
      playMotion(liftRef.current, hump, { duration: PULL_OUT_MS, easing: 'linear' }),
    ]).then(([moved]) => {
      if (!moved || phaseRef.current !== 'launching') return;   // interrupted by an early close
      phaseRef.current = 'display';
      setPagesReady(true);
      setHint(HINT_OPEN);
    });
    return () => { settleMotion(poseRef.current); settleMotion(liftRef.current); settleMotion(hingeRef.current); };
  }, []);

  /** Slides the book back into its slot and ends the stage. */
  const moveBack = (knownFrom) => {
    dimRef.current.classList.remove('is-on');
    if (isShelf) poseRef.current.classList.add('in-slot');   // darken the page edges again on the way back into the shadow
    if (!isShelf) onReturning();                          // the stand's book fades back in underneath
    playMotionTo(liftRef.current, { transform: LIFT_FLAT }, { duration: PUT_BACK_MS, easing: EASE_IN_OUT });
    playMotionTo(poseRef.current, { transform: launchT }, { duration: PUT_BACK_MS, easing: EASE_IN_OUT, from: knownFrom })
      .then((finished) => { if (finished) onClose(); });
  };

  /** Puts the book back: shuts the cover first if it is open, then slides the book home in one smooth motion. */
  const requestClose = () => {
    const was = phaseRef.current;
    if (was === 'closing') return;
    phaseRef.current = 'closing';
    setHint('');
    if (was === 'open' || was === 'opening') {
      const atRest = was === 'open';
      playMotionTo(hingeRef.current, { transform: COVER_CLOSED }, { duration: COVER_CLOSE_MS, easing: EASE_IN_OUT, from: atRest ? { transform: COVER_OPEN } : undefined });
      // The book starts moving just before the cover lands, so there is no dead pause between the two
      setTimeout(() => moveBack(atRest ? { transform: openT } : undefined), COVER_CLOSE_MS * COVER_CLOSE_OVERLAP);
    } else {
      moveBack(was === 'display' ? { transform: displayT } : undefined);
    }
  };

  /** Opens the cover and recenters the book so both pages are in view. */
  const openCover = useCallback((event) => {
    event.stopPropagation();
    if (phaseRef.current !== 'display') return;
    phaseRef.current = 'opening';
    setHint('');
    Promise.all([
      playMotion(hingeRef.current, [{ transform: COVER_CLOSED }, { transform: COVER_OPEN }], { duration: OPEN_MS, easing: EASE_OPEN }),
      playMotion(poseRef.current, [{ transform: displayT }, { transform: openT }], { duration: OPEN_MS, easing: EASE_OPEN }),
    ]).then(([swung]) => {
      if (swung && phaseRef.current === 'opening') { phaseRef.current = 'open'; setHint(HINT_CLOSE); }
    });
  }, [displayT, openT]);

  return html`<div className="stage" style=${{ perspective: STAGE_PERSPECTIVE_PX + 'px', perspectiveOrigin: `${anchorX}px ${anchorY}px` }} onClick=${requestClose}>
    <div className="stage-dim" ref=${dimRef} />
    <button className="stage-close" aria-label="Put the book back" onClick=${(e) => { e.stopPropagation(); requestClose(); }}>×</button>
    <div className="stage-anchor" onClick=${(e) => e.stopPropagation()}>
      <div className="book3d" ref=${poseRef} style=${{ left: -W / 2, top: -H / 2, width: W, height: H }}>
        <div className="book-lift" ref=${liftRef}>
          <${BookBox} book=${book} allBooks=${allBooks} today=${today} W=${W} H=${H} D=${D} spineUnit=${isShelf ? 1 / scale0 : undefined}
            hingeRef=${hingeRef} onCoverClick=${openCover} withPages=${pagesReady} />
        </div>
      </div>
    </div>
    <div className="stage-hint">${hint}</div>
  </div>`;
}
