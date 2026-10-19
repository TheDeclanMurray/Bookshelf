/**
 * stand3d.js
 * The reading stand as real 3D geometry (CSS 3D, no flat drawing): the top of a Roman
 * column on a thick stepped base, with the book resting on a marble wedge. Round parts
 * are rings of flat facets (20 around, 16 for the fluted shaft); each facet is lit from
 * a fixed light direction, so the shading changes smoothly around the column.
 * Everything is positioned relative to the center of the abacus' top surface, with y
 * pointing down (negative y is above the abacus).
 */

// ----------------------------------------------------------------- constants
const LIGHT_DIR = (() => { const v = [-0.55, -0.65, 0.55]; const len = Math.hypot(...v); return v.map((c) => c / len); })();   // from upper left, toward the viewer
const AMBIENT_LIGHT = 0.28;                               // shade of a face turned fully away from the light
const MARBLE_LIGHT = [247, 244, 238];                     // marble in full light
const MARBLE_SHADOW = [104, 110, 128];                    // marble in shade (cool grey-blue)
const BRASS_LIGHT = [246, 222, 150];
const BRASS_SHADOW = [96, 68, 22];
const ROUND_FACETS = 20;                                  // facets around a smooth round part
const SHAFT_FACETS = 16;                                  // flutes around the column shaft
const VEIN_TILE_PX = 256;                                 // size of the repeating vein texture (drawn in texture.js)
const STAND_TILT_X_DEG = -17;                             // the camera looks down on the stand
const STAND_TURN_Y_DEG = 16;                              // and sees it from slightly to the left, so the book's spine shows
const STAND_SCALE = 0.88;
const BOOK_REST_Z = 62;                                   // front edge of the wedge, where the book's bottom edge sits
const BOOK_REST_DEG = 55;                                 // book leans back this far from vertical (35 degrees above flat)
const WEDGE_W = 132;
const WEDGE_DEPTH = 124;
const WEDGE_BACK_H = 86;
const FLOOR_Y = 234;                                      // bottom of the base, in stand coordinates

/**
 * How brightly a surface with the given outward normal is lit.
 * @param {number[]} normal - Unit vector [x, y, z]; y is negative for upward-facing
 * @returns {number} AMBIENT_LIGHT up to 1
 */
function lightAmount(normal) {
  const facing = normal[0] * LIGHT_DIR[0] + normal[1] * LIGHT_DIR[1] + normal[2] * LIGHT_DIR[2];   // dot product
  return AMBIENT_LIGHT + (1 - AMBIENT_LIGHT) * Math.max(0, facing);
}

/**
 * CSS color for a lit surface.
 * @param {string} tint - 'marble' or 'brass'
 * @param {number} amount - 0 (shade) to 1 (full light)
 * @returns {string} rgb() color
 */
function surfaceColor(tint, amount) {
  const [dark, light] = tint === 'brass' ? [BRASS_SHADOW, BRASS_LIGHT] : [MARBLE_SHADOW, MARBLE_LIGHT];
  const mixed = dark.map((channel, i) => Math.round(channel + (light[i] - channel) * amount));
  return `rgb(${mixed[0]}, ${mixed[1]}, ${mixed[2]})`;
}

/**
 * Background for a flat face: base color plus marble veins offset per face so veins do not repeat.
 * @param {string} tint - 'marble' or 'brass'
 * @param {number} amount - Light on this face, 0 to 1
 * @param {number} seed - Different per face, shifts the vein texture
 * @param {number} y - Face height, continues veins from face to face
 * @returns {Object} Style properties
 */
function flatPaint(tint, amount, seed, y) {
  const color = surfaceColor(tint, amount);
  if (tint === 'brass') return { backgroundColor: color, backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,.28), rgba(0,0,0,.2))' };
  return { backgroundColor: color, backgroundImage: 'var(--vein)', backgroundSize: `${VEIN_TILE_PX}px ${VEIN_TILE_PX}px`, backgroundPosition: `${-seed * 37}px ${-y}px` };
}

/**
 * A rectangular block (four sides and a top).
 * @param {{w: number, h: number, d: number, y: number, tint?: string, z?: number}} props - Size, top height, tint and z offset of its center
 * @returns {React.ReactElement} Faces
 */
