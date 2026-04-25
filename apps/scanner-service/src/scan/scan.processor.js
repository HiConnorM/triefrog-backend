"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ScanProcessor_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScanProcessor = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const bullmq_1 = require("@nestjs/bullmq");
const bullmq_2 = require("@nestjs/bullmq");
const common_1 = require("@nestjs/common");
const bullmq_3 = require("bullmq");
const simple_git_1 = require("simple-git");
const db_1 = require("@triefrog/db");
const analyzers_1 = require("@triefrog/analyzers");
const storage_service_1 = require("../storage/storage.service");
const sample_repo_1 = require("./sample-repo");
const SNAPSHOT_BUCKET = 'snapshots';
function walkDirRelative(dir, baseDir) {
    const results = [];
    if (!fs.existsSync(dir))
        return results;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.name === 'node_modules' || entry.name === '.git')
            continue;
        if (entry.isDirectory()) {
            results.push(...walkDirRelative(fullPath, baseDir));
        }
        else {
            results.push(path.relative(baseDir, fullPath));
        }
    }
    return results;
}
let ScanProcessor = ScanProcessor_1 = class ScanProcessor extends bullmq_1.WorkerHost {
    storageService;
    graphQueue;
    checkQueue;
    docsQueue;
    logger = new common_1.Logger(ScanProcessor_1.name);
    runner = new analyzers_1.AnalyzerRunner();
    constructor(storageService, graphQueue, checkQueue, docsQueue) {
        super();
        this.storageService = storageService;
        this.graphQueue = graphQueue;
        this.checkQueue = checkQueue;
        this.docsQueue = docsQueue;
    }
    async process(job) {
        const { scanId, projectId } = job.data;
        const localMode = process.env.GITHUB_SCAN_MODE === 'local';
        this.logger.log(`Processing scan ${scanId} for project ${projectId} (localMode=${localMode})`);
        let repoPath = null;
        let clonedTemp = false;
        try {
            // 1. Update scan status to running
            await db_1.db.scan.update({
                where: { id: scanId },
                data: { status: 'running' },
            });
            // 2. Emit progress: cloning
            await job.updateProgress({ stage: 'cloning', percent: 5 });
            if (localMode) {
                // 3a. Use local sample repo
                repoPath = process.env.SAMPLE_REPO_PATH ?? '/tmp/triefrog-sample-repo';
                await (0, sample_repo_1.ensureSampleRepo)(repoPath);
                this.logger.log(`Using sample repo at ${repoPath}`);
            }
            else {
                // 3b. Clone the actual repo from GitHub
                const project = await db_1.db.project.findUniqueOrThrow({ where: { id: projectId } });
                const repoUrl = project.repoUrl;
                repoPath = path.join('/tmp', `triefrog-scan-${scanId}`);
                fs.mkdirSync(repoPath, { recursive: true });
                clonedTemp = true;
                this.logger.log(`Cloning ${repoUrl} into ${repoPath}`);
                const git = (0, simple_git_1.simpleGit)();
                await git.clone(repoUrl, repoPath, ['--depth', '1']);
            }
            // 4. Run analyzers
            await job.updateProgress({ stage: 'analyzing', percent: 20 });
            const files = walkDirRelative(repoPath, repoPath);
            const ctx = { repoPath, projectId, files };
            let analyzerPercent = 20;
            const analyzerCount = 7;
            const { entities, edges, findings } = await this.runner.run(ctx, async (stage) => {
                analyzerPercent += Math.floor(60 / analyzerCount);
                await job.updateProgress({ stage, percent: analyzerPercent });
                this.logger.log(`Scan ${scanId}: analyzer stage = ${stage}`);
            });
            // 5. Upload snapshot JSON to MinIO
            await job.updateProgress({ stage: 'uploading', percent: 88 });
            await this.storageService.ensureBucket(SNAPSHOT_BUCKET);
            const snapshotKey = `${projectId}/${scanId}.json`;
            const snapshotData = { scanId, projectId, entities, edges, findings };
            await this.storageService.putObject(SNAPSHOT_BUCKET, snapshotKey, JSON.stringify(snapshotData));
            this.logger.log(`Snapshot uploaded to ${SNAPSHOT_BUCKET}/${snapshotKey}`);
            // 6. Create Snapshot record in DB
            const snapshotRecord = await db_1.db.snapshot.create({
                data: {
                    projectId,
                    scanId,
                    s3Key: snapshotKey,
                    version: 1,
                    techStack: {},
                },
            });
            // 7. Save entities to DB (upsert by projectId+externalId)
            await job.updateProgress({ stage: 'persisting', percent: 92 });
            for (const entity of entities) {
                await db_1.db.entity.upsert({
                    where: { projectId_externalId: { projectId, externalId: entity.externalId } },
                    create: {
                        projectId,
                        snapshotId: snapshotRecord.id,
                        externalId: entity.externalId,
                        type: entity.type,
                        name: entity.name,
                        status: 'suspect',
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        properties: entity.properties,
                        files: entity.files ?? [],
                    },
                    update: {
                        snapshotId: snapshotRecord.id,
                        type: entity.type,
                        name: entity.name,
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        properties: entity.properties,
                        files: entity.files ?? [],
                    },
                });
            }
            // 8-10. Emit snapshot.created to downstream queues
            await job.updateProgress({ stage: 'dispatching', percent: 96 });
            const eventPayload = {
                scanId,
                projectId,
                snapshotId: snapshotRecord.id,
                s3Key: snapshotKey,
            };
            await Promise.all([
                this.graphQueue.add('snapshot.created', eventPayload),
                this.checkQueue.add('snapshot.created', eventPayload),
                this.docsQueue.add('snapshot.created', eventPayload),
            ]);
            // 11. Update scan status to done
            await db_1.db.scan.update({
                where: { id: scanId },
                data: {
                    status: 'done',
                    endedAt: new Date(),
                },
            });
            await job.updateProgress({ stage: 'done', percent: 100 });
            this.logger.log(`Scan ${scanId} completed successfully`);
        }
        catch (err) {
            this.logger.error(`Scan ${scanId} failed:`, err);
            try {
                await db_1.db.scan.update({
                    where: { id: scanId },
                    data: {
                        status: 'failed',
                        endedAt: new Date(),
                        errorMsg: err instanceof Error ? err.message : String(err),
                    },
                });
            }
            catch (dbErr) {
                this.logger.error('Failed to update scan status to failed:', dbErr);
            }
            throw err;
        }
        finally {
            // Cleanup cloned temp repo
            if (clonedTemp && repoPath && fs.existsSync(repoPath)) {
                try {
                    fs.rmSync(repoPath, { recursive: true, force: true });
                }
                catch {
                    // ignore cleanup errors
                }
            }
        }
    }
};
exports.ScanProcessor = ScanProcessor;
exports.ScanProcessor = ScanProcessor = ScanProcessor_1 = __decorate([
    (0, bullmq_1.Processor)('scan'),
    __param(1, (0, bullmq_2.InjectQueue)('graph')),
    __param(2, (0, bullmq_2.InjectQueue)('check')),
    __param(3, (0, bullmq_2.InjectQueue)('docs')),
    __metadata("design:paramtypes", [storage_service_1.StorageService,
        bullmq_3.Queue,
        bullmq_3.Queue,
        bullmq_3.Queue])
], ScanProcessor);
//# sourceMappingURL=scan.processor.js.map