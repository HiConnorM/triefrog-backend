import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CheckService } from './check.service';
export interface SnapshotCreatedEvent {
    projectId: string;
    snapshotId: string;
    s3Key: string;
}
export declare class CheckProcessor extends WorkerHost {
    private readonly checkService;
    private readonly logger;
    constructor(checkService: CheckService);
    process(job: Job): Promise<void>;
    private handleSnapshotCreated;
}
//# sourceMappingURL=check.processor.d.ts.map