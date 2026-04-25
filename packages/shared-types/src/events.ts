import { z } from 'zod';

// ---------------------------------------------------------------------------
// Queue name constants
// ---------------------------------------------------------------------------

export const QUEUE_SCAN = 'scan' as const;
export const QUEUE_GRAPH = 'graph' as const;
export const QUEUE_DOCS = 'docs' as const;
export const QUEUE_CHECK = 'check' as const;
export const QUEUE_SEARCH = 'search' as const;

// ---------------------------------------------------------------------------
// Event schemas
// ---------------------------------------------------------------------------

export const ScanRequestedEventSchema = z.object({
  projectId: z.string(),
  scanId: z.string(),
  triggeredBy: z.string(),
});
export type ScanRequestedEvent = z.infer<typeof ScanRequestedEventSchema>;

export const SnapshotCreatedEventSchema = z.object({
  projectId: z.string(),
  scanId: z.string(),
  snapshotId: z.string(),
  s3Key: z.string(),
});
export type SnapshotCreatedEvent = z.infer<typeof SnapshotCreatedEventSchema>;

export const ScanProgressEventSchema = z.object({
  projectId: z.string(),
  scanId: z.string(),
  stage: z.string(),
  progress: z.number().min(0).max(100),
  message: z.string(),
});
export type ScanProgressEvent = z.infer<typeof ScanProgressEventSchema>;

export const ScanCompletedEventSchema = z.object({
  projectId: z.string(),
  scanId: z.string(),
  snapshotId: z.string(),
});
export type ScanCompletedEvent = z.infer<typeof ScanCompletedEventSchema>;

export const ScanFailedEventSchema = z.object({
  projectId: z.string(),
  scanId: z.string(),
  error: z.string(),
});
export type ScanFailedEvent = z.infer<typeof ScanFailedEventSchema>;

export const GraphUpdatedEventSchema = z.object({
  projectId: z.string(),
  version: z.number(),
});
export type GraphUpdatedEvent = z.infer<typeof GraphUpdatedEventSchema>;

export const FindingsUpdatedEventSchema = z.object({
  projectId: z.string(),
  count: z.number(),
});
export type FindingsUpdatedEvent = z.infer<typeof FindingsUpdatedEventSchema>;

export const DocsGeneratedEventSchema = z.object({
  projectId: z.string(),
  docIds: z.array(z.string()),
});
export type DocsGeneratedEvent = z.infer<typeof DocsGeneratedEventSchema>;

// ---------------------------------------------------------------------------
// Queue event map — maps queue name to its payload type
// ---------------------------------------------------------------------------

export type QueueEventMap = {
  [QUEUE_SCAN]: ScanRequestedEvent;
  [QUEUE_GRAPH]: GraphUpdatedEvent;
  [QUEUE_DOCS]: DocsGeneratedEvent;
  [QUEUE_CHECK]: FindingsUpdatedEvent;
  [QUEUE_SEARCH]: SnapshotCreatedEvent;
};