function Box3D({ w, h, d, y, tint = 'marble', z = 0 }) {
  const faces = [
    { id: 'front', fw: w, fh: h, top: y, t: `translateZ(${d / 2 + z}px)`, n: [0, 0, 1] },
    { id: 'right', fw: d, fh: h, top: y, t: `translateZ(${z}px) rotateY(90deg) translateZ(${w / 2}px)`, n: [1, 0, 0] },
    { id: 'left', fw: d, fh: h, top: y, t: `translateZ(${z}px) rotateY(-90deg) translateZ(${w / 2}px)`, n: [-1, 0, 0] },
    { id: 'top', fw: w, fh: d, top: y - d / 2, t: `translateZ(${z}px) rotateX(90deg)`, n: [0, -1, 0] },
  ];
  return html`<${React.Fragment}>${faces.map((f, i) => html`<div key=${f.id} className="f3 f3-edge" style=${{ left: -f.fw / 2, top: f.top, width: f.fw, height: f.fh,
    transform: f.t, ...flatPaint(tint, lightAmount(f.n), i + h, y) }} />`)}<//>`;
}

/**
 * A round part (cylinder or cone frustum) built from flat facets.
 * @param {{rTop: number, rBottom: number, h: number, y: number, facets?: number, fluted?: boolean, tint?: string}} props
 *   radii at the top and bottom, height, y of the top, facet count, flutes, tint
 * @returns {React.ReactElement} Facets
 */
function Frustum3D({ rTop, rBottom, h, y, facets = ROUND_FACETS, fluted = false, tint = 'marble', veins: withVeins = true }) {
  const half = Math.PI / facets;
  const slant = Math.hypot(h, rBottom - rTop);
  const tilt = Math.atan2(rBottom - rTop, h);             // positive when the part is narrower at the top
  const wTop = 2 * rTop * Math.sin(half);
  const wBottom = 2 * rBottom * Math.sin(half);
  const wMax = Math.max(wTop, wBottom);
  const apothem = ((rTop + rBottom) / 2) * Math.cos(half);   // distance from the axis to the middle of a facet
  const topInset = (wMax - wTop) / 2;
  const bottomInset = (wMax - wBottom) / 2;
  const clip = `polygon(${topInset}px 0, calc(100% - ${topInset}px) 0, calc(100% - ${bottomInset}px) 100%, ${bottomInset}px 100%)`;
  const lightAt = (degrees) => {
    const a = (degrees * Math.PI) / 180;
    return lightAmount([Math.sin(a) * Math.cos(tilt), -Math.sin(tilt), Math.cos(a) * Math.cos(tilt)]);
  };
  return html`<${React.Fragment}>${Array.from({ length: facets }, (_, i) => {
    const theta = (i * 360) / facets;                      // 0 faces the viewer; positive turns toward +x
    const left = lightAt(theta - 180 / facets);            // light at this facet's left and right edges
    const right = lightAt(theta + 180 / facets);
    const mid = lightAt(theta);
    const colorOf = (amount) => surfaceColor(tint, amount);
    const gradient = fluted
      ? `linear-gradient(90deg, ${colorOf(left * 0.62)} 0%, ${colorOf(mid * 1.02)} 30%, ${colorOf(mid)} 62%, ${colorOf(right * 0.7)} 100%)`   // each flute is a shallow groove
      : `linear-gradient(90deg, ${colorOf(left)}, ${colorOf(right)})`;
    const veins = tint === 'brass' || !withVeins ? '' : 'var(--vein), ';   // small rings skip the texture: it is invisible at that size and costs paint time
    const layered = veins !== '';
    return html`<div key=${i} className="f3" style=${{ left: -wMax / 2, top: y + h / 2 - slant / 2, width: wMax, height: slant,
      transform: `rotateY(${theta}deg) translateZ(${apothem}px) rotateX(${(tilt * 180) / Math.PI}deg)`, clipPath: clip, WebkitClipPath: clip,
      backgroundImage: veins + gradient, backgroundSize: layered ? `${VEIN_TILE_PX}px ${VEIN_TILE_PX}px, 100% 100%` : '100% 100%', backgroundRepeat: layered ? 'repeat, no-repeat' : 'no-repeat',
      backgroundPosition: layered ? `${-i * 41}px ${-y}px, 0 0` : '0 0' }} />`;
  })}<//>`;
}

/**
 * A flat round surface facing up (the top of a ring you can see from above).
 * @param {{r: number, y: number, tint?: string}} props - Radius, height, tint
 * @returns {React.ReactElement} Disc
 */
function Disc3D({ r, y, tint = 'marble' }) {
  return html`<div className="f3" style=${{ left: -r, top: y - r, width: 2 * r, height: 2 * r, borderRadius: '50%', transform: 'rotateX(90deg)',
    ...flatPaint(tint, lightAmount([0, -1, 0]), 7, y) }} />`;
}

/**
 * A wedge (triangular block) that slopes up toward the back, holding the book at a reading angle.
 * @returns {React.ReactElement} Faces
 */
