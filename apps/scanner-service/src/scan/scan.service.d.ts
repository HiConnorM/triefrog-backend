import { Queue } from 'bullmq';
import type { ScanRequestedEvent } from '@triefrog/shared-types';
export declare class ScanService {
    private readonly scanQueue;
    constructor(scanQueue: Queue<ScanRequestedEvent>);
    triggerScan(projectId: string, triggeredBy?: string): Promise<{
        id: string;
        status: string;
        triggeredBy: string | null;
        startedAt: Date | null;
        endedAt: Date | null;
        errorMsg: string | null;
        createdAt: Date;
        projectId: string;
    }>;
    getScan(id: string): Promise<{
        id: string;
        status: string;
        triggeredBy: string | null;
        startedAt: Date | null;
        endedAt: Date | null;
        errorMsg: string | null;
        createdAt: Date;
        projectId: string;
    }>;
    getProjectScans(projectId: string): Promise<{
        id: string;
        status: string;
        triggeredBy: string | null;
        startedAt: Date | null;
        endedAt: Date | null;
        errorMsg: string | null;
        createdAt: Date;
        projectId: string;
    }[]>;
}
//# sourceMappingURL=scan.service.d.ts.map