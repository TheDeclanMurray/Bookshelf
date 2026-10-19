/**
 * book3d.js
 * A book as a CSS 3D box: back cover, spine, page edges, and a front cover that swings
 * open on its spine side. Used by the stage (big, opens to pages) and by the reading
 * stand (small, closed). The parent supplies the sizing element and `preserve-3d`.
 */

// ----------------------------------------------------------------- constants
const OPEN_ANGLE_DEG = -180;                              // how far the front cover swings
const COVER_SPRING = { type: 'spring', stiffness: 200, damping: 24, mass: 0.9 };
const COVER_CLOSE = { duration: 0.2, ease: [0.4, 0, 0.2, 1] };   // closing is quick so the book can move straight after
const PAGE_FONT_RATIO = 0.068;                            // page text size as a fraction of the book width

/**
 * The faces of one book.
 * @param {{book: Object, allBooks: Object[], today: string, W: number, H: number, D: number,
 *   coverOpen: boolean, closing: boolean, onCoverClick: function, onCoverSettled: function,
 *   withPages: boolean, coverExtras: *}} props
 *   W, H, D are width, height and thickness in px; spineUnit is px per spine design unit (omit to derive from H); withPages draws the printed pages
 *   (the stand does not need them); coverExtras is drawn on the front cover (e.g. a tap hint)
 * @returns {React.ReactElement} Fragment of positioned faces
 */
function BookBox({ book, allBooks, today, W, H, D, spineUnit, coverOpen, closing, onCoverClick, onCoverSettled, withPages, coverExtras }) {
  const faceBox = { left: 0, top: 0, width: W, height: H };
  const pageFontSize = W * PAGE_FONT_RATIO;               // page text scales with the book
  return html`<${React.Fragment}>
    <div className="face page-edge" style=${{ ...faceBox, transform: `translateZ(${-D / 2}px) rotateY(180deg)`, background: '#2a1a10' }}>
      <${CoverArt} book=${book} width=${W} height=${H} /></div>
    <div className="face" style=${{ left: (W - D) / 2, top: 0, width: D, height: H, transform: `translateX(${-W / 2}px) rotateY(-90deg)` }}>
      <${SpineArt} book=${book} width=${D} height=${H} unit=${spineUnit || H / SL.SPINE_BASE_HEIGHT_PX} /></div>
    <div className="face page-edge" style=${{ left: (W - D) / 2, top: 0, width: D, height: H, transform: `translateX(${W / 2}px) rotateY(90deg)` }} />
    <div className="face page-edge h" style=${{ left: 0, top: (H - D) / 2, width: W, height: D, transform: `translateY(${-H / 2}px) rotateX(90deg)` }} />
    <div className="face page-edge h" style=${{ left: 0, top: (H - D) / 2, width: W, height: D, transform: `translateY(${H / 2}px) rotateX(-90deg)` }} />
    ${withPages && html`<div className="face" style=${{ ...faceBox, transform: `translateZ(${D / 2 - 1}px)`, fontSize: pageFontSize }}>
      <${StatsPage} book=${book} allBooks=${allBooks} today=${today} /></div>`}
    <div style=${{ ...faceBox, position: 'absolute', transformStyle: 'preserve-3d', transform: `translateZ(${D / 2}px)` }}>
      <${motion.div} style=${{ position: 'absolute', inset: 0, transformOrigin: '0% 50%', transformStyle: 'preserve-3d' }}
        animate=${{ rotateY: coverOpen ? OPEN_ANGLE_DEG : 0 }} transition=${closing ? COVER_CLOSE : COVER_SPRING} onAnimationComplete=${onCoverSettled}>
        <div className="face cover-face" style=${faceBox} onClick=${onCoverClick} onPointerDown=${noteTapStart}>
          <${CoverArt} book=${book} width=${W} height=${H} /><div className="cover-sheen" /><div className="cover-crease" />${coverExtras}</div>
        ${withPages && html`<div className="face" style=${{ ...faceBox, transform: 'rotateY(180deg)', fontSize: pageFontSize }}><${SummaryPage} book=${book} /></div>`}
      <//>
    </div>
  <//>`;
}
