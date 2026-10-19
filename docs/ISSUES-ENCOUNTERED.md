# Issues Encountered

| Date | Issue | Resolution / compromise |
|---|---|---|
| 2026-10-19 | Project kicked off. No issues yet. Known risks: <br>(1) Open Library covers looked up by ISBN are rate-limited (about 100 requests per 5 minutes per IP). <br>(2) Hardcover's API limits are documented only by third parties (about 60 requests/min). <br>(3) Cover colors can't be read from canvas when the image comes from another origin (CORS). | Fetch covers by cover ID or OLID and cache them in our own S3. Proxy and cache Hardcover calls through a Lambda. Do color extraction only on covers we've cached. |
