# Architecture

_Last updated: 2026-10-19_

## Summary
- **App type:** Progressive Web App (PWA), installed to the iPhone home screen. No App Store or Apple developer account needed.
- **Frontend:** React + TypeScript + Vite, with Framer Motion and CSS 3D transforms for the shelf and book animations.
- **Backend:** AWS serverless: API Gateway (HTTP API), Lambda (TypeScript/Node), DynamoDB, S3, and Cognito with passkeys / Face ID.
- **Hosting:** S3 + CloudFront, on a subdomain of the user's domain. DNS is in Cloudflare.
- **IaC:** Terraform in `infra/`.
- **CI/CD:** GitHub Actions. Tests run on every push/PR; deploys happen from `main`.
- **Containers:** none. Everything is serverless, so Docker would add nothing (see Decisions).

---

## Language choice
**TypeScript end to end, not the Python default.** The frontend has to be TS/React for browser and animation work. Using TS in the Lambdas too means one language, shared types for `Book`, `Read`, etc., and one test runner (Vitest).

## Frontend
| Concern | Choice | Notes |
|---|---|---|
| Framework | React 18 + TypeScript + Vite | |
| Animation | Framer Motion + CSS 3D transforms | Fallback: React Three Fiber (Three.js). A Three.js comparison test is scheduled for after the MVP. |
| PWA | `vite-plugin-pwa` | Service worker, offline shell, install manifest |
| Local cache | IndexedDB (via `idb`) | Shelves render instantly and work offline, then sync to the API |
| Cover color extraction | Canvas-based palette extraction (e.g. `fast-average-color` / `colorthief`) | Run on covers we cache in S3, which avoids CORS-tainted canvas problems |
| Gestures | Framer Motion drag/pan | Swipe between bookcases; tap to pull out a book; tap the cover to open it |
| Tests | Vitest (unit) + Playwright (end-to-end, mobile WebKit viewport) | |

### Screen layout (horizontal swipe track)
```
 ← swipe left-to-right             swipe right-to-left →
[ TBR ] ← [ CURRENTLY READING ] → [ Genre cases (Read)... ] → [ Youth ] → [ DNF ]
              (start screen)
```
- **Currently Reading:** the start screen. The book sits on an ornate reading stand or a desk (the prototype will try both).
- **TBR and DNF:** each is a single bookcase with mixed genres.
- **Genre cases:** one bookcase per genre, holding only books marked Read. The genre name is carved into the top. When a case fills up, a copy of it continues to the right ("Fantasy II").
- **Youth:** books where `age` is YA or Kids and the status is Read. These go here instead of to a genre case.
- **Empty bookcases are hidden.**
- **Default shelf order:** author → series → series number → title. Other orders: date read, rating, color, title.

### Book interaction
1. Tap a spine: the book slides out of the shelf and rotates to show the front cover.
2. Tap the cover: the book opens. The left page shows the summary; the right page shows your rating, dates, series position and notes.
3. Tap outside the book: it closes and goes back on the shelf.

### Generated spines
- **Color:** the dominant and accent colors from the cover.
- **Font:** chosen by genre (each genre has a theme).
- **Height:** a small random variation, seeded by the book ID so it stays the same every time.
- **Thickness:** based on page count, clamped to a min/max.
- **Series number:** shown on the spine. Books in the same series share a consistent spine treatment.

## Backend (AWS)
| Component | Service | Purpose |
|---|---|---|
| Auth | Cognito user pool, **Essentials tier**, passkeys (Face ID) | Free up to 10k monthly active users. Ready for more than one user (e.g. the user's brothers). |
| API | API Gateway HTTP API + Lambda (Node 22, TS) | CRUD for books and reads; proxy for metadata search |
| Database | DynamoDB, on-demand, single table | Point-in-time recovery on |
| Cover cache | S3 bucket served through CloudFront | Covers are copied in once. This avoids the Open Library rate limits, link rot and CORS issues. |
| Secrets | SSM Parameter Store (SecureString) | Hardcover API token. It is never sent to the frontend. |
| Static hosting | S3 + CloudFront + ACM certificate (us-east-1) | |
| DNS | Cloudflare CNAME pointing to CloudFront (DNS-only, not proxied) | ACM validation records also go in Cloudflare |
| Backups | DynamoDB point-in-time recovery + a nightly export to S3 | |
| Scheduled jobs (later) | EventBridge Scheduler + Lambda | TV new-season alerts, Spotify snapshots |

**Expected cost:** about $0–1/month for 1–3 users, almost all within free tiers.

### Metadata sources
| Data | Primary | Fallback |
|---|---|---|
| Search, title, author, description | Hardcover GraphQL API (Bearer token, ~60 requests/min) | Google Books API, Open Library |
| Series name and position | Hardcover | Manual entry |
| Cover image | Hardcover / Open Library (fetched by cover ID, which is not rate-limited) | Google Books, manual URL or upload |
| Page count | Hardcover / Open Library | Google Books, manual |
| Genre | Mapped from API subjects onto our genre list | Manual override |
| Age (Adult/YA/Kids) | Guessed from API subjects | Manual override |

All metadata calls go through a Lambda proxy. That keeps the token private, normalizes results into one shape and caches responses.

### Data model (DynamoDB single table)
Every key is prefixed with `USER#<userId>` so that adding more users later needs no data migration.

| Entity | PK | SK | Key attributes |
|---|---|---|---|
| Book | `USER#<id>` | `BOOK#<bookId>` | title, authors[], seriesName, seriesNumber, pageCount, genreId, age (adult/ya/kids), coverKey, spineColors, description, externalIds{hardcover, openLibrary, googleBooks, isbn} |
| Read | `USER#<id>` | `READ#<bookId>#<readId>` | status (reading/read/dnf/tbr), startedAt, finishedAt, rating (1–5), notes |
| Genre | `USER#<id>` | `GENRE#<genreId>` | name, font, theme, sortOrder, isCustom |
| Settings | `USER#<id>` | `SETTINGS` | default shelf sort, preferred Currently Reading style (stand/desk) |

- One Book can have many Reads, so re-reads are supported.
- A book's current shelf comes from its latest Read's status.
- Media types beyond books (movies, TV, music) will add new entity types (`MOVIE#`, `SHOW#`, `TRACK#`) under the same user partition.

### Multi-user (future: user's brothers)
The data model and auth are ready for this from day one. Later features:
- View a sibling's shelves, read-only.
- Add a book to a sibling's TBR. The Read would carry `addedBy` and show a "from \<name\>" tag.

## Infrastructure as Code
- Terraform lives in `infra/`, with remote state in an S3 backend that has native lockfile locking.
- DNS: either the Cloudflare Terraform provider, or records added by hand, depending on what the user prefers for the existing zone.

## CI/CD (GitHub Actions)
- `ci.yml`: on every push/PR, run lint, type-check, Vitest and a Playwright smoke test.
- `deploy.yml`: on push to `main`, after CI passes:
  - `terraform apply`
  - build the frontend
  - sync it to S3
  - invalidate the CloudFront cache

  AWS auth uses a GitHub OIDC role, so no long-lived keys are stored.

## Prototype phase (before any of the above)
A standalone single-file HTML/React page published as a claude.ai Artifact, using fake data. Purpose: check how the shelf, spines, swipe and pull-out/open animation feel on the iPhone before building the real app.
