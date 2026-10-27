/**
 * BookForm.tsx
 * Bottom-sheet modal for adding or editing a book.
 */
import { useState, useEffect, useRef } from 'react';
import type { Book, Status, Age } from './types';
import { newBookId } from './useBooks';

// ----------------------------------------------------------------- constants

const STATUSES: { value: Status; label: string }[] = [
  { value: 'tbr', label: 'TBR' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
  { value: 'dnf', label: 'DNF' },
];

const AGES: { value: Age; label: string }[] = [
  { value: 'adult', label: 'Adult' },
  { value: 'ya', label: 'YA' },
  { value: 'kids', label: 'Kids' },
];

const DEFAULT_GENRES: { key: string; name: string }[] = [
  { key: 'fantasy',   name: 'Fantasy' },
  { key: 'scifi',     name: 'Sci-Fi' },
  { key: 'mystery',   name: 'Mystery/Thriller' },
  { key: 'horror',    name: 'Horror' },
  { key: 'romance',   name: 'Romance' },
  { key: 'romantasy', name: 'Romantasy' },
  { key: 'smut',      name: 'Smut' },
  { key: 'historical',name: 'Historical Fiction' },
  { key: 'literary',  name: 'Literary Fiction' },
  { key: 'nonfiction',name: 'Nonfiction' },
  { key: 'biography', name: 'Biography/Memoir' },
  { key: 'selfhelp',  name: 'Self-Help' },
];

const FONT_COLORS: { label: string; value: string }[] = [
  { label: 'White',  value: '#f5f5f5' },
  { label: 'Black',  value: '#1a1a1a' },
  { label: 'Silver', value: '#c0c0c0' },
  { label: 'Gold',   value: '#d4af37' },
  { label: 'Purple', value: '#9333ea' },
  { label: 'Pink',   value: '#ec4899' },
  { label: 'Blue',   value: '#3b82f6' },
  { label: 'Brown',  value: '#92400e' },
];

// ----------------------------------------------------------------- book APIs

interface OLDoc {
  title: string;
  author_name?: string[];
  number_of_pages_median?: number;
  series?: string[];
  cover_i?: number;
}

interface GBVolume {
  volumeInfo?: {
    seriesInfo?: {
      bookDisplayNumber?: string;
      volumeSeries?: { orderNumber?: number }[];
    };
  };
}

interface SearchResult {
  title: string;
  author: string;
  pages: number;
  series: string;
  coverUrl: string;
}

async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=6&fields=title,author_name,number_of_pages_median,series,cover_i`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json() as { docs: OLDoc[] };
  return (data.docs || []).map(doc => ({
    title: doc.title,
    author: doc.author_name?.[0] ?? '',
    pages: doc.number_of_pages_median ?? 0,
    series: doc.series?.[0] ?? '',
    coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : '',
  }));
}

async function getGoogleExtras(title: string, author: string): Promise<{ seriesNumber?: number }> {
  try {
    const q = `intitle:${encodeURIComponent(title)}+inauthor:${encodeURIComponent(author)}`;
    const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${q}&maxResults=1`);
    if (!res.ok) return {};
    const data = await res.json() as { items?: GBVolume[] };
    const si = data.items?.[0]?.volumeInfo?.seriesInfo;
    if (!si) return {};
    const n = parseInt(si.bookDisplayNumber ?? '') || si.volumeSeries?.[0]?.orderNumber;
    return { seriesNumber: typeof n === 'number' && n > 0 ? n : undefined };
  } catch {
    return {};
  }
}

// ----------------------------------------------------------------- colour wheel

