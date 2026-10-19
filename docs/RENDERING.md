# How the prototype draws and animates

_Last updated: 2026-10-19. Numbers are from headless Chromium at phone size, not a real iPhone._

## The three stages the browser goes through
1. **React render (JavaScript).** Turns state into a tree of elements and updates the real page (DOM). This is the work we want to avoid repeating.
2. **Style, layout and paint (main thread).** The browser works out sizes and draws pixels for each element's layer.
3. **Compositing (GPU).** Layers are moved, scaled, rotated and faded as ready-made pictures. Changing only `transform` or `opacity` can stay at this stage, which is why it is the cheapest and smoothest.

The goal: animations touch only stage 3, and user actions trigger as little of stage 1 as possible.

## What moves, and how
| Motion | Technique | Runs on |
|---|---|---|
| Swiping between bookcases | Framer Motion changes the track's `transform` directly (no React render per frame) | main thread, transform only |
| Pull-out, turn, cover swing, put-back | Web Animations API (`stageMotion.js`) on `transform` | GPU compositor, even if the page is busy |
| Screen dimming | CSS transition on `opacity` | GPU compositor |
| Hiding the picked spine or stand book | Class toggle on the element (`is-out`) | no React render |
| Stand book fade | CSS transition on `opacity` | GPU compositor |

Rules that follow from this:
- Animate only `transform` and `opacity`. Never width, height, top, left.
- **Never animate `opacity` (or set `will-change: opacity`) on the 3D book.** It flattens the 3D box into a flat card.
- `scale()` leaves depth unscaled; use `scale3d()` for 3D poses.
- Perspective only reaches an element's direct children, so every wrapper in between needs `transform-style: preserve-3d`.
- Use `will-change: transform` only on things that animate, and only while they exist.

## How we avoid redrawing
- Bookcases, spines, the stand and the 3D book are wrapped in `memo`, so React skips them when their inputs have not changed.
- Picking a book hides the real spine by toggling a class instead of changing React state, so nothing re-renders at the moment the motion starts.
- Room objects are reused when nothing about them changed (`roomSignature`), so sorting one bookcase does not redraw the others.
- Only the current screen and its two neighbours are mounted.
- Tap handlers, phases and timers live in refs (no render when they change).
- Textures (marble veins, wood grain) are drawn once, not per element.

## Measured work per action (React elements created, a proxy for render cost)
| Action | Before | After |
|---|---|---|
| Idle for 1.5 s | 0 | 0 |
| Open the cover | 338 | 74 |
| Put back from open | 145 | 57 |
| Change one bookcase's sort | 509 | 193 |
| Endless animations running | 1 | 0 |

Picking a book (221) and swiping to a new screen (253) are mostly mounting new content, which is necessary.

## The handoff between shelf and stage
The stage book is a separate 3D object. To avoid a jump, `poseSolver.js` solves for the exact pose that puts its face on top of the real spine (or the stand book's cover), using the corners measured on screen and the same perspective as the stage. Measured gap at rest: 0-1 px. The solver is unit tested.

## Static parts are drawn once
Anything that does not change is drawn once into a picture instead of being kept as live elements.

| Part | How it is made | Where it is kept |
|---|---|---|
| Stand column (Ionic) | Built in 3D (`ionic.js`, `stand3d.js`), photographed by `npm run render:static` (3x) | `assets/stand.webp`, embedded by `standAsset.js` |
| Bookcase frame (crown, columns, boards, base), one per wood theme (13) | The live bookcase with no books or labels, photographed at 2x | `assets/case-<theme>.webp`, embedded by `caseAsset.js` |
| Each spine | Drawn on a canvas at 2x-3x (`spineLayout.js` decides the layout, `spineCanvas.js` draws it) | Memory plus the browser's IndexedDB (`spineCache.js`) |

What stays live: the plaque and sort button, the tappable spines (now one `<img>` each), the 3D book on the stage, and the page text.

**Spine cache rules**
- The key is the design version + book id + size + pixel ratio + a hash of everything that affects the picture (title, author, genre, color, series, sticker). Change any of them and a new picture is drawn; old ones age out (600 kept).
- A picture is only saved once the web fonts are confirmed loaded. Pictures drawn before that are kept for this visit only and redrawn when the fonts arrive, so wrong letters are never stored.
- The first screen waits up to 1.5 s for saved pictures and 2.5 s for fonts, then draws; slower things finish in the background.
- If IndexedDB is unavailable (private window) everything still works from memory.
- The big 3D copy of a spine on the stage is drawn at the screen's size and not saved.
- To redraw everything after a design change, bump `DESIGN_VERSION` in `spineLayout.js`.

**Re-photographing** (after changing `ionic.js`, `stand3d.js`, `texture.js`, `bookcase.js` or the bookcase CSS): `npm run build:prototype && npm run render:static && npm run build:prototype`. The script refuses to save a photograph that would be cut off by its window.

**Rules for the photographs**
- The stand image must be a flat child of the scene, drawn before the 3D group. Inside the group it would sit at depth 0 and hide the upper part of the leaning book.
- The frame image is placed behind the shelves; spacing elements keep the same sizes, so spines land exactly where they did.

**Measured (headless Chromium, phone size, Fantasy bookcase)**
| | Before | After |
|---|---|---|
| Elements in one bookcase | 221 | 58 |
| Elements in its 19 spines | 143 | 38 |
| Spines using a blend effect | 19 | 0 |
| Whole page, stand screen | 610 | 214 |
| 3D layers on the stand screen | 142 | 4 |
| Returning to the stand after swiping away | 6 fps for a second | 61 fps at once |
| Spines drawn on a second visit | 29 | 0 |
Cost: the page grew from about 135 KB to about 1 MB (the pictures are embedded), which is fine for a prototype. In the real app the pictures are separate cached files.

### Rule: photographed pictures must ignore host image rules
Pages that host the prototype (the claude.ai Artifact wrapper) apply `img { max-width: 100% }`. A photographed picture wider than its box (the 452 px bookcase frame in a 360 px case) is then shrunk but keeps its negative offset, so it sits off-centre. `.case-frame` and `.stand-image` therefore set `max-width: none; max-height: none`. Any new photographed image needs the same. To test, inject `<style>img{max-width:100%}</style>` before the page and check the frame is still centred.

### Rule: hide the side wall at the end of a shelf put-back
The stage is above the shelf, so nothing covers the book's cover edge as it slides home. `bookStage.js` clips `.stage-clip` (the flat perspective wrapper) to the spine's projected width over 30-85% of the put-back. Never put `clip-path` on the 3D book itself: it flattens it.

## Known costs and ideas, in order of payoff
1. ~~Layer count on the Currently Reading screen~~ Done: the column is an image.
2. **Covers and spines are re-rasterized at different sizes.** Could be rendered once to a bitmap and reused.
3. **Three.js (one canvas, one draw call per object, real lighting)** would handle the stand better than ~140 DOM layers. Already planned as a comparison test after the MVP.
4. **Measure on the real phone** with Safari Web Inspector (Timelines and Layers) before optimizing further.
