import { WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import type { ScanRequestedEvent } from '@triefrog/shared-types';
import { StorageService } from '../storage/storage.service';
export declare class ScanProcessor extends WorkerHost {
    private readonly storageService;
    private readonly graphQueue;
    private readonly checkQueue;
    private readonly docsQueue;
    private readonly logger;
    private readonly runner;
    constructor(storageService: StorageService, graphQueue: Queue, checkQueue: Queue, docsQueue: Queue);
    process(job: Job<ScanRequestedEvent>): Promise<void>;
}
//# sourceMappingURL=scan.processor.d.ts.map