# Triefrog — Visual Project OS

> Turn "it kinda works" into a system you can see, understand, maintain, and ship.

---

## Architecture at a glance

```
┌────────────────────────────────────────────────┐
│  github.com/HiConnorM/triefrog  (Next.js 15)   │
│  /app/api/* routes call ↓ via fetch()          │
└────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│  Backend microservices  (NestJS + Fastify, running locally)     │
│                                                                 │
│  :3002 connector-service   — projects, repo token storage       │
│  :3003 scanner-service     — repo ingestion, BullMQ worker      │
│  :3004 graph-service       — entities, edges, map/trie payloads │
│  :3005 check-service       — shippability findings + score      │
│  :3006 docs-service        — doc generation + versioning        │
│  :3007 search-service      — Postgres full-text search          │
│  :3008 realtime-service    — SSE scan progress (Redis pub/sub)  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌──────────────────────────────────────┐
│  Infrastructure (Docker Compose)     │
│  Postgres :5432                      │
│  Redis    :6379                      │
│  MinIO    :9000 (S3 compatible)      │
└──────────────────────────────────────┘
```

---

## Quickstart (local dev — recommended)

### Prerequisites
- Node 20+, pnpm 9+
- Docker Desktop (for Postgres, Redis, MinIO)

### 1 — Clone both repos side by side

```bash
# Backend monorepo (this repo)
git clone <this-repo> triefrog-backend
cd triefrog-backend

# Existing frontend
git clone https://github.com/HiConnorM/triefrog triefrog-frontend
```

### 2 — Start infrastructure

```bash
cd triefrog-backend
docker compose up -d postgres redis minio
# Wait ~10 seconds for Postgres to be ready
```

### 3 — Install backend dependencies

```bash
pnpm install
```

### 4 — Set up environment

```bash
cp .env.example .env
# The defaults work out of the box for local dev — no changes needed
```

### 5 — Run DB migrations + seed demo data

```bash
pnpm db:migrate    # Runs prisma migrate dev
pnpm db:seed       # Creates demo org, project, entities, docs, findings
```

After seeding, **copy the printed demo project ID** — you'll need it for the frontend env.

### 6 — Start all backend services

```bash
# Each in a separate terminal (or use a tool like tmux / overmind)
pnpm --filter @triefrog/connector-service dev   # :3002
pnpm --filter @triefrog/scanner-service  dev   # :3003
pnpm --filter @triefrog/graph-service    dev   # :3004
pnpm --filter @triefrog/check-service    dev   # :3005
pnpm --filter @triefrog/docs-service     dev   # :3006
pnpm --filter @triefrog/search-service   dev   # :3007
pnpm --filter @triefrog/realtime-service dev   # :3008
```

Or start everything at once (requires concurrently):
```bash
pnpm dev
```

### 7 — Wire the frontend

```bash
cd ../triefrog-frontend

# Copy the wiring files from this repo
cp ../triefrog-backend/frontend-wiring/.env.local .

# Replace each mock API route with the real backend-wired version
cp ../triefrog-backend/frontend-wiring/lib/backend.ts lib/backend.ts
cp ../triefrog-backend/frontend-wiring/app/api/projects/route.ts          app/api/projects/route.ts
cp ../triefrog-backend/frontend-wiring/app/api/projects/\[id\]/route.ts   "app/api/projects/[id]/route.ts"
cp ../triefrog-backend/frontend-wiring/app/api/projects/\[id\]/findings/route.ts  "app/api/projects/[id]/findings/route.ts"
cp ../triefrog-backend/frontend-wiring/app/api/projects/\[id\]/graph/route.ts     "app/api/projects/[id]/graph/route.ts"
cp ../triefrog-backend/frontend-wiring/app/api/projects/\[id\]/scan/route.ts      "app/api/projects/[id]/scan/route.ts"
cp ../triefrog-backend/frontend-wiring/app/api/docs/route.ts              app/api/docs/route.ts
cp ../triefrog-backend/frontend-wiring/app/api/fixes/route.ts             app/api/fixes/route.ts
cp ../triefrog-backend/frontend-wiring/app/api/integrations/route.ts      app/api/integrations/route.ts
```

### 8 — Fill in the demo IDs

Edit `.env.local` in the frontend repo:
```env
DEMO_PROJECT_ID=<paste the id printed by pnpm db:seed>
DEMO_ORG_ID=<paste the org id printed by pnpm db:seed>
```

### 9 — Start the frontend

```bash
cd triefrog-frontend
pnpm dev   # → http://localhost:3000
```

Open http://localhost:3000 — the UI now loads **real data** from the backend.

---

## Run everything via Docker Compose (one command)

```bash
cd triefrog-backend
docker compose up
# → Frontend:  http://localhost:3100
# → MinIO UI:  http://localhost:9001  (minioadmin / minioadmin_dev)
# → Postgres:  localhost:5432         (triefrog / triefrog_dev_password)
```

> Note: The Docker Compose version bundles a pre-built frontend. For active frontend development, use the local dev approach above.

---

## How a scan works end-to-end

