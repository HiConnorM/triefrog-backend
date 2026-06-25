import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import {
  generateReadme,
  generateSetup,
  generateArchitecture,
  generateDeploy,
  generateApi,
  generateDataModel,
  generateRunbook,
} from './templates';

export type DocType =
  | 'readme'
  | 'setup'
  | 'architecture'
  | 'deploy'
  | 'api'
  | 'data-model'
  | 'runbook';

const DOC_TYPE_META: Record<DocType, { title: string; filename: string }> = {
  readme: { title: 'README', filename: 'README.md' },
  setup: { title: 'Setup Guide', filename: 'setup.md' },
  architecture: { title: 'Architecture', filename: 'architecture.md' },
  deploy: { title: 'Deployment Guide', filename: 'deploy.md' },
  api: { title: 'API Reference', filename: 'api.md' },
  'data-model': { title: 'Data Model', filename: 'data-model.md' },
  runbook: { title: 'Runbook', filename: 'runbook.md' },
};

// In-memory store until DB package is wired up
interface DocRecord {
  id: string;
  projectId: string;
  type: DocType;
  title: string;
  status: string;
  lastVerifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

interface DocVersionRecord {
  id: string;
  docId: string;
  content: string;
  createdAt: Date;
}

const docsStore = new Map<string, DocRecord>();
const versionsStore = new Map<string, DocVersionRecord[]>();

@Injectable()
export class DocsService {
  private readonly logger = new Logger(DocsService.name);

  private toDto(doc: DocRecord, content?: string) {
    return {
      id: doc.id,
      projectId: doc.projectId,
      type: doc.type,
      title: doc.title,
      status: doc.status,
      content,
      lastVerifiedAt: doc.lastVerifiedAt,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  private getLatestVersion(docId: string): DocVersionRecord | undefined {
    const versions = versionsStore.get(docId) ?? [];
    return versions[versions.length - 1];
  }

  async getDocs(projectId: string) {
    const docs: DocRecord[] = [];
    for (const doc of docsStore.values()) {
      if (doc.projectId === projectId) {
        docs.push(doc);
      }
    }
    return docs.map((doc) => {
      const latest = this.getLatestVersion(doc.id);
      return this.toDto(doc, latest?.content);
    });
  }

  async getDoc(id: string) {
    const doc = docsStore.get(id);
    if (!doc) {
      throw new NotFoundException(`Doc ${id} not found`);
    }
    const latest = this.getLatestVersion(id);
    return this.toDto(doc, latest?.content);
  }

  async generateDocs(projectId: string): Promise<{ docIds: string[] }> {
    this.logger.log(`Generating docs for project ${projectId}`);

    // Build context from project data
    // In production this would query the DB package for entities / techStack
    const context = {
      projectName: `Project ${projectId}`,
      projectId,
      techStack: ['TypeScript', 'NestJS', 'Prisma', 'PostgreSQL', 'Redis'],
      entities: {
        pages: [],
        apis: [],
        dbTables: [],
        envVars: [],
        integrations: [],
      },
      findings: [],
    };

    const generators: Record<DocType, (ctx: typeof context) => string> = {
      readme: generateReadme,
      setup: generateSetup,
      architecture: generateArchitecture,
      deploy: generateDeploy,
      api: generateApi,
      'data-model': generateDataModel,
      runbook: generateRunbook,
    };

    const docIds: string[] = [];

    for (const [type, generator] of Object.entries(generators) as [
      DocType,
      (ctx: typeof context) => string,
    ][]) {
      const meta = DOC_TYPE_META[type];
      const content = generator(context);

      // Find existing doc or create new one
      let existingDoc: DocRecord | undefined;
      for (const doc of docsStore.values()) {
        if (doc.projectId === projectId && doc.type === type) {
          existingDoc = doc;
          break;
        }
      }

      let docId: string;
      const now = new Date();

      if (existingDoc) {
        docId = existingDoc.id;
        existingDoc.updatedAt = now;
        existingDoc.status = 'draft';
      } else {
        docId = randomUUID();
        const newDoc: DocRecord = {
          id: docId,
          projectId,
          type,
          title: meta.title,
          status: 'draft',
          createdAt: now,
          updatedAt: now,
        };
        docsStore.set(docId, newDoc);
      }

      // Create new version
      const version: DocVersionRecord = {
        id: randomUUID(),
        docId,
        content,
        createdAt: now,
      };
      const versions = versionsStore.get(docId) ?? [];
      versions.push(version);
      versionsStore.set(docId, versions);

      docIds.push(docId);
      this.logger.log(`Generated ${type} doc (${docId}) for project ${projectId}`);
    }

    return { docIds };
  }

  async verifyDoc(id: string, attestedBy: string) {
    const doc = docsStore.get(id);
    if (!doc) {
      throw new NotFoundException(`Doc ${id} not found`);
    }

    const now = new Date();
    doc.status = 'verified';
    doc.lastVerifiedAt = now;
    doc.updatedAt = now;

    this.logger.log(`Doc ${id} verified by ${attestedBy}`);

    const latest = this.getLatestVersion(id);
    return this.toDto(doc, latest?.content);
  }

  async exportPr(projectId: string): Promise<{ prUrl: string; message: string }> {
    this.logger.log(`Exporting docs as PR for project ${projectId}`);

    // Mock PR creation
    const prNumber = Math.floor(Math.random() * 900) + 100;
    const prUrl = `https://github.com/triefrog/repo/pull/${prNumber}`;

    return {
      prUrl,
      message: `Pull request #${prNumber} created with latest documentation for project ${projectId}. Review and merge to publish.`,
    };
  }
}
