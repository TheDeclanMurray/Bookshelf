# TODO

## Now
- [x] Planning and architecture
- [x] Repo scaffold (folders, ignores, README, CLAUDE.md)
- [x] Phase 0 prototype (published as a claude.ai Artifact)
  - [x] Generated spines (cover color, genre font, thickness from pages, series number)
  - [x] Swipe track: TBR ← Currently Reading → genres → Youth → DNF, empty bookcases hidden
  - [x] Full bookcases continue into a copy ("Fantasy II")
  - [x] Pull-out → turn to cover → open to summary and stats
  - [x] Currently Reading on a stand and on a desk (toggle)
  - [x] Per-bookcase sort order (button on the plaque)
  - [ ] **Try it on the iPhone and report what feels off** (animation speed, spine readability, sizes)
  - [ ] Decide: stand or desk (or keep both as a setting)
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
