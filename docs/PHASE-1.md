# Phase 1: Books MVP — plan

_Last updated: 2026-10-26. Builds on `docs/ARCHITECTURE.md` and `docs/SCOPE.md`; this file only adds sequencing, the prototype port and open risks._

### Hosting and auth decisions (2026-10-26)
- **Hosting deferred:** M2 (CloudFront/custom domain) and M8 (CI/CD) pushed until backend is working. Pi serves the frontend via Docker; iPhone accesses over LAN/Tailscale. AWS backend (API Gateway, Lambda, DynamoDB) accessed directly.
- **Auth deferred:** M3 (Cognito passkeys, Face ID, multi-user) pushed to go alongside the hosting update. For now: single hardcoded user (`USER#dmurray`), no login screen, no JWT. The DynamoDB key prefix stays `USER#<id>` so no migration is needed when auth lands.

### M1 progress — DONE ✓
- [x] M1a: prototype running locally as a Vite app with a Playwright smoke test
- [x] M1b: TSX/TS conversion, Vitest port of unit tests, PWA manifest/icons, bundled fonts
- [x] M1c: `noImplicitAny: true` clean (64 tests pass); image assets split out of the JS bundle (310 kB gzip → 105 kB, down from ~1.17 MB with embedded base64); iPhone PWA check passed. (`strict: true` deferred — 60+ strictNullChecks errors; see `tsconfig.json` TODO.)

**iPhone PWA check (manual, needs device on the LAN):**
1. Start dev server: `docker compose up dev` from the repo root — note the LAN IP printed (e.g. `192.168.x.x:5173`). Source files are mounted so edits are picked up without restarting the container. (Fallback: `npm run dev` from `frontend/`, but prefer Docker to avoid orphan processes.)
2. Open Safari on the iPhone, navigate to `http://<LAN-IP>:5173`
3. Add to Home Screen (Share → Add to Home Screen)
4. Launch from the Home Screen (standalone mode)
5. Verify using `docs/RENDERING.md` checklist: spine fonts render, bookcase frames load, stand image loads, swipe track works, pull-out/turn/open animates, no opacity on the 3D book, photographed images are not shifted
6. Turn off Wi-Fi on the device, reload — the offline shelf should still render from the service worker cache

## Summary
Turn the Phase 0 prototype (`src/prototype/`, ~3.3k lines of global-script JS) into the real app at **bookshelf.thedeclanmurray.com**: sign in with Face ID, search and add books, and see them on the shelves exactly as the Artifact looks today. Single user for now; keys are already `USER#<id>`.

**Done when:** a real book can be added from the iPhone, survives reload and reinstall, the shelves look and animate like the prototype, and a push to `main` deploys.

## Settled
| Item | Choice |
|---|---|
| URL | `bookshelf.thedeclanmurray.com`, Cloudflare DNS-only CNAME to CloudFront |
| AWS | Personal account, `us-east-1` (ACM for CloudFront must be there, so everything shares it) |
| Users | Single user; multi-user data model kept |
| Import | None (no Goodreads) |
| Look and feel | The Artifact is the reference; port, don't redesign |

## The port (biggest risk in Phase 1)
The prototype is not module-based: `build.mjs` concatenates files into one `<script>`, UI uses `htm` (no JSX), React/Motion come from CDNs, and files share globals (`SL`, `html`, `DragGuard`, ...). The real app needs:
1. **Vite + React 18 + TS**, npm `react`, `framer-motion`; replace `html\`...\`` with TSX.
2. **ES modules** per file, with types for `Book`, `Read`, `Room`, `Genre` (shared with the Lambdas).
3. **Keep unchanged:** `shelfLogic`, `spineLayout`, `poseSolver`, `texture` logic and their tests (convert to Vitest, same cases); the photographed assets (`assets/*.webp`, `standAsset`, `caseAsset`); the Web Animations stage (`stageMotion`, `bookStage`); everything in `docs/RENDERING.md` (no opacity on the 3D book, `max-width: none` on photographed images, `DESIGN_VERSION` for spines, memoized rooms).
4. **Replace:** `fakeData` with the API/IndexedDB data layer; generated covers with real covers from S3 (spine colors from the cached cover); Google Fonts CDN with bundled fonts (offline PWA).
5. **Drop from the shipped app:** `build.mjs`, `template.html`, `renderStatic.mjs` stay as prototype/asset tooling only.

Acceptance for the port: same screens, swipe, pull-out/turn/open, stand, sort button and series stickers working on the iPhone from fixtures, before any backend exists.

## Milestones
| # | Milestone | Depends on | Notes |
|---|---|---|---|
| M1 | App scaffold + port (fixtures only) | — | Vite/TS/Vitest/Playwright, PWA manifest, safe areas. Verify on iPhone via a preview deploy |
| M2 | Terraform baseline + first deploy | — (parallel with M1) | `infra/`: state bucket (S3 lockfile), S3, CloudFront, ACM, Cloudflare records; empty shell live at the subdomain |
| M3 | Auth | M2 | Cognito Essentials passkeys; login screen; JWT on API calls. Test Face ID in the installed PWA early |
| M4 | API + data | M3 | Lambda CRUD for Book/Read/Genre/Settings, DynamoDB (PITR on), IndexedDB cache with sync, offline reads |
| M5 | Search and add | M4 | Metadata proxy (Hardcover → Google Books → Open Library), SSM token, S3 cover cache, add flow with status, age, genre, rating, series, manual entry |
| M6 | Real covers to spines | M5 | Palette extraction on cached covers, store `spineColors`, bump `DESIGN_VERSION` if the design changes |
| M7 | Shelf features | M4 | Custom genres, genre mapping table (API subjects to genre/age), re-reads, "add next in series to TBR", cover override |
| M8 | CI/CD | M2 | `ci.yml` (lint, types, Vitest, Playwright WebKit), `deploy.yml` (OIDC, apply, sync, invalidate) |
| M9 | Hardening | all | Backups export, offline/install checks on device, cost alarm, README/runbook |

M1 and M2 start together; M8 can land right after M2 so everything after is deployed by CI.

## Risks and checks
- **Port regressions:** rendering fixes in `ISSUES-ENCOUNTERED.md` are easy to lose in a rewrite. Keep the rules in `docs/RENDERING.md` as a checklist for M1 and compare on-device.
- **Passkeys in an installed iOS PWA:** WebAuthn needs a stable relying-party ID (the subdomain) and can behave differently standalone vs Safari. Test in M3; fallback is Safari-only login with a session token the PWA reuses.
- **Cognito passkey config in Terraform:** newer feature; confirm provider support, else use a small `aws_cognito_user_pool` plus CLI/null_resource step.
- **Hardcover limits and gaps:** about 60 req/min, undocumented officially; the fallback chain and manual entry cover gaps.
- **iOS storage eviction:** IndexedDB can be cleared if the PWA goes unused; the server is the source of truth, so the cache is rebuildable.
- **Fonts and offline:** spine fonts must be bundled, or the offline shelf will render in fallbacks.

## Out of scope for Phase 1
Stats, Three.js comparison, movies/TV, Spotify, brothers, Goodreads import (all as in `SCOPE.md`).

## Still open
1. AWS: new IAM role/user for Terraform and a GitHub OIDC role. Do you want me to write the bootstrap Terraform and a short "run this once" doc?
2. Do you want the shell deployed (M2) before the port is finished (M1)? Recommended: yes, so the iPhone install and passkey tests start early.
3. Zone details: the `thedeclanmurray.com` Cloudflare zone ID and an API token (kept out of git) if Terraform should manage the DNS records; otherwise add the records by hand.
