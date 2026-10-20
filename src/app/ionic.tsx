import { React } from './reactSetup';
import { Box3D, Disc3D, flatPaint, FACET_OVERLAP_PX, FLOOR_Y, Frustum3D, VEIN_TILE_PX, Wedge3D, lightAmount, surfaceColor } from './stand3d';

/**
 * ionic.js
 * The Ionic column that holds the head of the stand, built from the 3D parts in stand3d.js:
 * a stepped plinth and Attic base, a slender shaft with 24 flutes separated by flat fillets,
 * a bead-and-reel astragal, an egg-and-dart echinus, a scroll (volute) capital whose
 * cushions join the front and back volutes, and a thin abacus slab on top.
 * Coordinates match stand3d.js: origin at the center of the abacus' top surface, y down.
 * This column never moves, so it is rendered once into an image (see renderStand.mjs).
 */

// ----------------------------------------------------------------- constants
const ABACUS_W = 156;                                     // width of the slab the wedge sits on
const ABACUS_D = 136;
const VOLUTE_R = 19;                                      // radius of each scroll
const CAPITAL_DEPTH = 100;                                // front-to-back length of the capital (scroll to scroll)
const VOLUTE_X = ABACUS_W / 2 - VOLUTE_R - 2;             // scroll centers sit near the ends of the abacus
const CAPITAL_TOP_Y = 10;                                 // where the capital starts, just under the abacus
const VOLUTE_Y = CAPITAL_TOP_Y + VOLUTE_R;                // center height of the scrolls
const SHAFT_TOP_Y = 29;
const SHAFT_BASE_Y = 170;
const SHAFT_FLUTES = 24;
const FLUTE_SHARE = 0.72;                                 // part of each flute slot that is the curved groove (the rest is a flat fillet)
const VOLUTE_TURNS = 2.7;                                 // how many times the scroll winds
const SPIRAL_STEPS = 120;
const LINE_DARK = 'rgba(58, 62, 76, 0.75)';               // carved grooves
const LINE_LIGHT = 'rgba(255, 255, 255, 0.85)';           // light catching an edge
const EGG_TILE = 'url("data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 40 30\' preserveAspectRatio=\'none\'>'
  + '<path d=\'M20 3 C27 3 31 9 31 15 C31 22 26 26 20 26 C14 26 9 22 9 15 C9 9 13 3 20 3 Z\' fill=\'rgba(255,255,255,.25)\' stroke=\'rgba(58,62,76,.8)\' stroke-width=\'1.4\'/>'
  + '<path d=\'M20 8 L20 24\' stroke=\'rgba(58,62,76,.45)\' stroke-width=\'1\'/>'
  + '<path d=\'M3 29 L20 23 L37 29\' fill=\'none\' stroke=\'rgba(58,62,76,.7)\' stroke-width=\'1.3\'/></svg>")';   // one egg and its dart per facet

/**
 * Points along a spiral that winds inward.
 * @param {number} radius - Outer radius in px
 * @param {boolean} mirrored - Wind the other way (for the right-hand scroll)
 * @returns {string} SVG polyline points
 */
function spiralPoints(radius: number, mirrored: boolean) {
  const points = [];
  for (let i = 0; i <= SPIRAL_STEPS; i++) {
    const t = i / SPIRAL_STEPS;
    const angle = t * VOLUTE_TURNS * Math.PI * 2 + Math.PI / 2;     // start at the top
    const r = radius * (0.94 - 0.84 * t);                            // shrink toward the eye
    const x = Math.cos(angle) * r * (mirrored ? -1 : 1);
    points.push(`${(radius + x).toFixed(2)},${(radius - Math.sin(angle) * r).toFixed(2)}`);
  }
  return points.join(' ');
}

/**
 * One flat scroll on the front or back of the capital.
 * @param {{x: number, z: number, front: boolean}} props - Center x, depth, and which side it faces
 * @returns {React.ReactElement} Circular marble panel with a carved spiral
 */
