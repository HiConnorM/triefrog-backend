import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { db } from '@triefrog/db';
import { findings, entities } from '@triefrog/db/schema';
import { eq, and } from 'drizzle-orm';
import { FindingsQueryDto } from './dto/findings-query.dto';

export interface RawFinding {
  title: string;
  description: string;
  severity: 'critical' | 'warn';
  category: string;
  entityId?: string;
}

@Injectable()
export class CheckService {
  private readonly logger = new Logger(CheckService.name);

  async getFindings(projectId: string, filters: FindingsQueryDto) {
    const conditions = [eq(findings.projectId, projectId)];

    if (filters.category !== undefined) {
      conditions.push(eq(findings.category, filters.category));
    }
    if (filters.severity !== undefined) {
      conditions.push(eq(findings.severity, filters.severity));
    }
    if (filters.resolved !== undefined) {
      conditions.push(eq(findings.resolved, filters.resolved));
    }

    const results = await db
      .select()
      .from(findings)
      .where(and(...conditions));

    return { findings: results, total: results.length };
  }

  async getOverview(projectId: string) {
    const allFindings = await db
      .select()
      .from(findings)
      .where(and(eq(findings.projectId, projectId), eq(findings.resolved, false)));

    // Compute shippability score
    let score = 100;
    for (const finding of allFindings) {
      if (finding.severity === 'critical') {
        score -= 15;
      } else if (finding.severity === 'warn') {
        score -= 5;
      }
    }
    score = Math.max(0, score);

    // Group findings by category for health cards
    const grouped: Record<string, (typeof findings.$inferSelect)[]> = {};
    for (const finding of allFindings) {
      const cat = finding.category ?? 'general';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(finding);
    }

    const healthCards = Object.entries(grouped).map(([category, catFindings]) => {
      const hasCritical = catFindings.some((f) => f.severity === 'critical');
      const status: 'verified' | 'suspect' | 'critical' = hasCritical
        ? 'critical'
        : 'suspect';

      return {
        category,
        status,
        findingCount: catFindings.length,
        findings: catFindings.map((f) => ({
          id: f.id,
          title: f.title,
          severity: f.severity,
        })),
      };
    });

    // Add verified cards for categories with zero findings
    const knownCategories = ['setup', 'docs', 'security', 'data', 'deploy'];
    for (const cat of knownCategories) {
      if (!grouped[cat]) {
        healthCards.push({
          category: cat,
          status: 'verified',
          findingCount: 0,
          findings: [],
        });
      }
    }

    return {
      projectId,
      shippabilityScore: score,
      healthCards,
    };
  }

