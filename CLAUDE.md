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
- `src/`: application code (not started)
- `src/tests/`: unit and integration tests
- `infra/`: Terraform (to be added in Phase 1)
- `logs/`: runtime logs (gitignored)

## Component Connections
The PWA (IndexedDB cache) calls API Gateway, which calls Lambdas, which read and write DynamoDB.
- The metadata proxy Lambda queries Hardcover, then Google Books, then Open Library, and caches covers in S3.
- Cognito issues the JWTs that the API checks.

## Test Files
- UnitTests: `src/tests/` — run with: `npm test` (Vitest; not yet set up)
- IntegrationTests: `src/tests/e2e/` — run with: `npx playwright test` (not yet set up)

## Progress
- [x] Planning and architecture docs
- [x] Repo scaffold
- [ ] Phase 0 prototype (Artifact)
- [ ] Phase 1 Books MVP
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
