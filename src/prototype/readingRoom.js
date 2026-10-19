/**
 * readingRoom.js
 * The start screen: the book you are reading, resting on an intricately carved
 * marble lectern with a brass ledge. The stand is drawn in SVG (marble veining
 * comes from an SVG noise filter); the book is a real element so tapping it can
 * lift it onto the stage.
 */

// ----------------------------------------------------------------- constants
const READING_COVER_W = 150;                              // cover size on the stand, in frame px
const READING_COVER_H = 225;
const STAND_TILT_DEG = 9;                                 // how far the book leans back on the lectern
const READING_COVER_TOP = 33;                             // where the cover sits inside the scene
const CARVE = 'rgba(64, 68, 80, 0.62)';                   // carved grooves
const HIGHLIGHT = 'rgba(255, 255, 255, 0.8)';             // light catching a carved edge
const FLUTE_XS = [168, 172.5, 177, 181.5, 186, 190.5, 195];   // column flute positions
const EGG_XS = Array.from({ length: 7 }, (_, i) => 149 + i * 10.3);   // egg-and-dart molding under the capital
const STAND_DENTIL_XS = Array.from({ length: 21 }, (_, i) => 70 + i * 11.2); // small blocks under the slab
const BEAD_XS = Array.from({ length: 31 }, (_, i) => 62 + i * 8.2);   // row of beads along the slab's edge

/**
 * An Ionic scroll (volute) made of nested arcs.
 * @param {{cx: number, cy: number, flip: boolean}} props - Center, and whether to mirror it
 * @returns {React.ReactElement} SVG group
 */
function Volute({ cx, cy, flip }) {
  const dir = flip ? -1 : 1;
  const sweep = flip ? 0 : 1;                             // arcs turn the other way when mirrored
  return html`<g fill="none" stroke=${CARVE} strokeWidth="1.1">
    <circle cx=${cx} cy=${cy} r="11" fill="url(#marbleFace)" stroke=${CARVE} />
    <path d=${`M ${cx + 9 * dir} ${cy - 2} a 9 9 0 1 ${sweep} ${-9 * dir} -7 a 6 6 0 1 ${sweep} ${6 * dir} 6 a 3.2 3.2 0 1 ${sweep} ${-3 * dir} -3`} />
    <circle cx=${cx} cy=${cy} r="1.6" fill="#d9b865" stroke="none" />
    <circle cx=${cx} cy=${cy} r="11" stroke=${HIGHLIGHT} strokeWidth="0.6" transform=${`translate(-0.6 -0.6)`} opacity="0.7" />
  </g>`;
}

/**
 * The marble lectern drawn behind the book: stepped plinth, fluted baluster column,
 * Ionic capital, carved relief panel, and a brass ledge for the book to rest on.
 * @returns {React.ReactElement} SVG scene
 */
