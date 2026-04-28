import { z } from 'zod';

export const JanitorCategorySchema = z.enum([
  'duplicate-components',
  'unused-files',
  'unused-dependencies',
  'dead-routes',
  'messy-logic',
  'naming-inconsistency',
  'bloated-folders',
  'broken-imports',
  'missing-env-example',
  'missing-readme',
  'missing-tests',
  'missing-error-handling',
  'missing-loading-states',
  'weak-validation',
  'hardcoded-secrets',
  'stale-todos',
  'abandoned-files',
  'structure',
]);
export type JanitorCategory = z.infer<typeof JanitorCategorySchema>;

export const JanitorRiskSchema = z.enum(['safe', 'review', 'high']);
export type JanitorRisk = z.infer<typeof JanitorRiskSchema>;

export const JanitorFindingSchema = z.object({
  id: z.string(),
  category: JanitorCategorySchema,
  riskLevel: JanitorRiskSchema,
  title: z.string(),
  description: z.string(),
  affectedFiles: z.array(z.string()),
  suggestedFix: z.string(),
  canAutoFix: z.boolean(),
  githubIssueTitle: z.string().optional(),
});
export type JanitorFinding = z.infer<typeof JanitorFindingSchema>;

export const JanitorReportSchema = z.object({
  projectId: z.string(),
  cleanlinessScore: z.number().min(0).max(100),
  aiMessRisk: z.enum(['Low', 'Medium', 'High']),
  safeFixes: z.array(JanitorFindingSchema),
  reviewFixes: z.array(JanitorFindingSchema),
  doNotAutoFix: z.array(z.string()),
  allFindings: z.array(JanitorFindingSchema),
  summary: z.string(),
  scannedAt: z.string(),
  stats: z.object({
    totalFindings: z.number(),
    safeCount: z.number(),
    reviewCount: z.number(),
    highCount: z.number(),
    canAutoFixCount: z.number(),
  }),
});
export type JanitorReport = z.infer<typeof JanitorReportSchema>;
