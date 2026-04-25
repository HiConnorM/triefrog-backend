import { GraphService } from './graph.service';
import { UpdateNodeStatusDto } from './dto/update-node-status.dto';
export declare class GraphController {
    private readonly graphService;
    constructor(graphService: GraphService);
    getMap(projectId: string): Promise<unknown>;
    getTrie(projectId: string): Promise<unknown>;
    getNode(nodeId: string): Promise<unknown>;
    updateNodeStatus(nodeId: string, dto: UpdateNodeStatusDto): Promise<unknown>;
}
//# sourceMappingURL=graph.controller.d.ts.map