function MarbleStand() {
  return html`<svg viewBox="0 0 360 470" aria-hidden="true">
    <defs>
      <linearGradient id="marbleFace" x1="0" x2="1"><stop offset="0" stopColor="#b8bcc4" /><stop offset="0.2" stopColor="#ebe9e5" /><stop offset="0.5" stopColor="#f8f6f2" /><stop offset="0.82" stopColor="#dcdad6" /><stop offset="1" stopColor="#a4a8b0" /></linearGradient>
      <linearGradient id="marbleTop" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#d6d4cf" /><stop offset="1" stopColor="#fbf9f5" /></linearGradient>
      <linearGradient id="marbleShade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f5f3ef" /><stop offset="1" stopColor="#bdc0c7" /></linearGradient>
      <radialGradient id="marbleBall" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#aeb2ba" /></radialGradient>
      <linearGradient id="standBrass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f1da9a" /><stop offset="0.5" stopColor="#b08a38" /><stop offset="1" stopColor="#e1c576" /></linearGradient>
      <radialGradient id="standGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#e9a45c" stopOpacity="0.26" /><stop offset="1" stopColor="#e9a45c" stopOpacity="0" /></radialGradient>
      <filter id="marbleVeins" x="-5%" y="-5%" width="110%" height="110%">
        <feTurbulence type="turbulence" baseFrequency="0.011 0.03" numOctaves="4" seed="12" result="noise" />
        <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0.36  0 0 0 0 0.39  0 0 0 0 0.44  1 0 0 0 0" result="tinted" />
        <feComponentTransfer in="tinted" result="veinAlpha"><feFuncA type="table" tableValues="0.85 0.3 0 0 0 0 0" /></feComponentTransfer>
        <feComposite in="veinAlpha" in2="SourceAlpha" operator="in" result="veins" />
        <feMerge><feMergeNode in="SourceGraphic" /><feMergeNode in="veins" /></feMerge>
      </filter>
    </defs>
    <ellipse cx="180" cy="190" rx="200" ry="200" fill="url(#standGlow)" />
    <ellipse cx="180" cy="466" rx="140" ry="11" fill="rgba(0,0,0,.6)" />

    <g filter="url(#marbleVeins)">
      <rect x="88" y="452" width="184" height="13" rx="3" fill="url(#marbleFace)" />
      <rect x="106" y="442" width="148" height="11" rx="3" fill="url(#marbleFace)" />
      <rect x="124" y="430" width="112" height="13" rx="2" fill="url(#marbleFace)" />
      <ellipse cx="180" cy="427" rx="42" ry="8" fill="url(#marbleFace)" /><ellipse cx="180" cy="416" rx="35" ry="7" fill="url(#marbleFace)" />
      <path d="M 160 414 C 163 394 164 366 166 334 L 194 334 C 196 366 197 394 200 414 Z" fill="url(#marbleFace)" />
    </g>
    <g fill="none" stroke=${CARVE} strokeWidth="0.9">
      <path d="M 88 452 H 272 M 106 442 H 254 M 124 430 H 236" stroke=${HIGHLIGHT} strokeWidth="1" />
      <ellipse cx="180" cy="427" rx="42" ry="8" /><ellipse cx="180" cy="416" rx="35" ry="7" />
      ${FLUTE_XS.map((x) => html`<path key=${x} d=${`M ${x} 340 C ${x + (x - 180) * 0.04} 372 ${x + (x - 180) * 0.1} 398 ${x + (x - 180) * 0.2} 411`} />`)}
      <path d="M 160 412 C 172 418 188 418 200 412" /><path d="M 165 340 C 175 344 185 344 195 340" />
      <ellipse cx="180" cy="352" rx="15.2" ry="2.6" /><ellipse cx="180" cy="376" rx="16.6" ry="2.7" /><ellipse cx="180" cy="398" rx="18.4" ry="2.8" />
    </g>

    <g transform="translate(0 -34)">
      <g filter="url(#marbleVeins)">
        <rect x="146" y="355" width="68" height="13" rx="4" fill="url(#marbleFace)" />
        <rect x="120" y="344" width="120" height="12" rx="2" fill="url(#marbleFace)" />
        <circle cx="130" cy="364" r="11" fill="url(#marbleFace)" /><circle cx="230" cy="364" r="11" fill="url(#marbleFace)" />
        <rect x="158" y="330" width="44" height="15" rx="2" fill="url(#marbleFace)" />
        <path d="M 58 318 H 302 C 296 326 270 328 250 330 H 110 C 90 328 64 326 58 318 Z" fill="url(#marbleShade)" />
        <rect x="50" y="300" width="260" height="19" rx="2" fill="url(#marbleFace)" />
        <polygon points="50,300 310,300 286,254 74,254" fill="url(#marbleTop)" />
        <circle cx="56" cy="296" r="8" fill="url(#marbleBall)" /><circle cx="304" cy="296" r="8" fill="url(#marbleBall)" />
      </g>
      <g fill="none" stroke=${CARVE} strokeWidth="0.9">
        <rect x="146" y="355" width="68" height="13" rx="4" />
        <rect x="120" y="344" width="120" height="12" rx="2" /><path d="M 124 347 H 236" stroke=${HIGHLIGHT} />
        ${EGG_XS.map((x) => html`<g key=${x}><ellipse cx=${x} cy="361" rx="3.5" ry="4.6" /><path d=${`M ${x - 5} 366 L ${x} 363 L ${x + 5} 366`} /></g>`)}
        <rect x="158" y="330" width="44" height="15" rx="2" /><path d="M 162 335 H 198 M 162 340 H 198" />
        <path d="M 58 318 H 302 C 296 326 270 328 250 330 H 110 C 90 328 64 326 58 318 Z" />
        ${STAND_DENTIL_XS.map((x) => html`<rect key=${x} x=${x} y="321" width="5.5" height="4.6" fill=${CARVE} stroke="none" />`)}
        <rect x="50" y="300" width="260" height="19" rx="2" />
        <polygon points="50,300 310,300 286,254 74,254" /><path d="M 60 296 L 82 258 M 300 296 L 278 258" opacity="0.4" />
      </g>
      <${Volute} cx=${130} cy=${364} flip=${false} /><${Volute} cx=${230} cy=${364} flip=${true} />

      <rect x="60" y="304" width="240" height="11" rx="2" fill="none" stroke=${CARVE} strokeWidth="0.9" />
      <g fill="none" stroke=${CARVE} strokeWidth="1.1" strokeLinecap="round">
        <path d="M 70 309.5 C 80 303 92 303 100 309 S 118 316 128 309.5 S 140 304 152 309" /><path d="M 290 309.5 C 280 303 268 303 260 309 S 242 316 232 309.5 S 220 304 208 309" />
        <circle cx="70" cy="309.5" r="2.2" /><circle cx="290" cy="309.5" r="2.2" />
        <ellipse cx="88" cy="305.4" rx="3.2" ry="1.6" transform="rotate(-20 88 305.4)" /><ellipse cx="116" cy="313.6" rx="3.2" ry="1.6" transform="rotate(20 116 313.6)" />
        <ellipse cx="272" cy="305.4" rx="3.2" ry="1.6" transform="rotate(20 272 305.4)" /><ellipse cx="244" cy="313.6" rx="3.2" ry="1.6" transform="rotate(-20 244 313.6)" />
      </g>
      <g stroke=${CARVE} strokeWidth="0.8" fill="rgba(255,255,255,.35)">
        ${[0, 45, 90, 135].map((a) => html`<ellipse key=${a} cx="180" cy="309.5" rx="7" ry="2.6" transform=${`rotate(${a} 180 309.5)`} />`)}
        <circle cx="180" cy="309.5" r="2.4" fill="#d9b865" />
      </g>
      <g fill=${HIGHLIGHT}>${BEAD_XS.map((x) => html`<circle key=${x} cx=${x} cy="301.6" r="1.35" />`)}</g>

      <rect x="88" y="290" width="184" height="9" rx="2" fill="url(#standBrass)" stroke="rgba(0,0,0,.4)" />
      <ellipse cx="56" cy="296" rx="8.6" ry="2.2" fill="none" stroke="url(#standBrass)" strokeWidth="1.8" /><ellipse cx="304" cy="296" rx="8.6" ry="2.2" fill="none" stroke="url(#standBrass)" strokeWidth="1.8" />
    </g>
  </svg>`;
}