const WHEEL_DRAW = 360; // canvas pixel resolution

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100; l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function drawColorWheel(canvas: HTMLCanvasElement, lightness: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = WHEEL_DRAW;
  const cx = size / 2, cy = size / 2;
  const radius = size / 2 - 2;
  const imageData = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx, dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > radius) continue;
      const hue = ((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360;
      const sat = (dist / radius) * 100;
      const [r, g, b] = hslToRgb(hue, sat, lightness);
      const idx = (y * size + x) * 4;
      imageData.data[idx] = r; imageData.data[idx + 1] = g;
      imageData.data[idx + 2] = b; imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawWheelCursor(canvas: HTMLCanvasElement, hue: number, sat: number) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const size = WHEEL_DRAW;
  const cx = size / 2, cy = size / 2;
  const radius = size / 2 - 2;
  const angle = (hue * Math.PI) / 180;
  const dist = (sat / 100) * radius;
  const px = cx + dist * Math.cos(angle);
  const py = cy + dist * Math.sin(angle);
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(0,0,0,0.65)';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(px, py, 12, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

function spineHsl(b: { hue: number; spineSaturation?: number; spineLightness?: number }) {
  return `hsl(${b.hue},${b.spineSaturation ?? 55}%,${b.spineLightness ?? 42}%)`;
}

/** Sample the dominant HSL colour from the leftmost pixels of a cover image.
 *  Returns null when cross-origin tainted or load fails. */
async function sampleCoverColor(coverUrl: string): Promise<{ h: number; s: number; l: number } | null> {
  return new Promise(resolve => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const sampleW = 8;
        canvas.width = sampleW;
        canvas.height = img.naturalHeight || 100;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(null); return; }
        ctx.drawImage(img, 0, 0, sampleW, canvas.height);
        const { data } = ctx.getImageData(0, 0, sampleW, canvas.height);
        let r = 0, g = 0, b = 0, count = 0;
        for (let i = 0; i < data.length; i += 4) {
          r += data[i]; g += data[i + 1]; b += data[i + 2]; count++;
        }
        if (!count) { resolve(null); return; }
        r /= count; g /= count; b /= count;
        const rn = r / 255, gn = g / 255, bn = b / 255;
        const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn);
        const ll = (max + min) / 2;
        if (max === min) { resolve({ h: 0, s: 0, l: Math.round(ll * 100) }); return; }
        const d = max - min;
        const ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min);
        let h = 0;
        if (max === rn) h = ((gn - bn) / d + (gn < bn ? 6 : 0)) / 6;
        else if (max === gn) h = ((bn - rn) / d + 2) / 6;
        else h = ((rn - gn) / d + 4) / 6;
        resolve({ h: Math.round(h * 360), s: Math.round(ss * 100), l: Math.round(ll * 100) });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = coverUrl;
  });
}

// ----------------------------------------------------------------- component

function emptyBook(): Book {
  return {
    id: newBookId(),
    title: '',
    author: '',
    series: '',
    seriesNumber: 0,
    seriesTotal: 0,
    pages: 0,
    genre: 'fantasy',
    age: 'adult',
    status: 'tbr',
    hue: Math.floor(Math.random() * 360),
    spineSaturation: 55,
    spineLightness: 42,
    spineTextColor: '#f5f5f5',
    coverUrl: '',
    summary: '',
    notes: '',
    rating: 0,
    startedAt: '',
    finishedAt: '',
  };
}

