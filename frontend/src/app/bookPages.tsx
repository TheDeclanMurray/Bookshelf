import { React, SL } from './reactSetup';
import type { Book } from './types';

/**
 * bookPages.js
 * What is printed inside the open book: the summary on the left page and your
 * own reading record on the right page.
 */

// ----------------------------------------------------------------- constants
const AGE_LABELS: Record<string, string> = { adult: 'Adult', ya: 'Young adult', kids: 'Kids' };
const STATUS_LABELS: Record<string, string> = { read: 'Read', dnf: 'Did not finish', tbr: 'To be read', reading: 'Reading now' };
const STAR_COUNT = 5;

/**
 * Left page: title, author and summary.
 * @param {{book: Object}} props - The open book
 * @returns {React.ReactElement} Page content (fills its parent)
 */
function SummaryPage({ book }: { book: Book }) {
  return (<div className="paper left"><div className="paper-inner">
    <div className="pg-kicker">Summary</div>
    <div className="pg-title">{book.title}</div>
    <div className="pg-author">{book.author}</div>
    <div className="pg-rule"  />
    <p className="pg-text dropcap">{book.summary}</p>
    {book.series && <p className="pg-note">{SL.seriesLabel(book)} in {book.series}.</p>}
    <div className="pg-num">ii</div>
  </div></div>);
}

/**
 * Right page: rating, status, dates, series progress, and your note.
 * @param {{book: Object, allBooks: Object[], today: string}} props - The open book, the library, and today's date
 * @returns {React.ReactElement} Page content (fills its parent)
 */
function StatsPage({ book, allBooks, today }: { book: Book; allBooks: Book[]; today: string }) {
  const genre = SL.genreOf(book);
  const readDays = book.finishedAt && book.startedAt ? SL.daysBetween(book.startedAt, book.finishedAt) + 1 : 0;
  // Series dots: filled for volumes you have read, gold for this one
  const volumes = book.series && book.seriesTotal ? Array.from({ length: book.seriesTotal }, (_, i) => {
    const n = i + 1;
    const mine = allBooks.find((b: Book) => b.series === book.series && b.seriesNumber === n);
    return n === book.seriesNumber ? 'here' : (mine && mine.status === 'read' ? 'have' : '');
  }) : [];
  return (<div className="paper right">
    <div className="paper-inner">
    <div className="pg-kicker">Your reading</div>
    {book.rating > 0
      ? (<div className="stars" aria-label={`${book.rating} out of ${STAR_COUNT} stars`}>{Array.from({ length: STAR_COUNT }, (_, i) =>
        <span key={i} className={'star' + (i < book.rating ? ' on' : '')}>★</span>)}</div>)
      : <div className="pg-author">Not rated yet</div>}
    <div><span className={'status-chip st-' + book.status}>{STATUS_LABELS[book.status]}</span></div>
    <dl className="facts">
      {book.startedAt && <React.Fragment><dt>Started</dt><dd>{SL.formatShortDate(book.startedAt)}</dd></React.Fragment>}
      {book.finishedAt && <React.Fragment><dt>Finished</dt><dd>{SL.formatShortDate(book.finishedAt)}</dd><dt>Took</dt><dd>{readDays} {readDays === 1 ? 'day' : 'days'}</dd></React.Fragment>}
      {book.status === 'reading' && <React.Fragment><dt>So far</dt><dd>{SL.daysBetween(book.startedAt, today) + 1} days</dd></React.Fragment>}
      <dt>Genre</dt><dd>{genre.name}</dd>
      <dt>Age</dt><dd>{AGE_LABELS[book.age]}</dd>
      <dt>Pages</dt><dd>{book.pages}</dd>
    </dl>
    {volumes.length > 0 && (<div><div className="pg-kicker">{SL.seriesLabel(book)}</div>
      <div className="series-dots">{volumes.map((state, i) => <i key={i} className={state}  />)}</div></div>)}
    {book.notes && <p className="pg-note">{book.notes}</p>}
    <div className="pg-num">iii</div>
  </div></div>);
}

export { AGE_LABELS, STATUS_LABELS, STAR_COUNT, SummaryPage, StatsPage };
