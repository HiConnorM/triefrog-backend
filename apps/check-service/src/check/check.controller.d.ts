import { CheckService } from './check.service';
import { FindingsQueryDto } from './dto/findings-query.dto';
export declare class CheckController {
    private readonly checkService;
    constructor(checkService: CheckService);
    getFindings(projectId: string, query: FindingsQueryDto): Promise<unknown>;
    getOverview(projectId: string): Promise<unknown>;
    resolveFinding(findingId: string): Promise<unknown>;
}
//# sourceMappingURL=check.controller.d.ts.map