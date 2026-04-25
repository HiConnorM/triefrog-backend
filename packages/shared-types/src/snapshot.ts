import { z } from 'zod';
import {
  EntityTypeSchema,
  EdgeTypeSchema,
  FindingCategorySchema,
  FindingSeveritySchema,
  DocTypeSchema,
} from './entities';

// ---------------------------------------------------------------------------
// Sub-schemas
// ---------------------------------------------------------------------------

export const TechStackSchema = z.object({
  framework: z.string(),
  language: z.string(),
  orm: z.string().optional(),
  deploy: z.array(z.string()).optional(),
  integrations: z.array(z.string()),
});
export type TechStack = z.infer<typeof TechStackSchema>;

export const SnapshotEntitySchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  name: z.string(),
  path: z.string().optional(),
  properties: z.record(z.string(), z.any()),
  files: z.array(z.string()),
});
export type SnapshotEntity = z.infer<typeof SnapshotEntitySchema>;

export const SnapshotEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  type: EdgeTypeSchema,
});
export type SnapshotEdge = z.infer<typeof SnapshotEdgeSchema>;

export const RawFindingSchema = z.object({
  ruleId: z.string(),
  category: FindingCategorySchema,
  severity: FindingSeveritySchema,
  title: z.string(),
  description: z.string(),
  nodeId: z.string().optional(),
  suggestedActions: z.array(z.string()),
});
export type RawFinding = z.infer<typeof RawFindingSchema>;

export const DocsInputSchema = z.object({
  type: DocTypeSchema,
  title: z.string(),
  context: z.record(z.string(), z.any()),
});
export type DocsInput = z.infer<typeof DocsInputSchema>;

export const SearchDocumentSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  content: z.string(),
  tags: z.array(z.string()),
});
export type SearchDocument = z.infer<typeof SearchDocumentSchema>;

// ---------------------------------------------------------------------------
// ProjectSnapshot — main output of the scanner
// ---------------------------------------------------------------------------

export const ProjectSnapshotSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  scanId: z.string(),
  version: z.number().int().positive(),
  createdAt: z.string(),
  techStack: TechStackSchema,
  entities: z.array(SnapshotEntitySchema),
  edges: z.array(SnapshotEdgeSchema),
  findingsRaw: z.array(RawFindingSchema),
  docsInputs: z.array(DocsInputSchema),
  searchDocuments: z.array(SearchDocumentSchema),
  metadata: z.object({
    repoUrl: z.string().url(),
    branch: z.string(),
    commitSha: z.string(),
    filesScanned: z.number().int().nonnegative(),
    scanDurationMs: z.number().nonnegative(),
  }),
});
export type ProjectSnapshot = z.infer<typeof ProjectSnapshotSchema>;
