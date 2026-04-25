import { ScanService } from './scan.service';
import { TriggerScanDto } from './dto/trigger-scan.dto';
export declare class ScanController {
    private readonly scanService;
    constructor(scanService: ScanService);
    triggerScan(dto: TriggerScanDto): Promise<{
        scanId: string;
    }>;
    getProjectScans(projectId: string): Promise<{
        scans: unknown[];
    }>;
    getScan(scanId: string): Promise<{
        scan: unknown;
    }>;
}
//# sourceMappingURL=scan.controller.d.ts.map