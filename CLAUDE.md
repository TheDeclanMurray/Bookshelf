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
- `src/prototype/`: Phase 0 prototype source (logic, fake data, UI files, `build.mjs`) and the built `bookshelf-prototype.html`
- `src/app/`: real application code (Phase 1 port of the prototype: ES modules, still `htm` templates and plain JS; move to TSX/TS next). Run with `npm run dev`; entry is `index.html` -> `src/app/app.js`
- `src/tests/`: unit and integration tests
- `infra/`: Terraform (to be added in Phase 1)
- `logs/`: runtime logs (gitignored)

## Component Connections
The PWA (IndexedDB cache) calls API Gateway, which calls Lambdas, which read and write DynamoDB.
- The metadata proxy Lambda queries Hardcover, then Google Books, then Open Library, and caches covers in S3.
- Cognito issues the JWTs that the API checks.

## Test Files
- UnitTests: `src/tests/*.test.js` (Node's built-in runner; logic and fake data) — run with: `npm test`
- IntegrationTests: `src/tests/e2e/` — run with: `npm run e2e` (set `CHROMIUM_PATH` if the browser is not Playwright's own)

## Progress
- [x] Planning and architecture docs
- [x] Repo scaffold
- [x] Phase 0 prototype (Artifact published; waiting on iPhone feedback)
- [ ] Phase 1 Books MVP (plan: docs/PHASE-1.md)
  - [x] M1a: prototype running locally as a Vite app with a Playwright smoke test
  - [ ] M1b: TSX/TS conversion, Vitest port of unit tests, PWA manifest, bundled fonts
- [ ] Phase 2 Stats
- [ ] Phase 3 Three.js comparison
- [ ] Phase 4 Movies & TV
- [ ] Phase 5 Music (Spotify)
- [ ] Phase 6 Brothers (multi-user)

## Key Constants & Config
- Statuses: `reading`, `read`, `dnf`, `tbr`
- Age: `adult`, `ya`, `kids`
- Default genres: Fantasy, Sci-Fi, Mystery/Thriller, Horror, Romance, Historical Fiction, Literary Fiction, Nonfiction, Biography/Memoir, Self-Help (users can add more)
- Secrets: the Hardcover token lives in SSM Parameter Store and is never put in the frontend or in git

## Known Issues & Decisions
- See `docs/DECISIONS.md` and `docs/ISSUES-ENCOUNTERED.md`.
- All DynamoDB keys are prefixed with `USER#<id>` so more users can be added without a migration.

## Prototype notes
- Edit files in `src/prototype/`, then run `npm run build:prototype` and republish `bookshelf-prototype.html` as an Artifact.
- The stand's column and the bookcase frames are photographs. After changing `ionic.js`, `stand3d.js`, `texture.js`, `bookcase.js` or the bookcase CSS, run `npm run build:prototype && npm run render:static && npm run build:prototype` (needs Playwright; see the header of `renderStatic.mjs`). `standAsset.js`, `caseAsset.js` and `assets/*.webp` are generated and committed.
- Spines are drawn once on a canvas and cached in the browser (`spineLayout.js`, `spineCanvas.js`, `spineCache.js`). Bump `DESIGN_VERSION` in `spineLayout.js` when the spine design changes.
- The book's pull-out and put-back use the Web Animations API (`stageMotion.js`); Framer Motion only drives the swipe track. Never animate `opacity` on the 3D book: it flattens it.
- Photographed `<img>`s (`.case-frame`, `.stand-image`) need `max-width: none`; the Artifact page's `img { max-width: 100% }` otherwise shifts them off-centre.
- How drawing and animation work, and the rules to keep: see `docs/RENDERING.md`.
- Libraries (React, htm, Framer Motion) load from CDNs, so the page only renders where those hosts are reachable.
