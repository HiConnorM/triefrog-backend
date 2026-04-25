import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { CheckService } from './check.service';

export interface SnapshotCreatedEvent {
  projectId: string;
  snapshotId: string;
  s3Key: string;
}

@Processor('check')
export class CheckProcessor extends WorkerHost {
  private readonly logger = new Logger(CheckProcessor.name);

  constructor(private readonly checkService: CheckService) {
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
    const { projectId, snapshotId } = event;
    this.logger.log(
      `Processing findings for project ${projectId} from snapshot ${snapshotId}`,
    );

    try {
      // For MVP: generate findings by reading entities from DB directly
      // rather than pulling the full snapshot from S3/MinIO
      const rawFindings =
        await this.checkService.generateFindingsFromEntities(projectId);

      await this.checkService.processFindingsFromSnapshot(
        projectId,
        rawFindings,
      );

      this.logger.log(
        `Successfully processed ${rawFindings.length} findings for project ${projectId}`,
      );
    } catch (err) {
      this.logger.error(
        `Failed to process findings for project ${projectId}`,
        err,
      );
      throw err;
    }
  }
}