interface BookFormProps {
  book?: Book;
  onSave: (book: Book) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export function BookForm({ book: initial, onSave, onDelete, onClose }: BookFormProps) {
  const [book, setBook] = useState<Book>(() =>
    initial ? { spineTextColor: '#f5f5f5', coverUrl: '', ...initial } : emptyBook()
  );
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wheelRef = useRef<HTMLCanvasElement>(null);
  const dragging = useRef(false);

  useEffect(() => {
    const canvas = wheelRef.current;
    if (!canvas) return;
    drawColorWheel(canvas, book.spineLightness ?? 42);
    drawWheelCursor(canvas, book.hue, book.spineSaturation ?? 55);
  }, [book.hue, book.spineSaturation, book.spineLightness]);

  function pickFromWheel(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = wheelRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const cssR = rect.width / 2;
    const dx = e.clientX - rect.left - cssR;
    const dy = e.clientY - rect.top - cssR;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > cssR + 4) return;
    const hue = Math.round(((Math.atan2(dy, dx) * 180 / Math.PI) + 360) % 360);
    const sat = Math.round(Math.min(100, (dist / cssR) * 100));
    setBook(b => ({ ...b, hue, spineSaturation: sat }));
  }

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => { prev?.focus(); };
  }, []);

  const set = <K extends keyof Book>(key: K, value: Book[K]) =>
    setBook(b => ({ ...b, [key]: value }));

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    setSearchResults([]);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearching(false); return; }
    setSearching(true);
    searchTimer.current = setTimeout(async () => {
      const results = await searchBooks(q);
      setSearchResults(results);
      setSearching(false);
    }, 420);
  };

  const closeSearch = () => {
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const toggleSearch = () => {
    if (showSearch) closeSearch();
    else setShowSearch(true);
  };

  const applyResult = async (r: SearchResult) => {
    setBook(b => ({
      ...b,
      title: r.title,
      author: r.author,
      pages: r.pages || b.pages,
      series: r.series || b.series,
      coverUrl: r.coverUrl || b.coverUrl,
    }));
    setSearchQuery('');
    setSearchResults([]);
    setShowSearch(false);

    // Try to auto-set spine colour from the left edge of the cover
    if (r.coverUrl) {
      const color = await sampleCoverColor(r.coverUrl);
      if (color !== null) setBook(b => ({ ...b, hue: color.h, spineSaturation: color.s, spineLightness: color.l }));
    }

    // Supplement with Google Books for series number
    if (r.title && r.author) {
      const extra = await getGoogleExtras(r.title, r.author);
      if (extra.seriesNumber) setBook(b => ({ ...b, seriesNumber: extra.seriesNumber! }));
    }
  };

  const handleSave = async () => {
    if (!book.title.trim() || !book.author.trim()) return;
    setSaving(true);
    await onSave(book);
    onClose();
  };

  const handleDelete = async () => {
    if (!initial || !onDelete) return;
    if (!confirm(`Remove "${initial.title}" from your shelf?`)) return;
    await onDelete(initial.id);
    onClose();
  };

  const isEdit = !!initial;
  const showDates = book.status === 'reading' || book.status === 'read' || book.status === 'dnf';
  const textColor = book.spineTextColor ?? '#f5f5f5';
  const coverStyle = book.coverUrl
    ? { backgroundImage: `url(${book.coverUrl})` }
    : { background: `hsl(${book.hue},45%,55%)` };

  return (
    <div className="bf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bf-sheet" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit book' : 'Add a book'}>

        <div className="bf-header">
          {!isEdit
            ? showSearch
              ? <div className="bf-header-search">
                  <svg className="bf-header-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                  </svg>
                  <input id="bf-search" className="bf-header-search-input" type="search" value={searchQuery}
                    onChange={e => handleSearchChange(e.target.value)}
                    placeholder="Search for a book…" autoComplete="off" autoFocus
                    onBlur={() => setTimeout(closeSearch, 150)} />
                  {searching && <span className="bf-search-spinner">…</span>}
                  <button className="bf-search-cancel" onMouseDown={e => e.preventDefault()} onClick={closeSearch} aria-label="Cancel search">✕</button>
                </div>
              : <button className="bf-search-toggle"
                  onClick={toggleSearch} aria-label="Search for a book">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7"/><line x1="16.5" y1="16.5" x2="21" y2="21"/>
                  </svg>
                </button>
            : <span />
          }
          <button className="bf-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="bf-form-area">

          {showSearch && searchResults.length > 0 && (
            <ul className="bf-search-results-overlay" onMouseDown={e => e.preventDefault()}>
              {searchResults.map((r, i) => (
                <li key={i}>
                  <button type="button" className="bf-search-result" onClick={() => applyResult(r)}>
                    {r.coverUrl
                      ? <img className="bf-sr-cover" src={r.coverUrl} alt="" loading="lazy" />
                      : <div className="bf-sr-cover bf-sr-cover-empty" />
                    }
                    <div className="bf-sr-text">
                      <span className="bf-sr-title">{r.title}</span>
                      {r.author && <span className="bf-sr-author">{r.author}</span>}
                      {r.series && <span className="bf-sr-series">{r.series}</span>}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="bf-body">

          {/* Title */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-title">Title <span className="bf-req">*</span></label>
            <input id="bf-title" className="bf-input" type="text" value={book.title} autoFocus={!!initial}
              onChange={e => set('title', e.target.value)} placeholder="Book title" />
          </div>

          {/* Author */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-author">Author <span className="bf-req">*</span></label>
            <input id="bf-author" className="bf-input" type="text" value={book.author}
              onChange={e => set('author', e.target.value)} placeholder="Author name" />
          </div>

          {/* Pages + Genre + Age — one row */}
          <div className="bf-row">
            <div className="bf-field bf-field-pages">
              <label className="bf-label" htmlFor="bf-pages">Pages</label>
              <input id="bf-pages" className="bf-input" type="number" min="0" value={book.pages || ''}
                onChange={e => set('pages', parseInt(e.target.value) || 0)} placeholder="0" />
            </div>
            <div className="bf-field bf-field-grow">
              <label className="bf-label" htmlFor="bf-genre">Genre</label>
              <select id="bf-genre" className="bf-input" value={book.genre}
                onChange={e => set('genre', e.target.value)}>
                {DEFAULT_GENRES.map(g => <option key={g.key} value={g.key}>{g.name}</option>)}
              </select>
            </div>
            <div className="bf-field bf-field-age">
              <div className="bf-age-stack">
                {AGES.map(a => (
                  <button key={a.value} type="button"
                    className={'bf-age-btn' + (book.age === a.value ? ' is-active' : '')}
                    onClick={() => set('age', a.value)}>{a.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Series */}
          {/* TODO: search internal DB for series names to auto-fill series name, total book count, and guess the number of this book */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-series">Series</label>
            <input id="bf-series" className="bf-input" type="text" value={book.series}
              onChange={e => set('series', e.target.value)} placeholder="Series name" />
          </div>
          {book.series && (
            <div className="bf-row">
              <div className="bf-field bf-field-half">
                <label className="bf-label" htmlFor="bf-seriesnum">Book #</label>
                <input id="bf-seriesnum" className="bf-input" type="number" min="1" value={book.seriesNumber || ''}
                  onChange={e => set('seriesNumber', parseInt(e.target.value) || 0)} placeholder="1" />
              </div>
              <div className="bf-field bf-field-half">
                <label className="bf-label" htmlFor="bf-seriestotal">of</label>
                <input id="bf-seriestotal" className="bf-input" type="number" min="1" value={book.seriesTotal || ''}
                  onChange={e => set('seriesTotal', parseInt(e.target.value) || 0)} placeholder="?" />
              </div>
            </div>
          )}

          {/* Rating */}
          <div className="bf-field">
            <label className="bf-label">Rating</label>
            <div className="bf-stars">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} type="button" className={'bf-star' + (n <= book.rating ? ' is-on' : '')}
                  onClick={() => set('rating', book.rating === n ? 0 : n)}
                  aria-label={`${n} star${n > 1 ? 's' : ''}`}>★</button>
              ))}
              {book.rating > 0 && (
                <button type="button" className="bf-star-clear" onClick={() => set('rating', 0)}>clear</button>
              )}
            </div>
          </div>

          {/* Dates */}
          {showDates && (
            <div className="bf-row">
              {(book.status === 'reading' || book.status === 'read' || book.status === 'dnf') && (
                <div className="bf-field bf-field-half">
                  <label className="bf-label" htmlFor="bf-started">Started</label>
                  <input id="bf-started" className="bf-input" type="date" value={book.startedAt}
                    onChange={e => set('startedAt', e.target.value)} />
                </div>
              )}
              {(book.status === 'read' || book.status === 'dnf') && (
                <div className="bf-field bf-field-half">
                  <label className="bf-label" htmlFor="bf-finished">Finished</label>
                  <input id="bf-finished" className="bf-input" type="date" value={book.finishedAt}
                    onChange={e => set('finishedAt', e.target.value)} />
                </div>
              )}
            </div>
          )}

          {/* Book appearance: colour wheel + preview */}
          <div className="bf-field">
            <label className="bf-label">Book appearance</label>
            <div className="bf-appearance-grid">

              {/* Left: preview on top, text colour below */}
              <div className="bf-appearance-left">
                <div className="bf-book-preview">
                  <div className="bf-preview-spine" style={{ background: spineHsl(book) }}>
                    <span className="bf-preview-spine-text" style={{ color: textColor }}>
                      {book.title || 'Title'}
                    </span>
                  </div>
                  <div className="bf-preview-cover" style={coverStyle} />
                </div>
                <div className="bf-wheel-label">Text colour</div>
                <div className="bf-font-colors">
                  {FONT_COLORS.map(fc => (
                    <button key={fc.value} type="button"
                      className={'bf-font-color-btn' + (textColor === fc.value ? ' is-active' : '')}
                      style={{ background: fc.value }}
                      aria-label={fc.label}
                      onClick={() => set('spineTextColor', fc.value)} />
                  ))}
                </div>
              </div>

              {/* Right: colour wheel on top, dark/light slider below */}
              <div className="bf-appearance-right">
                <div className="bf-wheel-label">Spine colour</div>
                <canvas
                  ref={wheelRef}
                  className="bf-color-wheel"
                  width={WHEEL_DRAW}
                  height={WHEEL_DRAW}
                  onPointerDown={e => { dragging.current = true; e.currentTarget.setPointerCapture(e.pointerId); pickFromWheel(e); }}
                  onPointerMove={e => { if (dragging.current) pickFromWheel(e); }}
                  onPointerUp={() => { dragging.current = false; }}
                  onPointerCancel={() => { dragging.current = false; }}
                />
                <div className="bf-lightness-wrap">
                  <input
                    className="bf-lightness-slider"
                    type="range" min="15" max="75"
                    value={book.spineLightness ?? 42}
                    style={{ background: `linear-gradient(to right,hsl(${book.hue},${book.spineSaturation ?? 55}%,15%),hsl(${book.hue},${book.spineSaturation ?? 55}%,75%))` }}
                    onChange={e => set('spineLightness', parseInt(e.target.value))}
                  />
                  <div className="bf-shade-labels">
                    <span className="bf-shade-label">Dark</span>
                    <span className="bf-shade-label">Light</span>
                  </div>
                </div>
              </div>

            </div>
          </div>

          {/* Notes */}
          <div className="bf-field">
            <textarea id="bf-notes" className="bf-input bf-textarea" value={book.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Your thoughts…" rows={3} />
          </div>

          <div className="bf-field">
            <div className="bf-pills">
              {STATUSES.map(s => (
                <button key={s.value} type="button"
                  className={'bf-pill bf-pill-' + s.value + (book.status === s.value ? ' is-active' : '')}
                  onClick={() => set('status', s.value)}>{s.label}</button>
              ))}
            </div>
          </div>

          </div>

          <div className="bf-footer">
            {isEdit && onDelete && (
              <button type="button" className="bf-btn-delete" onClick={handleDelete}>Remove</button>
            )}
            <button type="button" className="bf-btn-save" onClick={handleSave} disabled={saving || !book.title.trim() || !book.author.trim()}>
              {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Place on your shelf'}
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
