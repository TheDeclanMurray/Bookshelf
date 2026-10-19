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

## Static parts are photographed once
Anything that never moves is drawn once into an image instead of being kept as live elements.
- **The stand's Ionic column** (plinth, Attic base, 24-flute shaft, scroll capital, abacus, wedge) is built in 3D in `ionic.js`/`stand3d.js`, photographed by `npm run render:stand` (Playwright, 3x pixel ratio, transparent background) into `assets/stand.webp` (84 KB) and embedded by `standAsset.js`. Only the book and its brass lip stay live, in the identical camera, so they line up with the picture.
- Result (headless Chromium): 3D layers on the Currently Reading screen 142 -> 4, page elements 610 -> 472, and returning to the stand after swiping away went from 6 fps for a second to 61 fps straight away.
- Re-run the render whenever `ionic.js`, `stand3d.js` or `texture.js` change: `npm run build:prototype && npm run render:stand && npm run build:prototype`.
- The image must be a flat child of the scene, drawn before the 3D group. Inside the group it would sit at depth 0 and hide the upper part of the leaning book.

## Next candidates (measured on the Fantasy bookcase: 221 elements)
| Part | Elements | Notes |
|---|---|---|
| 19 spines | 143 (about 7.5 each), all using a `multiply` blend overlay | Biggest. One bitmap per book would be 1 element each with no blend |
| Bookcase frame (crown, pilasters, boards, plinth) | 78 | Same for every book in a theme: one image per theme (14 themes) |

Spine bitmaps are drawn once per book on a canvas (title on its side, author, series sticker, bands) at 3x pixel ratio, about 20 KB each, and cached in the browser (IndexedDB) and optionally in S3 so a new device or a sibling's phone does not redraw them and the stage's 3D book can use the same picture. The cache key is book id + design version + pixel ratio, so a design change simply makes new pictures. Fonts must be loaded before drawing. Frames are photographed at build time like the stand.

## Known costs and ideas, in order of payoff
1. ~~Layer count on the Currently Reading screen~~ Done: the column is an image.
2. **Covers and spines are re-rasterized at different sizes.** Could be rendered once to a bitmap and reused.
3. **Three.js (one canvas, one draw call per object, real lighting)** would handle the stand better than ~140 DOM layers. Already planned as a comparison test after the MVP.
4. **Measure on the real phone** with Safari Web Inspector (Timelines and Layers) before optimizing further.