function Wedge3D() {
  const slopeLen = Math.hypot(WEDGE_DEPTH, WEDGE_BACK_H);
  const zBack = BOOK_REST_Z - WEDGE_DEPTH;                // z of the wedge's back wall
  const zMid = (BOOK_REST_Z + zBack) / 2;
  const sideTop = -WEDGE_BACK_H;
  const slopeNormal = [0, -Math.cos(Math.atan2(WEDGE_BACK_H, WEDGE_DEPTH)), Math.sin(Math.atan2(WEDGE_BACK_H, WEDGE_DEPTH))];
  const sideClip = { right: 'polygon(0 100%, 100% 100%, 100% 0)', left: 'polygon(0 0, 0 100%, 100% 100%)' };
  const side = (key, rotation, normal) => html`<div key=${key} className="f3 f3-edge" style=${{ left: -WEDGE_DEPTH / 2, top: sideTop, width: WEDGE_DEPTH, height: WEDGE_BACK_H,
    transform: `translateZ(${zMid}px) rotateY(${rotation}deg) translateZ(${WEDGE_W / 2}px)`, clipPath: sideClip[key], WebkitClipPath: sideClip[key], ...flatPaint('marble', lightAmount(normal), 3, 0) }} />`;
  return html`<${React.Fragment}>
    <div className="f3 f3-edge" style=${{ left: -WEDGE_W / 2, top: sideTop, width: WEDGE_W, height: WEDGE_BACK_H, transform: `translateZ(${zBack}px) rotateY(180deg)`, ...flatPaint('marble', AMBIENT_LIGHT, 5, 0) }} />
    <div className="f3 f3-edge" style=${{ left: -WEDGE_W / 2, top: -WEDGE_BACK_H / 2 - slopeLen / 2, width: WEDGE_W, height: slopeLen,
      transform: `translateZ(${zMid}px) rotateX(${BOOK_REST_DEG}deg)`, ...flatPaint('marble', lightAmount(slopeNormal), 9, 0) }} />
    ${side('right', 90, [1, 0, 0])}${side('left', -90, [-1, 0, 0])}
  <//>`;
}

/**
 * The whole stand with the book resting on it. The book is a real 3D book so tapping it
 * can hand over to the stage with the same shape.
 * Memoized so picking the book does not redraw its ~190 facets (the book is hidden by toggling a class).
 * @param {{book: (Object|null), W: number, H: number, D: number, onBookClick: function}} props
 *   W, H, D are the book's width, height and thickness
 * @returns {React.ReactElement} Stand scene content (position it inside a perspective container)
 */
const MarbleStand = memo(function MarbleStand({ book, W, H, D, onBookClick }) {
  return html`<div className="stand3d" style=${{ transform: `rotateX(${STAND_TILT_X_DEG}deg) rotateY(${STAND_TURN_Y_DEG}deg) scale(${STAND_SCALE})` }}>
    <div className="floor-shadow" style=${{ top: FLOOR_Y - 170, transform: 'rotateX(90deg)' }} />
    <${Box3D} w=${196} h=${16} d=${196} y=${218} /><${Box3D} w=${172} h=${34} d=${172} y=${184} />
    <${Disc3D} r=${60} y=${176} /><${Frustum3D} rTop=${58} rBottom=${60} h=${8} y=${176} veins=${false} />
    <${Disc3D} r=${54} y=${170} /><${Frustum3D} rTop=${52} rBottom=${56} h=${6} y=${170} veins=${false} />
    <${Frustum3D} rTop=${42} rBottom=${49} h=${126} y=${44} facets=${SHAFT_FACETS} fluted=${true} />
    <${Frustum3D} rTop=${47} rBottom=${47} h=${3} y=${41} tint="brass" /><${Frustum3D} rTop=${45} rBottom=${45} h=${3} y=${38} tint="brass" />
    <${Frustum3D} rTop=${62} rBottom=${46} h=${22} y=${16} veins=${false} />
    <${Box3D} w=${146} h=${6} d=${146} y=${10} /><${Box3D} w=${158} h=${10} d=${158} y=${0} />
    <${Wedge3D} />
    <${Box3D} w=${W + 14} h=${5} d=${6} y=${-5} z=${BOOK_REST_Z - 3} tint="brass" />
    ${book && html`<div className="rest-book" data-book-id=${book.id} style=${{ left: -W / 2, top: -H, width: W, height: H,
      transform: `translateZ(${BOOK_REST_Z}px) rotateX(${BOOK_REST_DEG}deg) translateZ(${D / 2}px)` }}>
      <${BookBox} book=${book} W=${W} H=${H} D=${D} withPages=${false}
        onCoverClick=${onBookClick} coverExtras=${html`<span className="tap-ring" />`} />
    </div>`}
  </div>`;});
