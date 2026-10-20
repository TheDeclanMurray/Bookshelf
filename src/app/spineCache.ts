import { SL } from './reactSetup';
import { AUTHOR_FONT } from './spineCanvas';

/**
 * spineCache.js
 * Remembers drawn spines. Pictures live in memory for fast reuse and, when it is safe, are also
 * saved in the browser (IndexedDB) so the next visit draws nothing. A picture is only saved
 * once the web fonts it uses are confirmed loaded; otherwise it would be saved with the wrong
 * letters for good. Pictures made without the fonts are kept for this visit only, and are redrawn
 * as soon as the fonts arrive.
 */
const SpineCache = (function () {
  'use strict';

  // ----------------------------------------------------------------- constants
  const DB_NAME = 'bookshelf-render-cache';
  const STORE = 'spines';
  const DB_VERSION = 1;
  const MAX_ENTRIES = 600;                                // oldest pictures are dropped beyond this many
  const FONT_WAIT_MS = 2500;                              // how long the first screen waits for fonts
  const PREPARE_WAIT_MS = 1500;                           // how long it waits for the saved pictures

  const memory = new Map();                               // key -> picture URL
  const volatileKeys = new Set();                         // keys drawn without confirmed fonts: not saved, redrawn later
  const listeners = new Set<(epoch: number) => void>();                            // components to refresh when pictures are redrawn
  let database: IDBDatabase | null = null;
  let fontsReady = false;
  let epoch = 0;                                          // changes whenever pictures must be redrawn

  /**
   * Opens the browser database.
   * @returns {Promise<(IDBDatabase|null)>} The database, or null when the browser will not allow it
   */
  function openDatabase(): Promise<IDBDatabase | null> {
    return new Promise<IDBDatabase | null>((resolve) => {
      try {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = () => request.result.createObjectStore(STORE);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => resolve(null);
        request.onblocked = () => resolve(null);
      } catch (error) { resolve(null); }                  // private windows may refuse IndexedDB
    });
  }

  /**
   * Loads every saved picture into memory, and drops the oldest if there are too many.
   * @returns {Promise<number>} How many pictures were loaded
   */
  async function preload() {
    database = await openDatabase();
    if (!database) return 0;
    return new Promise((resolve) => {
      const entries: Array<{ key: IDBValidKey; createdAt: number }> = [];
      const request = database.transaction(STORE, 'readonly').objectStore(STORE).openCursor();
      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) { memory.set(cursor.key, cursor.value.url); entries.push({ key: cursor.key, createdAt: cursor.value.createdAt }); cursor.continue(); return; }
        if (entries.length > MAX_ENTRIES) {               // forget the oldest
          entries.sort((a, b) => a.createdAt - b.createdAt).slice(0, entries.length - MAX_ENTRIES).forEach((entry) => { memory.delete(entry.key); remove(entry.key); });
        }
        resolve(Math.min(entries.length, MAX_ENTRIES));
      };
      request.onerror = () => resolve(entries.length);
    });
  }

  /**
   * Deletes one saved picture (errors are ignored: the cache is only a speed-up).
   * @param {string} key - Cache key
   */
  function remove(key: IDBValidKey) {
    try { database.transaction(STORE, 'readwrite').objectStore(STORE).delete(key); } catch (error) { /* ignore */ }
  }

  /**
   * Looks up a picture.
   * @param {string} key - Cache key
   * @returns {(string|undefined)} Picture URL when known
   */
  function get(key: string) {
    return memory.get(key);
  }

  /**
   * Remembers a picture; saves it in the browser too when allowed and the fonts are confirmed.
   * @param {string} key - Cache key
   * @param {string} url - Picture data URL
   * @param {boolean} persist - False for pictures that must not be saved
   */
  function put(key: string, url: string, persist: boolean) {
    memory.set(key, url);
    const mayPersist = persist && (fontsReady || (window as any).__spineForcePersist === true);   // the flag lets tests exercise saving without web fonts
    if (persist && !mayPersist) volatileKeys.add(key);
    if (mayPersist && database) {
      try { database.transaction(STORE, 'readwrite').objectStore(STORE).put({ url, createdAt: Date.now() }, key); } catch (error) { /* ignore */ }
    }
  }

  /**
   * Loads the web fonts the spines use, so pictures are drawn with the real letters.
   * @returns {Promise<boolean>} True when every font loaded
   */
  async function loadFonts() {
    const fonts = Array.from(new Set(SL.GENRES.map((genre) => genre.font).concat(AUTHOR_FONT)));
    const results = await Promise.all(fonts.map((font) => document.fonts.load(`400 16px ${font}`).then((faces) => faces.length > 0, () => false)));
    return results.every(Boolean);
  }

  /** Called when the fonts have loaded: pictures drawn before that are discarded and redrawn. */
  function markFontsReady() {
    fontsReady = true;
    if (volatileKeys.size === 0) return;
    volatileKeys.forEach((key) => memory.delete(key));
    volatileKeys.clear();
    epoch++;
    listeners.forEach((listener) => listener(epoch));
  }

  /**
   * Gets everything ready before the first screen is drawn: saved pictures and fonts. Waits a
   * limited time; anything slower finishes in the background and the screen refreshes then.
   * @returns {Promise<void>}
   */
  async function prepare() {
    const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
    const fonts = loadFonts().then((ok) => { if (ok) markFontsReady(); return ok; });
    await Promise.race([preload(), wait(PREPARE_WAIT_MS)]);
    await Promise.race([fonts, wait(FONT_WAIT_MS)]);
  }

  /**
   * Subscribes to redraw notifications.
   * @param {function(number): void} listener - Called with the new epoch
   * @returns {function(): void} Unsubscribe function
   */
  function subscribe(listener: (epoch: number) => void) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  }

  return { get, put, prepare, subscribe, getEpoch: () => epoch, size: () => memory.size };
})();

export { SpineCache };
