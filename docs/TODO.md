# TODO

## Now
- [x] Planning and architecture
- [x] Repo scaffold (folders, ignores, README, CLAUDE.md)
- [ ] Phase 0 prototype (claude.ai Artifact)
  - [ ] Source art: ornate bookcase, wood textures, reading stand, desk (AI-generated or free)
  - [ ] Generated spine component (colors, genre font, thickness, series number)
  - [ ] Swipe track: TBR ← Currently Reading → genres → Youth → DNF
  - [ ] Book pull-out → rotate → open animation
  - [ ] Currently Reading: stand vs desk versions
  - [ ] Test on iPhone, then decide whether to keep CSS 3D

## Next (Phase 1: Books MVP)
- [ ] Vite + React + TS + PWA scaffold, Vitest, Playwright
- [ ] Terraform: S3/CloudFront/ACM, Cognito, API Gateway, Lambda, DynamoDB, SSM
- [ ] Cloudflare subdomain + ACM DNS validation
- [ ] Metadata proxy Lambda (Hardcover → Google Books → Open Library)
- [ ] Genre mapping table (API subjects → genre/age)
- [ ] GitHub Actions: ci.yml and deploy.yml (OIDC)

## Later
- [ ] Phase 2: Stats
- [ ] Phase 3: Three.js comparison test
- [ ] Phase 4: Movies & TV + new-season push alerts
- [ ] Phase 5: Spotify playlist tracking
- [ ] Phase 6: Brothers (shared viewing, add to a sibling's TBR)
