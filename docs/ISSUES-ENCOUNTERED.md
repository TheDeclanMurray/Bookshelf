# Issues Encountered

| Date | Issue | Resolution / compromise |
|---|---|---|
| 2026-10-19 | Project kicked off. No issues yet. Known risks: <br>(1) Open Library covers looked up by ISBN are rate-limited (about 100 requests per 5 minutes per IP). <br>(2) Hardcover's API limits are documented only by third parties (about 60 requests/min). <br>(3) Cover colors can't be read from canvas when the image comes from another origin (CORS). | Fetch covers by cover ID or OLID and cache them in our own S3. Proxy and cache Hardcover calls through a Lambda. Do color extraction only on covers we've cached. |
| 2026-10-19 | The sandbox blocks the CDNs the prototype loads libraries from, so the page could not be opened as published | Tested in headless Chromium with the same library versions from npm, served in place of the CDN requests. The CDN check itself happens when the user opens the Artifact. |
| 2026-10-19 | Spine author names were cut off ("BR…") and long titles crowded out the author | The author now shows only when the title still fits at a readable size next to it |
| 2026-10-19 | `node --test src/tests/` fails on Node 22 (treats the folder as a module) | Test script uses a glob: `node --test "src/tests/**/*.test.js"` |
