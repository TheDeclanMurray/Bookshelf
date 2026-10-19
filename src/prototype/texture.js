/**
 * texture.js
 * Draws the marble vein texture once, at startup, into a small bitmap and installs it as
 * the `--vein` CSS variable. A bitmap is cheap to paint on all ~190 facets of the 3D stand;
 * the same look made with an SVG filter had to be re-rendered and stalled the page.
 * (styles.css keeps an SVG version as a fallback if a canvas is not available.)
 */

// ----------------------------------------------------------------- constants
const VEIN_TEXTURE_PX = 256;                              // tile size; sine frequencies are whole numbers, so the tile repeats seamlessly
const VEIN_RGB = [118, 124, 142];                         // cool grey filaments

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
 * Computes how strong a vein is at one point of the tile.
 * @param {number} u - Horizontal position, 0 to 1
 * @param {number} v - Vertical position, 0 to 1
 * @returns {number} Opacity 0 to 1
 */
function veinStrength(u, v) {
  const TAU = Math.PI * 2;
  // A gentle warp bends the lines so they wander like real veins
  const warp = 0.18 * Math.sin(TAU * (2 * u + 3 * v)) + 0.1 * Math.sin(TAU * (5 * u - 4 * v + 0.3)) + 0.05 * Math.sin(TAU * (9 * u + 7 * v));
  const main = Math.abs(Math.sin(TAU * (u + 2 * v + warp * 1.5)));          // near 0 along a vein
  const branch = Math.abs(Math.sin(TAU * (3 * u - v + warp * 2.2 + 0.4)));
  return Math.min(0.6, smoothStep(0.11, 0, main) * 0.5 + smoothStep(0.06, 0, branch) * 0.32);
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

installMarbleTexture();
