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
var CheckProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckProcessor = void 0;
const bullmq_1 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const check_service_1 = require("./check.service");
let CheckProcessor = CheckProcessor_1 = class CheckProcessor extends bullmq_1.WorkerHost {
    checkService;
    logger = new common_1.Logger(CheckProcessor_1.name);
    constructor(checkService) {
        super();
        this.checkService = checkService;
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
        const { projectId, snapshotId } = event;
        this.logger.log(`Processing findings for project ${projectId} from snapshot ${snapshotId}`);
        try {
            // For MVP: generate findings by reading entities from DB directly
            // rather than pulling the full snapshot from S3/MinIO
            const rawFindings = await this.checkService.generateFindingsFromEntities(projectId);
            await this.checkService.processFindingsFromSnapshot(projectId, rawFindings);
            this.logger.log(`Successfully processed ${rawFindings.length} findings for project ${projectId}`);
        }
        catch (err) {
            this.logger.error(`Failed to process findings for project ${projectId}`, err);
            throw err;
        }
    }
};
exports.CheckProcessor = CheckProcessor;
exports.CheckProcessor = CheckProcessor = CheckProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('check'),
    __metadata("design:paramtypes", [check_service_1.CheckService])
], CheckProcessor);
//# sourceMappingURL=check.processor.js.map