```
User clicks "Scan"
  → POST /api/projects/:id/scan  (Next.js route)
  → POST :3003/scans             (scanner-service)
  → BullMQ job enqueued in Redis

scanner-service worker picks up the job:
  1. Updates Scan status → running
  2. Clones repo (or uses local sample in GITHUB_SCAN_MODE=local)
  3. Runs analyzers:
     - TechStackAnalyzer   → detects Next.js, Prisma, Stripe, etc.
     - RoutesAnalyzer       → maps pages + API endpoints
     - EnvVarsAnalyzer      → finds process.env.* usage
     - SchemaAnalyzer       → parses prisma/schema.prisma
     - ScriptsAnalyzer      → reads package.json scripts
     - DeployAnalyzer       → finds Dockerfile, vercel.json, etc.
     - SecurityAnalyzer     → checks for committed secrets
  4. Uploads ProjectSnapshot JSON → MinIO
  5. Upserts entities + edges     → Postgres
  6. Publishes events:
     - snapshot.created → graph queue   → graph-service rebuilds map
     - snapshot.created → check queue   → check-service generates findings
     - snapshot.created → docs queue    → docs-service generates 7 doc types
  7. Publishes SSE events to Redis → realtime-service → frontend

Frontend receives SSE progress events and shows the scan timeline.
```

---

## API surface (what the frontend calls)

| Frontend route | Backend service | Endpoint |
|---|---|---|
| `GET /api/projects` | connector-service | `GET /projects` |
| `POST /api/projects` | connector-service | `POST /projects` |
| `GET /api/projects/:id` | connector-service + check | `GET /projects/:id` + `GET /projects/:id/overview` |
| `GET /api/projects/:id/graph` | graph-service | `GET /projects/:id/map` |
| `GET /api/projects/:id/findings` | check-service | `GET /projects/:id/findings` |
| `POST /api/projects/:id/scan` | scanner-service | `POST /scans` |
| `GET /api/docs` | docs-service | `GET /projects/:id/docs` |
| `GET /api/fixes` | check-service | `GET /projects/:id/findings` (mapped) |
| `PATCH /api/fixes` | check-service | `PATCH /findings/:id/resolve` |
| `GET /api/integrations` | graph-service | `GET /projects/:id/map` (filtered to integrations) |

---

## Swagger API docs

Each service hosts its own Swagger UI:

| Service | URL |
|---|---|
| auth-service | http://localhost:3001/docs |
| connector-service | http://localhost:3002/docs |
| scanner-service | http://localhost:3003/docs |
| graph-service | http://localhost:3004/docs |
| check-service | http://localhost:3005/docs |
| docs-service | http://localhost:3006/docs |
| search-service | http://localhost:3007/docs |

---

## Project structure (backend monorepo)

```
triefrog-backend/
├── apps/
│   ├── auth-service/       NestJS — JWT, users, orgs, RBAC
│   ├── connector-service/  NestJS — projects CRUD, encrypted repo tokens
│   ├── scanner-service/    NestJS — repo ingestion, BullMQ worker, MinIO upload
│   ├── graph-service/      NestJS — entities/edges, map + trie payloads
│   ├── check-service/      NestJS — shippability findings, score computation
│   ├── docs-service/       NestJS — doc generation from templates
│   ├── search-service/     NestJS — Postgres full-text search
│   └── realtime-service/   NestJS — Redis pub/sub → SSE
├── packages/
│   ├── db/                 Prisma schema + seed script
│   ├── shared-types/       Zod schemas, TypeScript types
│   ├── shared-utils/       Logger, errors, crypto, pagination
│   └── analyzers/          Pluggable repo analyzer library
├── frontend-wiring/        Drop-in replacement files for the frontend
│   ├── lib/backend.ts      Backend client + type mappers
│   └── app/api/*/route.ts  Wired API routes
├── docker-compose.yml
├── .env.example
└── README.md               (this file)
```

---

## Useful commands

```bash
pnpm db:migrate        # Run Prisma migrations
pnpm db:seed           # Seed demo data
pnpm db:studio         # Open Prisma Studio (DB GUI)
pnpm db:reset          # Reset DB (drops all data)

pnpm infra:up          # docker compose up -d (all services)
pnpm infra:down        # docker compose down
pnpm infra:logs        # Stream all docker logs

# Run a single service in dev mode
pnpm --filter @triefrog/scanner-service dev
```

---

## Extending analyzers

Add a new analyzer by implementing the `Analyzer` interface in `packages/analyzers/src/analyzers/`:

```ts
// packages/analyzers/src/analyzers/my-analyzer.ts
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

export class MyAnalyzer implements Analyzer {
  name = 'my-analyzer';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    // ctx.repoPath — cloned repo directory
    // ctx.files    — all file paths
    return { entities: [], edges: [], findings: [] };
  }
}
```

Then register it in `packages/analyzers/src/runner.ts`.

---

## Roadmap

- [ ] GitHub OAuth login (auth-service already has stubs)
- [ ] Incremental scans (diff-based, not full re-clone)
- [ ] PR creation from docs-service (`/docs/export-pr`)
- [ ] OpenSearch indexing in search-service
- [ ] Temporal workflows for long-running scans
- [ ] Vercel / Supabase integration analyzers
