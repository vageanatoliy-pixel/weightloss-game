# WeightLoss Game v1.0 (MVP+)

## Stack
- Frontend: React + TypeScript + Vite (mobile-first, PWA manifest + service worker)
- Backend: Node.js + TypeScript + Express + Zod + JWT
- DB: SQLite + Prisma
- Deploy: Docker Compose

## Run locally
1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure backend env:
   ```bash
   cp backend/.env.example backend/.env
   ```
3. Generate Prisma client + migrate + seed:
   ```bash
   npm run prisma:generate
   npm run prisma:migrate
   npm run seed
   ```
4. Start app:
   ```bash
   npm run dev
   ```
5. Open frontend at `http://localhost:5173`, backend at `http://localhost:4000`.

Demo users:
- admin: `admin@demo.com` / `password123`
- users: `anna@demo.com`, `bob@demo.com`, `carla@demo.com`, `dmytro@demo.com`, `eva@demo.com` / `password123`

## Run with Docker Compose
```bash
docker compose up --build
```

## Tests
```bash
npm run test
```

E2E smoke tests (Playwright):
```bash
npm install
npx playwright install --with-deps chromium
npm run test:e2e
```

Run everything:
```bash
npm run test:all
```

## Smoke test (API)
```bash
# login admin
TOKEN=$(curl -s -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@demo.com","password":"password123"}' | jq -r .token)

# verify health + games + leaderboard privacy
curl -s http://localhost:4000/health
curl -s http://localhost:4000/games -H "Authorization: Bearer $TOKEN" | jq
curl -s http://localhost:4000/games/demo-game-1/leaderboard -H "Authorization: Bearer $TOKEN" | jq

# weigh-in anti-cheat: create + 1 edit allowed, 2nd edit denied
curl -s -X POST http://localhost:4000/games/demo-game-1/weighins \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"roundId":"demo-round-2","weightKg":95.5,"conditions":{"morning":true,"afterToilet":true,"noClothes":true}}' | jq
curl -s -X POST http://localhost:4000/games/demo-game-1/weighins \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"roundId":"demo-round-2","weightKg":95.2,"conditions":{"morning":true,"afterToilet":true,"noClothes":true}}' | jq
curl -s -X POST http://localhost:4000/games/demo-game-1/weighins \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"roundId":"demo-round-2","weightKg":95.0,"conditions":{"morning":true,"afterToilet":true,"noClothes":true}}' | jq

# close round -> no edits
curl -s -X PATCH http://localhost:4000/rounds/demo-round-2/close \
  -H "Authorization: Bearer $TOKEN" | jq
curl -s -X POST http://localhost:4000/games/demo-game-1/weighins \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"roundId":"demo-round-2","weightKg":94.8,"conditions":{"morning":true,"afterToilet":true,"noClothes":true}}' | jq

# IF start/finish/today
curl -s -X POST http://localhost:4000/games/demo-game-1/if/start \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"targetHours":16}' | jq
curl -s -X POST http://localhost:4000/games/demo-game-1/if/finish \
  -H "Authorization: Bearer $TOKEN" | jq
curl -s http://localhost:4000/games/demo-game-1/if/today \
  -H "Authorization: Bearer $TOKEN" | jq
```

## Privacy guarantees
- API leaderboard and round result responses never expose `weightKg` for other users.
- Raw weight is returned only to the owner in weigh-in flow.
- Calories are private; when user enables `PUBLIC_CHECKMARK`, only `Tracked ✅/❌` is public.

## v1.1 additions
- Mobile leaderboard cards (with desktop table fallback).
- IF local notification reminder (1 hour before fast end, after notification permission is granted).
- Playwright smoke tests for auth/home, leaderboard privacy, IF start/finish flow.
- CI workflow for unit + e2e on push/PR: `/Users/imag/Documents/Codex/weightloss-game/.github/workflows/ci.yml`
