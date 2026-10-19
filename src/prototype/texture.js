/**
 * texture.js
 * Draws the marble vein texture once, at startup, into a small bitmap and installs it as
 * the `--vein` CSS variable. A bitmap is cheap to paint on all ~190 facets of the 3D stand;
 * the same look made with an SVG filter had to be re-rendered and stalled the page.
 * (styles.css keeps an SVG version as a fallback if a canvas is not available.)
 */

// ----------------------------------------------------------------- constants
const VEIN_TEXTURE_PX = 256;                              // tile size; the noise wraps around, so the tile repeats seamlessly
const VEIN_RGB = [112, 118, 138];                         // cool grey filaments
const NOISE_OCTAVES = 4;
const WARP_STRENGTH = 0.32;                               // how far the warp bends the veins

/**
 * Smooth 0-1 ramp between two edges (either order).
 * @param {number} edge0 - Value that maps to 0
 * @param {number} edge1 - Value that maps to 1
 * @param {number} x - Input
 * @returns {number} 0 to 1
 */
function smoothStep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/**
 * A repeatable random number for a lattice point; the point wraps around at `period`, so noise tiles.
 * @param {number} ix - Lattice column
 * @param {number} iy - Lattice row
 * @param {number} period - Lattice size before it wraps
 * @param {number} seed - Different seeds give different patterns
 * @returns {number} 0 to 1
 */
function latticeValue(ix, iy, period, seed) {
  const x = ((ix % period) + period) % period;
  const y = ((iy % period) + period) % period;
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(seed, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * Smooth value noise at one point.
 * @param {number} x - Horizontal position in lattice units
 * @param {number} y - Vertical position in lattice units
 * @param {number} period - Lattice size before it wraps
 * @param {number} seed - Pattern seed
 * @returns {number} 0 to 1
 */
function valueNoise(x, y, period, seed) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  const sx = smoothStep(0, 1, x - x0), sy = smoothStep(0, 1, y - y0);
  const top = latticeValue(x0, y0, period, seed) * (1 - sx) + latticeValue(x0 + 1, y0, period, seed) * sx;
  const bottom = latticeValue(x0, y0 + 1, period, seed) * (1 - sx) + latticeValue(x0 + 1, y0 + 1, period, seed) * sx;
  return top * (1 - sy) + bottom * sy;
}

/**
 * Layers of noise at doubling detail (fractal noise); repeats seamlessly over u and v from 0 to 1.
 * @param {number} u - Horizontal position, may be outside 0-1 (it wraps)
 * @param {number} v - Vertical position, may be outside 0-1 (it wraps)
 * @param {number} basePeriod - Lattice size of the coarsest layer
 * @param {number} seed - Pattern seed
 * @returns {number} 0 to 1, mostly near 0.5
 */
function fractalNoise(u, v, basePeriod, seed) {
  let sum = 0, amplitude = 0.5, total = 0;
  for (let octave = 0; octave < NOISE_OCTAVES; octave++) {
    const period = basePeriod * 2 ** octave;
    sum += amplitude * valueNoise(u * period, v * period, period, seed + octave);
    total += amplitude;
    amplitude *= 0.5;
  }
  return sum / total;
}

/**
 * How strong a vein is at one point of the tile. Veins run along the places where the noise crosses
 * its middle value, which always form continuous winding lines.
 * @param {number} u - Horizontal position, 0 to 1
 * @param {number} v - Vertical position, 0 to 1
 * @returns {number} Opacity 0 to 1
 */
function veinStrength(u, v) {
  const warpedU = u + WARP_STRENGTH * (fractalNoise(u, v, 2, 11) - 0.5);        // bend the lines so they wander
  const warpedV = v + WARP_STRENGTH * (fractalNoise(u + 0.37, v + 0.61, 2, 29) - 0.5);
  const distance = Math.abs(fractalNoise(warpedU, warpedV, 3, 3) - 0.5) * 2;    // 0 right on a vein
  return Math.min(0.7, smoothStep(0.07, 0, distance) * 0.62 + smoothStep(0.3, 0, distance) * 0.1);
}

/**
 * Renders the vein tile.
 * @returns {string} PNG data URL
 */
function buildMarbleVeinDataUrl() {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = VEIN_TEXTURE_PX;
  const context = canvas.getContext('2d');
  const image = context.createImageData(VEIN_TEXTURE_PX, VEIN_TEXTURE_PX);
  for (let y = 0; y < VEIN_TEXTURE_PX; y++) {
    for (let x = 0; x < VEIN_TEXTURE_PX; x++) {
      const at = (y * VEIN_TEXTURE_PX + x) * 4;
      image.data[at] = VEIN_RGB[0];
      image.data[at + 1] = VEIN_RGB[1];
      image.data[at + 2] = VEIN_RGB[2];
      image.data[at + 3] = Math.round(veinStrength(x / VEIN_TEXTURE_PX, y / VEIN_TEXTURE_PX) * 255);
    }
  }
  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

/** Installs the bitmap as --vein; on any failure the CSS fallback stays in place. */
function installMarbleTexture() {
  try {
    document.documentElement.style.setProperty('--vein', `url(${buildMarbleVeinDataUrl()})`);
  } catch (error) { /* no canvas available: keep the SVG fallback from styles.css */ }
}

if (typeof document !== 'undefined') installMarbleTexture();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { veinStrength, smoothStep, valueNoise, fractalNoise };   // Node (tests)
}
