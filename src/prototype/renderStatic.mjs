/**
 * renderStatic.mjs
 * Photographs the parts of the page that never move and saves them as images the page draws instead
 * of hundreds of live elements: the 3D marble column of the reading stand, and the empty frame of
 * a bookcase in each wood theme (crown, columns, shelf boards, base). Run it whenever the look of
 * those parts changes (ionic.js, stand3d.js, texture.js, bookcase.js, the bookcase CSS):
 *
 *   npm run build:prototype && npm run render:static && npm run build:prototype
 *
 * Needs Playwright with Chromium (`npx playwright install chromium`). Environment variables:
 *   PLAYWRIGHT_PATH  path or name of the playwright module (default "playwright")
 *   CHROMIUM_PATH    a Chromium executable to use instead of Playwright's own
 *   LIBS_DIR         a node_modules folder holding react, react-dom, htm and framer-motion; when set, the
 *                    page's CDN scripts are served from it (useful offline), otherwise the CDNs are used
 * Writes src/prototype/assets/*.webp (to look at), public/assets/*.webp (served by Vite),
 * standAsset.js and caseAsset.js for the prototype, and src/app/standAsset.ts and
 * src/app/caseAsset.ts for the real app (URL references, not embedded base64).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildPage } from './build.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP_SRC = resolve(HERE, '../../src/app');
const PUBLIC_ASSETS = resolve(HERE, '../../public/assets');
const STAND_VIEWPORT = { width: 440, height: 820 };       // roomy: a photograph must fit inside the window, shadows included (the pieces are drawn at scale 1 whatever the window)
const CASE_VIEWPORT = { width: 520, height: 900 };
const SCREENSHOT_TIMEOUT_MS = 180000;                     // the 3D column is slow to paint without a GPU
const STAND_RATIO = 3;                                    // the column is photographed at 3x, crisp on a 3x iPhone screen
const CASE_RATIO = 2;                                     // wood frames are soft, so 2x is enough and keeps the page small
const STAND_PADDING_PX = 8;                               // space kept around the picture
const CASE_PADDING_PX = 40;                               // the base casts a shadow outside its box
const WEBP_QUALITY = 0.9;
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
 * Builds the page once and writes it where the browser can open it.
 * @returns {string} file:// URL of the built page
 */
function writePage() {
  // Wrap the built page the way the publisher does: a viewport meta, so phone-size layout applies
  const page = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>'
    + buildPage(HERE) + '</body></html>';
  const folder = join(tmpdir(), 'bookshelf-render-static');
  mkdirSync(folder, { recursive: true });
  const file = join(folder, 'page.html');
  writeFileSync(file, page);
  return pathToFileURL(file).href;
}

/**
 * Opens a tab at the phone size and pixel ratio, serving the libraries locally when LIBS_DIR is set.
 * @param {Object} browser - Playwright browser
 * @param {number} ratio - Device pixel ratio (how sharp the photographs are)
 * @param {{width: number, height: number}} viewport - Window size in css px
 * @returns {Promise<Object>} Playwright page
 */
async function openTab(browser, ratio, viewport) {
  const tab = await (await browser.newContext({ viewport, deviceScaleFactor: ratio })).newPage();
  if (process.env.LIBS_DIR) {
    await tab.route('**/*', (route) => {
      const name = route.request().url().split('/').pop().split('?')[0];
      if (LIB_FILES[name]) return route.fulfill({ contentType: 'application/javascript', body: readFileSync(join(process.env.LIBS_DIR, LIB_FILES[name])) });
      return route.request().url().startsWith('file://') ? route.continue() : route.abort();   // fonts are not needed for these pieces
    });
  }
  return tab;
}

/**
 * Photographs everything inside `partsSelector` on a transparent background and converts it to WebP.
 * @param {Object} tab - Playwright page showing the piece
 * @param {{partsSelector: string, anchorSelector: string, padding: number}} options
 *   partsSelector matches every element that is part of the piece; the picture covers all of them plus padding;
 *   anchorSelector is the element the live page positions the picture against
 * @returns {Promise<{dataUrl: string, placement: {left: number, top: number, width: number, height: number}}>}
 *   WebP data URL and its position in css px relative to the anchor
 */
async function photograph(tab, { partsSelector, anchorSelector, padding }) {
  const area = await tab.evaluate(([parts, anchor, pad]) => {
    const origin = document.querySelector(anchor).getBoundingClientRect();
    let left = Infinity, top = Infinity, right = -Infinity, bottom = -Infinity;
    document.querySelectorAll(parts).forEach((element) => {
      const box = element.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) return;
      left = Math.min(left, box.left); top = Math.min(top, box.top); right = Math.max(right, box.right); bottom = Math.max(bottom, box.bottom);
    });
    left = Math.floor(left - pad); top = Math.floor(top - pad); right = Math.ceil(right + pad); bottom = Math.ceil(bottom + pad);
    if (left < 0 || top < 0 || right > innerWidth || bottom > innerHeight) throw new Error(`photograph area ${left},${top} to ${right},${bottom} does not fit the ${innerWidth}x${innerHeight} window`);
    return { clip: { x: left, y: top, width: right - left, height: bottom - top }, origin: { x: origin.left, y: origin.top } };
  }, [partsSelector, anchorSelector, padding]);
  const png = await tab.screenshot({ clip: area.clip, omitBackground: true, timeout: SCREENSHOT_TIMEOUT_MS });
  const dataUrl = await tab.evaluate(async ([base64, quality]) => {
    const image = new Image();
    image.src = `data:image/png;base64,${base64}`;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    canvas.getContext('2d').drawImage(image, 0, 0);
    return canvas.toDataURL('image/webp', quality);          // keeps transparency, much smaller than PNG
  }, [png.toString('base64'), WEBP_QUALITY]);
  return { dataUrl, placement: { left: area.clip.x - area.origin.x, top: area.clip.y - area.origin.y, width: area.clip.width, height: area.clip.height } };
}

