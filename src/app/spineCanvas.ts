import { SL } from './reactSetup';
import { SpineLayout } from './spineLayout';
import { SpineCache } from './spineCache';

/**
 * spineCanvas.js
 * Draws one spine into a canvas (and from there into a picture) using the layout from
 * spineLayout.js. A spine is drawn once per book and kept in the cache (spineCache.js), so
 * a shelf shows one <img> per book instead of about eight live elements with a blend effect each.
 * The picture is drawn at a multiple of the screen's pixel ratio so it stays sharp.
 */

// ----------------------------------------------------------------- constants
const SPINE_CORNER_UNITS = 2;                             // rounded top corners, in design units
const CLOTH_TILE_PX = 64;                                 // size of the repeating cloth speckle
const CLOTH_OPACITY = 0.7;
const INK_COLOR = '#2a1d12';
const LABEL_PAPER = '#eadfc4';
const AUTHOR_FONT = "'Cinzel','Trajan Pro',Georgia,serif";       // the same display face as the rest of the page
const MAX_RATIO = 3;                                      // never draw more than 3x (phones top out there)
const PICTURE_TYPE = 'image/webp';                        // Safari falls back to PNG on its own
const PICTURE_QUALITY = 0.92;
let clothTileCanvas = null;                               // built on first use

/**
 * The pixel ratio spines are drawn at.
 * @returns {number} 2 or 3 (a whole number, never below 2, so lines stay crisp)
 */
function spineRatio() {
  return Math.min(MAX_RATIO, Math.max(2, Math.ceil(window.devicePixelRatio || 1)));
}

/**
 * The cloth speckle tile: faint dark specks, drawn once and reused for every spine.
 * @returns {HTMLCanvasElement} Tile canvas
 */
function clothTile() {
  if (clothTileCanvas) return clothTileCanvas;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = CLOTH_TILE_PX;
  const context = canvas.getContext('2d');
  const image = context.createImageData(CLOTH_TILE_PX, CLOTH_TILE_PX);
  const random = SL.seededRandom('cloth');                // repeatable, so every spine and every visit looks the same
  for (let i = 0; i < CLOTH_TILE_PX * CLOTH_TILE_PX; i++) {
    image.data[i * 4 + 3] = Math.max(0, Math.round((random() * 0.9 - 0.25) * 255 * 0.5));   // alpha only: black specks
  }
  context.putImageData(image, 0, 0);
  clothTileCanvas = canvas;
  return canvas;
}

/**
 * Shortens text with an ellipsis until it fits.
 * @param {CanvasRenderingContext2D} context - Context with the font already set
 * @param {string} text - Text to fit
 * @param {number} maxWidth - Available length in px
 * @returns {string} Text, possibly cut short with an ellipsis
 */
function fitText(context, text, maxWidth) {
  if (context.measureText(text).width <= maxWidth) return text;
  let cut = text;
  while (cut.length > 1 && context.measureText(cut + '…').width > maxWidth) cut = cut.slice(0, -1);
  return cut + '…';
}

/**
 * Draws the whole spine.
 * @param {{book: Object, width: number, height: number, unit: number, sticker?: Object, ratio: number}} input
 *   size in px, design unit (px per unit), series sticker style, and the pixel ratio to draw at
 * @returns {HTMLCanvasElement} The drawn spine
 */
