/**
 * backend.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin client for talking to the Triefrog microservices from Next.js API routes.
 * All response shapes are mapped to the types the existing frontend expects.
 */

import type {
  Project,
  GraphNode,
  GraphEdge,
  Finding,
  DocPage,
  Integration,
  Fix,
} from './types';

// ── Service URLs (set in .env.local) ─────────────────────────────────────────
const CONNECTOR = process.env.CONNECTOR_SERVICE_URL ?? 'http://localhost:3002';
const SCANNER   = process.env.SCANNER_SERVICE_URL   ?? 'http://localhost:3003';
const GRAPH     = process.env.GRAPH_SERVICE_URL     ?? 'http://localhost:3004';
const CHECK     = process.env.CHECK_SERVICE_URL     ?? 'http://localhost:3005';
const DOCS      = process.env.DOCS_SERVICE_URL      ?? 'http://localhost:3006';

const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY ?? 'triefrog-internal-dev';
const DEFAULT_PROJECT_ID = process.env.DEMO_PROJECT_ID ?? '';

// ── Fetch helper ──────────────────────────────────────────────────────────────
async function svc<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      'x-internal-key': INTERNAL_KEY,
      ...(init?.headers ?? {}),
    },
    // Don't cache service responses in dev
    next: { revalidate: 0 },
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`[backend] ${url} → ${res.status}: ${text}`);
  }

  const json = await res.json();
  // Our services wrap in { data: ... } or return the object directly
  return (json.data ?? json) as T;
}

// ── Type mappers ──────────────────────────────────────────────────────────────

/** Backend entity type → frontend NodeKind */
const KIND_MAP: Record<string, GraphNode['kind']> = {
  page:            'route',
  'api-endpoint':  'endpoint',
  'db-table':      'table',
  integration:     'integration',
  'env-var':       'envvar',
  'deploy-target': 'deploy_target',
  script:          'service',
  job:             'job',
  doc:             'doc',
  project:         'service',
  component:       'route',
  middleware:      'service',
};

/** Backend entity status → frontend NodeStatus */
const STATUS_MAP: Record<string, GraphNode['status']> = {
  verified: 'verified',
  suspect:  'suspect',
  missing:  'critical',
  changed:  'suspect',
};

function mapEntity(e: any): GraphNode {
  return {
    id:          e.id ?? e.externalId,
    kind:        KIND_MAP[e.type] ?? 'service',
    label:       e.name,
    status:      STATUS_MAP[e.status] ?? 'unknown',
    file:        e.files?.[0] ?? e.properties?.file,
    description: e.properties?.description ?? '',
    dependencies: [],
    findings:    [],
    docs:        [],
    metadata:    e.properties ?? {},
  };
}

function mapEdge(e: any): GraphEdge {
  return {
    id:     e.id,
    source: e.fromEntityId ?? e.from,
    target: e.toEntityId   ?? e.to,
    label:  e.type,
  };
}

function mapFinding(f: any): Finding {
  return {
    id:          f.id,
    severity:    f.severity,
    title:       f.title,
    description: f.description,
    file:        f.properties?.file,
    line:        f.properties?.line,
    rule:        f.ruleId,
    category:    f.category,
    fix: f.suggestedActions?.[0]
      ? { label: f.suggestedActions[0], kind: 'auto-fix' }
      : undefined,
  };
}

function mapDoc(d: any): DocPage {
  // Map backend doc types to frontend categories
  const catMap: Record<string, DocPage['category']> = {
    readme:       'setup',
    setup:        'setup',
    architecture: 'architecture',
    deploy:       'deploy',
    api:          'api-map',
    'data-model': 'data-model',
    runbook:      'runbooks',
    adr:          'adr',
  };
  return {
    id:          d.id,
    title:       d.title,
    category:    catMap[d.type] ?? 'architecture',
    lastVerified: d.lastVerifiedAt
      ? new Date(d.lastVerifiedAt).toLocaleDateString()
      : d.updatedAt
      ? new Date(d.updatedAt).toLocaleDateString()
      : 'never',
    linkedNodes: d.links?.length ?? d.linkedNodeIds?.length ?? 0,
    author:      'triefrog',
    content:     d.content ?? d.latestContent ?? '',
  };
}

