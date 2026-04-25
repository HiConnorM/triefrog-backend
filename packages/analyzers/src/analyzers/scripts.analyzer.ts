import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity, RawFinding } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

export class ScriptsAnalyzer implements Analyzer {
  name = 'scripts';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const entities: SnapshotEntity[] = [];
    const findings: RawFinding[] = [];

    const pkgPath = path.join(ctx.repoPath, 'package.json');
    if (!fs.existsSync(pkgPath)) {
      return { entities, edges: [], findings };
    }

    let pkg: { scripts?: Record<string, string> };
    try {
      pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
    } catch {
      return { entities, edges: [], findings };
    }

    const scripts = pkg.scripts ?? {};

    // Create entity for each script
    for (const [scriptName, scriptCommand] of Object.entries(scripts)) {
      entities.push({
        externalId: `${ctx.projectId}:script:${scriptName}`,
        projectId: ctx.projectId,
        type: 'script',
        name: scriptName,
        properties: {
          command: scriptCommand,
        },
      } as SnapshotEntity);
    }

    // Finding: missing 'build' script
    if (!('build' in scripts)) {
      findings.push({
        externalId: `${ctx.projectId}:finding:scripts:missing-build`,
        projectId: ctx.projectId,
        category: 'setup',
        severity: 'critical',
        title: 'Missing "build" script in package.json',
        description:
          'No "build" script was found in package.json. A build script is required for deployment and CI/CD pipelines. Add one such as `"build": "next build"` or `"build": "tsc"`.',
        affectedEntityIds: [],
      } as RawFinding);
    }

    // Finding: missing 'start' script
    if (!('start' in scripts)) {
      findings.push({
        externalId: `${ctx.projectId}:finding:scripts:missing-start`,
        projectId: ctx.projectId,
        category: 'setup',
        severity: 'warning',
        title: 'Missing "start" script in package.json',
        description:
          'No "start" script was found in package.json. A start script is needed to run the application in production. Add one such as `"start": "next start"` or `"start": "node dist/main"`.',
        affectedEntityIds: [],
      } as RawFinding);
    }

    return { entities, edges: [], findings };
  }
}
