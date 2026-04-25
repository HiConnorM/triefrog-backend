import type { SnapshotEntity, SnapshotEdge, RawFinding } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext } from './types';
import { TechStackAnalyzer } from './analyzers/tech-stack.analyzer';
import { RoutesAnalyzer } from './analyzers/routes.analyzer';
import { EnvVarsAnalyzer } from './analyzers/env-vars.analyzer';
import { SchemaAnalyzer } from './analyzers/schema.analyzer';
import { ScriptsAnalyzer } from './analyzers/scripts.analyzer';
import { DeployAnalyzer } from './analyzers/deploy.analyzer';
import { SecurityAnalyzer } from './analyzers/security.analyzer';

export class AnalyzerRunner {
  private analyzers: Analyzer[] = [
    new TechStackAnalyzer(),
    new RoutesAnalyzer(),
    new EnvVarsAnalyzer(),
    new SchemaAnalyzer(),
    new ScriptsAnalyzer(),
    new DeployAnalyzer(),
    new SecurityAnalyzer(),
  ];

  async run(
    ctx: AnalyzerContext,
    onProgress?: (stage: string) => void,
  ): Promise<{
    entities: SnapshotEntity[];
    edges: SnapshotEdge[];
    findings: RawFinding[];
  }> {
    const allEntities: SnapshotEntity[] = [];
    const allEdges: SnapshotEdge[] = [];
    const allFindings: RawFinding[] = [];

    for (const analyzer of this.analyzers) {
      onProgress?.(analyzer.name);

      try {
        const result = await analyzer.analyze(ctx);
        allEntities.push(...result.entities);
        allEdges.push(...result.edges);
        allFindings.push(...result.findings);
      } catch (err) {
        console.error(`[AnalyzerRunner] Analyzer "${analyzer.name}" failed:`, err);
      }
    }

    // Deduplicate entities by externalId (last one wins)
    const entityMap = new Map<string, SnapshotEntity>();
    for (const entity of allEntities) {
      entityMap.set(entity.externalId, entity);
    }

    // Deduplicate edges by externalId
    const edgeMap = new Map<string, SnapshotEdge>();
    for (const edge of allEdges) {
      edgeMap.set(edge.externalId, edge);
    }

    // Deduplicate findings by externalId
    const findingMap = new Map<string, RawFinding>();
    for (const finding of allFindings) {
      findingMap.set(finding.externalId, finding);
    }

    return {
      entities: Array.from(entityMap.values()),
      edges: Array.from(edgeMap.values()),
      findings: Array.from(findingMap.values()),
    };
  }
}
