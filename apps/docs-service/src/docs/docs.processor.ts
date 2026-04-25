import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { DocsService } from './docs.service';

export interface SnapshotCreatedEvent {
  projectId: string;
  snapshotId: string;
  triggeredAt: string;
}

@Processor('docs')
export class DocsProcessor extends WorkerHost {
  private readonly logger = new Logger(DocsProcessor.name);

  constructor(private readonly docsService: DocsService) {
    super();
  }

  async process(job: Job<SnapshotCreatedEvent>): Promise<void> {
    this.logger.log(`Processing job ${job.name} for project ${job.data.projectId}`);

    switch (job.name) {
      case 'snapshot.created':
        await this.handleSnapshotCreated(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleSnapshotCreated(event: SnapshotCreatedEvent): Promise<void> {
    const { projectId, snapshotId } = event;
    this.logger.log(
      `Snapshot ${snapshotId} created for project ${projectId} — triggering doc generation`,
    );

    try {
      const result = await this.docsService.generateDocs(projectId);
      this.logger.log(
        `Doc generation complete for project ${projectId}: ${result.docIds.length} docs generated`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to generate docs for project ${projectId}: ${(err as Error).message}`,
        (err as Error).stack,
      );
      throw err;
    }
  }
}
