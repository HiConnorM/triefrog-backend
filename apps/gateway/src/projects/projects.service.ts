import { Injectable } from '@nestjs/common';
import { HttpService } from '../http.service';

const CONNECTOR = process.env.CONNECTOR_SERVICE_URL || 'http://localhost:3002';
const SCANNER = process.env.SCANNER_SERVICE_URL || 'http://localhost:3003';
const CHECK = process.env.CHECK_SERVICE_URL || 'http://localhost:3005';

@Injectable()
export class ProjectsService {
  constructor(private readonly http: HttpService) {}

  async getProjects(orgId: string, authHeader?: string) {
    return this.http.get(`${CONNECTOR}/projects?orgId=${orgId}`, authHeader);
  }

  async createProject(data: any, authHeader?: string) {
    return this.http.post(`${CONNECTOR}/projects`, data, authHeader);
  }

  async getProject(id: string, authHeader?: string) {
    return this.http.get(`${CONNECTOR}/projects/${id}`, authHeader);
  }

  async getProjectOverview(projectId: string, authHeader?: string) {
    const [project, overview, scansData] = await Promise.allSettled([
      this.http.get(`${CONNECTOR}/projects/${projectId}`, authHeader),
      this.http.get(`${CHECK}/projects/${projectId}/overview`, authHeader),
      this.http.get(`${SCANNER}/scans/project/${projectId}`, authHeader),
    ]);

    const projectData = project.status === 'fulfilled' ? project.value : null;
    const overviewData = overview.status === 'fulfilled' ? overview.value : null;
    const scans = scansData.status === 'fulfilled' ? scansData.value : null;
    const latestScan = Array.isArray(scans) ? scans[0] : null;

    return {
      project: projectData,
      ...overviewData,
      latestScan,
    };
  }

  async triggerScan(projectId: string, triggeredBy: string, authHeader?: string) {
    return this.http.post(
      `${SCANNER}/scans`,
      { projectId, triggeredBy },
      authHeader,
    );
  }
}
