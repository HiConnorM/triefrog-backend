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
exports.ScanController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const scan_service_1 = require("./scan.service");
const trigger_scan_dto_1 = require("./dto/trigger-scan.dto");
let ScanController = class ScanController {
    scanService;
    constructor(scanService) {
        this.scanService = scanService;
    }
    async triggerScan(dto) {
        const scan = await this.scanService.triggerScan(dto.projectId, dto.triggeredBy);
        return { scanId: scan.id };
    }
    async getProjectScans(projectId) {
        const scans = await this.scanService.getProjectScans(projectId);
        return { scans };
    }
    async getScan(scanId) {
        const scan = await this.scanService.getScan(scanId);
        return { scan };
    }
};
exports.ScanController = ScanController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Trigger a new scan for a project' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Scan created and queued' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [trigger_scan_dto_1.TriggerScanDto]),
    __metadata("design:returntype", Promise)
], ScanController.prototype, "triggerScan", null);
__decorate([
    (0, common_1.Get)('project/:projectId'),
    (0, swagger_1.ApiOperation)({ summary: 'List all scans for a project' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', description: 'Project ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'List of scans' }),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScanController.prototype, "getProjectScans", null);
__decorate([
    (0, common_1.Get)(':scanId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a scan by ID' }),
    (0, swagger_1.ApiParam)({ name: 'scanId', description: 'Scan ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Scan details' }),
    __param(0, (0, common_1.Param)('scanId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], ScanController.prototype, "getScan", null);
exports.ScanController = ScanController = __decorate([
    (0, swagger_1.ApiTags)('scans'),
    (0, common_1.Controller)('scans'),
    __metadata("design:paramtypes", [scan_service_1.ScanService])
], ScanController);
//# sourceMappingURL=scan.controller.js.map