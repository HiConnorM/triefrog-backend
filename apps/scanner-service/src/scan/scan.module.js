"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const scan_controller_1 = require("./scan.controller");
const scan_service_1 = require("./scan.service");
const scan_processor_1 = require("./scan.processor");
const storage_module_1 = require("../storage/storage.module");
let ScanModule = class ScanModule {
};
exports.ScanModule = ScanModule;
exports.ScanModule = ScanModule = __decorate([
    (0, common_1.Module)({
        imports: [
            bullmq_1.BullModule.registerQueue({
                name: 'scan',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'graph',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'check',
            }),
            bullmq_1.BullModule.registerQueue({
                name: 'docs',
            }),
            storage_module_1.StorageModule,
        ],
        controllers: [scan_controller_1.ScanController],
        providers: [scan_service_1.ScanService, scan_processor_1.ScanProcessor],
        exports: [scan_service_1.ScanService],
    })
], ScanModule);
//# sourceMappingURL=scan.module.js.map