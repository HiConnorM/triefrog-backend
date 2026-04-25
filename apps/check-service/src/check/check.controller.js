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
exports.CheckController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const check_service_1 = require("./check.service");
const findings_query_dto_1 = require("./dto/findings-query.dto");
let CheckController = class CheckController {
    checkService;
    constructor(checkService) {
        this.checkService = checkService;
    }
    async getFindings(projectId, query) {
        return this.checkService.getFindings(projectId, query);
    }
    async getOverview(projectId) {
        return this.checkService.getOverview(projectId);
    }
    async resolveFinding(findingId) {
        return this.checkService.resolveFinding(findingId);
    }
};
exports.CheckController = CheckController;
__decorate([
    (0, common_1.Get)('projects/:projectId/findings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all findings for a project with optional filters' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: String }),
    (0, swagger_1.ApiQuery)({ name: 'category', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'severity', required: false, type: String }),
    (0, swagger_1.ApiQuery)({ name: 'resolved', required: false, type: Boolean }),
    __param(0, (0, common_1.Param)('projectId')),
    __param(1, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, findings_query_dto_1.FindingsQueryDto]),
    __metadata("design:returntype", Promise)
], CheckController.prototype, "getFindings", null);
__decorate([
    (0, common_1.Get)('projects/:projectId/overview'),
    (0, swagger_1.ApiOperation)({ summary: 'Get project shippability overview and health cards' }),
    (0, swagger_1.ApiParam)({ name: 'projectId', type: String }),
    __param(0, (0, common_1.Param)('projectId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CheckController.prototype, "getOverview", null);
__decorate([
    (0, common_1.Patch)('findings/:findingId/resolve'),
    (0, swagger_1.ApiOperation)({ summary: 'Mark a finding as resolved' }),
    (0, swagger_1.ApiParam)({ name: 'findingId', type: String }),
    __param(0, (0, common_1.Param)('findingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CheckController.prototype, "resolveFinding", null);
exports.CheckController = CheckController = __decorate([
    (0, swagger_1.ApiTags)('check'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [check_service_1.CheckService])
], CheckController);
//# sourceMappingURL=check.controller.js.map