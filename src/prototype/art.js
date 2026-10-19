/**
 * art.js
 * Drawn artwork for the prototype: generated covers and generated spines.
 * Real covers cannot be fetched inside the prototype, so each cover is a small
 * illustration colored from the book's hue. Spines are always generated, as in
 * the real app: color from the cover, font from the genre, thickness from pages.
 */

// ----------------------------------------------------------------- constants
const COVER_VIEW_W = 200;                                 // cover drawing coordinate width
const COVER_VIEW_H = 300;                                 // cover drawing coordinate height
const COVER_STARS = [[24, 150, 1.4], [170, 140, 1.2], [60, 176, 1], [150, 168, 1.6], [100, 152, 1], [36, 112, 1.2], [176, 98, 1.4]];

/**
 * Cover colors derived from a hue.
 * @param {number} hue - 0-360
 * @returns {{c1: string, c2: string, c3: string, dark: string, ink: string}} CSS colors
 */
function coverPalette(hue) {
  return {
    c1: `hsl(${hue}, 55%, 19%)`, c2: `hsl(${(hue + 22) % 360}, 58%, 36%)`,
    c3: `hsl(${(hue + 42) % 360}, 72%, 64%)`, dark: `hsl(${hue}, 50%, 9%)`, ink: '#f6ecd6',
  };
}

/**
 * The illustration on a cover, chosen by genre.
 * @param {{genre: string, pal: Object}} props - Genre key and cover palette
 * @returns {React.ReactElement} SVG group
 */
function CoverMotif({ genre, pal }) {
  const stars = COVER_STARS.map(([x, y, r], i) => html`<circle key=${i} cx=${x} cy=${y} r=${r} fill=${pal.ink} opacity="0.7" />`);
  switch (genre) {
    case 'fantasy': return html`<g>${stars}
      <circle cx="100" cy="188" r="40" fill=${pal.c3} opacity="0.95" />
      <circle cx="117" cy="178" r="37" fill=${pal.c2} opacity="0.6" />
      <polygon points="0,300 0,238 42,196 78,242 118,186 162,236 200,206 200,300" fill=${pal.dark} opacity="0.92" />
      <polygon points="0,300 0,264 50,234 96,268 146,242 200,272 200,300" fill=${pal.c1} /></g>`;
    case 'scifi': return html`<g>${stars}
      <circle cx="100" cy="200" r="48" fill=${pal.c3} opacity="0.9" />
      <circle cx="84" cy="188" r="44" fill=${pal.c2} opacity="0.55" />
      <ellipse cx="100" cy="204" rx="86" ry="14" fill="none" stroke=${pal.ink} strokeWidth="2" transform="rotate(-16 100 204)" opacity="0.8" />
      <rect x="0" y="262" width="200" height="38" fill=${pal.dark} /></g>`;
    case 'mystery': return html`<g>
      <circle cx="146" cy="130" r="22" fill=${pal.c3} opacity="0.9" /><circle cx="156" cy="124" r="20" fill=${pal.c1} />
      <rect x="10" y="190" width="34" height="110" fill=${pal.dark} /><rect x="48" y="170" width="28" height="130" fill=${pal.dark} />
      <rect x="80" y="205" width="40" height="95" fill=${pal.dark} /><rect x="124" y="180" width="30" height="120" fill=${pal.dark} />
      <rect x="158" y="198" width="34" height="102" fill=${pal.dark} />
      <rect x="18" y="204" width="6" height="8" fill=${pal.c3} /><rect x="56" y="188" width="6" height="8" fill=${pal.c3} />
      <rect x="132" y="196" width="6" height="8" fill=${pal.c3} /><rect x="96" y="222" width="6" height="8" fill=${pal.c3} /></g>`;
    case 'horror': return html`<g>
      <path d="M 28 210 Q 100 140 172 210 Q 100 270 28 210 Z" fill=${pal.c3} opacity="0.92" />
      <circle cx="100" cy="208" r="26" fill=${pal.dark} /><circle cx="100" cy="208" r="9" fill=${pal.c3} /></g>`;
    case 'romance': return html`<g>
      <circle cx="100" cy="196" r="52" fill=${pal.c3} opacity="0.92" /><circle cx="100" cy="196" r="38" fill=${pal.c2} opacity="0.5" />
      <path d="M 0 250 Q 50 230 100 250 T 200 250 V 300 H 0 Z" fill=${pal.dark} opacity="0.85" />
      <path d="M 0 272 Q 50 254 100 272 T 200 272 V 300 H 0 Z" fill=${pal.c1} /></g>`;
    case 'historical': return html`<g fill="none" stroke=${pal.c3} strokeWidth="1.6">
      <rect x="22" y="132" width="156" height="140" opacity="0.85" /><rect x="30" y="140" width="140" height="124" opacity="0.55" />
      <circle cx="100" cy="202" r="34" /><circle cx="100" cy="202" r="26" opacity="0.6" />
      <path d="M 100 168 V 236 M 66 202 H 134" opacity="0.7" /></g>`;
    case 'literary': return html`<g>
      <circle cx="82" cy="196" r="46" fill=${pal.c3} opacity="0.75" /><circle cx="122" cy="206" r="46" fill=${pal.c2} opacity="0.8" />
      <circle cx="100" cy="236" r="40" fill=${pal.dark} opacity="0.7" /></g>`;
    case 'nonfiction': return html`<g fill=${pal.c3}>
      <rect x="22" y="236" width="24" height="40" opacity="0.6" /><rect x="52" y="216" width="24" height="60" opacity="0.7" />
      <rect x="82" y="190" width="24" height="86" opacity="0.8" /><rect x="112" y="166" width="24" height="110" opacity="0.9" />
      <rect x="142" y="140" width="24" height="136" /><rect x="14" y="276" width="160" height="3" fill=${pal.ink} /></g>`;
    case 'biography': return html`<g>
      <circle cx="100" cy="200" r="58" fill=${pal.c3} opacity="0.9" />
      <circle cx="100" cy="184" r="19" fill=${pal.dark} />
      <path d="M 52 258 Q 52 218 100 214 Q 148 218 148 258 Z" fill=${pal.dark} /></g>`;
    case 'selfhelp': return html`<g stroke=${pal.c3} strokeWidth="3" strokeLinecap="round">
      <path d="M 100 246 L 100 168 M 100 246 L 54 176 M 100 246 L 146 176 M 100 246 L 28 214 M 100 246 L 172 214" opacity="0.9" />
      <path d="M 60 252 A 40 40 0 0 1 140 252 Z" fill=${pal.c3} stroke="none" /></g>`;
    default: return html`<g><circle cx="100" cy="200" r="50" fill=${pal.c3} opacity="0.85" /></g>`;
  }
}

