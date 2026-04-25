export declare class GraphService {
    getMapPayload(projectId: string): Promise<unknown>;
    rebuildMapPayload(projectId: string): Promise<unknown>;
    getTriePayload(projectId: string): Promise<unknown>;
    private buildTrieTree;
    getNodeDetail(nodeId: string): Promise<unknown>;
    updateNodeStatus(nodeId: string, status: string): Promise<unknown>;
}
//# sourceMappingURL=graph.service.d.ts.map