/**
 * Saves a picture file to src/prototype/assets/ (to look at) and public/assets/ (served by Vite).
 * @param {string} name - File name
 * @param {string} dataUrl - WebP data URL
 */
function saveLook(name, dataUrl) {
  const buf = Buffer.from(dataUrl.split(',')[1], 'base64');
  mkdirSync(join(HERE, 'assets'), { recursive: true });
  writeFileSync(join(HERE, 'assets', name), buf);
  mkdirSync(PUBLIC_ASSETS, { recursive: true });
  writeFileSync(join(PUBLIC_ASSETS, name), buf);
}

/**
 * Photographs the stand's column and writes standAsset.js.
 * @param {Object} browser - Playwright browser
 * @param {string} url - Built page URL
 * @returns {Promise<void>}
 */
async function renderStand(browser, url) {
  const tab = await openTab(browser, STAND_RATIO, STAND_VIEWPORT);
  await tab.goto(`${url}#render-stand`);
  await tab.waitForSelector('.f3');
  await tab.waitForTimeout(800);                          // marble veins are drawn at startup
  const { dataUrl, placement } = await photograph(tab, { partsSelector: '.stand3d .f3, .stand3d .floor-shadow', anchorSelector: '.scene', padding: STAND_PADDING_PX });
  saveLook('stand.webp', dataUrl);
  // Prototype asset file (base64 for standalone HTML)
  writeFileSync(join(HERE, 'standAsset.js'), `/**\n * standAsset.js\n * GENERATED by renderStatic.mjs (npm run render:static). Placement is in scene pixels.\n * \`null\` means the image has not been rendered yet, so the stand draws its 3D column live.\n */\nconst STAND_IMAGE = ${JSON.stringify({ src: dataUrl, ...placement })};\n`);
  // App asset file (URL reference — webp served from public/assets/)
  writeFileSync(join(APP_SRC, 'standAsset.ts'), `/**\n * standAsset.ts\n * GENERATED by renderStatic.mjs (npm run render:static). Placement is in scene pixels.\n * \`null\` means the image has not been rendered yet, so the stand draws its 3D column live.\n */\nconst STAND_IMAGE = { src: '/assets/stand.webp', ...${JSON.stringify(placement)} };\nexport { STAND_IMAGE };\n`);
  console.log(`stand: ${placement.width}x${placement.height} css px, ${Math.round(dataUrl.length / 1024)} KB as webp`);
  await tab.context().close();
}

/**
 * Photographs the empty bookcase frame in every wood theme and writes caseAsset.js. All themes share
 * the same shape, so one placement serves them all.
 * @param {Object} browser - Playwright browser
 * @param {string} url - Built page URL
 * @returns {Promise<void>}
 */
async function renderCases(browser, url) {
  const tab = await openTab(browser, CASE_RATIO, CASE_VIEWPORT);
  await tab.goto(`${url}#render-static`);
  await tab.waitForSelector('#app');
  const themes = await tab.evaluate(() => Array.from(new Set(SL.GENRES.map((g) => g.theme).concat(Object.values(SL.SPECIAL_GROUPS).map((g) => g.theme)))));
  const images = {};
  let placement = null;
  let total = 0;
  for (const theme of themes) {
    await tab.goto(`${url}#render-case=${theme}`);
    await tab.reload();                                   // a hash change alone does not restart the page
    await tab.waitForSelector('.case .crown');
    await tab.waitForTimeout(400);
    const shot = await photograph(tab, { partsSelector: '.case, .case *', anchorSelector: '.case', padding: CASE_PADDING_PX });
    images[theme] = shot.dataUrl;
    placement = placement || shot.placement;              // identical for every theme
    saveLook(`case-${theme}.webp`, shot.dataUrl);
    total += shot.dataUrl.length;
  }
  // Prototype asset file (base64 for standalone HTML)
  writeFileSync(join(HERE, 'caseAsset.js'), `/**\n * caseAsset.js\n * GENERATED by renderStatic.mjs (npm run render:static). Placement is in bookcase pixels.\n * \`null\` means the frames have not been rendered yet, so bookcases draw their frame live.\n */\nconst CASE_FRAMES = ${JSON.stringify({ placement, images })};\n`);
  // App asset file (URL references — webp files served from public/assets/)
  const urlImages = Object.fromEntries(themes.map((t) => [t, `/assets/case-${t}.webp`]));
  writeFileSync(join(APP_SRC, 'caseAsset.ts'), `/**\n * caseAsset.ts\n * GENERATED by renderStatic.mjs (npm run render:static). Placement is in bookcase pixels.\n * \`null\` means the frames have not been rendered yet, so bookcases draw their frame live.\n */\nconst CASE_FRAMES = {\n  placement: ${JSON.stringify(placement)},\n  images: ${JSON.stringify(urlImages, null, 2)} as Record<string, string>,\n};\nexport { CASE_FRAMES };\n`);
  console.log(`bookcase frames: ${themes.length} themes, ${placement.width}x${placement.height} css px each, ${Math.round(total / 1024)} KB as webp in total`);
  await tab.context().close();
}

/**
 * Photographs everything.
 * @returns {Promise<void>}
 */
async function main() {
  const { chromium } = await loadPlaywright();
  const url = writePage();
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
  await renderStand(browser, url);
  await renderCases(browser, url);
  await browser.close();
}

main().catch((error) => { console.error(error); process.exit(1); });