/**
 * A generated book cover: gradient, genre illustration, title and author.
 * @param {{book: Object, width: number, height: number}} props - Book and size in px (2:3 ratio expected)
 * @returns {React.ReactElement} Cover element
 */
function CoverArt({ book, width, height }) {
  const genre = SL.genreOf(book);
  const pal = coverPalette(book.hue);
  const titleSize = width * SL.clamp(0.14 - book.title.length * 0.0023, 0.075, 0.12) * genre.fontScale;   // longer titles get smaller type
  return html`<div style=${{ position: 'absolute', inset: 0, width, height, overflow: 'hidden',
    background: `linear-gradient(180deg, ${pal.c1}, ${pal.c2} 78%, ${pal.c1})` }}>
    <svg viewBox=${`0 0 ${COVER_VIEW_W} ${COVER_VIEW_H}`} preserveAspectRatio="xMidYMid slice" style=${{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <${CoverMotif} genre=${book.genre} pal=${pal} />
    </svg>
    <div style=${{ position: 'absolute', inset: width * 0.035, border: `1px solid ${pal.ink}55`, pointerEvents: 'none' }} />
    <div style=${{ position: 'absolute', top: '8%', left: '9%', right: '9%', textAlign: 'center', color: pal.ink, fontFamily: genre.font,
      fontSize: titleSize, lineHeight: 1.12, fontWeight: 700, textShadow: '0 1px 3px rgba(0,0,0,.55)', maxHeight: '36%', overflow: 'hidden', textWrap: 'balance' }}>${book.title}</div>
    <div style=${{ position: 'absolute', bottom: '4.5%', left: 0, right: 0, textAlign: 'center', color: pal.ink, fontFamily: 'var(--font-display)',
      fontSize: width * 0.052, letterSpacing: '0.16em', textTransform: 'uppercase', textShadow: '0 1px 2px rgba(0,0,0,.6)' }}>${book.author}</div>
  </div>`;
}

/**
 * A spine, shown as the picture drawn once for this book (see spineCanvas.js). One <img> instead of
 * about eight live elements, and nothing to recompute on later visits.
 * @param {{book: Object, width: number, height: number, unit?: number, persist?: boolean}} props
 *   spine size in px, px per design unit (1 on a shelf), and whether the picture may be saved in the browser
 * @returns {React.ReactElement} Image filling its parent
 */
function SpineImage({ book, width, height, unit = 1, persist = true }) {
  const seriesStyles = useContext(SeriesStyleContext);
  const sticker = book.series && book.seriesNumber ? seriesStyles[book.series] : undefined;   // same for every volume
  const epoch = useSpineEpoch();                          // pictures are redrawn if the fonts arrive late
  const url = useMemo(() => spineBitmapUrl({ book, width, height, unit, sticker, persist }), [book, width, height, unit, sticker, persist, epoch]);
  return html`<img className="spine-img" alt="" draggable="false" src=${url} />`;
}

/**
 * Re-renders the component when cached spine pictures are redrawn.
 * @returns {number} Current epoch
 */
function useSpineEpoch() {
  const [epoch, setEpoch] = useState(SpineCache.getEpoch());
  useEffect(() => SpineCache.subscribe(setEpoch), []);
  return epoch;
}
