import * as fs from 'fs';
import * as path from 'path';
import type { RawFinding } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

const HARDCODED_SECRET_REGEX =
  /(?:password|secret|api_?key|token)\s*=\s*["'][^"']{8,}/gi;

export class SecurityAnalyzer implements Analyzer {
  name = 'security';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const findings: RawFinding[] = [];

    // Check if .gitignore exists
    const gitignorePath = path.join(ctx.repoPath, '.gitignore');
    const gitignoreExists = fs.existsSync(gitignorePath);

    if (!gitignoreExists) {
      findings.push({
        externalId: `${ctx.projectId}:finding:security:no-gitignore`,
        projectId: ctx.projectId,
        category: 'security',
        severity: 'critical',
        title: '.gitignore file is missing',
        description:
          'No .gitignore file was found. Without a .gitignore, sensitive files like .env, node_modules, and build artifacts may be accidentally committed to version control.',
        affectedEntityIds: [],
      } as RawFinding);
    } else {
      // Check if .env is in .gitignore
      const gitignoreContent = fs.readFileSync(gitignorePath, 'utf-8');
      const envIgnored = gitignoreContent
        .split('\n')
        .some((line) => {
          const trimmed = line.trim();
          return trimmed === '.env' || trimmed === '*.env' || trimmed === '.env*';
        });

      if (!envIgnored) {
        findings.push({
          externalId: `${ctx.projectId}:finding:security:env-not-gitignored`,
          projectId: ctx.projectId,
          category: 'security',
          severity: 'critical',
          title: '.env file is not listed in .gitignore',
          description:
            'The .env file does not appear to be excluded in .gitignore. If committed, .env files can expose secrets, API keys, and database credentials. Add ".env" to your .gitignore immediately and rotate any exposed credentials.',
          affectedEntityIds: [],
        } as RawFinding);
      }

      // Check if .env file is actually present (which could mean it was already committed)
      const envPath = path.join(ctx.repoPath, '.env');
      if (fs.existsSync(envPath) && !envIgnored) {
        findings.push({
          externalId: `${ctx.projectId}:finding:security:env-committed`,
          projectId: ctx.projectId,
          category: 'security',
          severity: 'critical',
          title: '.env file exists and is not gitignored',
          description:
            'A .env file was found and it is not excluded by .gitignore. This file may be tracked by git and could expose secrets if pushed to a remote repository. Rotate all credentials and add .env to .gitignore.',
          affectedEntityIds: [],
        } as RawFinding);
      }
    }

    // Scan .ts/.js files for hardcoded secrets
    const codeFiles = ctx.files.filter(
      (f) =>
        (f.endsWith('.ts') || f.endsWith('.js') || f.endsWith('.tsx') || f.endsWith('.jsx')) &&
        !f.includes('node_modules') &&
        !f.endsWith('.d.ts'),
    );

    for (const relFile of codeFiles) {
      const filePath = path.join(ctx.repoPath, relFile);
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        const lines = content.split('\n');

        for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
          const line = lines[lineIdx];
          HARDCODED_SECRET_REGEX.lastIndex = 0;
          const match = HARDCODED_SECRET_REGEX.exec(line);
          if (match) {
            findings.push({
              externalId: `${ctx.projectId}:finding:security:hardcoded-secret:${relFile}:${lineIdx + 1}`,
              projectId: ctx.projectId,
              category: 'security',
              severity: 'critical',
              title: `Possible hardcoded secret in ${relFile}`,
              description: `A potential hardcoded secret was detected at line ${lineIdx + 1} in ${relFile}. Pattern matched: "${match[0].substring(0, 40)}...". Move this value to an environment variable immediately.`,
              affectedEntityIds: [],
            } as RawFinding);
          }
        }
      } catch {
        // ignore unreadable files
      }
    }

    return { entities: [], edges: [], findings };
  }
}
