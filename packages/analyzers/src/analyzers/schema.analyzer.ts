import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity, SnapshotEdge, RawFinding } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

const MODEL_REGEX = /^model\s+(\w+)/gm;

export class SchemaAnalyzer implements Analyzer {
  name = 'schema';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const entities: SnapshotEntity[] = [];
    const edges: SnapshotEdge[] = [];
    const findings: RawFinding[] = [];

    const schemaPath = path.join(ctx.repoPath, 'prisma', 'schema.prisma');

    if (!fs.existsSync(schemaPath)) {
      return { entities, edges, findings };
    }

    let schemaContent: string;
    try {
      schemaContent = fs.readFileSync(schemaPath, 'utf-8');
    } catch {
      return { entities, edges, findings };
    }

    // Extract model names
    const models: string[] = [];
    let match: RegExpExecArray | null;
    MODEL_REGEX.lastIndex = 0;
    while ((match = MODEL_REGEX.exec(schemaContent)) !== null) {
      models.push(match[1]);
    }

    // Create db-table entities
    for (const model of models) {
      entities.push({
        externalId: `${ctx.projectId}:db-table:${model}`,
        projectId: ctx.projectId,
        type: 'db-table',
        name: model,
        properties: {
          model,
          source: 'prisma',
        },
      } as SnapshotEntity);
    }

    // Check migrations folder
    const migrationsDir = path.join(ctx.repoPath, 'prisma', 'migrations');
    if (!fs.existsSync(migrationsDir)) {
      findings.push({
        externalId: `${ctx.projectId}:finding:schema:no-migrations-dir`,
        projectId: ctx.projectId,
        category: 'setup',
        severity: 'warning',
        title: 'Prisma migrations directory not found',
        description:
          'A Prisma schema was detected but no migrations directory exists at prisma/migrations. Run `prisma migrate dev` to create your first migration.',
        affectedEntityIds: [],
      } as RawFinding);
    } else {
      const migrationEntries = fs.readdirSync(migrationsDir).filter((f) => {
        const fullPath = path.join(migrationsDir, f);
        return fs.statSync(fullPath).isDirectory();
      });

      if (migrationEntries.length === 0) {
        findings.push({
          externalId: `${ctx.projectId}:finding:schema:empty-migrations`,
          projectId: ctx.projectId,
          category: 'setup',
          severity: 'warning',
          title: 'Prisma migrations directory is empty',
          description:
            'The prisma/migrations directory exists but contains no migrations. Run `prisma migrate dev --name init` to create your first migration.',
          affectedEntityIds: [],
        } as RawFinding);
      }
    }

    // Heuristic edges: api-endpoint -> db-table
    // If an endpoint name (last segment of route) matches a table name (case-insensitive, singular/plural)
    const apiEndpointIds = ctx.files
      .filter((f) => f.includes('/api/'))
      .map((f) => {
        // Extract the route segment name
        const parts = f.split('/').filter(Boolean);
        const apiIdx = parts.indexOf('api');
        if (apiIdx >= 0 && parts[apiIdx + 1]) {
          return { file: f, segment: parts[apiIdx + 1] };
        }
        return null;
      })
      .filter(Boolean) as { file: string; segment: string }[];

    for (const { segment } of apiEndpointIds) {
      for (const model of models) {
        const modelLower = model.toLowerCase();
        const segmentLower = segment.toLowerCase();
        // Simple heuristic: match singular or plural
        if (
          segmentLower === modelLower ||
          segmentLower === modelLower + 's' ||
          segmentLower + 's' === modelLower ||
          segmentLower === modelLower.replace(/y$/, 'ies')
        ) {
          // Find potential endpoint entity IDs by matching segment
          edges.push({
            externalId: `${ctx.projectId}:edge:${segment}->reads->${model}`,
            from: `${ctx.projectId}:api-endpoint:GET:/${segment}`,
            to: `${ctx.projectId}:db-table:${model}`,
            type: 'reads',
          } as SnapshotEdge);

          edges.push({
            externalId: `${ctx.projectId}:edge:${segment}->writes->${model}`,
            from: `${ctx.projectId}:api-endpoint:POST:/${segment}`,
            to: `${ctx.projectId}:db-table:${model}`,
            type: 'writes',
          } as SnapshotEdge);
        }
      }
    }

    return { entities, edges, findings };
  }
}
