import * as fs from 'fs';
import * as path from 'path';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job, Queue } from 'bullmq';
import { simpleGit } from 'simple-git';
import { db } from '@triefrog/db';
import { AnalyzerRunner } from '@triefrog/analyzers';
import type { ScanRequestedEvent } from '@triefrog/shared-types';
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

      // 5. Upload snapshot JSON to MinIO
      await job.updateProgress({ stage: 'uploading', percent: 88 });
      await this.storageService.ensureBucket(SNAPSHOT_BUCKET);
      const snapshotKey = `${projectId}/${scanId}.json`;
      const snapshotData = { scanId, projectId, entities, edges, findings };
      await this.storageService.putObject(SNAPSHOT_BUCKET, snapshotKey, JSON.stringify(snapshotData));
      this.logger.log(`Snapshot uploaded to ${SNAPSHOT_BUCKET}/${snapshotKey}`);

      // 6. Create Snapshot record in DB
      const snapshotRecord = await db.snapshot.create({
        data: {
          projectId,
          scanId,
          s3Key: snapshotKey,
          version: 1,
          techStack: {},
        },
      });

      // 7. Save entities to DB (upsert by projectId+externalId), capturing the
      //    DB id of each so edges can be resolved from externalId references.
      await job.updateProgress({ stage: 'persisting', percent: 92 });

      const idByExternalId = new Map<string, string>();
      for (const entity of entities) {
        const saved = await db.entity.upsert({
          where: { projectId_externalId: { projectId, externalId: entity.externalId } },
          create: {
            projectId,
            snapshotId: snapshotRecord.id,
            externalId: entity.externalId,
            type: entity.type,
            name: entity.name,
            status: 'suspect',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            properties: entity.properties as any,
            files: entity.files ?? [],
          },
          update: {
            snapshotId: snapshotRecord.id,
            type: entity.type,
            name: entity.name,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            properties: entity.properties as any,
            files: entity.files ?? [],
          },
        });
        idByExternalId.set(entity.externalId, saved.id);
      }

      // 7a. Prune entities from earlier snapshots that this scan no longer
      //     produced, so removed/renamed nodes don't linger in the graph.
      //     (Their edges cascade-delete; current edges are rebuilt below.)
      const pruned = await db.entity.deleteMany({
        where: { projectId, snapshotId: { not: snapshotRecord.id } },
      });

      // 7b. Persist edges. Analyzers reference endpoints by externalId; resolve
      //     those to DB ids and drop any edge whose endpoints weren't found.
      //     Rebuilt wholesale each scan to avoid stale connections.
      await db.edge.deleteMany({ where: { projectId } });

      const resolvedEdges = edges
        .map((edge) => {
          const fromEntityId = idByExternalId.get(edge.from);
          const toEntityId = idByExternalId.get(edge.to);
          if (!fromEntityId || !toEntityId) return null;
          return { projectId, fromEntityId, toEntityId, type: edge.type };
        })
        .filter((e): e is NonNullable<typeof e> => e !== null);

      if (resolvedEdges.length > 0) {
        await db.edge.createMany({ data: resolvedEdges, skipDuplicates: true });
      }
      this.logger.log(
        `Scan ${scanId}: persisted ${idByExternalId.size} entities ` +
          `(pruned ${pruned.count} stale), ${resolvedEdges.length}/${edges.length} edges`,
      );

      // 8-10. Emit snapshot.created to downstream queues
      await job.updateProgress({ stage: 'dispatching', percent: 96 });

      const eventPayload = {
        scanId,
        projectId,
        snapshotId: snapshotRecord.id,
        s3Key: snapshotKey,
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
          endedAt: new Date(),
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
            endedAt: new Date(),
            errorMsg: err instanceof Error ? err.message : String(err),
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
