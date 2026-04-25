import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { GraphService } from './graph.service';
export interface SnapshotCreatedEvent {
    projectId: string;
    snapshotId: string;
    s3Key: string;
}
export declare class GraphProcessor extends WorkerHost {
    private readonly graphService;
    private readonly logger;
    constructor(graphService: GraphService);
    process(job: Job): Promise<void>;
    private handleSnapshotCreated;
}
//# sourceMappingURL=graph.processor.d.ts.map