/**
 * The reading screen.
 * @param {{room: Object, pickedId: (string|null), onPickReading: function, today: string}} props
 *   room.book is the current book or null; onPickReading(book, element) opens the book;
 *   today is YYYY-MM-DD for the day count
 * @returns {React.ReactElement} Reading room element
 */
function ReadingRoom({ room, pickedId, onPickReading, today }) {
  const book = room.book;
  const days = book && book.startedAt ? SL.daysBetween(book.startedAt, today) : 0;
  const handleClick = (event) => {
    if (!isRealTap(event)) return;                         // ignore the touch that ends a swipe
    onPickReading(book, event.currentTarget);
  };
  return html`<div className="reading case" data-theme="mahogany">
    <div className="reading-label">Currently Reading</div>
    <div className="scene">
      <${MarbleStand} />
      ${book && html`<button className=${'reading-book' + (pickedId === book.id ? ' is-out' : '')}
        aria-label=${`Open ${book.title}`} onPointerDown=${noteTapStart} onClick=${handleClick}
        style=${{ left: (360 - READING_COVER_W) / 2, top: READING_COVER_TOP, width: READING_COVER_W, height: READING_COVER_H,
          transformOrigin: '50% 100%', transform: `rotateX(${STAND_TILT_DEG}deg)`, boxShadow: '0 10px 22px rgba(0,0,0,.6)' }}>
        <${CoverArt} book=${book} width=${READING_COVER_W} height=${READING_COVER_H} />
        <div className="cover-sheen" /><div className="cover-crease" /><span className="tap-ring" />
      </button>`}
    </div>
    ${book ? html`<div className="reading-info">
      <div className="reading-title">${book.title}</div>
      <div className="reading-author">${book.author}</div>
      <div className="reading-meta">Day ${days + 1} · started ${SL.formatShortDate(book.startedAt)}${book.series ? ' · ' + SL.seriesLabel(book) : ''}</div>
    </div>` : html`<div className="reading-empty">The stand is empty. Pull something from your To Be Read shelf.</div>`}
  </div>`;
}
