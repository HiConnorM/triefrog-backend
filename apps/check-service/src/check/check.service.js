"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var CheckService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CheckService = void 0;
const common_1 = require("@nestjs/common");
const db_1 = require("@triefrog/db");
let CheckService = CheckService_1 = class CheckService {
    logger = new common_1.Logger(CheckService_1.name);
    async getFindings(projectId, filters) {
        const where = { projectId };
        if (filters.category !== undefined) {
            where.category = filters.category;
        }
        if (filters.severity !== undefined) {
            where.severity = filters.severity;
        }
        if (filters.resolved !== undefined) {
            where.resolved = filters.resolved;
        }
        const results = await db_1.db.finding.findMany({ where });
        return { findings: results, total: results.length };
    }
    async getOverview(projectId) {
        const allFindings = await db_1.db.finding.findMany({
            where: { projectId, resolved: false },
        });
        // Compute shippability score
        let score = 100;
        for (const finding of allFindings) {
            if (finding.severity === 'critical') {
                score -= 15;
            }
            else if (finding.severity === 'warn') {
                score -= 5;
            }
        }
        score = Math.max(0, score);
        // Group findings by category for health cards
        const grouped = {};
        for (const finding of allFindings) {
            const cat = finding.category ?? 'general';
            if (!grouped[cat])
                grouped[cat] = [];
            grouped[cat].push(finding);
        }
        const healthCards = Object.entries(grouped).map(([category, catFindings]) => {
            const hasCritical = catFindings.some((f) => f.severity === 'critical');
            const status = hasCritical
                ? 'critical'
                : 'suspect';
            return {
                category,
                status,
                findingCount: catFindings.length,
                findings: catFindings.map((f) => ({
                    id: f.id,
                    title: f.title,
                    severity: f.severity,
                })),
            };
        });
        // Add verified cards for categories with zero findings
        const knownCategories = ['setup', 'docs', 'security', 'data', 'deploy'];
        for (const cat of knownCategories) {
            if (!grouped[cat]) {
                healthCards.push({
                    category: cat,
                    status: 'verified',
                    findingCount: 0,
                    findings: [],
                });
            }
        }
        return {
            projectId,
            shippabilityScore: score,
            healthCards,
        };
    }
    async resolveFinding(findingId) {
        const existing = await db_1.db.finding.findUnique({
            where: { id: findingId },
        });
        if (!existing) {
            throw new common_1.NotFoundException(`Finding ${findingId} not found`);
        }
        const updated = await db_1.db.finding.update({
            where: { id: findingId },
            data: { resolved: true, resolvedAt: new Date() },
        });
        return updated;
    }
    async processFindingsFromSnapshot(projectId, rawFindings) {
        this.logger.log(`Processing ${rawFindings.length} findings for project ${projectId}`);
        // Delete old unresolved findings for this project
        await db_1.db.finding.deleteMany({
            where: { projectId, resolved: false },
        });
        // Insert new findings
        if (rawFindings.length > 0) {
            await db_1.db.finding.createMany({
                data: rawFindings.map((f) => ({
                    projectId,
                    ruleId: `rule:${f.category}:${f.title.toLowerCase().replace(/\s+/g, '-')}`,
                    title: f.title,
                    description: f.description,
                    severity: f.severity,
                    category: f.category,
                    entityId: f.entityId ?? null,
                    resolved: false,
                })),
            });
        }
        this.logger.log(`Inserted ${rawFindings.length} findings for project ${projectId}`);
    }
    async generateFindingsFromEntities(projectId) {
        const projectEntities = await db_1.db.entity.findMany({
            where: { projectId },
        });
        const rawFindings = [];
        const types = projectEntities.map((e) => e.type.toLowerCase());
        const hasEnvVarEntities = types.some((t) => t.includes('env-var') || t.includes('env_var'));
        const hasEnvExample = projectEntities.some((e) => e.name?.toLowerCase().includes('.env.example'));
        const hasBuildScript = projectEntities.some((e) => e.name?.toLowerCase() === 'build' &&
            e.type?.toLowerCase().includes('script'));
        const hasDbTables = types.some((t) => t.includes('db-table') || t.includes('table'));
        const hasDeployTarget = types.some((t) => t.includes('deploy'));
        // Check for .env.example
        if (!hasEnvExample && hasEnvVarEntities) {
            rawFindings.push({
                title: 'Missing .env.example',
                description: 'Env var entities exist but no .env.example file was detected. Add a .env.example to document required environment variables.',
                severity: 'critical',
                category: 'setup',
            });
        }
        // Check env vars without documentation
        for (const entity of projectEntities) {
            const type = entity.type.toLowerCase();
            if (type.includes('env-var') || type.includes('env_var')) {
                const props = (entity.properties ?? {});
                const hasDoc = props['documented'] ||
                    props['description'];
                if (!hasDoc) {
                    rawFindings.push({
                        title: 'Env vars not documented',
                        description: `Environment variable "${entity.name}" has no documentation. Add descriptions to all env vars.`,
                        severity: 'warn',
                        category: 'docs',
                        entityId: entity.id,
                    });
                    break; // One finding per project for this rule
                }
            }
        }
        // Check for build script
        if (!hasBuildScript) {
            const buildScriptEntity = projectEntities.find((e) => (e.name?.toLowerCase().includes('build') &&
                e.type?.toLowerCase().includes('script')) ||
                e.properties?.['buildScript']);
            if (!buildScriptEntity) {
                rawFindings.push({
                    title: 'Missing build script',
                    description: 'No build script entity was detected. Ensure a build script is defined in your project.',
                    severity: 'critical',
                    category: 'setup',
                });
            }
        }
        // Check for DB migrations
        if (hasDbTables) {
            const hasMigrations = projectEntities.some((e) => {
                const props = (e.properties ?? {});
                return (e.name?.toLowerCase().includes('migration') ||
                    props['migrationFolder'] ||
                    props['migrations']);
            });
            if (!hasMigrations) {
                rawFindings.push({
                    title: 'Missing DB migrations',
                    description: 'DB table entities exist but no migration folder was detected in entity properties. Add database migrations to track schema changes.',
                    severity: 'warn',
                    category: 'data',
                });
            }
        }
        // Check for deploy documentation
        if (hasDeployTarget) {
            const hasDeployDoc = projectEntities.some((e) => e.type?.toLowerCase().includes('doc') &&
                e.name?.toLowerCase().includes('deploy'));
            if (!hasDeployDoc) {
                rawFindings.push({
                    title: 'Missing deploy documentation',
                    description: 'Deploy target entities exist but no deploy documentation was found. Add documentation describing the deployment process.',
                    severity: 'warn',
                    category: 'deploy',
                });
            }
        }
        // Check for exposed secrets
        for (const entity of projectEntities) {
            const type = entity.type.toLowerCase();
            if (type.includes('security') || type.includes('credential')) {
                const props = (entity.properties ?? {});
                if (props['secretExposed'] === true) {
                    rawFindings.push({
                        title: 'Exposed secret detected',
                        description: `Entity "${entity.name}" has secretExposed=true. Rotate credentials immediately and remove secrets from source.`,
                        severity: 'critical',
                        category: 'security',
                        entityId: entity.id,
                    });
                }
            }
        }
        return rawFindings;
    }
};
exports.CheckService = CheckService;
exports.CheckService = CheckService = CheckService_1 = __decorate([
    (0, common_1.Injectable)()
], CheckService);
//# sourceMappingURL=check.service.js.map