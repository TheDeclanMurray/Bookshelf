# Decisions Log

| Date | Decision | Why |
|---|---|---|
| 2026-10-19 | Build a PWA, not a native iOS app | Installs to the home screen without the App Store or a $99/yr developer account. Web push works on iOS 16.4+. Can be wrapped with Capacitor later. |
| 2026-10-19 | Host on AWS serverless, managed with Terraform | About $0–1/mo. Supabase's free tier pauses idle projects. AWS matches the user's work stack. The Raspberry Pi was rejected because it adds uptime and maintenance work. |
| 2026-10-19 | Use TypeScript for both frontend and Lambdas, not Python | One language and shared types across the whole stack |
| 2026-10-19 | No Docker | Fully serverless; nothing long-running to containerize |
| 2026-10-19 | Use CSS 3D + Framer Motion first; Three.js as fallback | Lighter and smoother on iPhone. A Three.js comparison test is scheduled after the MVP. |
| 2026-10-19 | Generate spines (cover colors, genre font, page-count thickness) instead of using real spine images | No free API provides spine images |
| 2026-10-19 | Use Hardcover as the primary metadata source; Google Books / Open Library as fallbacks | Hardcover has the best series data; the other two have weak series data |
| 2026-10-19 | Proxy all metadata calls through a Lambda and cache covers in S3 | Keeps the API token private, avoids Open Library rate limits and broken links, and gives CORS-safe images for color extraction |
| 2026-10-19 | Order the swipe track: TBR ← Currently Reading (start) → genres → Youth → DNF; hide empty bookcases | User preference |
| 2026-10-19 | TBR and DNF are single mixed-genre bookcases; Read books get one bookcase per genre | User preference |
| 2026-10-19 | Add an age field (Adult/YA/Kids); YA and Kids books that are Read go to the Youth bookcase | Keeps youth reads out of the adult genre bookcases |
| 2026-10-19 | Use 5-star ratings and no "recommend" flag | Ratings already cover recommending |
| 2026-10-19 | Don't track reading progress | Not needed |
| 2026-10-19 | Default shelf order is library order (author → series → number → title), with other orders selectable | User preference |
| 2026-10-19 | Key all DynamoDB items by user ID from day one | Room to add the user's brothers later without a migration |
| 2026-10-19 | Sign in with Cognito Essentials passkeys (Face ID) | No passwords, and covered by the free tier |
| 2026-10-19 | Host on a subdomain of the user's domain via Cloudflare DNS (DNS-only CNAME to CloudFront) | The user already owns the domain |
| 2026-10-19 | Build the prototype as a claude.ai Artifact | Fastest way to try it on the iPhone before any infrastructure exists |
| 2026-10-19 | Don't install the `.claude/` safety hooks (secret and destructive-git blockers) | They came from an older version of the setup skill and are no longer wanted. `.gitignore` and `.claudeignore` still keep `.env` files out. |
| 2026-10-19 | Prototype is a single HTML file built from small source files in `src/prototype/` (`npm run build:prototype`) | Artifacts must be one page, but the logic stays in separate files so it can be unit-tested |
| 2026-10-19 | Prototype uses React + htm + Framer Motion loaded from CDNs, no JSX build step | Fastest way to test the planned animation stack inside an Artifact |
| 2026-10-19 | Prototype art (bookcases, covers, stand, desk) is drawn with CSS and SVG; covers are generated, not fetched | Artifacts cannot load outside images, and real covers need the backend. AI or stock art can replace this later. |
| 2026-10-19 | Empty bookcases are hidden; the shelves inside a visible bookcase are always drawn | A bookcase with missing shelves would not look like furniture. Tell me if you meant something different. |
| 2026-10-19 | Prototype includes both the reading stand and the desk, with a toggle | User wanted to try both |
| 2026-10-19 | Currently Reading uses a carved marble stand only; the desk is removed | User preferred the stand and asked for intricately carved marble |
| 2026-10-19 | Pull-out is one quick motion (about 0.3 s) while the screen fades at the same time; put-back is one motion (about 0.25 s) | The first version fed the dimming and the pull-out in sequence and felt slow |
| 2026-10-19 | Swiping changes screens after about 10% of the screen width (28 to 56 px) or a quick flick; spines no longer lift on hover | Full-width drags were too long on a phone, and the hover lift got in the way of swiping over books |
| 2026-10-19 | A tap only counts if the finger moved less than 10 px; every touch target lets the swipe through | Swipes that started or ended on a spine were being lost or opening books |
| 2026-10-19 | Each series has one number sticker style: same size (fits the thinnest volume), same color, same number color. Stickers are anchored to the shelf, not to each book's height | User wanted consistent series numbers |
| 2026-10-19 | The reading stand is real 3D geometry (CSS 3D): the top of a Roman column (abacus, echinus, brass rings, fluted shaft) on a thick stepped base, with the book leaning on a marble wedge | User found the flat-drawn stand an odd mix of 2D and 3D and asked for a column top with the book sitting on it |
| 2026-10-19 | Round parts are rings of lit flat facets (20 around, 16 for the shaft) with fixed lighting, and marble veins come from a bitmap drawn once at startup | An SVG-filter texture on every facet stalled the page; a bitmap does not |
| 2026-10-19 | The stand's book and the stage's book cross-fade at handoff | The two 3D views cannot match perspective exactly, and a fade hides the small mismatch |
| 2026-10-19 | Extraction takes about 0.1 s longer (about 0.5 s to settle); putting a book back closes the cover first (0.2 s), then moves the book (about 0.3 s) | User feedback: slightly slower out, and moving with the cover open caused visual glitches |
| 2026-10-19 | The stage plays the book's movements with the Web Animations API (compositor-driven) instead of Framer Motion's per-frame JavaScript; Framer Motion stays for the swipe track | Per-frame JS animation stutters whenever the page is busy; transform animations on the compositor do not |
| 2026-10-19 | The pull-out is one 0.52 s motion plus a separate forward arc; putting back is 0.38 s, starting just before the cover finishes closing (no pause between the two) | Smooth, continuous motion with no dead gap, while still keeping the cover shut before the book moves |
| 2026-10-19 | Bookcases, spines and the stand are memoized and the picked book is hidden by toggling a class | Picking a book used to re-render the stand's ~190 facets exactly when the motion began |
| 2026-10-19 | The stage book's launch pose is solved numerically (`poseSolver.js`) from the measured corners of the real spine or stand book, and the stage has real perspective (1300 px) | The shelf-to-stage handoff must match exactly, or the book snaps when it returns |
| 2026-10-19 | Stage poses use `scale3d`, a roll (`rotateZ`) is allowed, and the stage wrapper uses `preserve-3d` | `scale()` does not scale depth; the stand's stacked turns need a roll; perspective does not pass through a flat wrapper |
| 2026-10-19 | Unchanged bookcases keep the same room object between renders, the 3D book is memoized, and the tap hint pulses 3 times instead of forever | Fewer redraws and no endless animation keeping the GPU busy. See docs/RENDERING.md |
| 2026-10-19 | The column holding the head of the stand is Ionic: scroll capital with cushions and an egg-and-dart echinus, a slender shaft of 24 flutes with fillets, an Attic base, and a thicker stepped plinth | User request |
| 2026-10-19 | The column is photographed once (`renderStand.mjs`) and shown as an image; only the book and its brass lip stay live 3D | The column never moves, so live 3D pieces were pure cost |
| 2026-10-19 | Marble veins use warped fractal noise (the middle contour of the noise), not sines | Sines made dotted loops; noise contours give continuous winding veins |
| 2026-10-19 | Next static candidates are per-book spine bitmaps (cached in the browser and S3) and per-theme bookcase frames | Spines are about 65% of a bookcase's elements and each uses a blend mode; frames are identical across a theme |
| 2026-10-19 | Spines are drawn once on a canvas and shown as one image each, cached in memory and IndexedDB (browser only for now) | A spine was about 7.5 live elements with a blend effect; drawing is deterministic and cheap, and the picture can later also go to S3 |
| 2026-10-19 | Spine layout is a pure module (`spineLayout.js`) separate from drawing (`spineCanvas.js`) | It can be unit tested, and there is one layout for every size (shelf and stage) |
| 2026-10-19 | Bookcase frames are photographed per wood theme at build time; plaque, sort button and spines stay live | The frame is identical for every book in a theme |
| 2026-10-19 | A book's page edges start in shadow and brighten as it leaves the shelf (a CSS color change on an overlay, never opacity) | With real perspective, a book above the screen center shows its bottom edge, which looked like a white flash at the shelf |
| 2026-10-19 | Phase 0 rendering work is finished; covers stay generated drawings until the real app supplies cover images | Real covers are images from the backend, so they need no drawing code |
| 2026-10-19 | Photographed pictures opt out of host image rules (`max-width: none`) | Host pages (the Artifact wrapper) can shrink any `<img>`, which moved the frame off-centre |
| 2026-10-19 | The stage perspective lives on a flat wrapper (`.stage-clip`) that is clipped to the spine width at the end of a shelf put-back | Hides the side wall that neighbours would cover on a real shelf; clip-path on the 3D book itself would flatten it |
| 2026-10-19 | Shelf put-back is two segments: arrive at shelf height first, then push into the slot (stand put-back stays a straight line) | A straight path crossed in front of the shelf board below the slot |
| 2026-10-19 | Shelf books use the slot as the perspective origin while at the shelf; the stand book keeps the stage centre | Face-on at the shelf on every row, with no top or side showing. The origin animation runs on the main thread but is one property on one element |
| 2026-10-19 | App URL is bookshelf.thedeclanmurray.com on the user's personal AWS account, all in us-east-1 | User's domain and account; CloudFront certificates must be in us-east-1, so one region keeps it simple |
| 2026-10-19 | Phase 1 is single-user with no Goodreads import | User decision; data model keeps USER# keys for later |
| 2026-10-19 | Phase 1 ports the prototype to Vite/React/TS modules (TSX instead of htm, npm instead of CDNs, bundled fonts) without redesigning it | The Artifact is the approved look; see docs/PHASE-1.md |
| 2026-10-19 | App code moved to a `frontend/` subdirectory; root holds `docker-compose.yml` and project-level config | Separates frontend from future `infra/` and makes the Docker context clean |
| 2026-10-19 | Docker + Compose added for dev testing (contradicts the earlier "No Docker" entry, which referred to production) | Corporate MDM on the dev laptop blocks Tailscale inbound connections even with a manual firewall rule, making direct iPhone testing impossible. Docker lets the app be built and served on the Raspberry Pi over Tailscale instead |
| 2026-10-19 | Build Docker images on the Raspberry Pi (not cross-compiled on the dev machine) | Pi is ARM64; cross-compiling with buildx and QEMU works but adds setup friction. Building directly on the Pi is simpler for now |
