# Bookshelf

## Overview
A personal media tracker that looks like an ornate, old library, as a PWA for iPhone.
- Books first (Currently Reading / Read / DNF / TBR); movies, TV and music later.
- Stack:
  - Frontend: React + TypeScript + Vite + Framer Motion (CSS 3D)
  - Backend: AWS serverless (API Gateway, Lambda in TS, DynamoDB, S3, Cognito passkeys), Terraform
  - CI/CD: GitHub Actions
- See `docs/ARCHITECTURE.md` and `docs/SCOPE.md`.

## File & Folder Structure
- `docs/`: architecture, scope, decisions, issues, TODO
- `src/prototype/`: Phase 0 prototype source (logic, fake data, UI files, `build.mjs`) and the built `bookshelf-prototype.html`. Also contains the movies prototype: `movie-data.js`, `movie-setup.js`, `movie-styles.css`, `movie-room.js`, `binder-view.js`, `movie-app.js`, `movies-template.html`, `build-movies.mjs`, and the built `movies-prototype.html`.
- `frontend/`: real application code (Phase 1 port of the prototype). **Prefer Docker for dev** (`docker compose up dev` from the repo root — mounts source for hot reload on port 5173); raw `npm run dev` from this directory also works but leaves orphan processes when the session ends. Entry is `index.html` -> `src/app/app.tsx`
  - `frontend/src/app/`: TypeScript/TSX modules, shared types in `types.ts`; key modules: `db.ts` (IndexedDB CRUD), `useBooks.ts` (book state hook), `BookForm.tsx` (add/edit modal)
  - `frontend/src/tests/`: unit and integration tests
  - `frontend/Dockerfile` + root `docker-compose.yml`: Docker setup for dev testing (e.g. on the Raspberry Pi)
- `infra/`: Terraform (to be added when hosting comes up)
- `logs/`: runtime logs (gitignored)

## Component Connections
The PWA (IndexedDB cache) calls API Gateway, which calls Lambdas, which read and write DynamoDB.
- The metadata proxy Lambda queries Hardcover, then Google Books, then Open Library, and caches covers in S3.
- Cognito issues the JWTs that the API checks.
- **Temporary (pre-backend):** `BookForm.tsx` queries Open Library and Google Books directly from the browser for book-add search and cover images. These calls will be replaced by the metadata Lambda once it exists.

