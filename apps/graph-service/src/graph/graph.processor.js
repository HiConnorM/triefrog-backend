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
var GraphProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const graph_service_1 = require("./graph.service");
let GraphProcessor = GraphProcessor_1 = class GraphProcessor extends bullmq_1.WorkerHost {
    graphService;
    logger = new common_1.Logger(GraphProcessor_1.name);
    constructor(graphService) {
        super();
        this.graphService = graphService;
    }
    async process(job) {
        this.logger.log(`Processing job ${job.id} of type ${job.name}`);
        switch (job.name) {
            case 'snapshot.created': {
                await this.handleSnapshotCreated(job.data);
                break;
            }
            default:
                this.logger.warn(`Unknown job type: ${job.name}`);
        }
    }
    async handleSnapshotCreated(event) {
        const { projectId } = event;
        this.logger.log(`Rebuilding map payload for project ${projectId} after snapshot created`);
        try {
            await this.graphService.rebuildMapPayload(projectId);
            this.logger.log(`Successfully rebuilt map payload for project ${projectId}`);
        }
        catch (err) {
            this.logger.error(`Failed to rebuild map payload for project ${projectId}`, err);
            throw err;
        }
    }
};
exports.GraphProcessor = GraphProcessor;
exports.GraphProcessor = GraphProcessor = GraphProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('graph'),
    __metadata("design:paramtypes", [graph_service_1.GraphService])
], GraphProcessor);
//# sourceMappingURL=graph.processor.js.map