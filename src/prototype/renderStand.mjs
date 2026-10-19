/**
 * renderStand.mjs
 * Photographs the 3D marble column once and saves it as an image the page draws instead of
 * ~140 live 3D pieces. Run it whenever ionic.js or stand3d.js changes:
 *
 *   npm run build:prototype && npm run render:stand && npm run build:prototype
 *
 * Needs Playwright with Chromium (`npx playwright install chromium`). Environment variables:
 *   PLAYWRIGHT_PATH  path or name of the playwright module (default "playwright")
 *   CHROMIUM_PATH    a Chromium executable to use instead of Playwright's own
 *   LIBS_DIR         a node_modules folder holding react, react-dom, htm and framer-motion; when set, the
 *                    page's CDN scripts are served from it (useful offline), otherwise the CDNs are used
 * Writes src/prototype/assets/stand.webp (to look at) and src/prototype/standAsset.js (what the page uses).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPage } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VIEWPORT = { width: 392, height: 800 };             // chosen so the reading screen is drawn at exactly scale 1
const PIXEL_RATIO = 3;                                    // crisp on a 3x iPhone screen
const PADDING_PX = 8;                                     // space kept around the column in the picture
const WEBP_QUALITY = 0.92;
const LIB_FILES = {                                       // CDN file name -> path inside LIBS_DIR
  'react.production.min.js': 'react/umd/react.production.min.js',
  'react-dom.production.min.js': 'react-dom/umd/react-dom.production.min.js',
  'htm.js': 'htm/dist/htm.js',
  'framer-motion.js': 'framer-motion/dist/framer-motion.js',
};

/**
 * Loads Playwright from the configured place.
 * @returns {Promise<Object>} The playwright module
 */
async function loadPlaywright() {
  const where = process.env.PLAYWRIGHT_PATH || 'playwright';
  return import(where.startsWith('/') ? pathToFileURL(where).href : where);
}

/**
 * Renders the stand and writes the image and its placement.
 * @returns {Promise<void>}
 */
async function renderStand() {
  const { chromium } = await loadPlaywright();
  // Wrap the built page the way the publisher does: a viewport meta, so phone-size layout applies
  const page = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
    + buildPage(HERE) + '</body></html>';
  const folder = join(tmpdir(), 'bookshelf-render-stand');
  mkdirSync(folder, { recursive: true });
  const file = join(folder, 'page.html');
  writeFileSync(file, page);

  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  const tab = await (await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: PIXEL_RATIO })).newPage();
  if (process.env.LIBS_DIR) {
    await tab.route('**/*', (route) => {
      const name = route.request().url().split('/').pop().split('?')[0];
      if (LIB_FILES[name]) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(join(process.env.LIBS_DIR, LIB_FILES[name])) });
      return route.request().url().startsWith('file://') ? route.continue() : route.abort();   // fonts are not needed for the column
    });
  }
  await tab.goto(`${pathToFileURL(file).href}#render-stand`);
  await tab.waitForSelector('.f3');
  await tab.waitForTimeout(800);                          // marble veins are drawn at startup

  // The picture covers every part of the column, and is placed relative to the scene it lives in
  const area = await tab.evaluate((padding) => {
    const scene = document.querySelector('.scene').getBoundingClientRect();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    document.querySelectorAll('.stand3d .f3, .stand3d .floor-shadow').forEach((element) => {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return;
      left = Math.min(left, box.left); top = Math.min(top, box.top); right = Math.max(right, box.right); bottom = Math.max(bottom, box.bottom);
    });
    left = Math.floor(left - padding); top = Math.floor(top - padding); right = Math.ceil(right + padding); bottom = Math.ceil(bottom + padding);
    return { clip: { x: left, y: top, width: right - left, height: bottom - top }, scene: { x: scene.left, y: scene.top } };
  }, PADDING_PX);
  const png = await tab.screenshot({ clip: area.clip, omitBackground: true });

  // Convert to WebP (keeps transparency, much smaller than PNG)
  const webpDataUrl = await tab.evaluate(async ([base64, quality]) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', quality);
  }, [png.toString('base64'), WEBP_QUALITY]);
  await browser.close();

  const placement = { left: area.clip.x - area.scene.x, top: area.clip.y - area.scene.y, width: area.clip.width, height: area.clip.height };
  mkdirSync(join(HERE, 'assets'), { recursive: true });
  writeFileSync(join(HERE, 'assets', 'stand.webp'), Buffer.from(webpDataUrl.split(',')[1], 'base64'));
  writeFileSync(join(HERE, 'standAsset.js'), `/**\n * standAsset.js\n * GENERATED by renderStand.mjs (npm run render:stand). Placement is in scene pixels.\n * \`null\` means the image has not been rendered yet, so the stand draws its 3D column live.\n */\nconst STAND_IMAGE = ${JSON.stringify({ src: webpDataUrl, ...placement })};\n`);
  console.log(`Wrote assets/stand.webp and standAsset.js: ${placement.width}x${placement.height} css px, ${Math.round(webpDataUrl.length / 1024)} KB as text`);
}

renderStand().catch((error) => { console.error(error); process.exit(1); });
