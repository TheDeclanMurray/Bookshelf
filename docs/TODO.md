# TODO

## Now
- [x] Planning and architecture
- [x] Repo scaffold (folders, ignores, README, CLAUDE.md)
- [x] Phase 0 prototype (published as a claude.ai Artifact)
  - [x] Generated spines (cover color, genre font, thickness from pages, series number)
  - [x] Swipe track: TBR ← Currently Reading → genres → Youth → DNF, empty bookcases hidden
  - [x] Full bookcases continue into a copy ("Fantasy II")
  - [x] Pull-out → turn to cover → open to summary and stats
  - [x] Currently Reading on a carved marble stand (desk removed)
  - [x] Round 2 feedback: faster pull-out and put-back, easier swipe, no hover lift, consistent series stickers
  - [x] Per-bookcase sort order (button on the plaque)
  - [x] Round 3 feedback: slightly slower pull-out, close cover before putting back, 3D marble column stand
  - [x] Round 4 feedback: smoother pick-up and put-back (Web Animations, no re-render on pick)
  - [x] Round 5: fix put-back landing in the wrong place, fewer redraws (docs/RENDERING.md)
  - [x] Round 6: Ionic column, column rendered once as an image
  - [x] Round 7: spines drawn once and cached in the browser; bookcase frames photographed per theme (docs/RENDERING.md). Rendering work for Phase 0 is done
  - [x] Round 7 fix: bookcase frames off-centre on the phone (host `img` max-width rule), confirmed fixed on device
  - [ ] **Try round 6 on the iPhone and report what feels off** (spines and frames look the same as before, swiping feels lighter, first launch time)
  - [x] Decide: stand or desk (stand, now marble)
  - [ ] Decide: keep CSS 3D, or schedule the Three.js test earlier

## Next (after the prototype feedback)
- [ ] Later: also keep spine pictures in S3 so a new device (or a sibling's phone) skips drawing
- [ ] Art upgrade: AI-generated or free carved-wood textures and ornaments to replace the CSS/SVG drawing
- [ ] Real spine fonts check on device (fonts load from Google Fonts)
- [ ] Phase 1 (plan in docs/PHASE-1.md): Vite + React + TS + PWA scaffold, port the prototype, Vitest, Playwright
- [ ] Terraform: S3/CloudFront/ACM, Cognito, API Gateway, Lambda, DynamoDB, SSM
- [ ] Cloudflare subdomain + ACM DNS validation
- [ ] Metadata proxy Lambda (Hardcover → Google Books → Open Library)
- [ ] Genre mapping table (API subjects → genre/age)
- [ ] "Add genre" screen
- [ ] GitHub Actions: ci.yml and deploy.yml (OIDC)

## Later
- [ ] Phase 2: Stats
- [ ] Phase 3: Three.js comparison test
- [ ] Phase 4: Movies & TV + new-season push alerts
- [ ] Phase 5: Spotify playlist tracking
- [ ] Phase 6: Brothers (shared viewing, add to a sibling's TBR)
