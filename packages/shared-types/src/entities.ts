import { z } from 'zod';

// ---------------------------------------------------------------------------
// Enums
// ---------------------------------------------------------------------------

export const EntityTypeSchema = z.enum([
  'project',
  'app',
  'page',
  'api-endpoint',
  'db-table',
  'integration',
  'env-var',
  'deploy-target',
  'job',
  'doc',
  'script',
  'middleware',
  'component',
]);
export type EntityType = z.infer<typeof EntityTypeSchema>;

export const EdgeTypeSchema = z.enum([
  'calls',
  'reads',
  'writes',
  'requires',
  'depends_on',
  'uses',
  'documented_by',
  'imports',
  'contains',
]);
export type EdgeType = z.infer<typeof EdgeTypeSchema>;

export const EntityStatusSchema = z.enum([
  'verified',
  'suspect',
  'missing',
  'changed',
]);
export type EntityStatus = z.infer<typeof EntityStatusSchema>;

export const FindingCategorySchema = z.enum([
  'setup',
  'docs',
  'deploy',
  'api',
  'data',
  'security',
  'hygiene',
]);
export type FindingCategory = z.infer<typeof FindingCategorySchema>;

export const FindingSeveritySchema = z.enum(['info', 'warn', 'critical']);
export type FindingSeverity = z.infer<typeof FindingSeveritySchema>;

export const DocTypeSchema = z.enum([
  'readme',
  'setup',
  'architecture',
  'deploy',
  'api',
  'data-model',
  'runbook',
  'adr',
]);
export type DocType = z.infer<typeof DocTypeSchema>;

export const DocStatusSchema = z.enum(['draft', 'verified', 'stale']);
export type DocStatus = z.infer<typeof DocStatusSchema>;

export const ScanStatusSchema = z.enum(['queued', 'running', 'done', 'failed']);
export type ScanStatus = z.infer<typeof ScanStatusSchema>;

// NodeStatus is an alias for EntityStatus
export const NodeStatusSchema = EntityStatusSchema;
export type NodeStatus = EntityStatus;
