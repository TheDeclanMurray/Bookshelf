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
 * Finds top-level names declared in more than one inlined file. All files end up in a
 * single script, so a repeated `const` or `function` name would stop the whole page.
 * @param {string[]} files - Source text of each inlined file
 * @returns {string[]} Names declared more than once (empty when all are unique)
 */
export function findDuplicateNames(files) {
  const seen = new Set();
  const duplicates = new Set();
  for (const source of files) {
    // Only lines that start at column 0 are top-level declarations
    for (const match of source.matchAll(/^(?:const|let|var|function|class)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (seen.has(match[1])) duplicates.add(match[1]);
      seen.add(match[1]);
    }
  }
  return [...duplicates];
}

/**
 * Builds the page text from the template.
 * @param {string} folder - Folder holding the template and the files it inlines
 * @returns {string} Complete page text
 * @throws {Error} If an inlined file is missing, or two files declare the same top-level name
 */
export function buildPage(folder) {
  const template = readFileSync(join(folder, TEMPLATE_FILE), 'utf8');
  const inlined = [];                                     // source text of every inlined file, for the duplicate check
  // Replace every marker with its file; a function replacer avoids "$" patterns in code being interpreted
  const page = template.replace(MARKER, (_match, name) => {
    const source = readFileSync(join(folder, name), 'utf8');
    if (name.endsWith('.js')) inlined.push(source);
    return source;
  });
  const duplicates = findDuplicateNames(inlined);
  if (duplicates.length > 0) throw new Error(`Names declared in more than one file: ${duplicates.join(', ')}`);
  return page;
}

// Only write the file when run directly, so tests can import buildPage safely
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const page = buildPage(HERE);
  writeFileSync(join(HERE, OUTPUT_FILE), page);
  console.log(`Wrote ${OUTPUT_FILE} (${Math.round(page.length / 1024)} KB)`);
}
