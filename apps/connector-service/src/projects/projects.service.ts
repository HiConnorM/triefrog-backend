import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient } from '@triefrog/db';
import { CreateProjectDto, UpdateProjectDto, ProjectDto } from './dto/project.dto';

@Injectable()
export class ProjectsService {
  private readonly prisma = new PrismaClient();

  async createProject(dto: CreateProjectDto): Promise<ProjectDto> {
    const project = await this.prisma.project.create({
      data: {
        name: dto.name,
        description: dto.description,
        repoUrl: dto.repoUrl,
        orgId: dto.orgId,
      },
      include: {
        repoConnections: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.toDto(project);
  }

  async getProjects(orgId: string): Promise<ProjectDto[]> {
    const projects = await this.prisma.project.findMany({
      where: { orgId },
      include: {
        repoConnections: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects.map((p) => this.toDto(p));
  }

  async getProject(id: string): Promise<ProjectDto> {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        repoConnections: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project ${id} not found`);
    }

    return this.toDto(project);
  }

  async updateProject(id: string, dto: UpdateProjectDto): Promise<ProjectDto> {
    await this.getProject(id);

    const project = await this.prisma.project.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.repoUrl !== undefined && { repoUrl: dto.repoUrl }),
      },
      include: {
        repoConnections: true,
        scans: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    return this.toDto(project);
  }

  async deleteProject(id: string): Promise<void> {
    await this.getProject(id);

    await this.prisma.project.delete({ where: { id } });
  }

  private toDto(project: any): ProjectDto {
    const lastScan = project.scans?.[0];

    return {
      id: project.id,
      name: project.name,
      description: project.description ?? undefined,
      repoUrl: project.repoUrl,
      orgId: project.orgId,
      lastScanStatus: lastScan?.status ?? undefined,
      lastScanAt: lastScan?.createdAt ?? undefined,
      repoConnection: project.repoConnections?.[0]
        ? {
            id: project.repoConnections[0].id,
            provider: project.repoConnections[0].provider,
            createdAt: project.repoConnections[0].createdAt,
          }
        : undefined,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    };
  }
}
