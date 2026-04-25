import { FindingsQueryDto } from './dto/findings-query.dto';
export interface RawFinding {
    title: string;
    description: string;
    severity: 'critical' | 'warn';
    category: string;
    entityId?: string;
}
export declare class CheckService {
    private readonly logger;
    getFindings(projectId: string, filters: FindingsQueryDto): Promise<unknown>;
    getOverview(projectId: string): Promise<{
        projectId: string;
        shippabilityScore: number;
        healthCards: {
            category: string;
            status: "verified" | "suspect" | "critical";
            findingCount: number;
            findings: {
                id: string;
                title: string;
                severity: string;
            }[];
        }[];
    }>;
    resolveFinding(findingId: string): Promise<unknown>;
    processFindingsFromSnapshot(projectId: string, rawFindings: RawFinding[]): Promise<void>;
    generateFindingsFromEntities(projectId: string): Promise<RawFinding[]>;
}
//# sourceMappingURL=check.service.d.ts.map