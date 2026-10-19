# Scope

_Last updated: 2026-10-19_

## What this is
A personal media tracker that looks like an ornate, old library. The main user reads mostly audiobooks and uses an iPhone. Books come first; movies, TV and music follow in later phases.

## In scope

### Phase 0: Interactive prototype (claude.ai Artifact)
- Fake book data, generated spines (cover colors, a genre font, thickness from page count)
- Horizontal swipe between bookcases: TBR ← Currently Reading → genres → Youth → DNF
- Tap a spine: the book pulls out and rotates to its cover. Tap the cover: it opens to summary and stats.
- Currently Reading: try both a reading stand and a desk
- AI-generated or free art

### Phase 1: Books MVP
- Search books (Hardcover → Google Books → Open Library) and add one to a shelf
- Statuses: Currently Reading, Read, DNF, TBR
- Genre bookcases for Read books, plus **custom genres**
- Age field (Adult / YA / Kids); YA and Kids books that are Read go to the Youth bookcase
- Series: name and number from the API, or entered manually
  - Spine shows the series number
  - Series books are grouped together on the shelf
  - The book view shows "Book N of M"
  - When you finish a book, the app offers to add the next one to TBR
- 5-star rating, start/finish dates, notes
- Re-reads (more than one Read per book)
- Shelf ordering: library order by default (author → series → number → title), with other orders available
- Empty bookcases hidden; full bookcases continue into a copy to the right
- Cover override (URL or upload); genre and age override
- Face ID (passkey) sign-in, data synced to AWS, works offline
- Installable PWA on iPhone

### Phase 2: Stats
- Books per year/month, pages, genre breakdown, rating distribution, DNF rate, streaks

### Phase 3: Three.js comparison test
- Rebuild the shelf and book interaction in React Three Fiber, then compare it with the CSS 3D version

### Phase 4: Movies & TV (TMDB)
- Movies shown as DVD cases and/or posters
- TV: track the last season and episode watched
- Push alerts for new seasons (iOS web push from the installed app, with a daily scheduled check)

### Phase 5: Music (Spotify)
- Daily snapshots of playlists, with alerts when tracks are removed or become unavailable
- Album art from Spotify / Cover Art Archive. Possibly a record-crate visual.

### Phase 6 (maybe): Brothers
- Accounts for the user's two brothers
- View each other's shelves; add books to each other's TBR

## Out of scope
- Native iOS app or App Store release (could revisit later with a Capacitor wrapper)
- Audiobook-specific data (narrator, runtime)
- Page-by-page or percentage progress tracking
- Barcode scanning (no physical books)
- Importing from Goodreads or StoryGraph (no existing data)
- Public or social features beyond the brothers
- A separate "would recommend" flag (ratings cover this)