  async resolveFinding(findingId: string) {
    const existing = await db
      .select()
      .from(findings)
      .where(eq(findings.id, findingId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Finding ${findingId} not found`);
    }

    await db
      .update(findings)
      .set({ resolved: true, updatedAt: new Date() })
      .where(eq(findings.id, findingId));

    const updated = await db
      .select()
      .from(findings)
      .where(eq(findings.id, findingId))
      .limit(1);

    return updated[0];
  }

  async processFindingsFromSnapshot(
    projectId: string,
    rawFindings: RawFinding[],
  ) {
    this.logger.log(
      `Processing ${rawFindings.length} findings for project ${projectId}`,
    );

    // Delete old unresolved findings for this project
    await db
      .delete(findings)
      .where(and(eq(findings.projectId, projectId), eq(findings.resolved, false)));

    // Insert new findings
    if (rawFindings.length > 0) {
      await db.insert(findings).values(
        rawFindings.map((f) => ({
          projectId,
          title: f.title,
          description: f.description,
          severity: f.severity,
          category: f.category,
          entityId: f.entityId ?? null,
          resolved: false,
        })),
      );
    }

    this.logger.log(
      `Inserted ${rawFindings.length} findings for project ${projectId}`,
    );
  }

  async generateFindingsFromEntities(projectId: string): Promise<RawFinding[]> {
    const projectEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.projectId, projectId));

    const rawFindings: RawFinding[] = [];

    const types = projectEntities.map((e) => e.type.toLowerCase());
    const hasEnvVarEntities = types.some(
      (t) => t.includes('env-var') || t.includes('env_var'),
    );
    const hasEnvExample = projectEntities.some(
      (e) => e.name?.toLowerCase().includes('.env.example'),
    );
    const hasBuildScript = projectEntities.some(
      (e) =>
        e.name?.toLowerCase() === 'build' &&
        e.type?.toLowerCase().includes('script'),
    );
    const hasDbTables = types.some(
      (t) => t.includes('db-table') || t.includes('table'),
    );
    const hasDeployTarget = types.some((t) => t.includes('deploy'));

    // Check for .env.example
    if (!hasEnvExample && hasEnvVarEntities) {
      rawFindings.push({
        title: 'Missing .env.example',
        description:
          'Env var entities exist but no .env.example file was detected. Add a .env.example to document required environment variables.',
        severity: 'critical',
        category: 'setup',
      });
    }

    // Check env vars without documentation
    for (const entity of projectEntities) {
      const type = entity.type.toLowerCase();
      if (type.includes('env-var') || type.includes('env_var')) {
        const props = (entity.properties ?? {}) as Record<string, unknown>;
        const hasDoc =
          entity.description ||
          props['documented'] ||
          props['description'];
        if (!hasDoc) {
          rawFindings.push({
            title: 'Env vars not documented',
            description: `Environment variable "${entity.name}" has no documentation. Add descriptions to all env vars.`,
            severity: 'warn',
            category: 'docs',
            entityId: entity.id,
          });
          break; // One finding per project for this rule
        }
      }
    }

    // Check for build script
    if (!hasBuildScript) {
      const buildScriptEntity = projectEntities.find(
        (e) =>
          (e.name?.toLowerCase().includes('build') &&
            e.type?.toLowerCase().includes('script')) ||
          (e.properties as Record<string, unknown>)?.['buildScript'],
      );
      if (!buildScriptEntity) {
        rawFindings.push({
          title: 'Missing build script',
          description:
            'No build script entity was detected. Ensure a build script is defined in your project.',
          severity: 'critical',
          category: 'setup',
        });
      }
    }

    // Check for DB migrations
    if (hasDbTables) {
      const hasMigrations = projectEntities.some((e) => {
        const props = (e.properties ?? {}) as Record<string, unknown>;
        return (
          e.name?.toLowerCase().includes('migration') ||
          props['migrationFolder'] ||
          props['migrations']
        );
      });

      if (!hasMigrations) {
        rawFindings.push({
          title: 'Missing DB migrations',
          description:
            'DB table entities exist but no migration folder was detected in entity properties. Add database migrations to track schema changes.',
          severity: 'warn',
          category: 'data',
        });
      }
    }

    // Check for deploy documentation
    if (hasDeployTarget) {
      const hasDeployDoc = projectEntities.some(
        (e) =>
          e.type?.toLowerCase().includes('doc') &&
          e.name?.toLowerCase().includes('deploy'),
      );
      if (!hasDeployDoc) {
        rawFindings.push({
          title: 'Missing deploy documentation',
          description:
            'Deploy target entities exist but no deploy documentation was found. Add documentation describing the deployment process.',
          severity: 'warn',
          category: 'deploy',
        });
      }
    }

    // Check for exposed secrets
    for (const entity of projectEntities) {
      const type = entity.type.toLowerCase();
      if (type.includes('security') || type.includes('credential')) {
        const props = (entity.properties ?? {}) as Record<string, unknown>;
        if (props['secretExposed'] === true) {
          rawFindings.push({
            title: 'Exposed secret detected',
            description: `Entity "${entity.name}" has secretExposed=true. Rotate credentials immediately and remove secrets from source.`,
            severity: 'critical',
            category: 'security',
            entityId: entity.id,
          });
        }
      }
    }

    return rawFindings;
  }
}