function Volute3D({ x, z, front }: { x: number; z: number; front: boolean }) {
  const size = VOLUTE_R * 2;
  const mirrored = x > 0;                                 // the two scrolls on a face wind toward each other
  const transform = front ? `translateZ(${z}px)` : `translateZ(${-z}px) rotateY(180deg)`;
  return (<div className="f3" style={{ left: x - VOLUTE_R, top: VOLUTE_Y - VOLUTE_R, width: size, height: size, borderRadius: '50%', transform,
    ...flatPaint('marble', lightAmount([0, 0, front ? 1 : -1]) + 0.08, front ? 3 : 4, 0), boxShadow: 'inset 0 0 0 1.4px rgba(58,62,76,.55), inset 2px 2px 3px rgba(255,255,255,.55), inset -2px -3px 4px rgba(40,44,60,.35)' }}>
    <svg viewBox={`0 0 ${size} ${size}`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <polyline points={spiralPoints(VOLUTE_R, mirrored)} fill="none" stroke={LINE_LIGHT} strokeWidth="2.6" transform="translate(0.7 0.9)"  />
      <polyline points={spiralPoints(VOLUTE_R, mirrored)} fill="none" stroke={LINE_DARK} strokeWidth="1.5"  />
      <circle cx={VOLUTE_R} cy={VOLUTE_R} r="2.2" fill="#d9b865" stroke={LINE_DARK} strokeWidth="0.6"  />
    </svg>
  </div>);
}

/**
 * The curved band (canalis) that links the two scrolls on the front or back of the capital.
 * @param {{front: boolean}} props - Which side it faces
 * @returns {React.ReactElement} Marble band with a carved edge
 */
function Canalis3D({ front }: { front: boolean }) {
  const width = (VOLUTE_X - VOLUTE_R * 0.4) * 2;
  const clip = `path("M 0 0 H ${width} V 7 Q ${width / 2} 25 0 7 Z")`;
  const transform = front ? `translateZ(${CAPITAL_DEPTH / 2 - 1}px)` : `translateZ(${-(CAPITAL_DEPTH / 2 - 1)}px) rotateY(180deg)`;
  return (<div className="f3" style={{ left: -width / 2, top: CAPITAL_TOP_Y, width, height: 26, transform, clipPath: clip, WebkitClipPath: clip,
    ...flatPaint('marble', lightAmount([0, 0, front ? 1 : -1]) + 0.05, front ? 6 : 8, 0) }}>
    <svg viewBox={`0 0 ${width} 26`} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
      <path d={`M 0 7 Q ${width / 2} 25 ${width} 7`} fill="none" stroke={LINE_DARK} strokeWidth="1.6"  />
      <path d={`M 0 4 Q ${width / 2} 21 ${width} 4`} fill="none" stroke={LINE_DARK} strokeWidth="0.8"  />
    </svg>
  </div>);
}

/**
 * A horizontal cushion (pulvinus) joining a front scroll to the back one, with a brass belt.
 * @param {{x: number}} props - Center x
 * @returns {React.ReactElement} Round bolster lying front to back
 */
function Cushion3D({ x }: { x: number }) {
  // Built as an upright cylinder, then laid on its side so its length runs front to back
  return (<div className="f3-group" style={{ transform: `translate3d(${x}px, ${VOLUTE_Y}px, 0px) rotateX(90deg)` }}>
    <Frustum3D rTop={VOLUTE_R - 1} rBottom={VOLUTE_R - 1} h={CAPITAL_DEPTH - 2} y={-(CAPITAL_DEPTH - 2) / 2} facets={18} veins={false}  />
    <Frustum3D rTop={VOLUTE_R + 1.2} rBottom={VOLUTE_R + 1.2} h={5} y={-2.5} facets={18} tint="brass"  />
  </div>);
}

/**
 * The fluted shaft: 24 concave flutes separated by narrow flat fillets, narrowing toward the top.
 * @returns {React.ReactElement} Facets
 */
function IonicShaft3D() {
  const rTop = 33, rBottom = 38, h = SHAFT_BASE_Y - SHAFT_TOP_Y, y = SHAFT_TOP_Y;
  const slot = 360 / SHAFT_FLUTES;
  const slant = Math.hypot(h, rBottom - rTop);
  const tilt = Math.atan2(rBottom - rTop, h);
  const pieces = [];
  for (let i = 0; i < SHAFT_FLUTES; i++) {
    pieces.push({ theta: i * slot, span: slot * FLUTE_SHARE, flute: true });
    pieces.push({ theta: i * slot + slot / 2, span: slot * (1 - FLUTE_SHARE), flute: false });
  }
  const lightAt = (degrees: number) => { const a = (degrees * Math.PI) / 180; return lightAmount([Math.sin(a) * Math.cos(tilt), -Math.sin(tilt), Math.cos(a) * Math.cos(tilt)]); };
  // A solid core just inside the flutes so the hairline gaps between them show shaded marble, not the page behind
  const core = <Frustum3D rTop={rTop - 2} rBottom={rBottom - 2} h={h} y={y} facets={12} veins={false}  />;
  return (<React.Fragment>{core}{pieces.map((piece, i) => {
    const half = (piece.span * Math.PI) / 360;
    const wTop = 2 * rTop * Math.sin(half), wBottom = 2 * rBottom * Math.sin(half);
    const wMax = Math.max(wTop, wBottom) + FACET_OVERLAP_PX;
    const apothem = ((rTop + rBottom) / 2) * Math.cos(half);
    const topInset = (wMax - wTop - FACET_OVERLAP_PX) / 2, bottomInset = (wMax - wBottom - FACET_OVERLAP_PX) / 2;
    const clip = `polygon(${topInset}px 0, calc(100% - ${topInset}px) 0, calc(100% - ${bottomInset}px) 100%, ${bottomInset}px 100%)`;
    const edge = piece.span / 2;
    // A concave flute is lit on the side that faces away from the light, so its edges swap
    const left = piece.flute ? lightAt(piece.theta + edge) * 0.9 : lightAt(piece.theta);
    const right = piece.flute ? lightAt(piece.theta - edge) * 1.04 : lightAt(piece.theta);
    const mid = piece.flute ? (left + right) / 2 : lightAt(piece.theta) * 1.08;
    const gradient = `linear-gradient(90deg, ${surfaceColor('marble', left)}, ${surfaceColor('marble', mid)} 50%, ${surfaceColor('marble', right)})`;
    return (<div key={i} className="f3" style={{ left: -wMax / 2, top: y + h / 2 - slant / 2, width: wMax, height: slant,
      transform: `rotateY(${piece.theta}deg) translateZ(${apothem}px) rotateX(${(tilt * 180) / Math.PI}deg)`, clipPath: clip, WebkitClipPath: clip,
      backgroundImage: `var(--vein), ${gradient}`, backgroundSize: `${VEIN_TILE_PX}px ${VEIN_TILE_PX}px, 100% 100%`, backgroundRepeat: 'repeat, no-repeat',
      backgroundPosition: `${-i * 29}px ${-y}px, 0 0`, boxShadow: piece.flute ? 'inset 0 0 0 0.5px rgba(58,62,76,.35)' : 'none' }}  />);
  })}</React.Fragment>);
}

/**
 * Everything that never moves: floor shadow, plinth, Attic base, shaft, capital, abacus, and the
 * wedge that carries the book. Rendered once into an image; the book and its brass lip stay live.
 * @returns {React.ReactElement} Static stand parts
 */
function IonicColumn() {
  return (<React.Fragment>
    <div className="floor-shadow" style={{ top: FLOOR_Y - 170, transform: 'rotateX(90deg)' }}  />
    <Box3D w={196} h={16} d={196} y={230}  /><Box3D w={172} h={34} d={172} y={196}  />
    <Disc3D r={52} y={196}  /><Frustum3D rTop={52} rBottom={53} h={3} y={193} veins={false}  />
    <Frustum3D rTop={47} rBottom={52} h={3} y={190} veins={false}  /><Frustum3D rTop={47} rBottom={47} h={4} y={186} veins={false}  />
    <Frustum3D rTop={42} rBottom={47} h={2} y={184} veins={false}  /><Frustum3D rTop={40} rBottom={42} h={4} y={180} veins={false}  />
    <Frustum3D rTop={42} rBottom={40} h={3} y={177} veins={false}  /><Frustum3D rTop={46} rBottom={42} h={3} y={174} veins={false}  />
    <Frustum3D rTop={44} rBottom={46} h={3} y={171} veins={false}  />
    <IonicShaft3D  />
    <Frustum3D rTop={34.5} rBottom={34.5} h={4} y={25} tint="brass" facets={24}  />
    <Frustum3D rTop={40} rBottom={34} h={16} y={10} facets={24} tile={EGG_TILE} veins={false}  />
    <Cushion3D x={-VOLUTE_X}  /><Cushion3D x={VOLUTE_X}  />
    <Volute3D x={-VOLUTE_X} z={CAPITAL_DEPTH / 2} front={true}  /><Volute3D x={VOLUTE_X} z={CAPITAL_DEPTH / 2} front={true}  />
    <Volute3D x={-VOLUTE_X} z={CAPITAL_DEPTH / 2} front={false}  /><Volute3D x={VOLUTE_X} z={CAPITAL_DEPTH / 2} front={false}  />
    <Canalis3D front={true}  /><Canalis3D front={false}  />
    <Box3D w={ABACUS_W - 8} h={4} d={ABACUS_D - 8} y={6}  /><Box3D w={ABACUS_W} h={6} d={ABACUS_D} y={0}  />
    <Wedge3D  />
  </React.Fragment>);
}

export { ABACUS_W, ABACUS_D, VOLUTE_R, CAPITAL_DEPTH, VOLUTE_X, CAPITAL_TOP_Y, VOLUTE_Y, SHAFT_TOP_Y, SHAFT_BASE_Y, SHAFT_FLUTES, FLUTE_SHARE, VOLUTE_TURNS, SPIRAL_STEPS, LINE_DARK, LINE_LIGHT, EGG_TILE, spiralPoints, Volute3D, Canalis3D, Cushion3D, IonicShaft3D, IonicColumn };