## Test Files
- UnitTests: `frontend/src/tests/unit/*.test.js` (Vitest; logic and fake data for `frontend/src/app`) — run with: `npm test` from `frontend/`; type check with `npm run typecheck`
- Prototype build test: `frontend/src/tests/build.test.mjs` — run with: `npm run test:prototype` from `frontend/`
- IntegrationTests: `frontend/src/tests/e2e/` — run with: `npm run e2e` from `frontend/` (set `CHROMIUM_PATH` if the browser is not Playwright's own)

## Progress
- [x] Planning and architecture docs
- [x] Repo scaffold
- [x] Phase 0 prototype (Artifact published; waiting on iPhone feedback)
- [ ] Phase 1 Books MVP (plan: docs/PHASE-1.md)
  - [x] M1a: prototype running locally as a Vite app with a Playwright smoke test
  - [x] M1b: TSX/TS conversion, Vitest port of unit tests, PWA manifest and icons, bundled fonts
  - [x] M1c: `noImplicitAny` clean, asset splitting, iPhone PWA check passed
  - [x] Hosting decision: deferring CloudFront/CI/CD (M2, M8); Pi serves frontend; AWS backend accessed directly
  - [x] Auth decision: deferring M3 (Cognito passkeys, Face ID) with hosting; single hardcoded user for now
  - [x] Local book storage (IndexedDB) + add/edit/delete UI (`db.ts`, `useBooks.ts`, `BookForm.tsx`) — books persist on device; fake data removed
  - [ ] M4: AWS backend (Lambda CRUD, DynamoDB, IndexedDB sync) — deferred until hosting milestone
- [ ] Phase 2 Stats
- [ ] Phase 3 Three.js comparison
- [ ] Phase 4 Movies & TV
- [ ] Phase 5 Music (Spotify)
- [ ] Phase 6 Brothers (multi-user)

## Key Constants & Config
- Statuses: `reading`, `read`, `dnf`, `tbr`
- Age: `adult`, `ya`, `kids`
- Default genres: Fantasy, Sci-Fi, Mystery/Thriller, Horror, Romance, Romantasy, Smut, Historical Fiction, Literary Fiction, Nonfiction, Biography/Memoir, Self-Help (users can add more)
- Genre keys (used as `book.genre` and in `shelfLogic.ts`): `fantasy`, `scifi`, `mystery`, `horror`, `romance`, `romantasy`, `smut`, `historical`, `literary`, `nonfiction`, `biography`, `selfhelp` — keys must match the `GENRES` array in `shelfLogic.ts`; `BookForm.tsx` stores keys on the book, not display names
- Book visual fields: `coverUrl` (Open Library cover URL or `''`), `spineTextColor` (CSS colour string, defaults to `#f5f5f5`), `spineSaturation` (0–100, defaults to 55), `spineLightness` (0–100, defaults to 42) — all optional on the type so older IndexedDB records without them remain valid
- Secrets: the Hardcover token lives in SSM Parameter Store and is never put in the frontend or in git

## Known Issues & Decisions
- See `docs/DECISIONS.md` and `docs/ISSUES-ENCOUNTERED.md`.
- All DynamoDB keys are prefixed with `USER#<id>` so more users can be added without a migration.

## Prototype notes
- Edit files in `src/prototype/`, then run `npm run build:prototype` (from `frontend/`) and republish `bookshelf-prototype.html` as an Artifact.
- The TV shows section visual concept is decided: a **poster wall** — portrait show-posters pinned to a dark study wall with push-pins and slight rotation variation. One poster per show (not per season). Clicking a poster lifts it forward off the wall into a stage view (same pattern as the book pull-out) for metadata display. A concept mockup (poster wall) was published at https://claude.ai/artifact/MDGddYtPtdHw1TRaZ2wyqc. A scroll-archive concept (triangular stone cubbies) was also prototyped but not chosen: https://claude.ai/artifact/SWnreGpcHnzi4YpQqfZ3pM. The old TV Den VHS prototype at https://claude.ai/artifact/WPQw2vZCqijsBP6AX1vVAX is superseded.
- The movies prototype was rebuilt as a self-contained single-file artifact (`movies-step10.html` in the session scratchpad, published at https://claude.ai/artifact/EZEFjvp6PRuZkeqqUStpWT). The original `src/prototype/movie-*.js` source files + `build-movies.mjs` pipeline exist but are **untracked** and were abandoned because `htm` template literal parser silently breaks on `<!-- -->` HTML comments, making the original one-shot build undebuggable. The new file inlines everything and was verified with Playwright screenshots at each build step. If you want to edit the movies prototype, edit `movies-step10.html` (or whatever the current scratchpad file is) and republish directly to that artifact URL — do not use `npm run build:movies`.
- The stand's column and the bookcase frames are photographs. After changing `ionic.js`, `stand3d.js`, `texture.js`, `bookcase.js` or the bookcase CSS, run `npm run build:prototype && npm run render:static && npm run build:prototype` (needs Playwright; see the header of `renderStatic.mjs`). `standAsset.js`, `caseAsset.js` and `assets/*.webp` are generated and committed.
- Spines are drawn once on a canvas and cached in the browser (`spineLayout.js`, `spineCanvas.js`, `spineCache.js`). Bump `DESIGN_VERSION` in `spineLayout.js` when the spine design changes.
- The book's pull-out and put-back use the Web Animations API (`stageMotion.js`); Framer Motion only drives the swipe track. Never animate `opacity` on the 3D book: it flattens it.
- Photographed `<img>`s (`.case-frame`, `.stand-image`) need `max-width: none`; the Artifact page's `img { max-width: 100% }` otherwise shifts them off-centre.
- How drawing and animation work, and the rules to keep: see `docs/RENDERING.md`.
- Libraries (React, htm, Framer Motion) load from CDNs, so the page only renders where those hosts are reachable.
