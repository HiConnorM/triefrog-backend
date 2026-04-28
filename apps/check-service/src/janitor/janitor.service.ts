import { Injectable, Logger } from '@nestjs/common';
import { db } from '@triefrog/db';
import type { JanitorFinding, JanitorReport } from '@triefrog/shared-types';

const DO_NOT_AUTO_FIX = [
  'Auth & authentication logic',
  'Payment processing code',
  'Database migrations',
  'Permission & RBAC systems',
  'Production environment config',
  'Security middleware',
  'Encryption & token handling',
];

@Injectable()
export class JanitorService {
  private readonly logger = new Logger(JanitorService.name);

  async analyze(projectId: string): Promise<JanitorReport> {
    this.logger.log(`Running janitor analysis for project ${projectId}`);

    const [entities, edges, findings, docs] = await Promise.all([
      db.entity.findMany({ where: { projectId } }),
      db.edge.findMany({ where: { projectId } }),
      db.finding.findMany({ where: { projectId } }),
      db.doc.findMany({ where: { projectId }, include: { versions: true } }),
    ]);

    const allFindings: JanitorFinding[] = [];
    let idx = 0;

    const makeId = (category: string) =>
      `${projectId}:janitor:${category}:${idx++}`;

    // Build edge sets for quick lookup
    const entityIdsWithEdges = new Set<string>();
    for (const edge of edges) {
      if (edge.fromEntityId) entityIdsWithEdges.add(edge.fromEntityId);
      if (edge.toEntityId) entityIdsWithEdges.add(edge.toEntityId);
    }

    // 1. hardcoded-secrets — map security findings from DB
    const securityFindings = findings.filter(
      (f) => f.category?.toLowerCase() === 'security',
    );
    for (const sf of securityFindings) {
      allFindings.push({
        id: makeId('hardcoded-secrets'),
        category: 'hardcoded-secrets',
        riskLevel: 'high',
        title: sf.title,
        description: sf.description ?? 'A security finding was detected.',
        affectedFiles: sf.entityId ? [sf.entityId] : [],
        suggestedFix: 'Rotate any exposed credentials and remove secrets from source code immediately.',
        canAutoFix: false,
        githubIssueTitle: `Security: ${sf.title}`,
      });
    }

    // 2. missing-env-example
    const hasEnvVarEntities = entities.some(
      (e) => e.type?.toLowerCase().includes('env-var') || e.type?.toLowerCase().includes('env_var'),
    );
    const hasEnvExample = entities.some((e) =>
      e.name?.toLowerCase().includes('.env.example'),
    );
    const docsHaveEnvSetup = docs.some((d) => {
      const content = JSON.stringify(d).toLowerCase();
      return content.includes('env') || content.includes('environment');
    });
    if (hasEnvVarEntities && !hasEnvExample && !docsHaveEnvSetup) {
      allFindings.push({
        id: makeId('missing-env-example'),
        category: 'missing-env-example',
        riskLevel: 'safe',
        title: 'Missing .env.example file',
        description:
          'Env var entities exist but no .env.example file was detected. New contributors won\'t know which environment variables to set.',
        affectedFiles: ['.env.example'],
        suggestedFix: 'Create a .env.example listing all required environment variable names (with placeholder values).',
        canAutoFix: true,
      });
    }

    // 3. missing-readme
    const hasReadmeDoc = docs.some(
      (d) => (d as Record<string, unknown>)['type'] === 'readme',
    );
    const hasReadmeEntity = entities.some((e) =>
      e.name?.toLowerCase().includes('readme'),
    );
    if (!hasReadmeDoc && !hasReadmeEntity) {
      allFindings.push({
        id: makeId('missing-readme'),
        category: 'missing-readme',
        riskLevel: 'safe',
        title: 'No README detected',
        description:
          'The project has no README document. This makes it harder for contributors and AI tools to understand the project.',
        affectedFiles: ['README.md'],
        suggestedFix: 'Add a README.md describing the project purpose, setup steps, and key architecture decisions.',
        canAutoFix: true,
      });
    }

    // 4. missing-tests
    const hasTestEntities = entities.some(
      (e) =>
        e.name?.toLowerCase().includes('test') ||
        e.name?.toLowerCase().includes('spec') ||
        e.name?.toLowerCase().includes('__tests__'),
    );
    if (!hasTestEntities) {
      allFindings.push({
        id: makeId('missing-tests'),
        category: 'missing-tests',
        riskLevel: 'review',
        title: 'No test files detected',
        description:
          'The project has no test files. AI-generated code often lacks test coverage, making regressions harder to catch.',
        affectedFiles: [],
        suggestedFix: 'Add unit tests for critical paths: auth, payments, API routes. Consider using Vitest or Jest.',
        canAutoFix: false,
      });
    }

    // 5. missing-error-handling
    const apiEndpoints = entities.filter(
      (e) => e.type?.toLowerCase() === 'api-endpoint',
    );
    const hasMiddlewareEntity = entities.some((e) =>
      e.type?.toLowerCase().includes('middleware'),
    );
    if (apiEndpoints.length > 3 && !hasMiddlewareEntity) {
      allFindings.push({
        id: makeId('missing-error-handling'),
        category: 'missing-error-handling',
        riskLevel: 'review',
        title: `${apiEndpoints.length} API routes may lack error handling`,
        description:
          'Multiple API endpoint entities exist but no middleware entity was detected. Without central error handling, unhandled errors may leak stack traces.',
        affectedFiles: apiEndpoints.map((e) => e.name ?? e.id),
        suggestedFix: 'Add a global error-handling middleware (e.g. Express error handler or NestJS ExceptionFilter).',
        canAutoFix: false,
      });
    }

    // 6. dead-routes
    const pageEntities = entities.filter(
      (e) => e.type?.toLowerCase() === 'page',
    );
    const isolatedPages = pageEntities.filter(
      (e) => !entityIdsWithEdges.has(e.id),
    );
    if (isolatedPages.length > 0) {
      allFindings.push({
        id: makeId('dead-routes'),
        category: 'dead-routes',
        riskLevel: 'safe',
        title: `${isolatedPages.length} potentially dead route(s) detected`,
        description:
          'Page entities with no incoming or outgoing edges may be unreachable dead routes.',
        affectedFiles: isolatedPages.map((e) => e.name ?? e.id),
        suggestedFix: 'Verify these pages are linked from navigation or other routes. Remove or connect them.',
        canAutoFix: false,
      });
    }

    // 7. unused-files
    const missingEntities = entities.filter(
      (e) => e.status === 'missing' && !entityIdsWithEdges.has(e.id),
    );
    if (missingEntities.length > 0) {
      allFindings.push({
        id: makeId('unused-files'),
        category: 'unused-files',
        riskLevel: 'safe',
        title: `${missingEntities.length} potentially unused file(s)`,
        description:
          'Entities with status "missing" that appear in no edges may be unused or deleted files still referenced in the graph.',
        affectedFiles: missingEntities.map((e) => e.name ?? e.id),
        suggestedFix: 'Verify these files are truly unused and remove them or update their references.',
        canAutoFix: false,
      });
    }

    // 8. weak-validation
    const hasValidationEntity = entities.some(
      (e) =>
        e.name?.toLowerCase().includes('validation') ||
        e.name?.toLowerCase().includes('validator') ||
        e.name?.toLowerCase().includes('class-validator'),
    );
    const hasValidationFinding = findings.some(
      (f) => f.category?.toLowerCase().includes('validation'),
    );
    if (apiEndpoints.length > 0 && !hasValidationEntity && !hasValidationFinding) {
      allFindings.push({
        id: makeId('weak-validation'),
        category: 'weak-validation',
        riskLevel: 'review',
        title: 'No input validation layer detected',
        description:
          'API endpoints exist but no validation library or middleware was detected. Unvalidated inputs are a common source of bugs and security issues.',
        affectedFiles: apiEndpoints.map((e) => e.name ?? e.id),
        suggestedFix: 'Add input validation using class-validator, zod, or similar. Validate all incoming request bodies.',
        canAutoFix: false,
      });
    }

    // 9. stale-todos
    const todoEntities = entities.filter((e) => {
      const props = JSON.stringify(e.properties ?? '');
      const desc = (e as Record<string, unknown>)['description'] as string | undefined ?? '';
      return (
        props.toLowerCase().includes('todo') ||
        props.toLowerCase().includes('fixme') ||
        desc.toLowerCase().includes('todo') ||
        desc.toLowerCase().includes('fixme')
      );
    });
    if (todoEntities.length > 0) {
      allFindings.push({
        id: makeId('stale-todos'),
        category: 'stale-todos',
        riskLevel: 'safe',
        title: `${todoEntities.length} stale TODO/FIXME comment(s) found`,
        description:
          'Found entities with TODO or FIXME markers in their properties. These may indicate unfinished work.',
        affectedFiles: todoEntities.map((e) => e.name ?? e.id),
        suggestedFix: 'Review and resolve or remove TODO/FIXME comments. Create GitHub issues for any real work items.',
        canAutoFix: false,
      });
    }

    // 10. naming-inconsistency
    const namedEntities = entities.filter(
      (e) =>
        e.type?.toLowerCase() === 'page' ||
        e.type?.toLowerCase() === 'api-endpoint',
    );
    const camelCaseCount = namedEntities.filter((e) =>
      /[a-z][A-Z]/.test(e.name ?? ''),
    ).length;
    const snakeOrKebabCount = namedEntities.filter((e) =>
      /[_-]/.test(e.name ?? ''),
    ).length;
    if (camelCaseCount > 0 && snakeOrKebabCount > 0) {
      allFindings.push({
        id: makeId('naming-inconsistency'),
        category: 'naming-inconsistency',
        riskLevel: 'safe',
        title: 'Naming convention inconsistency detected',
        description:
          `Found ${camelCaseCount} camelCase and ${snakeOrKebabCount} snake_case/kebab-case names among page and API entities. Mixed conventions make the codebase harder to navigate.`,
        affectedFiles: namedEntities.map((e) => e.name ?? e.id),
        suggestedFix: 'Pick one naming convention (camelCase or kebab-case) and apply it consistently across all route and API names.',
        canAutoFix: false,
      });
    }

    // 11. missing-loading-states
    const hasLoadingEntity = entities.some(
      (e) =>
        e.name?.toLowerCase().includes('loading') ||
        e.name?.toLowerCase().includes('skeleton'),
    );
    if (pageEntities.length > 0 && !hasLoadingEntity) {
      allFindings.push({
        id: makeId('missing-loading-states'),
        category: 'missing-loading-states',
        riskLevel: 'review',
        title: 'No loading state components detected',
        description:
          'Page entities exist but no loading or skeleton components were found. Async operations without loading states lead to poor UX.',
        affectedFiles: pageEntities.map((e) => e.name ?? e.id),
        suggestedFix: 'Add loading skeleton or spinner components for pages that fetch async data.',
        canAutoFix: false,
      });
    }

    // 12. duplicate-components
    const suffixes = ['Component', 'Container', 'View', 'Widget'];
    const componentEntities = entities.filter(
      (e) =>
        e.type?.toLowerCase() === 'component' ||
        e.type?.toLowerCase() === 'page',
    );
    const duplicatePairs: string[] = [];
    for (let i = 0; i < componentEntities.length; i++) {
      for (let j = i + 1; j < componentEntities.length; j++) {
        const nameA = componentEntities[i].name ?? '';
        const nameB = componentEntities[j].name ?? '';
        if (!nameA || !nameB) continue;
        const baseA = suffixes.reduce(
          (acc, s) => acc.replace(new RegExp(`${s}$`), ''),
          nameA,
        );
        const baseB = suffixes.reduce(
          (acc, s) => acc.replace(new RegExp(`${s}$`), ''),
          nameB,
        );
        if (
          baseA.toLowerCase() === baseB.toLowerCase() &&
          nameA !== nameB
        ) {
          duplicatePairs.push(nameA, nameB);
        }
      }
    }
    const uniqueDuplicates = [...new Set(duplicatePairs)];
    if (uniqueDuplicates.length > 0) {
      allFindings.push({
        id: makeId('duplicate-components'),
        category: 'duplicate-components',
        riskLevel: 'review',
        title: `${uniqueDuplicates.length} possibly duplicate component(s) detected`,
        description:
          'Components with very similar names may be duplicates. AI coding tools sometimes generate near-identical components.',
        affectedFiles: uniqueDuplicates,
        suggestedFix: 'Consolidate duplicate components into a single reusable component.',
        canAutoFix: false,
      });
    }

    // 13. bloated-folders
    const pagesAndComponents = entities.filter(
      (e) =>
        e.type?.toLowerCase() === 'page' ||
        e.type?.toLowerCase() === 'component',
    );
    if (pagesAndComponents.length > 15) {
      allFindings.push({
        id: makeId('bloated-folders'),
        category: 'bloated-folders',
        riskLevel: 'review',
        title: `${pagesAndComponents.length} page/component entities — consider folder reorganization`,
        description:
          'A large number of page and component entities suggests the folder structure may be flat and hard to navigate.',
        affectedFiles: [],
        suggestedFix: 'Group related components and pages into feature folders (e.g. /features/auth, /features/dashboard).',
        canAutoFix: false,
      });
    }

    // 14. abandoned-files
    const abandonedEntities = entities.filter(
      (e) => e.status === 'changed' && !entityIdsWithEdges.has(e.id),
    );
    if (abandonedEntities.length > 0) {
      allFindings.push({
        id: makeId('abandoned-files'),
        category: 'abandoned-files',
        riskLevel: 'safe',
        title: `${abandonedEntities.length} potentially abandoned file(s)`,
        description:
          'Entities with status "changed" and no edges may be leftover AI-generated files that are no longer connected to the project.',
        affectedFiles: abandonedEntities.map((e) => e.name ?? e.id),
        suggestedFix: 'Review these files and remove or integrate them into the project.',
        canAutoFix: false,
      });
    }

    // Categorise findings
    const highFindings = allFindings.filter((f) => f.riskLevel === 'high');
    const reviewFindings = allFindings.filter((f) => f.riskLevel === 'review');
    const safeFindings = allFindings.filter((f) => f.riskLevel === 'safe');

    // Compute score
    let score = 100;
    score -= highFindings.length * 10;
    score -= reviewFindings.length * 5;
    score -= safeFindings.length * 2;
    score = Math.max(0, Math.min(100, score));

    // AI Mess Risk
    let aiMessRisk: 'Low' | 'Medium' | 'High';
    if (score < 60 || highFindings.length > 0) {
      aiMessRisk = 'High';
    } else if (score < 80) {
      aiMessRisk = 'Medium';
    } else {
      aiMessRisk = 'Low';
    }

    const canAutoFixCount = allFindings.filter((f) => f.canAutoFix).length;

    const summary = this.buildSummary(projectId, allFindings, score, aiMessRisk);

    return {
      projectId,
      cleanlinessScore: score,
      aiMessRisk,
      safeFixes: safeFindings,
      reviewFixes: reviewFindings,
      doNotAutoFix: DO_NOT_AUTO_FIX,
      allFindings: [...safeFindings, ...reviewFindings, ...highFindings],
      summary,
      scannedAt: new Date().toISOString(),
      stats: {
        totalFindings: allFindings.length,
        safeCount: safeFindings.length,
        reviewCount: reviewFindings.length,
        highCount: highFindings.length,
        canAutoFixCount,
      },
    };
  }

  private buildSummary(
    projectId: string,
    findings: JanitorFinding[],
    score: number,
    risk: string,
  ): string {
    if (findings.length === 0) {
      return `Project ${projectId} looks clean! Cleanliness score: ${score}/100. No issues detected.`;
    }
    const highCount = findings.filter((f) => f.riskLevel === 'high').length;
    const reviewCount = findings.filter((f) => f.riskLevel === 'review').length;
    const safeCount = findings.filter((f) => f.riskLevel === 'safe').length;
    const parts: string[] = [];
    if (highCount > 0) parts.push(`${highCount} high-risk issue(s)`);
    if (reviewCount > 0) parts.push(`${reviewCount} area(s) needing review`);
    if (safeCount > 0) parts.push(`${safeCount} safe fix(es)`);
    return `TrieFrog found ${findings.length} issue(s): ${parts.join(', ')}. Cleanliness score: ${score}/100. AI Mess Risk: ${risk}.`;
  }
}
