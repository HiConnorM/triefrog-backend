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
exports.ScanService = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("bullmq");
const db_1 = require("@triefrog/db");
const uuid_1 = require("uuid");
let ScanService = class ScanService {
    scanQueue;
    constructor(scanQueue) {
        this.scanQueue = scanQueue;
    }
    async triggerScan(projectId, triggeredBy) {
        const scanId = (0, uuid_1.v4)();
        // Create scan record in DB
        const scan = await db_1.db.scan.create({
            data: {
                id: scanId,
                projectId,
                status: 'queued',
                triggeredBy: triggeredBy ?? 'system',
                startedAt: new Date(),
            },
        });
        // Enqueue the job
        await this.scanQueue.add('scan-requested', {
            scanId: scan.id,
            projectId,
            triggeredBy: triggeredBy ?? 'system',
        }, {
            jobId: `scan:${scan.id}`,
            attempts: 3,
            backoff: {
                type: 'exponential',
                delay: 5000,
            },
        });
        return scan;
    }
    async getScan(id) {
        const scan = await db_1.db.scan.findUnique({ where: { id } });
        if (!scan) {
            throw new common_1.NotFoundException(`Scan ${id} not found`);
        }
        return scan;
    }
    async getProjectScans(projectId) {
        return db_1.db.scan.findMany({
            where: { projectId },
            orderBy: { startedAt: 'desc' },
        });
    }
};
exports.ScanService = ScanService;
exports.ScanService = ScanService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, bullmq_1.InjectQueue)('scan')),
    __metadata("design:paramtypes", [bullmq_2.Queue])
], ScanService);
//# sourceMappingURL=scan.service.js.map