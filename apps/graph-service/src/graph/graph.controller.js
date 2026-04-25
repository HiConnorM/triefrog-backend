"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const graph_service_1 = require("./graph.service");
const update_node_status_dto_1 = require("./dto/update-node-status.dto");
let GraphController = class GraphController {
    graphService;
    constructor(graphService) {
        this.graphService = graphService;
    }
    async getMap(projectId) {
        return this.graphService.getMapPayload(projectId);
    }
    async getTrie(projectId) {
        return this.graphService.getTriePayload(projectId);
    }
    async getNode(nodeId) {
        return this.graphService.getNodeDetail(nodeId);
    }
    async updateNodeStatus(nodeId, dto) {
        return this.graphService.updateNodeStatus(nodeId, dto.status);
    }
};
exports.GraphController = GraphController;
__decorate([
    (0, common_1.Get)('projects/:projectId/map'),
    (0, swagger_1.ApiOperation)({ summary: 'Get graph map payload (nodes + edges) for a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: String }),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GraphController.prototype, "getMap", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/trie'),
    (0, swagger_1.ApiOperation)({ summary: 'Get trie tree structure for a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: String }),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GraphController.prototype, "getTrie", null);
__decorate([
    (0, common_1.Get)('nodes/:nodeId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get detailed node with relationships, findings, and docs' }),
    (0, swagger_1.ApiParam)({ name: 'nodeId', type: String }),
    __param(0, (0, common_1.Param)('nodeId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GraphController.prototype, "getNode", null);
__decorate([
    (0, common_1.Patch)('nodes/:nodeId/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Update node status' }),
    (0, swagger_1.ApiParam)({ name: 'nodeId', type: String }),
    __param(0, (0, common_1.Param)('nodeId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_node_status_dto_1.UpdateNodeStatusDto]),
    __metadata("design:returntype", Promise)
], GraphController.prototype, "updateNodeStatus", null);
exports.GraphController = GraphController = __decorate([
    (0, swagger_1.ApiTags)('graph'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [graph_service_1.GraphService])
], GraphController);
//# sourceMappingURL=graph.controller.js.map