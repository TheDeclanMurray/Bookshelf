/**
 * BookForm.tsx
 * Bottom-sheet modal for adding or editing a book.
 */
import { useState, useEffect, useRef } from 'react';
import type { Book, Status, Age } from './types';
import { newBookId } from './useBooks';

// ----------------------------------------------------------------- Open Library search

interface OLDoc {
  title: string;
  author_name?: string[];
  number_of_pages_median?: number;
  series?: string[];
  subject?: string[];
}

interface SearchResult {
  title: string;
  author: string;
  pages: number;
  series: string;
}

async function searchBooks(query: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const url = `https://openlibrary.org/search.json?title=${encodeURIComponent(query)}&limit=6&fields=title,author_name,number_of_pages_median,series`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json() as { docs: OLDoc[] };
  return (data.docs || []).map(doc => ({
    title: doc.title,
    author: doc.author_name?.[0] ?? '',
    pages: doc.number_of_pages_median ?? 0,
    series: doc.series?.[0] ?? '',
  }));
}

const STATUSES: { value: Status; label: string }[] = [
  { value: 'tbr', label: 'To Read' },
  { value: 'reading', label: 'Reading' },
  { value: 'read', label: 'Read' },
  { value: 'dnf', label: 'DNF' },
];

const AGES: { value: Age; label: string }[] = [
  { value: 'adult', label: 'Adult' },
  { value: 'ya', label: 'YA' },
  { value: 'kids', label: 'Kids' },
];

const DEFAULT_GENRES = [
  'Fantasy', 'Sci-Fi', 'Mystery/Thriller', 'Horror', 'Romance',
  'Historical Fiction', 'Literary Fiction', 'Nonfiction', 'Biography/Memoir', 'Self-Help',
];

function emptyBook(): Book {
  return {
    id: newBookId(),
    title: '',
    author: '',
    series: '',
    seriesNumber: 0,
    seriesTotal: 0,
    pages: 0,
    genre: 'Fantasy',
    age: 'adult',
    status: 'tbr',
    hue: Math.floor(Math.random() * 360),
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
  const [book, setBook] = useState<Book>(() => initial ? { ...initial } : emptyBook());
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Trap focus inside the sheet on mobile
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    return () => { prev?.focus(); };
  }, []);

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

  const applyResult = (r: SearchResult) => {
    setBook(b => ({
      ...b,
      title: r.title,
      author: r.author,
      pages: r.pages || b.pages,
      series: r.series || b.series,
    }));
    setSearchQuery('');
    setSearchResults([]);
  };

  const set = <K extends keyof Book>(key: K, value: Book[K]) =>
    setBook(b => ({ ...b, [key]: value }));

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

  return (
    <div className="bf-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bf-sheet" role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit book' : 'Add a book'}>

        <div className="bf-header">
          <span className="bf-title">{isEdit ? 'Edit Book' : 'Add a Book'}</span>
          <button className="bf-close" onClick={onClose} aria-label="Close">✕</button>
        </div>

        <div className="bf-body">

          {/* Book search */}
          {!initial && (
            <div className="bf-field bf-search-wrap">
              <label className="bf-label" htmlFor="bf-search">Search for a book <span className="bf-opt">(optional)</span></label>
              <div className="bf-search-row">
                <input id="bf-search" className="bf-input" type="search" value={searchQuery}
                  onChange={e => handleSearchChange(e.target.value)}
                  placeholder="Type a title to search…" autoComplete="off" />
                {searching && <span className="bf-search-spinner">…</span>}
              </div>
              {searchResults.length > 0 && (
                <ul className="bf-search-results">
                  {searchResults.map((r, i) => (
                    <li key={i}>
                      <button type="button" className="bf-search-result" onClick={() => applyResult(r)}>
                        <span className="bf-sr-title">{r.title}</span>
                        {r.author && <span className="bf-sr-author">{r.author}</span>}
                        {r.series && <span className="bf-sr-series">{r.series}</span>}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Status */}
          <div className="bf-field">
            <label className="bf-label">Status</label>
            <div className="bf-pills">
              {STATUSES.map(s => (
                <button key={s.value} type="button"
                  className={'bf-pill bf-pill-' + s.value + (book.status === s.value ? ' is-active' : '')}
                  onClick={() => set('status', s.value)}>{s.label}</button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-title">Title <span className="bf-req">*</span></label>
            <input id="bf-title" className="bf-input" type="text" value={book.title} autoFocus
              onChange={e => set('title', e.target.value)} placeholder="Book title" />
          </div>

          {/* Author */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-author">Author <span className="bf-req">*</span></label>
            <input id="bf-author" className="bf-input" type="text" value={book.author}
              onChange={e => set('author', e.target.value)} placeholder="Author name" />
          </div>

          {/* Genre + Age */}
          <div className="bf-row">
            <div className="bf-field bf-field-grow">
              <label className="bf-label" htmlFor="bf-genre">Genre</label>
              <select id="bf-genre" className="bf-input" value={book.genre}
                onChange={e => set('genre', e.target.value)}>
                {DEFAULT_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <div className="bf-field">
              <label className="bf-label">Age</label>
              <div className="bf-pills">
                {AGES.map(a => (
                  <button key={a.value} type="button"
                    className={'bf-pill' + (book.age === a.value ? ' is-active' : '')}
                    onClick={() => set('age', a.value)}>{a.label}</button>
                ))}
              </div>
            </div>
          </div>

          {/* Pages */}
          <div className="bf-field bf-field-half">
            <label className="bf-label" htmlFor="bf-pages">Pages</label>
            <input id="bf-pages" className="bf-input" type="number" min="0" value={book.pages || ''}
              onChange={e => set('pages', parseInt(e.target.value) || 0)} placeholder="0" />
          </div>

          {/* Series */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-series">Series <span className="bf-opt">(optional)</span></label>
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

          {/* Dates (only when relevant) */}
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

          {/* Spine colour */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-hue">Spine colour</label>
            <div className="bf-hue-row">
              <input id="bf-hue" className="bf-hue-slider" type="range" min="0" max="359"
                value={book.hue} onChange={e => set('hue', parseInt(e.target.value))} />
              <span className="bf-hue-swatch" style={{ background: `hsl(${book.hue},55%,45%)` }} />
            </div>
          </div>

          {/* Notes */}
          <div className="bf-field">
            <label className="bf-label" htmlFor="bf-notes">Notes <span className="bf-opt">(optional)</span></label>
            <textarea id="bf-notes" className="bf-input bf-textarea" value={book.notes}
              onChange={e => set('notes', e.target.value)} placeholder="Your thoughts…" rows={3} />
          </div>

        </div>{/* /bf-body */}

        <div className="bf-footer">
          {isEdit && onDelete && (
            <button type="button" className="bf-btn-delete" onClick={handleDelete}>Remove</button>
          )}
          <button type="button" className="bf-btn-save" onClick={handleSave} disabled={saving || !book.title.trim() || !book.author.trim()}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add to shelf'}
          </button>
        </div>

      </div>
    </div>
  );
}
