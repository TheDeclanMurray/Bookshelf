# TODO
<!-- Active items only. Finished items are removed, not ticked off — completed work goes in CLAUDE.md Progress and DECISIONS.md. Reorder by priority as things change. -->

## Now
- [ ] Decide: keep CSS 3D, or schedule the Three.js test earlier
- [ ] Export JSON button (backup before any backend exists)
- [ ] Series auto-fill: when a user types a series name, query an internal DB (or OL) to auto-fill total book count and guess the book number for the current title

## Next (backend + hosting)
- [ ] Terraform: S3/CloudFront/ACM, Cognito, API Gateway, Lambda, DynamoDB, SSM
- [ ] Cloudflare subdomain + ACM DNS validation
- [ ] GitHub Actions: ci.yml and deploy.yml (OIDC)
- [ ] Metadata proxy Lambda (Hardcover → Google Books → Open Library)
- [ ] Genre mapping table (API subjects → genre/age)
- [ ] "Add genre" screen
- [ ] Spine pictures also cached in S3 so a new device skips drawing

## Later
- [ ] Phase 2: Stats
- [ ] Phase 3: Three.js comparison test
- [ ] Phase 4: Movies & TV + new-season push alerts
  - [ ] Movies artifact visual upgrade (before merge into main app), remaining steps:
    1. Binder pull-out animation — binder spine translateZ forward then cross-fades into overlay; open binder also needs 3D treatment (rotateY spring, backface-visibility hidden, centre spine shadow)
    2. Merge movies prototype into main app
- [ ] Phase 5: Spotify playlist tracking
- [ ] Phase 6: Brothers (shared viewing, add to a sibling's TBR)
- [ ] Art upgrade: AI-generated or free carved-wood textures and ornaments to replace the CSS/SVG drawing