function mapFix(f: any): Fix {
  const severityToStatus = (s: string): Fix['status'] =>
    s === 'critical' ? 'suggested' : s === 'warn' ? 'suggested' : 'suggested';
  return {
    id:          f.id,
    title:       f.title,
    description: f.description,
    status:      f.resolved ? 'done' : severityToStatus(f.severity),
    category:    f.category,
    severity:    f.severity,
    file:        f.properties?.file,
    actions:     f.suggestedActions ?? [],
  };
}

function mapProject(p: any, overview?: any): Project {
  const o = overview ?? {};
  const cards: Record<string, string> = {};
  (o.healthCards ?? []).forEach((c: any) => { cards[c.category] = c.status; });

  const statusToNodeStatus = (s: string): Project['health'][keyof Project['health']] =>
    s === 'verified' ? 'verified' : s === 'critical' ? 'critical' : s === 'suspect' ? 'suspect' : 'unknown';

  const lastScan = p.lastScanAt
    ? formatRelative(new Date(p.lastScanAt))
    : 'never';

  return {
    id:               p.id,
    name:             p.name,
    repo:             p.repoUrl ?? p.repo ?? '',
    stack:            p.techStack
      ? [p.techStack.framework, ...(p.techStack.integrations ?? [])].filter(Boolean)
      : (p.stack ?? []),
    lastScan,
    shippabilityScore: o.shippabilityScore ?? p.shippabilityScore ?? 0,
    scanStatus:       mapScanStatus(p.scanStatus ?? p.lastScanStatus),
    nodeCount:        p.nodeCount ?? o.nodeCount ?? 0,
    issueCount: {
      critical: o.criticalCount ?? 0,
      high:     o.highCount     ?? 0,
      warn:     o.warnCount     ?? 0,
      info:     o.infoCount     ?? 0,
    },
    health: {
      setupHealth:     statusToNodeStatus(cards['setup']    ?? o.setupHealth    ?? 'unknown'),
      deployReadiness: statusToNodeStatus(cards['deploy']   ?? o.deployReadiness ?? 'unknown'),
      apiCoverage:     statusToNodeStatus(cards['api']      ?? o.apiCoverage    ?? 'unknown'),
      security:        statusToNodeStatus(cards['security'] ?? o.security       ?? 'unknown'),
    },
  };
}

function mapScanStatus(s?: string): Project['scanStatus'] {
  if (s === 'running' || s === 'queued') return 'scanning';
  if (s === 'done')                      return 'complete';
  if (s === 'failed')                    return 'failed';
  return 'idle';
}

function formatRelative(date: Date): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)   return 'just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)   return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Exported API helpers ──────────────────────────────────────────────────────

export async function getProjects(): Promise<Project[]> {
  const raw: any[] = await svc(`${CONNECTOR}/projects`);
  const projects = Array.isArray(raw) ? raw : raw?.items ?? [];
  return Promise.all(
    projects.map(async (p: any) => {
      const overview = await svc<any>(`${CHECK}/projects/${p.id}/overview`).catch(() => ({}));
      return mapProject(p, overview);
    }),
  );
}

export async function getProject(id: string): Promise<Project> {
  const [p, overview] = await Promise.all([
    svc<any>(`${CONNECTOR}/projects/${id}`),
    svc<any>(`${CHECK}/projects/${id}/overview`).catch(() => ({})),
  ]);
  return mapProject(p, overview);
}

