/**
 * useBooks.ts
 * React hook that owns the book list, backed by IndexedDB.
 * Replaces FakeData.buildFakeLibrary() as the source of truth.
 */
import { useState, useEffect } from 'react';
import type { Book } from './types';
import { DB } from './db';

export function newBookId(): string {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function useBooks() {
  const [books, setBooks] = useState<Book[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    DB.getAll()
      .then(all => { setBooks(all); setReady(true); })
      .catch(err => { console.error('DB load failed', err); setReady(true); });
  }, []);

  const saveBook = async (book: Book) => {
    await DB.put(book);
    setBooks(prev => {
      const idx = prev.findIndex(b => b.id === book.id);
      return idx >= 0 ? prev.map(b => b.id === book.id ? book : b) : [...prev, book];
    });
  };

  const deleteBook = async (id: string) => {
    await DB.remove(id);
    setBooks(prev => prev.filter(b => b.id !== id));
  };

  const exportBooks = () => DB.exportJson(books);

  return { books, ready, saveBook, deleteBook, exportBooks };
}
