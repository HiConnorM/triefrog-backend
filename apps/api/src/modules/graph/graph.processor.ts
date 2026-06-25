import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { GraphService } from './graph.service';

export interface SnapshotCreatedEvent {
  projectId: string;
  snapshotId: string;
  s3Key: string;
}

@Processor('graph')
export class GraphProcessor extends WorkerHost {
  private readonly logger = new Logger(GraphProcessor.name);

  constructor(private readonly graphService: GraphService) {
    super();
  }

  async process(job: Job): Promise<void> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);

    switch (job.name) {
      case 'snapshot.created': {
        await this.handleSnapshotCreated(job.data as SnapshotCreatedEvent);
        break;
      }
      default:
        this.logger.warn(`Unknown job type: ${job.name}`);
    }
  }

  private async handleSnapshotCreated(event: SnapshotCreatedEvent) {
    const { projectId } = event;
    this.logger.log(
      `Rebuilding map payload for project ${projectId} after snapshot created`,
    );

    try {
      await this.graphService.rebuildMapPayload(projectId);
      this.logger.log(
        `Successfully rebuilt map payload for project ${projectId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to rebuild map payload for project ${projectId}`,
        err,
      );
      throw err;
    }
  }
}
