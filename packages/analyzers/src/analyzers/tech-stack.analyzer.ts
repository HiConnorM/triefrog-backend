import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

const KNOWN_INTEGRATIONS: Record<string, string[]> = {
  nextjs: ['next'],
  react: ['react'],
  express: ['express'],
  fastify: ['fastify'],
  prisma: ['@prisma/client', 'prisma'],
  stripe: ['stripe'],
  supabase: ['@supabase/supabase-js'],
  firebase: ['firebase', 'firebase-admin'],
  resend: ['resend'],
};

export class TechStackAnalyzer implements Analyzer {
  name = 'tech-stack';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const entities: SnapshotEntity[] = [];
    const techStack: string[] = [];

    // Read package.json
    const pkgPath = path.join(ctx.repoPath, 'package.json');
    let allDeps: Record<string, string> = {};

    if (fs.existsSync(pkgPath)) {
      try {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        allDeps = {
          ...(pkg.dependencies ?? {}),
          ...(pkg.devDependencies ?? {}),
        };
      } catch {
        // ignore parse errors
      }
    }

    // Detect integrations from dependencies
    for (const [integration, packages] of Object.entries(KNOWN_INTEGRATIONS)) {
      const detected = packages.some((pkg) => pkg in allDeps);
      if (detected) {
        techStack.push(integration);
        entities.push({
          externalId: `${ctx.projectId}:integration:${integration}`,
          projectId: ctx.projectId,
          type: 'integration',
          name: integration,
          properties: {
            packages: packages.filter((p) => p in allDeps),
          },
        } as SnapshotEntity);
      }
    }

    // Check for Prisma schema
    const prismaSchemaPath = path.join(ctx.repoPath, 'prisma', 'schema.prisma');
    if (fs.existsSync(prismaSchemaPath) && !techStack.includes('prisma')) {
      techStack.push('prisma');
      entities.push({
        externalId: `${ctx.projectId}:integration:prisma`,
        projectId: ctx.projectId,
        type: 'integration',
        name: 'prisma',
        properties: { packages: ['prisma'] },
      } as SnapshotEntity);
    }

    // Check Dockerfile for deploy hints
    const dockerfilePath = path.join(ctx.repoPath, 'Dockerfile');
    if (fs.existsSync(dockerfilePath)) {
      if (!techStack.includes('docker')) {
        techStack.push('docker');
      }
    }

    // Check docker-compose.yml
    const dockerComposePath = path.join(ctx.repoPath, 'docker-compose.yml');
    if (fs.existsSync(dockerComposePath)) {
      if (!techStack.includes('docker-compose')) {
        techStack.push('docker-compose');
        try {
          const content = fs.readFileSync(dockerComposePath, 'utf-8');
          // Detect services from docker-compose
          const serviceMatches = content.match(/^\s{2}(\w+):/gm);
          if (serviceMatches) {
            for (const match of serviceMatches) {
              const svcName = match.trim().replace(':', '');
              if (['postgres', 'mysql', 'redis', 'mongodb'].includes(svcName)) {
                techStack.push(svcName);
              }
            }
          }
        } catch {
          // ignore
        }
      }
    }

    // Check .env for hints
    const envPath = path.join(ctx.repoPath, '.env');
    if (fs.existsSync(envPath)) {
      try {
        const envContent = fs.readFileSync(envPath, 'utf-8');
        if (envContent.includes('DATABASE_URL') && !techStack.includes('database')) {
          techStack.push('database');
        }
      } catch {
        // ignore
      }
    }

    // Project entity with techStack
    entities.unshift({
      externalId: `${ctx.projectId}:project`,
      projectId: ctx.projectId,
      type: 'project',
      name: ctx.projectId,
      properties: {
        techStack,
      },
    } as SnapshotEntity);

    return { entities, edges: [], findings: [] };
  }
}
