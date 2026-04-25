import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ---------------------------------------------------------------------------
  // Teardown (delete-then-recreate for idempotency)
  // Order matters: delete leaf tables first to avoid FK violations
  // ---------------------------------------------------------------------------
  await prisma.auditLog.deleteMany({});
  await prisma.refreshToken.deleteMany({});
  await prisma.docLink.deleteMany({});
  await prisma.docVersion.deleteMany({});
  await prisma.doc.deleteMany({});
  await prisma.finding.deleteMany({});
  await prisma.edge.deleteMany({});
  await prisma.entity.deleteMany({});
  await prisma.mapPayload.deleteMany({});
  await prisma.snapshot.deleteMany({});
  await prisma.scan.deleteMany({});
  await prisma.repoConnection.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.teamMember.deleteMany({});
  await prisma.team.deleteMany({});
  await prisma.orgMember.deleteMany({});
  await prisma.org.deleteMany({});
  await prisma.user.deleteMany({});

  // ---------------------------------------------------------------------------
  // Org
  // ---------------------------------------------------------------------------
  const org = await prisma.org.create({
    data: {
      name: 'Demo Org',
      slug: 'demo',
    },
  });
  console.log(`Created org: ${org.name} (${org.id})`);

  // ---------------------------------------------------------------------------
  // User
  // ---------------------------------------------------------------------------
  const passwordHash = await hash('password123', 12);
  const user = await prisma.user.create({
    data: {
      email: 'demo@triefrog.dev',
      name: 'Demo User',
      passwordHash,
    },
  });
  console.log(`Created user: ${user.email} (${user.id})`);

  // ---------------------------------------------------------------------------
  // OrgMember
  // ---------------------------------------------------------------------------
  await prisma.orgMember.create({
    data: {
      orgId: org.id,
      userId: user.id,
      role: 'owner',
    },
  });
  console.log('Created OrgMember (owner)');

  // ---------------------------------------------------------------------------
  // Project
  // ---------------------------------------------------------------------------
  const project = await prisma.project.create({
    data: {
      orgId: org.id,
      name: 'triefrog-web-app',
      description: 'The main Triefrog web application — maps your codebase automatically.',
      repoUrl: 'https://github.com/demo/triefrog-web-app',
      repoProvider: 'github',
      defaultBranch: 'main',
      lastScanAt: new Date(),
    },
  });
  console.log(`Created project: ${project.name} (${project.id})`);

  // ---------------------------------------------------------------------------
  // Scan
  // ---------------------------------------------------------------------------
  const now = new Date();
  const startedAt = new Date(now.getTime() - 1000 * 60 * 3); // 3 min ago
  const endedAt = new Date(now.getTime() - 1000 * 60 * 1);   // 1 min ago

  const scan = await prisma.scan.create({
    data: {
      projectId: project.id,
      status: 'done',
      triggeredBy: user.id,
      startedAt,
      endedAt,
    },
  });
  console.log(`Created scan: ${scan.id}`);

  // ---------------------------------------------------------------------------
  // Snapshot
  // ---------------------------------------------------------------------------
  const snapshot = await prisma.snapshot.create({
    data: {
      projectId: project.id,
      scanId: scan.id,
      s3Key: 'snapshots/demo/v1.json',
      version: 1,
      techStack: {
        framework: 'Next.js',
        language: 'TypeScript',
        orm: 'Prisma',
        deploy: ['Vercel'],
        integrations: ['Stripe', 'Resend'],
      },
    },
  });
  console.log(`Created snapshot: ${snapshot.id}`);

  // ---------------------------------------------------------------------------
  // Entities (~15)
  // ---------------------------------------------------------------------------
  const entityDefs = [
    // project-level entity
    {
      externalId: 'entity:project:triefrog-web-app',
      type: 'project',
      name: 'triefrog-web-app',
      status: 'verified',
      properties: { language: 'TypeScript', framework: 'Next.js' },
      files: ['package.json', 'next.config.ts'],
      posX: 0,
      posY: 0,
    },
    // pages
    {
      externalId: 'entity:page:/dashboard',
      type: 'page',
      name: '/dashboard',
      status: 'verified',
      properties: { route: '/dashboard', auth: true },
      files: ['apps/web/app/(app)/dashboard/page.tsx'],
      posX: -300,
      posY: 150,
    },
    {
      externalId: 'entity:page:/settings',
      type: 'page',
      name: '/settings',
      status: 'verified',
      properties: { route: '/settings', auth: true },
      files: ['apps/web/app/(app)/settings/page.tsx'],
      posX: -100,
      posY: 150,
    },
    {
      externalId: 'entity:page:/api-docs',
      type: 'page',
      name: '/api-docs',
      status: 'suspect',
      properties: { route: '/api-docs', auth: false },
      files: ['apps/web/app/api-docs/page.tsx'],
      posX: 100,
      posY: 150,
    },
    {
      externalId: 'entity:page:/onboarding',
      type: 'page',
      name: '/onboarding',
      status: 'verified',
      properties: { route: '/onboarding', auth: true },
      files: ['apps/web/app/(app)/onboarding/page.tsx'],
      posX: 300,
      posY: 150,
    },
    // api endpoints
    {
      externalId: 'entity:api:/api/users',
      type: 'api-endpoint',
      name: 'GET /api/users',
      status: 'verified',
      properties: { method: 'GET', path: '/api/users', auth: true },
      files: ['apps/api/src/routes/users.ts'],
      posX: -400,
      posY: 300,
    },
    {
      externalId: 'entity:api:/api/projects',
      type: 'api-endpoint',
      name: 'GET /api/projects',
      status: 'verified',
      properties: { method: 'GET', path: '/api/projects', auth: true },
      files: ['apps/api/src/routes/projects.ts'],
      posX: -200,
      posY: 300,
    },
    {
      externalId: 'entity:api:/api/scans',
      type: 'api-endpoint',
      name: 'POST /api/scans',
      status: 'verified',
      properties: { method: 'POST', path: '/api/scans', auth: true },
      files: ['apps/api/src/routes/scans.ts'],
      posX: 0,
      posY: 300,
    },
    {
      externalId: 'entity:api:/api/docs',
      type: 'api-endpoint',
      name: 'GET /api/docs',
      status: 'suspect',
      properties: { method: 'GET', path: '/api/docs', auth: true },
      files: ['apps/api/src/routes/docs.ts'],
      posX: 200,
      posY: 300,
    },
    {
      externalId: 'entity:api:/api/findings',
      type: 'api-endpoint',
      name: 'GET /api/findings',
      status: 'verified',
      properties: { method: 'GET', path: '/api/findings', auth: true },
      files: ['apps/api/src/routes/findings.ts'],
      posX: 400,
      posY: 300,
    },
    // db tables
    {
      externalId: 'entity:db-table:users',
      type: 'db-table',
      name: 'users',
      status: 'verified',
      properties: { table: 'User', orm: 'Prisma' },
      files: ['packages/db/prisma/schema.prisma'],
      posX: -300,
      posY: 450,
    },
    {
      externalId: 'entity:db-table:projects',
      type: 'db-table',
      name: 'projects',
      status: 'verified',
      properties: { table: 'Project', orm: 'Prisma' },
      files: ['packages/db/prisma/schema.prisma'],
      posX: 0,
      posY: 450,
    },
    {
      externalId: 'entity:db-table:scans',
      type: 'db-table',
      name: 'scans',
      status: 'verified',
      properties: { table: 'Scan', orm: 'Prisma' },
      files: ['packages/db/prisma/schema.prisma'],
      posX: 300,
      posY: 450,
    },
    // env-vars
    {
      externalId: 'entity:env-var:DATABASE_URL',
      type: 'env-var',
      name: 'DATABASE_URL',
      status: 'verified',
      properties: { secret: true, usedIn: ['packages/db'] },
      files: ['.env'],
      posX: -200,
      posY: 600,
    },
    {
      externalId: 'entity:env-var:GITHUB_CLIENT_ID',
      type: 'env-var',
      name: 'GITHUB_CLIENT_ID',
      status: 'suspect',
      properties: { secret: true, usedIn: ['apps/api'] },
      files: ['.env'],
      posX: 200,
      posY: 600,
    },
    // integration
    {
      externalId: 'entity:integration:stripe',
      type: 'integration',
      name: 'Stripe',
      status: 'verified',
      properties: { provider: 'stripe', mode: 'live' },
      files: ['apps/api/src/lib/stripe.ts'],
      posX: -100,
      posY: 700,
    },
    // deploy-target
    {
      externalId: 'entity:deploy-target:vercel',
      type: 'deploy-target',
      name: 'Vercel',
      status: 'verified',
      properties: { provider: 'vercel', region: 'iad1' },
      files: ['vercel.json'],
      posX: 100,
      posY: 700,
    },
  ];

  const entities: Record<string, string> = {}; // externalId -> id

  for (const def of entityDefs) {
    const entity = await prisma.entity.create({
      data: {
        projectId: project.id,
        snapshotId: snapshot.id,
        ...def,
      },
    });
    entities[def.externalId] = entity.id;
  }
  console.log(`Created ${entityDefs.length} entities`);

  // ---------------------------------------------------------------------------
  // Edges (~10)
  // ---------------------------------------------------------------------------
  const edgeDefs = [
    // project -> pages
    {
      fromEntityId: entities['entity:project:triefrog-web-app'],
      toEntityId: entities['entity:page:/dashboard'],
      type: 'renders',
      label: 'renders',
    },
    {
      fromEntityId: entities['entity:project:triefrog-web-app'],
      toEntityId: entities['entity:page:/settings'],
      type: 'renders',
      label: 'renders',
    },
    {
      fromEntityId: entities['entity:project:triefrog-web-app'],
      toEntityId: entities['entity:page:/onboarding'],
      type: 'renders',
      label: 'renders',
    },
    // pages -> api endpoints
    {
      fromEntityId: entities['entity:page:/dashboard'],
      toEntityId: entities['entity:api:/api/projects'],
      type: 'calls',
      label: 'fetches projects',
    },
    {
      fromEntityId: entities['entity:page:/dashboard'],
      toEntityId: entities['entity:api:/api/findings'],
      type: 'calls',
      label: 'fetches findings',
    },
    {
      fromEntityId: entities['entity:page:/settings'],
      toEntityId: entities['entity:api:/api/users'],
      type: 'calls',
      label: 'updates user',
    },
    // api endpoints -> db tables
    {
      fromEntityId: entities['entity:api:/api/users'],
      toEntityId: entities['entity:db-table:users'],
      type: 'queries',
      label: 'reads/writes',
    },
    {
      fromEntityId: entities['entity:api:/api/projects'],
      toEntityId: entities['entity:db-table:projects'],
      type: 'queries',
      label: 'reads/writes',
    },
    {
      fromEntityId: entities['entity:api:/api/scans'],
      toEntityId: entities['entity:db-table:scans'],
      type: 'queries',
      label: 'reads/writes',
    },
    // api -> integration
    {
      fromEntityId: entities['entity:api:/api/users'],
      toEntityId: entities['entity:integration:stripe'],
      type: 'calls',
      label: 'creates subscription',
    },
    // db -> env-var
    {
      fromEntityId: entities['entity:db-table:users'],
      toEntityId: entities['entity:env-var:DATABASE_URL'],
      type: 'uses',
      label: 'connection string',
    },
  ];

  for (const edgeDef of edgeDefs) {
    await prisma.edge.create({
      data: {
        projectId: project.id,
        ...edgeDef,
      },
    });
  }
  console.log(`Created ${edgeDefs.length} edges`);

  // ---------------------------------------------------------------------------
  // Findings (~8)
  // ---------------------------------------------------------------------------
  const findingDefs = [
    {
      entityId: entities['entity:env-var:GITHUB_CLIENT_ID'],
      ruleId: 'rule:env-var:undocumented',
      category: 'documentation',
      severity: 'medium',
      title: 'Undocumented environment variable',
      description:
        'GITHUB_CLIENT_ID is used in the codebase but is not documented in .env.example or the setup guide.',
      suggestedActions: [
        'Add GITHUB_CLIENT_ID to .env.example with a placeholder value',
        'Document the variable in the setup guide',
      ],
    },
    {
      entityId: entities['entity:page:/api-docs'],
      ruleId: 'rule:page:no-auth',
      category: 'security',
      severity: 'low',
      title: 'API docs page is publicly accessible',
      description:
        '/api-docs does not require authentication. Ensure sensitive endpoint details are not exposed publicly.',
      suggestedActions: [
        'Add authentication middleware to /api-docs',
        'Review what information is exposed in the API docs',
      ],
    },
    {
      entityId: entities['entity:api:/api/docs'],
      ruleId: 'rule:api:suspect-status',
      category: 'reliability',
      severity: 'medium',
      title: 'GET /api/docs is marked suspect',
      description:
        'The /api/docs endpoint was detected but could not be fully verified. It may be incomplete or unused.',
      suggestedActions: [
        'Review the docs route handler for completeness',
        'Add integration tests for GET /api/docs',
      ],
    },
    {
      entityId: entities['entity:integration:stripe'],
      ruleId: 'rule:integration:no-webhook-verification',
      category: 'security',
      severity: 'high',
      title: 'Stripe webhook signature not verified',
      description:
        'The Stripe webhook handler does not appear to verify the webhook signature. This allows spoofed events.',
      suggestedActions: [
        'Use stripe.webhooks.constructEvent() with STRIPE_WEBHOOK_SECRET',
        'Return 400 for invalid signatures',
        'Add a test for the webhook handler',
      ],
    },
    {
      entityId: entities['entity:db-table:users'],
      ruleId: 'rule:db:missing-index',
      category: 'performance',
      severity: 'medium',
      title: 'Missing index on users.createdAt',
      description:
        'The users table has no index on createdAt. Queries that sort or filter by this column will perform full table scans at scale.',
      suggestedActions: [
        'Add @@index([createdAt]) to the User model in schema.prisma',
        'Run a migration to apply the index',
      ],
    },
    {
      entityId: entities['entity:api:/api/scans'],
      ruleId: 'rule:api:rate-limit',
      category: 'reliability',
      severity: 'high',
      title: 'POST /api/scans has no rate limiting',
      description:
        'The scan trigger endpoint is not rate-limited. A bad actor or runaway client could trigger excessive scans.',
      suggestedActions: [
        'Add per-user rate limiting (e.g. 10 scans/hour)',
        'Return 429 when the limit is exceeded',
        'Log rate-limit violations to the audit log',
      ],
    },
    {
      entityId: entities['entity:project:triefrog-web-app'],
      ruleId: 'rule:project:no-e2e-tests',
      category: 'quality',
      severity: 'low',
      title: 'No end-to-end test suite detected',
      description:
        'No Playwright or Cypress configuration was found. Critical user flows are not covered by automated E2E tests.',
      suggestedActions: [
        'Set up Playwright in apps/web',
        'Write E2E tests for login, onboarding, and dashboard flows',
      ],
    },
    {
      entityId: entities['entity:deploy-target:vercel'],
      ruleId: 'rule:deploy:no-preview-protection',
      category: 'security',
      severity: 'medium',
      title: 'Vercel preview deployments are not password-protected',
      description:
        'Preview deployments on Vercel are publicly accessible. Sensitive features in-progress may be exposed.',
      suggestedActions: [
        'Enable Vercel deployment protection for preview branches',
        'Restrict preview access to your team members',
      ],
    },
  ];

  for (const def of findingDefs) {
    const { suggestedActions, ...rest } = def;
    await prisma.finding.create({
      data: {
        projectId: project.id,
        suggestedActions,
        ...rest,
      },
    });
  }
  console.log(`Created ${findingDefs.length} findings`);

  // ---------------------------------------------------------------------------
  // MapPayload
  // ---------------------------------------------------------------------------
  await prisma.mapPayload.create({
    data: {
      projectId: project.id,
      version: 1,
      payload: {
        nodes: entityDefs.map((e) => ({
          id: entities[e.externalId],
          type: e.type,
          label: e.name,
          status: e.status,
          x: e.posX ?? 0,
          y: e.posY ?? 0,
        })),
        edges: edgeDefs.map((e) => ({
          from: e.fromEntityId,
          to: e.toEntityId,
          type: e.type,
          label: e.label,
        })),
      },
    },
  });
  console.log('Created MapPayload');

  // ---------------------------------------------------------------------------
  // Docs (6) with DocVersions containing real markdown
  // ---------------------------------------------------------------------------
  const docDefs = [
    {
      type: 'readme',
      title: 'README',
      status: 'verified',
      lastVerifiedAt: now,
      contentKey: 'readme-v1',
      content: `# triefrog-web-app

> Automatically map, document, and understand your codebase.

## What is this?

**Triefrog** analyzes your GitHub repository and produces a living architecture map — nodes for every page, API endpoint, database table, integration, and environment variable, with edges showing how they connect.

## Getting started

\`\`\`bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env

# Start the dev server
pnpm dev
\`\`\`

## Tech stack

| Layer       | Technology        |
|-------------|-------------------|
| Framework   | Next.js 14 (App Router) |
| Language    | TypeScript        |
| Database    | PostgreSQL + Prisma |
| Auth        | JWT + refresh tokens |
| Deploy      | Vercel            |
| Payments    | Stripe            |
| Email       | Resend            |

## Repository structure

\`\`\`
apps/
  web/       # Next.js frontend
  api/       # Express API server
packages/
  db/        # Prisma schema + migrations
  ui/        # Shared component library
  config/    # Shared TypeScript / ESLint configs
\`\`\`

## License

MIT
`,
    },
    {
      type: 'setup',
      title: 'Setup Guide',
      status: 'verified',
      lastVerifiedAt: now,
      contentKey: 'setup-v1',
      content: `# Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 9+
- PostgreSQL 15+
- A GitHub OAuth App

## 1. Clone the repo

\`\`\`bash
git clone https://github.com/demo/triefrog-web-app.git
cd triefrog-web-app
pnpm install
\`\`\`

## 2. Environment variables

Copy the example file and fill in each value:

\`\`\`bash
cp .env.example .env
\`\`\`

| Variable              | Description                                    |
|-----------------------|------------------------------------------------|
| \`DATABASE_URL\`        | PostgreSQL connection string                   |
| \`GITHUB_CLIENT_ID\`    | GitHub OAuth App client ID                     |
| \`GITHUB_CLIENT_SECRET\`| GitHub OAuth App client secret                 |
| \`JWT_SECRET\`          | Random secret for signing access tokens        |
| \`REFRESH_TOKEN_SECRET\`| Random secret for signing refresh tokens       |
| \`STRIPE_SECRET_KEY\`   | Stripe secret key (sk_test_… for dev)          |
| \`STRIPE_WEBHOOK_SECRET\`| Stripe webhook signing secret                 |
| \`RESEND_API_KEY\`      | Resend API key for transactional email         |

## 3. Database setup

\`\`\`bash
pnpm --filter @triefrog/db migrate:dev
pnpm --filter @triefrog/db seed
\`\`\`

## 4. Start development servers

\`\`\`bash
pnpm dev
\`\`\`

The web app will be available at [http://localhost:3000](http://localhost:3000).
The API server will be available at [http://localhost:4000](http://localhost:4000).

## 5. Sign in

Use the demo credentials created by the seed script:

- **Email:** demo@triefrog.dev
- **Password:** password123
`,
    },
    {
      type: 'architecture',
      title: 'Architecture Overview',
      status: 'verified',
      lastVerifiedAt: now,
      contentKey: 'architecture-v1',
      content: `# Architecture Overview

## High-level diagram

\`\`\`
Browser ──► Next.js (Vercel)
               │
               ▼
           Express API ──► PostgreSQL (Prisma)
               │
               ├──► GitHub API  (repo scanning)
               ├──► Stripe API  (billing)
               └──► Resend API  (email)
\`\`\`

## Frontend (apps/web)

- **Framework:** Next.js 14 with the App Router
- **Rendering:** Server Components by default; Client Components only for interactive UI
- **Auth:** HTTP-only cookie containing a short-lived JWT; silent refresh via the API
- **Styling:** Tailwind CSS + shadcn/ui
- **State:** React Query for server state; Zustand for ephemeral UI state

## API (apps/api)

- **Runtime:** Node.js + Express
- **Auth middleware:** Validates JWT on every protected route
- **Rate limiting:** express-rate-limit per user per route
- **Scan pipeline:**
  1. Clone / fetch the repo via GitHub API
  2. Walk the file tree, extract entities (pages, API routes, env vars, etc.)
  3. Persist entities and edges to PostgreSQL
  4. Generate the MapPayload JSON
  5. Upload full snapshot JSON to S3

## Database (packages/db)

- **ORM:** Prisma 5
- **Database:** PostgreSQL 15
- **Key models:** Org → Project → Scan → Snapshot → Entity/Edge/Finding/Doc

## Scan worker

Scans run as async jobs. The API creates a \`Scan\` record (status: \`queued\`) and enqueues a job. The worker picks it up, sets status to \`running\`, performs analysis, and writes entities/edges/findings before setting status to \`done\` (or \`failed\`).

## Security considerations

- All API routes require a valid JWT
- Stripe webhooks are verified with the webhook signing secret
- Environment secrets are never logged
- Preview deployments should be protected (see findings)
`,
    },
    {
      type: 'deploy',
      title: 'Deployment Guide',
      status: 'verified',
      lastVerifiedAt: now,
      contentKey: 'deploy-v1',
      content: `# Deployment Guide

## Environments

| Environment | Branch  | URL                            |
|-------------|---------|--------------------------------|
| Production  | main    | https://triefrog.vercel.app    |
| Preview     | PRs     | Auto-generated by Vercel       |

## Vercel setup

1. Import the monorepo into Vercel.
2. Set the **Root Directory** to \`apps/web\` for the frontend project.
3. Set the **Root Directory** to \`apps/api\` for the API project.
4. Add all environment variables from the table in the Setup Guide.

## Database migrations in CI/CD

The deploy pipeline runs migrations automatically before each production deploy:

\`\`\`bash
pnpm --filter @triefrog/db migrate:deploy
\`\`\`

> **Never** run \`migrate:dev\` in production — it may prompt interactively and create shadow databases.

## Rollback procedure

1. Revert the Vercel deployment to the previous build.
2. If a migration was applied, roll it back manually using \`prisma migrate resolve --rolled-back <migration_name>\`.
3. Re-deploy the previous API build.

## Health checks

- \`GET /health\` → returns \`{ status: "ok", db: "connected" }\`
- Vercel monitors uptime automatically and alerts on 5xx spikes.

## Secrets rotation

When rotating a secret (e.g. \`JWT_SECRET\`):
1. Add the new value to Vercel environment variables.
2. Trigger a re-deploy to pick up the new value.
3. Remove the old value.
`,
    },
    {
      type: 'api',
      title: 'API Reference',
      status: 'draft',
      lastVerifiedAt: null,
      contentKey: 'api-v1',
      content: `# API Reference

Base URL: \`https://api.triefrog.vercel.app/v1\`

All endpoints require an \`Authorization: Bearer <token>\` header unless marked **public**.

---

## Authentication

### POST /auth/login

Authenticate with email and password.

**Body**
\`\`\`json
{ "email": "demo@triefrog.dev", "password": "password123" }
\`\`\`

**Response 200**
\`\`\`json
{ "accessToken": "...", "refreshToken": "..." }
\`\`\`

### POST /auth/refresh

Exchange a refresh token for a new access token.

---

## Users

### GET /users/me

Returns the authenticated user's profile.

---

## Projects

### GET /projects

Returns all projects in the authenticated user's organisations.

### POST /projects

Create a new project.

**Body**
\`\`\`json
{
  "orgId": "cuid",
  "name": "my-app",
  "repoUrl": "https://github.com/org/my-app"
}
\`\`\`

### GET /projects/:id

Returns a single project by ID.

---

## Scans

### POST /scans

Trigger a new scan for a project.

**Body**
\`\`\`json
{ "projectId": "cuid" }
\`\`\`

**Response 202** — scan enqueued.

### GET /scans/:id

Returns scan status and metadata.

---

## Findings

### GET /findings

Query findings. Supports \`?projectId=\`, \`?severity=\`, \`?resolved=\`.

### PATCH /findings/:id

Mark a finding resolved.

**Body**
\`\`\`json
{ "resolved": true }
\`\`\`

---

## Docs

### GET /docs

Returns all docs for a project (\`?projectId=\` required).

### GET /docs/:id

Returns a single doc with its latest version content.
`,
    },
    {
      type: 'data-model',
      title: 'Data Model',
      status: 'verified',
      lastVerifiedAt: now,
      contentKey: 'data-model-v1',
      content: `# Data Model

This document describes the key database models and their relationships.

## Entity Relationship overview

\`\`\`
Org ──< OrgMember >── User
 │
 ├──< Team ──< TeamMember >── User
 │
 └──< Project
          │
          ├──< RepoConnection
          ├──< Scan ──1 Snapshot
          ├──< Entity ──< Edge
          │         └──< Finding
          │         └──< DocLink >── Doc ──< DocVersion
          ├──< MapPayload
          └──< AuditLog (via actor User)
\`\`\`

## Key models

### Org
Top-level tenant. Every resource belongs to an org.

| Field     | Type   | Notes                   |
|-----------|--------|-------------------------|
| id        | cuid   | Primary key             |
| name      | String |                         |
| slug      | String | Unique, URL-safe handle |

### Project
A connected GitHub repository being analysed.

| Field          | Type     | Notes                              |
|----------------|----------|------------------------------------|
| repoUrl        | String   | Full GitHub URL                    |
| defaultBranch  | String   | e.g. \`main\`                        |
| lastScanAt     | DateTime | Populated after each scan          |

### Entity
A node on the architecture map. Represents a page, API endpoint, database table, environment variable, integration, or deploy target.

| Field      | Type    | Notes                                              |
|------------|---------|----------------------------------------------------|
| externalId | String  | Stable, human-readable ID. Unique per project.     |
| type       | String  | page \| api-endpoint \| db-table \| env-var \| ... |
| status     | String  | verified \| suspect \| missing \| changed          |
| properties | Json    | Type-specific metadata                             |
| files      | String[]| Source files that define this entity               |

### Edge
A directed relationship between two entities.

| Field  | Type   | Notes                             |
|--------|--------|-----------------------------------|
| type   | String | renders \| calls \| queries \| uses |
| label  | String | Human-readable description        |

### Finding
A detected issue attached to a project or entity.

| Field    | Type   | Notes                                        |
|----------|--------|----------------------------------------------|
| ruleId   | String | Machine-readable rule identifier             |
| category | String | security \| performance \| reliability \| ...  |
| severity | String | critical \| high \| medium \| low \| info    |
| resolved | Boolean| Whether the finding has been dismissed       |

### Snapshot
A point-in-time capture of the repository analysis output.

| Field     | Type | Notes                                  |
|-----------|------|----------------------------------------|
| s3Key     | String | Path to full snapshot JSON in S3     |
| techStack | Json   | Detected framework, language, etc.   |
| version   | Int    | Monotonically increasing             |
`,
    },
  ];

  for (const def of docDefs) {
    const { contentKey, content, ...docFields } = def;
    const doc = await prisma.doc.create({
      data: {
        projectId: project.id,
        ...docFields,
        versions: {
          create: {
            contentKey,
            content,
            version: 1,
          },
        },
      },
    });

    // Link the architecture doc to the project entity
    if (def.type === 'architecture') {
      await prisma.docLink.create({
        data: {
          docId: doc.id,
          entityId: entities['entity:project:triefrog-web-app'],
        },
      });
    }

    // Link the data-model doc to the db tables
    if (def.type === 'data-model') {
      for (const tableKey of [
        'entity:db-table:users',
        'entity:db-table:projects',
        'entity:db-table:scans',
      ]) {
        await prisma.docLink.create({
          data: {
            docId: doc.id,
            entityId: entities[tableKey],
          },
        });
      }
    }

    // Link the api doc to api endpoints
    if (def.type === 'api') {
      for (const apiKey of [
        'entity:api:/api/users',
        'entity:api:/api/projects',
        'entity:api:/api/scans',
        'entity:api:/api/docs',
        'entity:api:/api/findings',
      ]) {
        await prisma.docLink.create({
          data: {
            docId: doc.id,
            entityId: entities[apiKey],
          },
        });
      }
    }
  }
  console.log(`Created ${docDefs.length} docs with versions and doc links`);

  // ---------------------------------------------------------------------------
  // AuditLog — a couple of sample events
  // ---------------------------------------------------------------------------
  await prisma.auditLog.createMany({
    data: [
      {
        eventName: 'org.created',
        actorId: user.id,
        orgId: org.id,
        payload: { orgSlug: org.slug },
      },
      {
        eventName: 'project.created',
        actorId: user.id,
        orgId: org.id,
        payload: { projectId: project.id, projectName: project.name },
      },
      {
        eventName: 'scan.completed',
        actorId: user.id,
        orgId: org.id,
        payload: { scanId: scan.id, projectId: project.id, entitiesFound: entityDefs.length },
      },
    ],
  });
  console.log('Created audit log entries');

  console.log('\nSeed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
