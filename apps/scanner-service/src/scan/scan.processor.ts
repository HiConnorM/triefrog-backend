import * as fs from 'fs';
import * as path from 'path';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { simpleGit } from 'simple-git';
import { db } from '@triefrog/db';
import { AnalyzerRunner } from '@triefrog/analyzers';
import type { ScanRequestedEvent, ProjectSnapshot } from '@triefrog/shared-types';
import { StorageService } from '../storage/storage.service';
import { ensureSampleRepo } from './sample-repo';

const SNAPSHOT_BUCKET = 'snapshots';

function walkDirRelative(dir: string, baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    if (entry.isDirectory()) {
      results.push(...walkDirRelative(fullPath, baseDir));
    } else {
      results.push(path.relative(baseDir, fullPath));
    }
  }
  return results;
}

@Processor('scan')
export class ScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ScanProcessor.name);
  private readonly runner = new AnalyzerRunner();

  constructor(
    private readonly storageService: StorageService,
    @InjectQueue('graph') private readonly graphQueue: Queue,
    @InjectQueue('check') private readonly checkQueue: Queue,
    @InjectQueue('docs') private readonly docsQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<ScanRequestedEvent>): Promise<void> {
    const { scanId, projectId } = job.data;
    const localMode = process.env.GITHUB_SCAN_MODE === 'local';

    this.logger.log(`Processing scan ${scanId} for project ${projectId} (localMode=${localMode})`);

    let repoPath: string | null = null;
    let clonedTemp = false;

    try {
      // 1. Update scan status to running
      await db.scan.update({
        where: { id: scanId },
        data: { status: 'running' },
      });

      // 2. Emit progress: cloning
      await job.updateProgress({ stage: 'cloning', percent: 5 });

      if (localMode) {
        // 3a. Use local sample repo
        repoPath = process.env.SAMPLE_REPO_PATH ?? '/tmp/triefrog-sample-repo';
        await ensureSampleRepo(repoPath);
        this.logger.log(`Using sample repo at ${repoPath}`);
      } else {
        // 3b. Clone the actual repo from GitHub
        const project = await db.project.findUniqueOrThrow({ where: { id: projectId } });
        const repoUrl: string = (project as Record<string, unknown>).repoUrl as string;

        repoPath = path.join('/tmp', `triefrog-scan-${scanId}`);
        fs.mkdirSync(repoPath, { recursive: true });
        clonedTemp = true;

        this.logger.log(`Cloning ${repoUrl} into ${repoPath}`);
        const git = simpleGit();
        await git.clone(repoUrl, repoPath, ['--depth', '1']);
      }

      // 4. Run analyzers
      await job.updateProgress({ stage: 'analyzing', percent: 20 });

      const files = walkDirRelative(repoPath, repoPath);
      const ctx = { repoPath, projectId, files };

      let analyzerPercent = 20;
      const analyzerCount = 7;

      const { entities, edges, findings } = await this.runner.run(ctx, async (stage) => {
        analyzerPercent += Math.floor(60 / analyzerCount);
        await job.updateProgress({ stage, percent: analyzerPercent });
        this.logger.log(`Scan ${scanId}: analyzer stage = ${stage}`);
      });

      // 5. Build ProjectSnapshot
      await job.updateProgress({ stage: 'building-snapshot', percent: 82 });

      const snapshot: ProjectSnapshot = {
        id: scanId,
        projectId,
        scannedAt: new Date().toISOString(),
        entities,
        edges,
        findings,
      };

      // 6. Upload snapshot JSON to MinIO
      await job.updateProgress({ stage: 'uploading', percent: 88 });
      await this.storageService.ensureBucket(SNAPSHOT_BUCKET);
      const snapshotKey = `${projectId}/${scanId}.json`;
      await this.storageService.putObject(SNAPSHOT_BUCKET, snapshotKey, JSON.stringify(snapshot));
      this.logger.log(`Snapshot uploaded to ${SNAPSHOT_BUCKET}/${snapshotKey}`);

      // 7. Save entities + edges to DB (upsert)
      await job.updateProgress({ stage: 'persisting', percent: 92 });

      for (const entity of entities) {
        await db.snapshotEntity.upsert({
          where: { externalId: entity.externalId },
          create: {
            ...entity,
            scanId,
            properties: entity.properties as Record<string, unknown>,
          },
          update: {
            ...entity,
            scanId,
            properties: entity.properties as Record<string, unknown>,
          },
        });
      }

      for (const edge of edges) {
        await db.snapshotEdge.upsert({
          where: { externalId: edge.externalId },
          create: {
            ...edge,
            scanId,
            properties: edge.properties as Record<string, unknown>,
          },
          update: {
            ...edge,
            scanId,
            properties: edge.properties as Record<string, unknown>,
          },
        });
      }

      // 8-10. Emit snapshot.created to downstream queues
      await job.updateProgress({ stage: 'dispatching', percent: 96 });

      const eventPayload = {
        scanId,
        projectId,
        snapshotKey,
        entityCount: entities.length,
        edgeCount: edges.length,
        findingCount: findings.length,
      };

      await Promise.all([
        this.graphQueue.add('snapshot.created', eventPayload),
        this.checkQueue.add('snapshot.created', eventPayload),
        this.docsQueue.add('snapshot.created', eventPayload),
      ]);

      // 11. Update scan status to done
      await db.scan.update({
        where: { id: scanId },
        data: {
          status: 'done',
          completedAt: new Date(),
          entityCount: entities.length,
          edgeCount: edges.length,
          findingCount: findings.length,
          snapshotUrl: `${SNAPSHOT_BUCKET}/${snapshotKey}`,
        },
      });

      await job.updateProgress({ stage: 'done', percent: 100 });
      this.logger.log(`Scan ${scanId} completed successfully`);
    } catch (err) {
      this.logger.error(`Scan ${scanId} failed:`, err);

      try {
        await db.scan.update({
          where: { id: scanId },
          data: {
            status: 'failed',
            completedAt: new Date(),
            errorMessage: err instanceof Error ? err.message : String(err),
          },
        });
      } catch (dbErr) {
        this.logger.error('Failed to update scan status to failed:', dbErr);
      }

      throw err;
    } finally {
      // Cleanup cloned temp repo
      if (clonedTemp && repoPath && fs.existsSync(repoPath)) {
        try {
          fs.rmSync(repoPath, { recursive: true, force: true });
        } catch {
          // ignore cleanup errors
        }
      }
    }
  }
}
