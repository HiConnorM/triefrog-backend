"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureSampleRepo = ensureSampleRepo;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
function writeFile(filePath, content) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, content, 'utf-8');
}
async function ensureSampleRepo(repoPath) {
    // If already exists with a package.json, skip creation
    if (fs.existsSync(path.join(repoPath, 'package.json'))) {
        return;
    }
    fs.mkdirSync(repoPath, { recursive: true });
    // package.json
    writeFile(path.join(repoPath, 'package.json'), JSON.stringify({
        name: 'triefrog-sample-app',
        version: '0.1.0',
        private: true,
        scripts: {
            dev: 'next dev',
            build: 'next build',
            start: 'next start',
            lint: 'next lint',
        },
        dependencies: {
            next: '^14.2.0',
            react: '^18.3.0',
            'react-dom': '^18.3.0',
            '@prisma/client': '^5.15.0',
            stripe: '^15.12.0',
            resend: '^3.4.0',
        },
        devDependencies: {
            prisma: '^5.15.0',
            typescript: '^5.5.0',
            '@types/node': '^20.14.0',
            '@types/react': '^18.3.0',
        },
    }, null, 2));
    // next.config.js
    writeFile(path.join(repoPath, 'next.config.js'), `/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
};

module.exports = nextConfig;
`);
    // app/page.tsx
    writeFile(path.join(repoPath, 'app', 'page.tsx'), `export default function HomePage() {
  return (
    <main>
      <h1>Triefrog Sample App</h1>
      <p>Welcome to the sample application.</p>
    </main>
  );
}
`);
    // app/layout.tsx
    writeFile(path.join(repoPath, 'app', 'layout.tsx'), `import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Triefrog Sample App',
  description: 'A sample Next.js application',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
`);
    // app/dashboard/page.tsx
    writeFile(path.join(repoPath, 'app', 'dashboard', 'page.tsx'), `export default function DashboardPage() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Your project overview.</p>
    </div>
  );
}
`);
    // app/settings/page.tsx
    writeFile(path.join(repoPath, 'app', 'settings', 'page.tsx'), `export default function SettingsPage() {
  return (
    <div>
      <h1>Settings</h1>
      <p>Manage your account settings.</p>
    </div>
  );
}
`);
    // app/api/users/route.ts
    writeFile(path.join(repoPath, 'app', 'api', 'users', 'route.ts'), `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const users = await prisma.user.findMany();
  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const user = await prisma.user.create({ data: body });
  return NextResponse.json({ user }, { status: 201 });
}
`);
    // app/api/projects/route.ts
    writeFile(path.join(repoPath, 'app', 'api', 'projects', 'route.ts'), `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const projects = await prisma.project.findMany();
  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const project = await prisma.project.create({ data: body });
  return NextResponse.json({ project }, { status: 201 });
}
`);
    // app/api/scans/route.ts
    writeFile(path.join(repoPath, 'app', 'api', 'scans', 'route.ts'), `import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(request: NextRequest) {
  const scans = await prisma.scan.findMany({
    orderBy: { createdAt: 'desc' },
  });
  return NextResponse.json({ scans });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const scan = await prisma.scan.create({ data: body });
  return NextResponse.json({ scan }, { status: 201 });
}
`);
    // prisma/schema.prisma
    writeFile(path.join(repoPath, 'prisma', 'schema.prisma'), `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  projects  Project[]
}

model Project {
  id        String   @id @default(cuid())
  name      String
  repoUrl   String?
  ownerId   String
  owner     User     @relation(fields: [ownerId], references: [id])
  scans     Scan[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Scan {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id])
  status      String   @default("queued")
  triggeredBy String?
  startedAt   DateTime?
  completedAt DateTime?
  createdAt   DateTime @default(now())
}
`);
    // .env.example
    writeFile(path.join(repoPath, '.env.example'), `# Database
DATABASE_URL=postgresql://user:password@localhost:5432/triefrog_sample

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Resend (email)
RESEND_API_KEY=re_...

# NextAuth
NEXTAUTH_SECRET=your-secret-here
NEXTAUTH_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
`);
    // Dockerfile
    writeFile(path.join(repoPath, 'Dockerfile'), `FROM node:20-alpine AS base

FROM base AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci

FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
EXPOSE 3000
CMD ["npm", "start"]
`);
    // vercel.json
    writeFile(path.join(repoPath, 'vercel.json'), JSON.stringify({
        framework: 'nextjs',
        buildCommand: 'npm run build',
        devCommand: 'npm run dev',
        installCommand: 'npm install',
        regions: ['iad1'],
    }, null, 2));
    // .gitignore
    writeFile(path.join(repoPath, '.gitignore'), `# dependencies
node_modules
.pnp
.pnp.js

# testing
/coverage

# next.js
/.next/
/out/

# production
/build

# misc
.DS_Store
*.pem

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts
`);
}
//# sourceMappingURL=sample-repo.js.map