function drawSpineCanvas({ book, width, height, unit, sticker, ratio }) {
  const palette = SL.spinePalette(book);
  const layout = SpineLayout.computeLayout({ book, width, height, unit, sticker, isLight: palette.isLight });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(width * ratio);
  canvas.height = Math.ceil(height * ratio);
  const context = canvas.getContext('2d');
  context.scale(canvas.width / width, canvas.height / height);   // from here on, draw in layout px
  const radius = SPINE_CORNER_UNITS * unit;
  const stripeColor = `hsl(${(book.hue + 150) % 360}, 80%, 62%)`;
  const colors = { ink: INK_COLOR, accent: palette.accent, text: palette.text };

  // Rounded top corners: everything below is clipped to this shape
  context.beginPath();
  context.moveTo(0, height); context.lineTo(0, radius); context.quadraticCurveTo(0, 0, radius, 0);
  context.lineTo(width - radius, 0); context.quadraticCurveTo(width, 0, width, radius); context.lineTo(width, height); context.closePath();
  context.clip();

  // Cloth: a sideways gradient for roundness, then faint speckle multiplied over it
  const body = context.createLinearGradient(0, 0, width, 0);
  body.addColorStop(0, palette.bgDark); body.addColorStop(0.24, palette.bg); body.addColorStop(0.62, palette.bg); body.addColorStop(1, palette.bgDark);
  context.fillStyle = body;
  context.fillRect(0, 0, width, height);
  context.save();
  context.globalCompositeOperation = 'multiply';
  context.globalAlpha = CLOTH_OPACITY;
  const speckle = context.createPattern(clothTile(), 'repeat');
  context.fillStyle = speckle;
  context.fillRect(0, 0, width, height);
  context.restore();

  // Bands (gilt lines, glowing stripe, or the publisher block)
  for (const band of layout.bands) {
    context.save();
    context.globalAlpha = band.alpha === undefined ? 1 : band.alpha;
    if (band.kind === 'stripe' && band.glow) { context.shadowColor = stripeColor; context.shadowBlur = band.glow * ratio; }
    context.fillStyle = band.kind === 'stripe' ? stripeColor : palette.accent;
    context.fillRect(0, band.y, width, band.h);
    context.restore();
    if (band.kind === 'gilt') {                           // a lit top edge and a dark lower edge, like raised gold
      context.fillStyle = 'rgba(255,255,255,0.35)'; context.fillRect(0, band.y, width, 0.9 * unit);
      context.fillStyle = 'rgba(0,0,0,0.4)'; context.fillRect(0, band.y + band.h, width, 0.9 * unit);
    }
  }

  // Paper label (mystery spines)
  if (layout.label) {
    const x = (width - layout.label.w) / 2;
    context.save();
    context.shadowColor = 'rgba(0,0,0,0.4)'; context.shadowOffsetY = unit; context.shadowBlur = unit * ratio;
    context.fillStyle = LABEL_PAPER;
    context.fillRect(x, layout.label.y, layout.label.w, layout.label.h);
    context.restore();
    context.strokeStyle = 'rgba(0,0,0,0.3)'; context.lineWidth = Math.max(0.6, unit * 0.9);
    context.strokeRect(x + 0.5 * unit, layout.label.y + 0.5 * unit, layout.label.w - unit, layout.label.h - unit);
  }

  // Title and author run down the spine
  const centerX = width / 2;
  const drawDown = (text, top, length, fontSize, font, color, shadow, alpha, upper) => {
    context.save();
    context.translate(centerX, top);
    context.rotate(Math.PI / 2);                          // text runs downward, letter tops toward the right
    context.font = `400 ${fontSize}px ${font}`;
    context.textBaseline = 'middle'; context.textAlign = 'left';
    context.fillStyle = color; context.globalAlpha = alpha;
    if (shadow) { context.shadowColor = 'rgba(0,0,0,0.45)'; context.shadowOffsetX = 0; context.shadowOffsetY = unit; context.shadowBlur = unit * ratio; }
    if (upper && 'letterSpacing' in context) context.letterSpacing = `${(fontSize * 0.08).toFixed(2)}px`;
    context.fillText(fitText(context, upper ? text.toUpperCase() : text, length), 0, 0);
    context.restore();
  };
  drawDown(layout.title.text, layout.title.top, layout.title.height, layout.title.fontSize, layout.title.font, colors[layout.title.colorKind], layout.title.shadow, 1, false);
  if (layout.author) drawDown(layout.author.text, layout.author.top, layout.author.height, layout.author.fontSize, AUTHOR_FONT, palette.text, false, 0.8, true);

  // Series sticker
  if (layout.sticker) {
    const s = layout.sticker, cx = width / 2, cy = height - s.centerFromBottom, r = s.size / 2;
    context.save();
    context.shadowColor = 'rgba(0,0,0,0.5)'; context.shadowOffsetY = unit; context.shadowBlur = 2 * unit * ratio;
    context.beginPath(); context.arc(cx, cy, r + Math.max(0.6, 0.9 * unit), 0, Math.PI * 2); context.fillStyle = s.ring; context.fill();
    context.restore();
    context.beginPath(); context.arc(cx, cy, r, 0, Math.PI * 2); context.fillStyle = s.bg; context.fill();
    context.font = `700 ${s.size * 0.64}px ${AUTHOR_FONT}`;
    context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillStyle = s.text;
    context.fillText(String(s.number), cx, cy + s.size * 0.04);
  }

  // Final shading: light from the left across the spine, and a little darkening at the top and bottom
  const sideways = context.createLinearGradient(0, 0, width, 0);
  sideways.addColorStop(0, 'rgba(0,0,0,0.42)'); sideways.addColorStop(0.16, 'rgba(255,255,255,0.14)'); sideways.addColorStop(0.38, 'rgba(255,255,255,0)');
  sideways.addColorStop(0.7, 'rgba(0,0,0,0.12)'); sideways.addColorStop(1, 'rgba(0,0,0,0.42)');
  context.fillStyle = sideways; context.fillRect(0, 0, width, height);
  const lengthwise = context.createLinearGradient(0, 0, 0, height);
  lengthwise.addColorStop(0, 'rgba(0,0,0,0.28)'); lengthwise.addColorStop(0.12, 'rgba(0,0,0,0)'); lengthwise.addColorStop(0.88, 'rgba(0,0,0,0)'); lengthwise.addColorStop(1, 'rgba(0,0,0,0.3)');
  context.fillStyle = lengthwise; context.fillRect(0, 0, width, height);
  return canvas;
}

/**
 * The spine as a picture URL: from the cache when it has been drawn before, otherwise drawn now
 * and remembered. Drawing takes a few milliseconds, once per book.
 * @param {{book: Object, width: number, height: number, unit: number, sticker?: Object, persist?: boolean}} input
 *   persist false keeps the picture for this visit only (used for the big 3D copy, whose size depends on the screen)
 * @returns {string} Data URL of the picture
 */
function spineBitmapUrl({ book, width, height, unit, sticker, persist = true }) {
  const ratio = spineRatio();
  const key = SpineLayout.cacheKey({ book, width, height, unit, sticker, ratio: persist ? ratio : ratio + 'm' });
  const cached = SpineCache.get(key);
  if (cached) return cached;
  const url = drawSpineCanvas({ book, width, height, unit, sticker, ratio }).toDataURL(PICTURE_TYPE, PICTURE_QUALITY);
  SpineCache.put(key, url, persist);
  return url;
}

export { SPINE_CORNER_UNITS, CLOTH_TILE_PX, CLOTH_OPACITY, INK_COLOR, LABEL_PAPER, AUTHOR_FONT, MAX_RATIO, PICTURE_TYPE, PICTURE_QUALITY, clothTileCanvas, spineRatio, clothTile, fitText, drawSpineCanvas, spineBitmapUrl };
