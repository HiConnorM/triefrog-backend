import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity, RawFinding } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

const SECRET_PATTERNS = /^(DATABASE_URL|.*SECRET.*|.*_KEY$|.*_TOKEN$|.*PASSWORD.*|.*PRIVATE.*)/i;
const ENV_VAR_REGEX = /process\.env\.([A-Z_][A-Z0-9_]*)/g;

export class EnvVarsAnalyzer implements Analyzer {
  name = 'env-vars';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const entities: SnapshotEntity[] = [];
    const findings: RawFinding[] = [];

    const documentedVars = new Set<string>();
    const usedVars = new Set<string>();

    // Read documented vars from .env.example and .env.local.example
    for (const envFile of ['.env.example', '.env.local.example', '.env.sample']) {
      const envPath = path.join(ctx.repoPath, envFile);
      if (fs.existsSync(envPath)) {
        try {
          const content = fs.readFileSync(envPath, 'utf-8');
          for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) continue;
            const varName = trimmed.split('=')[0].trim();
            if (varName) documentedVars.add(varName);
          }
        } catch {
          // ignore
        }
      }
    }

    // Scan all .ts/.js files for process.env.VAR_NAME
    const codeFiles = ctx.files.filter(
      (f) =>
        (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')) &&
        !f.includes('node_modules') &&
        !f.includes('.d.ts'),
    );

    for (const file of codeFiles) {
      try {
        const content = fs.readFileSync(path.join(ctx.repoPath, file), 'utf-8');
        let match: RegExpExecArray | null;
        ENV_VAR_REGEX.lastIndex = 0;
        while ((match = ENV_VAR_REGEX.exec(content)) !== null) {
          usedVars.add(match[1]);
        }
      } catch {
        // ignore
      }
    }

    // Scan next.config.js/ts for env: {} blocks
    for (const configFile of ['next.config.js', 'next.config.ts', 'next.config.mjs']) {
      const configPath = path.join(ctx.repoPath, configFile);
      if (fs.existsSync(configPath)) {
        try {
          const content = fs.readFileSync(configPath, 'utf-8');
          // Extract vars from env: { VAR: process.env.VAR } or env: { VAR: '...' }
          const envBlockMatch = content.match(/env\s*:\s*\{([^}]+)\}/s);
          if (envBlockMatch) {
            const envBlock = envBlockMatch[1];
            const keyMatches = envBlock.matchAll(/(\w+)\s*:/g);
            for (const km of keyMatches) {
              usedVars.add(km[1]);
            }
          }
          // Also scan for process.env references in config
          ENV_VAR_REGEX.lastIndex = 0;
          let match: RegExpExecArray | null;
          while ((match = ENV_VAR_REGEX.exec(content)) !== null) {
            usedVars.add(match[1]);
          }
        } catch {
          // ignore
        }
      }
    }

    // Merge documented and used vars
    const allVars = new Set([...documentedVars, ...usedVars]);

    // Create entities
    for (const varName of allVars) {
      const isSecret = SECRET_PATTERNS.test(varName);
      entities.push({
        externalId: `${ctx.projectId}:env-var:${varName}`,
        projectId: ctx.projectId,
        type: 'env-var',
        name: varName,
        properties: {
          documented: documentedVars.has(varName),
          used: usedVars.has(varName),
          isSecret,
        },
      } as SnapshotEntity);
    }

    // Findings: vars used but not documented
    for (const varName of usedVars) {
      if (!documentedVars.has(varName)) {
        findings.push({
          externalId: `${ctx.projectId}:finding:env-undocumented:${varName}`,
          projectId: ctx.projectId,
          category: 'documentation',
          severity: 'warning',
          title: `Env var ${varName} is used but not documented`,
          description: `The environment variable ${varName} is referenced in code but missing from .env.example. Add it with a placeholder value so other developers know it's required.`,
          affectedEntityIds: [`${ctx.projectId}:env-var:${varName}`],
        } as RawFinding);
      }
    }

    // Findings: secret-looking vars
    for (const varName of allVars) {
      if (SECRET_PATTERNS.test(varName)) {
        findings.push({
          externalId: `${ctx.projectId}:finding:env-secret:${varName}`,
          projectId: ctx.projectId,
          category: 'security',
          severity: 'warning',
          title: `Potential secret env var: ${varName}`,
          description: `The environment variable ${varName} appears to contain sensitive credentials. Ensure it is never committed to version control and is rotated if exposed.`,
          affectedEntityIds: [`${ctx.projectId}:env-var:${varName}`],
        } as RawFinding);
      }
    }

    return { entities, edges: [], findings };
  }
}
