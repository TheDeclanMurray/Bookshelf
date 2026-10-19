/**
 * build.mjs
 * Builds the single-file prototype page. Reads template.html and replaces each
 * INLINE marker comment (slash-star, "INLINE:" and a file name, star-slash) with that
 * file's contents, then writes bookshelf-prototype.html next to this script.
 *
 * Run with: npm run build:prototype
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));     // folder this script lives in
const TEMPLATE_FILE = 'template.html';
const OUTPUT_FILE = 'bookshelf-prototype.html';
const MARKER = /\/\*INLINE:([\w.-]+)\*\//g;               // matches /*INLINE:name.ext*/

/**
 * Builds the page text from the template.
 * @param {string} folder - Folder holding the template and the files it inlines
 * @returns {string} Complete page text
 * @throws {Error} If an inlined file is missing
 */
export function buildPage(folder) {
  const template = readFileSync(join(folder, TEMPLATE_FILE), 'utf8');
  // Replace every marker with its file; a function replacer avoids "$" patterns in code being interpreted
  return template.replace(MARKER, (_match, name) => readFileSync(join(folder, name), 'utf8'));
}

// Only write the file when run directly, so tests can import buildPage safely
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const page = buildPage(HERE);
  writeFileSync(join(HERE, OUTPUT_FILE), page);
  console.log(`Wrote ${OUTPUT_FILE} (${Math.round(page.length / 1024)} KB)`);
}
