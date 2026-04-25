import { z } from 'zod';
import {
  EntityTypeSchema,
  EntityStatusSchema,
  EdgeTypeSchema,
  FindingCategorySchema,
  FindingSeveritySchema,
  DocTypeSchema,
  DocStatusSchema,
  ScanStatusSchema,
} from './entities';

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export const LoginDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginDto = z.infer<typeof LoginDtoSchema>;

export const RegisterDtoSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1),
  orgName: z.string().min(1),
});
export type RegisterDto = z.infer<typeof RegisterDtoSchema>;

export const TokenPairSchema = z.object({
  accessToken: z.string(),
  refreshToken: z.string(),
});
export type TokenPair = z.infer<typeof TokenPairSchema>;

export const AuthUserSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  name: z.string(),
  orgId: z.string(),
  role: z.string(),
});
export type AuthUser = z.infer<typeof AuthUserSchema>;

// ---------------------------------------------------------------------------
// Projects
// ---------------------------------------------------------------------------

export const CreateProjectDtoSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  repoUrl: z.string().url(),
  repoProvider: z.literal('github'),
  orgId: z.string(),
});
export type CreateProjectDto = z.infer<typeof CreateProjectDtoSchema>;

export const ProjectDtoSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  repoUrl: z.string().url(),
  orgId: z.string(),
  createdAt: z.string(),
  lastScanAt: z.string().nullable(),
  scanStatus: ScanStatusSchema.nullable(),
});
export type ProjectDto = z.infer<typeof ProjectDtoSchema>;

// ---------------------------------------------------------------------------
// Scans
// ---------------------------------------------------------------------------

export const TriggerScanDtoSchema = z.object({
  projectId: z.string(),
});
export type TriggerScanDto = z.infer<typeof TriggerScanDtoSchema>;

export const ScanProgressEventSchema = z.object({
  scanId: z.string(),
  projectId: z.string(),
  stage: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string(),
  ts: z.number(),
});
export type ScanProgressEvent = z.infer<typeof ScanProgressEventSchema>;

// ---------------------------------------------------------------------------
// Graph
// ---------------------------------------------------------------------------

export const NodeDtoSchema = z.object({
  id: z.string(),
  type: EntityTypeSchema,
  name: z.string(),
  status: EntityStatusSchema,
  properties: z.record(z.string(), z.any()),
  files: z.array(z.string()),
  x: z.number().optional(),
  y: z.number().optional(),
});
export type NodeDto = z.infer<typeof NodeDtoSchema>;

export const EdgeDtoSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.string(),
  type: EdgeTypeSchema,
  label: z.string().optional(),
});
export type EdgeDto = z.infer<typeof EdgeDtoSchema>;

export const MapPayloadSchema = z.object({
  nodes: z.array(NodeDtoSchema),
  edges: z.array(EdgeDtoSchema),
});
export type MapPayload = z.infer<typeof MapPayloadSchema>;

// TrieNode is recursive so we use z.lazy
export type TrieNode = {
  id: string;
  name: string;
  type: string;
  children: TrieNode[];
  status: z.infer<typeof EntityStatusSchema>;
};

export const TrieNodeSchema: z.ZodType<TrieNode> = z.lazy(() =>
  z.object({
    id: z.string(),
    name: z.string(),
    type: z.string(),
    children: z.array(TrieNodeSchema),
    status: EntityStatusSchema,
  }),
);

// ---------------------------------------------------------------------------
// Findings
// ---------------------------------------------------------------------------

export const FindingDtoSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  category: FindingCategorySchema,
  severity: FindingSeveritySchema,
  title: z.string(),
  description: z.string(),
  suggestedActions: z.array(z.string()),
  nodeId: z.string().optional(),
  resolved: z.boolean(),
});
export type FindingDto = z.infer<typeof FindingDtoSchema>;

export const HealthCardDtoSchema = z.object({
  category: z.string(),
  status: z.enum(['verified', 'suspect', 'critical', 'info']),
  title: z.string(),
  description: z.string(),
});
export type HealthCardDto = z.infer<typeof HealthCardDtoSchema>;

export const ProjectOverviewDtoSchema = z.object({
  projectId: z.string(),
  shippabilityScore: z.number().min(0).max(100),
  healthCards: z.array(HealthCardDtoSchema),
});
export type ProjectOverviewDto = z.infer<typeof ProjectOverviewDtoSchema>;

// ---------------------------------------------------------------------------
// Docs
// ---------------------------------------------------------------------------

export const DocDtoSchema = z.object({
  id: z.string(),
  projectId: z.string(),
  type: DocTypeSchema,
  title: z.string(),
  status: DocStatusSchema,
  content: z.string().optional(),
  lastVerifiedAt: z.string().optional(),
  linkedNodeIds: z.array(z.string()),
});
export type DocDto = z.infer<typeof DocDtoSchema>;

export const CreateDocDtoSchema = z.object({
  projectId: z.string(),
  type: DocTypeSchema,
  title: z.string().min(1),
  content: z.string().optional(),
});
export type CreateDocDto = z.infer<typeof CreateDocDtoSchema>;

export const VerifyDocDtoSchema = z.object({
  docId: z.string(),
  attestedBy: z.string(),
});
export type VerifyDocDto = z.infer<typeof VerifyDocDtoSchema>;

// ---------------------------------------------------------------------------
// Generic API response wrappers
// ---------------------------------------------------------------------------

export const ApiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.boolean(),
    data: dataSchema,
    error: z.string().optional(),
    requestId: z.string().optional(),
  });

export type ApiResponse<T> = {
  success: boolean;
  data: T;
  error?: string;
  requestId?: string;
};

export const PaginatedResponseSchema = <T extends z.ZodTypeAny>(
  itemSchema: T,
) =>
  z.object({
    items: z.array(itemSchema),
    total: z.number(),
    page: z.number(),
    pageSize: z.number(),
  });

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
};