export async function createProject(body: any): Promise<Project> {
  const p = await svc<any>(`${CONNECTOR}/projects`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  return mapProject(p);
}

export async function getGraph(
  projectId: string,
): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
  const raw = await svc<any>(`${GRAPH}/projects/${projectId}/map`);
  const nodes: GraphNode[] = (raw.nodes ?? []).map(mapEntity);
  const edges: GraphEdge[] = (raw.edges ?? []).map(mapEdge);

  // Attach finding refs to nodes
  const findingsRaw: any[] = await svc<any>(
    `${CHECK}/projects/${projectId}/findings`,
  ).then((r: any) => r.findings ?? r ?? []).catch(() => []);

  const findingsByNode: Record<string, Finding[]> = {};
  for (const f of findingsRaw) {
    if (f.entityId) {
      findingsByNode[f.entityId] = findingsByNode[f.entityId] ?? [];
      findingsByNode[f.entityId].push(mapFinding(f));
    }
  }

  for (const node of nodes) {
    node.findings = findingsByNode[node.id] ?? [];
  }

  return { nodes, edges };
}

export async function getFindings(
  projectId: string,
  category?: string | null,
  severity?: string | null,
): Promise<Finding[]> {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  if (severity) params.set('severity', severity);
  const raw = await svc<any>(
    `${CHECK}/projects/${projectId}/findings${params.toString() ? '?' + params : ''}`,
  );
  const arr = Array.isArray(raw) ? raw : raw.findings ?? [];
  return arr.map(mapFinding);
}

export async function triggerScan(projectId: string): Promise<{ jobId: string; status: string }> {
  const raw = await svc<any>(`${SCANNER}/scans`, {
    method: 'POST',
    body: JSON.stringify({ projectId, triggeredBy: 'user' }),
  });
  return { jobId: raw.id ?? raw.scanId ?? `scan-${Date.now()}`, status: raw.status ?? 'queued' };
}

export async function getDocs(projectId: string): Promise<DocPage[]> {
  const raw: any[] = await svc<any>(`${DOCS}/projects/${projectId}/docs`).then(
    (r: any) => (Array.isArray(r) ? r : r.docs ?? []),
  );
  return raw.map(mapDoc);
}

export async function getFixes(projectId: string, status?: string | null): Promise<Fix[]> {
  const raw: any[] = await svc<any>(`${CHECK}/projects/${projectId}/findings`).then(
    (r: any) => (Array.isArray(r) ? r : r.findings ?? []),
  );
  const fixes = raw.map(mapFix);
  if (status) return fixes.filter((f) => f.status === status);
  return fixes;
}

export async function getIntegrations(projectId: string): Promise<Integration[]> {
  // Integrations come from entity type="integration" in the graph
  const graph = await getGraph(projectId).catch(() => ({ nodes: [] as GraphNode[], edges: [] as GraphEdge[] }));
  const integrationNodes = graph.nodes.filter((n) => n.kind === 'integration');

  const statusMap: Record<string, Integration['status']> = {
    verified:  'connected',
    suspect:   'auth-failed',
    missing:   'not-configured',
    unknown:   'disconnected',
    changed:   'auth-failed',
    critical:  'disconnected',
  };

  return integrationNodes.map((n): Integration => ({
    id:          n.id,
    name:        n.label,
    description: n.description ?? '',
    status:      statusMap[n.status] ?? 'disconnected',
    icon:        n.metadata?.icon ?? n.label.toLowerCase(),
    detail:      n.metadata?.detail,
  }));
}

/** Resolve a finding (mark as done) */
export async function resolveFinding(findingId: string): Promise<void> {
  await svc(`${CHECK}/findings/${findingId}/resolve`, {
    method: 'PATCH',
    body: JSON.stringify({ resolved: true }),
  });
}

/** Generate docs for a project */
export async function generateDocs(projectId: string): Promise<void> {
  await svc(`${DOCS}/projects/${projectId}/docs/generate`, { method: 'POST' });
}

// Re-export for convenience
export { DEFAULT_PROJECT_ID };
