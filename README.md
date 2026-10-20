# Bookshelf

A personal media tracker styled as an ornate, realistic library. Books first (Read / DNF / TBR / Currently Reading), with movies, TV, and music to follow.

Installable on iPhone as a PWA (Safari → Share → Add to Home Screen).

## Status
Phase 1 in progress (M1a + M1b complete). The Vite app runs locally and installs as a PWA.

## Run

**Dev server (hot reload):**
```bash
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

**Docker (e.g. for iPhone testing over Tailscale on the Pi):**
```bash
docker compose up --build   # → http://<host>:8080
```

**Tests:**
```bash
cd frontend
npm test           # Vitest unit tests
npm run e2e        # Playwright smoke test (dev server must be running)
npm run typecheck  # TypeScript check
```

## More
- `docs/ARCHITECTURE.md` — stack, hosting, data model
- `docs/SCOPE.md` — what's in / out, phases
- `docs/DECISIONS.md` — decision log
- `CLAUDE.md` — project context for Claude Code
