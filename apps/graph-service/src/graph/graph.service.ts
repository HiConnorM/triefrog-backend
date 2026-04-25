import { Injectable, NotFoundException } from '@nestjs/common';
import { db } from '@triefrog/db';
import {
  entities,
  edges,
  mapPayloads,
  findings,
  docs,
} from '@triefrog/db/schema';
import { eq, or } from 'drizzle-orm';

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
  async getMapPayload(projectId: string) {
    // Check cache first
    const cached = await db
      .select()
      .from(mapPayloads)
      .where(eq(mapPayloads.projectId, projectId))
      .limit(1);

    if (cached.length > 0) {
      return cached[0].payload;
    }

    return this.rebuildMapPayload(projectId);
  }

  async rebuildMapPayload(projectId: string) {
    // Fetch all entities for the project
    const projectEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.projectId, projectId));

    // Fetch all edges for these entities
    const entityIds = projectEntities.map((e) => e.id);

    let projectEdges: (typeof edges.$inferSelect)[] = [];
    if (entityIds.length > 0) {
      projectEdges = await db
        .select()
        .from(edges)
        .where(
          or(
            ...entityIds.map((id) => eq(edges.fromEntityId, id)),
          ),
        );
    }

    // Build layout: group by type, assign x/y
    const typeGroups: Record<string, (typeof entities.$inferSelect)[]> = {};
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
    const existing = await db
      .select()
      .from(mapPayloads)
      .where(eq(mapPayloads.projectId, projectId))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(mapPayloads)
        .set({ payload, updatedAt: new Date() })
        .where(eq(mapPayloads.projectId, projectId));
    } else {
      await db.insert(mapPayloads).values({
        projectId,
        payload,
      });
    }

    return payload;
  }

  async getTriePayload(projectId: string) {
    const projectEntities = await db
      .select()
      .from(entities)
      .where(eq(entities.projectId, projectId));

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
    allEntities: (typeof entities.$inferSelect)[],
    root: (typeof entities.$inferSelect) | null,
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

    const toTrieNode = (e: typeof entities.$inferSelect) => ({
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

  async getNodeDetail(nodeId: string) {
    const entity = await db
      .select()
      .from(entities)
      .where(eq(entities.id, nodeId))
      .limit(1);

    if (entity.length === 0) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    // Get all edges where this node is source or target
    const fromEdges = await db
      .select()
      .from(edges)
      .where(eq(edges.fromEntityId, nodeId));

    const toEdges = await db
      .select()
      .from(edges)
      .where(eq(edges.toEntityId, nodeId));

    // Get linked findings
    const linkedFindings = await db
      .select()
      .from(findings)
      .where(eq(findings.entityId, nodeId));

    // Get linked docs
    const linkedDocs = await db
      .select()
      .from(docs)
      .where(eq(docs.entityId, nodeId));

    return {
      ...entity[0],
      relationships: {
        outgoing: fromEdges,
        incoming: toEdges,
      },
      findings: linkedFindings,
      docs: linkedDocs,
    };
  }

  async updateNodeStatus(nodeId: string, status: string) {
    const existing = await db
      .select()
      .from(entities)
      .where(eq(entities.id, nodeId))
      .limit(1);

    if (existing.length === 0) {
      throw new NotFoundException(`Node ${nodeId} not found`);
    }

    await db
      .update(entities)
      .set({ status, updatedAt: new Date() })
      .where(eq(entities.id, nodeId));

    const updated = await db
      .select()
      .from(entities)
      .where(eq(entities.id, nodeId))
      .limit(1);

    return updated[0];
  }
}
