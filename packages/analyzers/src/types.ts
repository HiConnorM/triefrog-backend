import type { SnapshotEntity, SnapshotEdge, RawFinding } from '@triefrog/shared-types';

export interface AnalyzerContext {
  repoPath: string;
  projectId: string;
  files: string[]; // all file paths in repo
}

export interface AnalyzerResult {
  entities: SnapshotEntity[];
  edges: SnapshotEdge[];
  findings: RawFinding[];
}

export interface Analyzer {
  name: string;
  analyze(ctx: AnalyzerContext): Promise<AnalyzerResult>;
}
