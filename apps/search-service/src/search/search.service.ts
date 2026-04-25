import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@triefrog/db';

export interface SearchResult {
  id: string;
  type: 'entity' | 'doc';
  title: string;
  excerpt: string;
  projectId: string;
}

@Injectable()
export class SearchService {
  private readonly prisma = new PrismaClient();

  async search(q: string, projectId?: string): Promise<SearchResult[]> {
    const pattern = `%${q}%`;

    // Search entities by name using ILIKE
    const entityWhere: Record<string, unknown> = {
      name: { contains: q, mode: 'insensitive' },
    };
    if (projectId) {
      entityWhere.projectId = projectId;
    }

    const entities = await this.prisma.entity.findMany({
      where: entityWhere,
      select: {
        id: true,
        name: true,
        type: true,
        projectId: true,
        description: true,
      },
      take: 50,
    });

    // Search docs by title using ILIKE
    const docWhere: Record<string, unknown> = {
      title: { contains: q, mode: 'insensitive' },
    };
    if (projectId) {
      docWhere.projectId = projectId;
    }

    const docs = await this.prisma.doc.findMany({
      where: docWhere,
      select: {
        id: true,
        title: true,
        projectId: true,
        content: true,
      },
      take: 50,
    });

    const entityResults: SearchResult[] = entities.map((e) => ({
      id: e.id,
      type: 'entity' as const,
      title: e.name,
      excerpt: e.description
        ? e.description.slice(0, 200)
        : `${e.type} entity`,
      projectId: e.projectId,
    }));

    const docResults: SearchResult[] = docs.map((d) => ({
      id: d.id,
      type: 'doc' as const,
      title: d.title,
      excerpt: d.content ? d.content.slice(0, 200) : '',
      projectId: d.projectId,
    }));

    return [...entityResults, ...docResults];
  }
}
