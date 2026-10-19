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
  - [ ] **Try round 3 on the iPhone and report what feels off** (stand look and speed on the real phone, animation timing)
  - [x] Decide: stand or desk (stand, now marble)
  - [ ] Decide: keep CSS 3D, or schedule the Three.js test earlier

## Next (after the prototype feedback)
- [ ] Art upgrade: AI-generated or free carved-wood textures and ornaments to replace the CSS/SVG drawing
- [ ] Real spine fonts check on device (fonts load from Google Fonts)
- [ ] Phase 1: Vite + React + TS + PWA scaffold, Vitest, Playwright
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
