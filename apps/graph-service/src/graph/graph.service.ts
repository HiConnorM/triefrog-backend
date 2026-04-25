import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@triefrog/db';

// Row-type positions by entity type
const ROW_MAP: Record<string, number> = {
  page: 0,
  route: 0,
  'api-endpoint': 1,
  'api': 1,
  'db-table': 2,
  'table': 2,
  data: 2,
  'env-var': 3,
  integration: 4,
  deploy: 4,
};

function getRow(type: string): number {
  const lower = type?.toLowerCase() ?? '';
  for (const [key, row] of Object.entries(ROW_MAP)) {
    if (lower.includes(key)) return row;
  }
  return 5; // misc row
}

@Injectable()
export class GraphService {
  async getMapPayload(projectId: string): Promise<unknown> {
    // Check cache first
    const cached = await db.mapPayload.findUnique({
      where: { projectId },
    });

    if (cached) {
      return cached.payload;
    }

    return this.rebuildMapPayload(projectId);
  }

  async rebuildMapPayload(projectId: string): Promise<unknown> {
    // Fetch all entities for the project
    const projectEntities = await db.entity.findMany({
      where: { projectId },
    });

    // Fetch all edges for the project
    const projectEdges = await db.edge.findMany({
      where: { projectId },
    });

    // Build layout: group by type, assign x/y
    const typeGroups: Record<string, typeof projectEntities> = {};
    for (const entity of projectEntities) {
      const row = getRow(entity.type);
      const rowKey = String(row);
      if (!typeGroups[rowKey]) typeGroups[rowKey] = [];
      typeGroups[rowKey].push(entity);
    }

    const positionMap: Record<string, { x: number; y: number }> = {};
    for (const [rowKey, rowEntities] of Object.entries(typeGroups)) {
      const y = parseInt(rowKey) * 120;
      rowEntities.forEach((entity, col) => {
        positionMap[entity.id] = { x: col * 180, y };
      });
    }

    // Build NodeDtos
    const nodes = projectEntities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      name: entity.name,
      status: entity.status,
      properties: entity.properties,
      files: entity.files,
      x: positionMap[entity.id]?.x ?? 0,
      y: positionMap[entity.id]?.y ?? 0,
    }));

    // Build EdgeDtos
    const edgeDtos = projectEdges.map((edge) => ({
      id: edge.id,
      fromEntityId: edge.fromEntityId,
      toEntityId: edge.toEntityId,
      type: edge.type,
      label: edge.label,
    }));

    const payload = { nodes, edges: edgeDtos };

    // Upsert into mapPayloads cache
    await db.mapPayload.upsert({
      where: { projectId },
      create: {
        projectId,
        payload,
        version: 1,
      },
      update: {
        payload,
        version: { increment: 1 },
      },
    });

    return payload;
  }

  async getTriePayload(projectId: string): Promise<unknown> {
    const projectEntities = await db.entity.findMany({
      where: { projectId },
    });

    // Find root (project entity)
    const root = projectEntities.find(
      (e) => e.type.toLowerCase() === 'project',
    );

    if (!root) {
      // Construct a synthetic root if no explicit project entity
      return this.buildTrieTree(projectId, projectEntities, null);
    }

    return this.buildTrieTree(projectId, projectEntities, root);
  }

  private buildTrieTree(
    projectId: string,
    allEntities: Awaited<ReturnType<typeof db.entity.findMany>>,
    root: Awaited<ReturnType<typeof db.entity.findMany>>[number] | null,
  ) {
    const rootNode = {
      id: root?.id ?? projectId,
      name: root?.name ?? 'Project',
      type: root?.type ?? 'project',
      status: root?.status ?? 'unknown',
      children: [] as unknown[],
    };

    // Group entities by type for trie structure
    const pages = allEntities.filter((e) =>
      ['page', 'route'].some((t) => e.type.toLowerCase().includes(t)),
    );
    const apiEndpoints = allEntities.filter((e) =>
      ['api-endpoint', 'api', 'endpoint'].some((t) =>
        e.type.toLowerCase().includes(t),
      ),
    );
    const dbTables = allEntities.filter((e) =>
      ['db-table', 'table', 'data'].some((t) =>
        e.type.toLowerCase().includes(t),
      ),
    );
    const envVars = allEntities.filter((e) =>
      e.type.toLowerCase().includes('env-var') ||
      e.type.toLowerCase().includes('env_var'),
    );
    const integrations = allEntities.filter((e) =>
      e.type.toLowerCase().includes('integration'),
    );

    const toTrieNode = (e: Awaited<ReturnType<typeof db.entity.findMany>>[number]) => ({
      id: e.id,
      name: e.name,
      type: e.type,
      status: e.status,
      children: [],
    });

    if (pages.length > 0) {
      rootNode.children.push({
        id: `${projectId}-app`,
        name: 'App',
        type: 'app',
        status: 'computed',
        children: pages.map(toTrieNode),
      });
    }

    if (apiEndpoints.length > 0) {
      rootNode.children.push({
        id: `${projectId}-api`,
        name: 'API',
        type: 'api-group',
        status: 'computed',
        children: apiEndpoints.map(toTrieNode),
      });
    }

    if (dbTables.length > 0) {
      rootNode.children.push({
        id: `${projectId}-data`,
        name: 'Data',
        type: 'data-group',
        status: 'computed',
        children: dbTables.map(toTrieNode),
      });
    }

    if (envVars.length > 0) {
      rootNode.children.push({
        id: `${projectId}-env`,
        name: 'Env Vars',
        type: 'env-group',
        status: 'computed',
        children: envVars.map(toTrieNode),
      });
    }

    if (integrations.length > 0) {
      rootNode.children.push({
        id: `${projectId}-integrations`,
        name: 'Integrations',
        type: 'integration-group',
        status: 'computed',
        children: integrations.map(toTrieNode),
      });
    }

    return rootNode;
  }

  async getNodeDetail(nodeId: string): Promise<unknown> {
    const entity = await db.entity.findUnique({
      where: { id: nodeId },
    });

    if (!entity) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Get all edges where this node is source or target
    const fromEdges = await db.edge.findMany({
      where: { fromEntityId: nodeId },
    });

    const toEdges = await db.edge.findMany({
      where: { toEntityId: nodeId },
    });

    // Get linked findings
    const linkedFindings = await db.finding.findMany({
      where: { entityId: nodeId },
    });

    // Get linked docs
    const linkedDocs = await db.docLink.findMany({
      where: { entityId: nodeId },
      include: { doc: true },
    });

    return {
      ...entity,
      relationships: {
        outgoing: fromEdges,
        incoming: toEdges,
      },
      findings: linkedFindings,
      docs: linkedDocs.map((dl) => dl.doc),
    };
  }

  async updateNodeStatus(nodeId: string, status: string): Promise<unknown> {
    const existing = await db.entity.findUnique({
      where: { id: nodeId },
    });

    if (!existing) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    const updated = await db.entity.update({
      where: { id: nodeId },
      data: { status },
    });

    return updated;
  }
}
