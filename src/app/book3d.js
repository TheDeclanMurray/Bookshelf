import { React, SL, html, memo, noteTapStart } from './reactSetup';
import { CoverArt, SpineImage } from './art';
import { StatsPage, SummaryPage } from './bookPages';

/**
 * book3d.js
 * A book as a CSS 3D box: back cover, spine, page edges, and a front cover that swings
 * open on its spine side. Used by the stage (big, opens to pages) and by the reading
 * stand (small, closed). The parent supplies the sizing element and `preserve-3d`.
 */

// ----------------------------------------------------------------- constants
const PAGE_FONT_RATIO = 0.068;                            // page text size as a fraction of the book width

/**
 * The faces of one book. Memoized: the stage's hint text changing does not redraw the whole book.
 * @param {{book: Object, allBooks: Object[], today: string, W: number, H: number, D: number,
 *   hingeRef: Object, onCoverClick: function, withPages: boolean, coverExtras: *}} props
 *   W, H, D are width, height and thickness in px; spineUnit is px per spine design unit (omit to derive from H); withPages draws the printed pages
 *   (the stand does not need them); hingeRef receives the element that swings the cover (turn it with rotateY, 0 to -180 degrees); coverExtras is drawn on the front cover (e.g. a tap hint)
 * @returns {React.ReactElement} Fragment of positioned faces
 */
const BookBox = memo(function BookBox({ book, allBooks, today, W, H, D, spineUnit, hingeRef, onCoverClick, withPages, coverExtras }) {
  const faceBox = { left: 0, top: 0, width: W, height: H };
  const pageFontSize = W * PAGE_FONT_RATIO;               // page text scales with the book
  return html`<${React.Fragment}>
    <div className="face page-edge" style=${{ ...faceBox, transform: `translateZ(${-D / 2}px) rotateY(180deg)`, background: '#2a1a10' }}>
      <${CoverArt} book=${book} width=${W} height=${H} /></div>
    <div className="face" data-face="spine" style=${{ left: (W - D) / 2, top: 0, width: D, height: H, transform: `translateX(${-W / 2}px) rotateY(-90deg)` }}>
      <${SpineImage} book=${book} width=${D} height=${H} unit=${spineUnit || H / SL.SPINE_BASE_HEIGHT_PX} persist=${false} /></div>
    <div className="face page-edge" style=${{ left: (W - D) / 2, top: 0, width: D, height: H, transform: `translateX(${W / 2}px) rotateY(90deg)` }} />
    <div className="face page-edge h" style=${{ left: 0, top: (H - D) / 2, width: W, height: D, transform: `translateY(${-H / 2}px) rotateX(90deg)` }} />
    <div className="face page-edge h" style=${{ left: 0, top: (H - D) / 2, width: W, height: D, transform: `translateY(${H / 2}px) rotateX(-90deg)` }} />
    ${withPages && html`<div className="face" style=${{ ...faceBox, transform: `translateZ(${D / 2 - 1}px)`, fontSize: pageFontSize }}>
      <${StatsPage} book=${book} allBooks=${allBooks} today=${today} /></div>`}
    <div style=${{ ...faceBox, position: 'absolute', transformStyle: 'preserve-3d', transform: `translateZ(${D / 2}px)` }}>
      <div ref=${hingeRef} className="hinge">
        <div className="face cover-face" data-face="cover" style=${faceBox} onClick=${onCoverClick} onPointerDown=${noteTapStart}>
          <${CoverArt} book=${book} width=${W} height=${H} /><div className="cover-sheen" /><div className="cover-crease" />${coverExtras}</div>
        ${withPages && html`<div className="face" style=${{ ...faceBox, transform: 'rotateY(180deg)', fontSize: pageFontSize }}><${SummaryPage} book=${book} /></div>`}
      </div>
    </div>
  <//>`;});

export { PAGE_FONT_RATIO, BookBox };
