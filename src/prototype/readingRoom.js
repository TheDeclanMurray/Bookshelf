/**
 * readingRoom.js
 * The start screen: the book you are reading, resting on an ornate lectern (stand)
 * or lying on a desk beside a lamp. A toggle switches between the two so both
 * can be judged in the prototype.
 */

// ----------------------------------------------------------------- constants
const READING_COVER_W = 150;                              // cover size on the stand and desk, in frame px
const READING_COVER_H = 225;
const STAND_TILT_DEG = 9;                                 // how far the book leans back on the lectern
const DESK_TILT_DEG = 58;                                 // how flat the book lies on the desk
const DESK_GRAIN_XS = Array.from({ length: 13 }, (_, i) => -60 + i * 40);   // desk grain line start positions

/**
 * Lectern illustration: carved wooden stand with brass ledge, drawn behind the book.
 * @returns {React.ReactElement} SVG scene
 */
function StandScene() {
  const wood = { fill: 'url(#wood)' };
  const foot = (flip) => html`<path d=${flip ? 'M 180 410 C 210 410 240 418 264 446 C 270 452 260 456 250 452 C 226 440 204 436 180 436 Z'
    : 'M 180 410 C 150 410 120 418 96 446 C 90 452 100 456 110 452 C 134 440 156 436 180 436 Z'} ...${wood} stroke="rgba(0,0,0,.5)" />`;
  return html`<svg viewBox="0 0 360 470" aria-hidden="true">
    <defs>
      <linearGradient id="wood" x1="0" x2="1"><stop offset="0" stopColor="#3b1c0f" /><stop offset="0.35" stopColor="#7a3b22" /><stop offset="0.7" stopColor="#4a2314" /><stop offset="1" stopColor="#2a130a" /></linearGradient>
      <linearGradient id="brass" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#f1da9a" /><stop offset="0.5" stopColor="#b08a38" /><stop offset="1" stopColor="#e1c576" /></linearGradient>
      <radialGradient id="standGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#e9a45c" stopOpacity="0.28" /><stop offset="1" stopColor="#e9a45c" stopOpacity="0" /></radialGradient>
    </defs>
    <ellipse cx="180" cy="190" rx="200" ry="200" fill="url(#standGlow)" />
    <ellipse cx="180" cy="452" rx="124" ry="12" fill="rgba(0,0,0,.55)" />
    ${foot(false)}${foot(true)}
    <rect x="168" y="326" width="24" height="90" ...${wood} />
    <ellipse cx="180" cy="352" rx="21" ry="7" ...${wood} stroke="rgba(0,0,0,.45)" /><ellipse cx="180" cy="378" rx="16" ry="6" ...${wood} stroke="rgba(0,0,0,.45)" />
    <ellipse cx="180" cy="404" rx="23" ry="8" ...${wood} stroke="rgba(0,0,0,.45)" /><ellipse cx="180" cy="326" rx="32" ry="8" ...${wood} stroke="rgba(0,0,0,.5)" />
    <polygon points="62,300 298,300 276,258 84,258" fill="#52261a" stroke="rgba(0,0,0,.5)" />
    <rect x="62" y="300" width="236" height="16" rx="2" ...${wood} stroke="rgba(0,0,0,.5)" />
    <rect x="90" y="288" width="180" height="9" rx="2" fill="url(#brass)" stroke="rgba(0,0,0,.4)" />
    <circle cx="76" cy="308" r="2.6" fill="url(#brass)" /><circle cx="284" cy="308" r="2.6" fill="url(#brass)" />
    <path d="M 100 308 H 260" stroke="#d4af5f" strokeWidth="0.8" opacity="0.5" />
  </svg>`;
}

/**
 * Desk illustration: wooden desk top in perspective, lamp glow, tea, and glasses.
 * @returns {React.ReactElement} SVG scene
 */
