import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity, RawFinding } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

const DEPLOY_FILES: Array<{ file: string; name: string; provider: string }> = [
  { file: 'vercel.json', name: 'Vercel', provider: 'vercel' },
  { file: 'Dockerfile', name: 'Docker', provider: 'docker' },
  { file: 'docker-compose.yml', name: 'Docker Compose', provider: 'docker-compose' },
  { file: '.railway.json', name: 'Railway', provider: 'railway' },
  { file: 'fly.toml', name: 'Fly.io', provider: 'fly' },
  { file: 'render.yaml', name: 'Render', provider: 'render' },
];

const DOC_EXTENSIONS = ['.md', '.txt', '.rst'];

export class DeployAnalyzer implements Analyzer {
  name = 'deploy';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const entities: SnapshotEntity[] = [];
    const findings: RawFinding[] = [];

    const detectedProviders: string[] = [];

    for (const { file, name, provider } of DEPLOY_FILES) {
      const fullPath = path.join(ctx.repoPath, file);
      if (!fs.existsSync(fullPath)) continue;

      detectedProviders.push(provider);

      entities.push({
        externalId: `${ctx.projectId}:deploy-target:${provider}`,
        projectId: ctx.projectId,
        type: 'deploy-target',
        name,
        properties: {
          provider,
          configFile: file,
        },
      } as SnapshotEntity);
    }

    // Check for deploy documentation
    const hasDocs = ctx.files.some((f) => {
      const lower = f.toLowerCase();
      return (
        DOC_EXTENSIONS.some((ext) => lower.endsWith(ext)) &&
        (lower.includes('deploy') || lower.includes('runbook') || lower.includes('readme'))
      );
    });

    if (detectedProviders.length > 0 && !hasDocs) {
      findings.push({
        externalId: `${ctx.projectId}:finding:deploy:no-deploy-doc`,
        projectId: ctx.projectId,
        category: 'documentation',
        severity: 'warning',
        title: 'Deploy configuration found but no deployment documentation',
        description: `Deployment configuration detected (${detectedProviders.join(', ')}) but no deployment documentation was found. Add a DEPLOY.md or README section explaining how to deploy this application.`,
        affectedEntityIds: detectedProviders.map((p) => `${ctx.projectId}:deploy-target:${p}`),
      } as RawFinding);
    }

    // Dockerfile without runbook
    if (detectedProviders.includes('docker')) {
      const hasRunbook = ctx.files.some((f) => {
        const lower = f.toLowerCase();
        return (
          DOC_EXTENSIONS.some((ext) => lower.endsWith(ext)) &&
          (lower.includes('runbook') || lower.includes('run-book') || lower.includes('operations'))
        );
      });

      if (!hasRunbook) {
        findings.push({
          externalId: `${ctx.projectId}:finding:deploy:no-runbook`,
          projectId: ctx.projectId,
          category: 'documentation',
          severity: 'warning',
          title: 'Dockerfile detected but no runbook found',
          description:
            'A Dockerfile was found but no runbook document exists. Add a RUNBOOK.md with instructions for building the Docker image, running the container, configuring environment variables, and troubleshooting common issues.',
          affectedEntityIds: [`${ctx.projectId}:deploy-target:docker`],
        } as RawFinding);
      }
    }

    return { entities, edges: [], findings };
  }
}
