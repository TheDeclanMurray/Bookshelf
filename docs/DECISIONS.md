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