function DeskScene() {
  return html`<svg viewBox="0 0 360 470" aria-hidden="true">
    <defs>
      <linearGradient id="deskTop" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6b3519" /><stop offset="1" stopColor="#2e160b" /></linearGradient>
      <linearGradient id="deskFade" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#130c08" stopOpacity="0" /><stop offset="1" stopColor="#130c08" stopOpacity="1" /></linearGradient>
      <linearGradient id="deskBrass" x1="0" x2="1"><stop offset="0" stopColor="#8f7236" /><stop offset="0.5" stopColor="#f1da9a" /><stop offset="1" stopColor="#8f7236" /></linearGradient>
      <radialGradient id="lampGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#ffd08a" stopOpacity="0.42" /><stop offset="1" stopColor="#ffd08a" stopOpacity="0" /></radialGradient>
      <filter id="blur6"><feGaussianBlur stdDeviation="6" /></filter>
    </defs>
    <rect x="-300" y="-300" width="960" height="556" fill="rgba(0,0,0,.18)" />
    <polygon points="0,252 360,252 424,470 -64,470" fill="url(#deskTop)" />
    <g stroke="rgba(0,0,0,.2)" strokeWidth="1.2">${DESK_GRAIN_XS.map((x) => html`<line key=${x} x1=${x} y1="470" x2=${180 + (x - 180) * 0.42} y2="252" />`)}</g>
    <path d="M 0 252 H 360" stroke="rgba(255,226,170,.22)" strokeWidth="1.5" />
    <polygon points="96,176 142,170 340,320 130,320" fill="rgba(255,214,150,.09)" />
    <rect x="-140" y="400" width="640" height="75" fill="url(#deskFade)" />
    <ellipse cx="190" cy="380" rx="96" ry="26" fill="rgba(0,0,0,.55)" filter="url(#blur6)" />
    <ellipse cx="58" cy="270" rx="24" ry="6.5" fill="#1a0f09" /><ellipse cx="58" cy="267" rx="22" ry="5.5" fill="url(#deskBrass)" />
    <path d="M 58 266 V 192 L 98 154" stroke="url(#deskBrass)" strokeWidth="4.5" fill="none" strokeLinecap="round" />
    <polygon points="70,140 132,126 142,168 84,180" fill="#1f5a45" stroke="#0f2f25" /><ellipse cx="112" cy="174" rx="26" ry="5" fill="#ffe2b0" opacity="0.85" />
    <circle cx="110" cy="176" r="190" fill="url(#lampGlow)" />
    <path d="M 290 304 L 290 274 Q 290 266 298 266 L 326 266 Q 334 266 334 274 L 334 304 Q 334 312 312 312 Q 290 312 290 304 Z" fill="#e9dfc6" stroke="rgba(0,0,0,.4)" />
    <path d="M 334 276 Q 352 276 350 292 Q 348 304 334 302" fill="none" stroke="#e9dfc6" strokeWidth="4" /><ellipse cx="312" cy="266" rx="22" ry="5" fill="#5a3118" />
    <path className="steam" d="M 304 258 q -6 -10 0 -18 q 6 -8 0 -16" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2.5" strokeLinecap="round" />
    <path className="steam b" d="M 318 258 q -6 -10 0 -18 q 6 -8 0 -16" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="2.5" strokeLinecap="round" />
    <g fill="rgba(255,255,255,.07)" stroke="#d4af5f" strokeWidth="1.6"><ellipse cx="262" cy="428" rx="15" ry="9" /><ellipse cx="298" cy="426" rx="15" ry="9" />
      <path d="M 277 426 Q 280 422 283 426" fill="none" /><path d="M 247 426 L 232 418 M 313 424 L 330 416" fill="none" /></g>
  </svg>`;
}

/**
 * The reading screen.
 * @param {{room: Object, style: string, onStyle: function, pickedId: (string|null), onPickReading: function, today: string}} props
 *   room.book is the current book or null; style is 'stand' or 'desk'; onPickReading(book, element, kind)
 *   opens the book; today is YYYY-MM-DD for the day count
 * @returns {React.ReactElement} Reading room element
 */
function ReadingRoom({ room, style, onStyle, pickedId, onPickReading, today }) {
  const book = room.book;
  const isDesk = style === 'desk';
  const days = book && book.startedAt ? SL.daysBetween(book.startedAt, today) : 0;
  const coverTop = isDesk ? 238 : 67;                      // where the cover sits inside the scene
  const handleClick = (event) => {
    if (DragGuard.dragging) return;                        // ignore the tap that ends a swipe
    onPickReading(book, event.currentTarget, isDesk ? 'desk' : 'stand');
  };
  return html`<div className="reading case" data-theme="mahogany">
    <div className="reading-label">Currently Reading</div>
    <div className="style-toggle" role="group" aria-label="Where the book rests">
      <button aria-pressed=${!isDesk} onClick=${() => onStyle('stand')}>Stand</button>
      <button aria-pressed=${isDesk} onClick=${() => onStyle('desk')}>Desk</button>
    </div>
    <div className="scene">
      ${isDesk ? html`<${DeskScene} />` : html`<${StandScene} />`}
      ${book && html`<button className=${'reading-book' + (pickedId === book.id ? ' is-out' : '')}
        aria-label=${`Open ${book.title}`} onClick=${handleClick}
        style=${{ left: (360 - READING_COVER_W) / 2, top: coverTop, width: READING_COVER_W, height: READING_COVER_H,
          transformOrigin: isDesk ? '50% 50%' : '50% 100%', transform: `rotateX(${isDesk ? DESK_TILT_DEG : STAND_TILT_DEG}deg)`,
          boxShadow: '0 10px 22px rgba(0,0,0,.6)' }}>
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
