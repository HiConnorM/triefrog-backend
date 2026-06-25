import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity, SnapshotEdge } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

const ENV_REF_REGEX = /process\.env\.([A-Z_][A-Z0-9_]*)/g;
const API_PATH_REGEX = /['"`](\/api\/[a-zA-Z0-9/_\-[\].:]*)['"`]/g;

/** An endpoint we've materialised, kept around so we can wire edges to it. */
interface EndpointRef {
  externalId: string;
  routePath: string;
  absFile: string;
}

function filePathToRoute(filePath: string, basePath: string): string {
  let route = filePath
    .replace(basePath, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '');

  // Remove file extension
  route = route.replace(/\.(tsx|ts|js|jsx)$/, '');

  // Next.js App Router: strip /page (route group) and /route (API handler) suffix
  route = route.replace(/\/page$/, '');
  route = route.replace(/\/route$/, '');

  // Next.js dynamic segments: [param] -> :param
  route = route.replace(/\[([^\]]+)\]/g, ':$1');

  // Catch-all: [...param] -> *
  route = route.replace(/\.\.\./g, '');

  return '/' + route;
}

function walkDir(dir: string, ext: string[]): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walkDir(fullPath, ext));
    } else if (entry.isFile() && ext.some((e) => entry.name.endsWith(e))) {
      results.push(fullPath);
    }
  }
  return results;
}

export class RoutesAnalyzer implements Analyzer {
  name = 'routes';

  async analyze(ctx: AnalyzerContext): Promise<AnalyzerResult> {
    const entities: SnapshotEntity[] = [];

    // App Router (Next.js 13+): app/ directory
    const appDir = path.join(ctx.repoPath, 'app');
    if (fs.existsSync(appDir)) {
      const allFiles = walkDir(appDir, ['.tsx', '.ts', '.js', '.jsx']);

      for (const file of allFiles) {
        const relativePath = file.replace(ctx.repoPath, '');
        const basename = path.basename(file);

        // API routes: route.ts/js files under app/api/
        if (
          (basename === 'route.ts' || basename === 'route.js') &&
          relativePath.includes('/api/')
        ) {
          const routePath = filePathToRoute(file, appDir);
          // Read file to detect HTTP methods
          const methods = this.detectHttpMethods(file);

          for (const method of methods) {
            entities.push({
              externalId: `${ctx.projectId}:api-endpoint:${method}:${routePath}`,
              projectId: ctx.projectId,
              type: 'api-endpoint',
              name: `${method} ${routePath}`,
              properties: {
                method,
                routePath,
                filePath: relativePath,
                router: 'app',
              },
            } as SnapshotEntity);
          }

          if (methods.length === 0) {
            entities.push({
              externalId: `${ctx.projectId}:api-endpoint:ANY:${routePath}`,
              projectId: ctx.projectId,
              type: 'api-endpoint',
              name: `ANY ${routePath}`,
              properties: {
                method: 'ANY',
                routePath,
                filePath: relativePath,
                router: 'app',
              },
            } as SnapshotEntity);
          }
          continue;
        }

        // Page files
        if (basename === 'page.tsx' || basename === 'page.js' || basename === 'page.ts') {
          const routePath = filePathToRoute(file, appDir);
          entities.push({
            externalId: `${ctx.projectId}:page:${routePath}`,
            projectId: ctx.projectId,
            type: 'page',
            name: routePath || '/',
            properties: {
              routePath: routePath || '/',
              filePath: relativePath,
              router: 'app',
            },
          } as SnapshotEntity);
        }
      }
    }

    // Pages Router (Next.js): pages/ directory
    const pagesDir = path.join(ctx.repoPath, 'pages');
    if (fs.existsSync(pagesDir)) {
      const allFiles = walkDir(pagesDir, ['.tsx', '.ts', '.js', '.jsx']);

      for (const file of allFiles) {
        const relativePath = file.replace(ctx.repoPath, '');
        const basename = path.basename(file);

        // Skip _app, _document, _error
        if (basename.startsWith('_')) continue;

        const routePath = filePathToRoute(file, pagesDir);

        // API routes: files under pages/api/
        if (relativePath.includes('/api/')) {
          const methods = this.detectHttpMethods(file);
          const primaryMethod = methods[0] ?? 'ANY';

          entities.push({
            externalId: `${ctx.projectId}:api-endpoint:${primaryMethod}:${routePath}`,
            projectId: ctx.projectId,
            type: 'api-endpoint',
            name: `${primaryMethod} ${routePath}`,
            properties: {
              method: primaryMethod,
              routePath,
              filePath: relativePath,
              router: 'pages',
            },
          } as SnapshotEntity);
          continue;
        }

        // Regular pages
        entities.push({
          externalId: `${ctx.projectId}:page:${routePath}`,
          projectId: ctx.projectId,
          type: 'page',
          name: routePath || '/',
          properties: {
            routePath: routePath || '/',
            filePath: relativePath,
            router: 'pages',
          },
        } as SnapshotEntity);
      }
    }

    const edges = this.buildEdges(ctx, entities);
    return { entities, edges, findings: [] };
  }

  /**
   * Derives connectivity from the materialised entities:
   *  - api-endpoint --requires--> env-var   (route file reads process.env.X)
   *  - page --calls--> api-endpoint          (page file references "/api/...")
   * Edges reference entities by externalId; unresolved refs are dropped when
   * the snapshot is persisted, so emitting optimistically here is safe.
   */
  private buildEdges(
    ctx: AnalyzerContext,
    entities: SnapshotEntity[],
  ): SnapshotEdge[] {
    const edges: SnapshotEdge[] = [];
    const seen = new Set<string>();
    const push = (edge: SnapshotEdge) => {
      const key = edge.externalId ?? `${edge.from}|${edge.type}|${edge.to}`;
      if (seen.has(key)) return;
      seen.add(key);
      edges.push(edge);
    };

    const endpoints: EndpointRef[] = entities
      .filter((e) => e.type === 'api-endpoint')
      .map((e) => ({
        externalId: e.externalId,
        routePath: String((e.properties as Record<string, unknown>).routePath ?? ''),
        absFile: path.join(
          ctx.repoPath,
          String((e.properties as Record<string, unknown>).filePath ?? ''),
        ),
      }));

    // api-endpoint --requires--> env-var
    for (const ep of endpoints) {
      for (const varName of this.readEnvRefs(ep.absFile)) {
        push({
          externalId: `${ctx.projectId}:edge:${ep.externalId}->requires->${varName}`,
          from: ep.externalId,
          to: `${ctx.projectId}:env-var:${varName}`,
          type: 'requires',
        } as SnapshotEdge);
      }
    }

    // page --calls--> api-endpoint (match by route path prefix)
    const pageFiles = entities
      .filter((e) => e.type === 'page')
      .map((e) => ({
        externalId: e.externalId,
        absFile: path.join(
          ctx.repoPath,
          String((e.properties as Record<string, unknown>).filePath ?? ''),
        ),
      }));

    for (const page of pageFiles) {
      const referenced = this.readApiPaths(page.absFile);
      for (const apiPath of referenced) {
        for (const ep of endpoints) {
          if (ep.routePath && apiPath.startsWith(ep.routePath)) {
            push({
              externalId: `${ctx.projectId}:edge:${page.externalId}->calls->${ep.externalId}`,
              from: page.externalId,
              to: ep.externalId,
              type: 'calls',
            } as SnapshotEdge);
          }
        }
      }
    }

    return edges;
  }

  private readEnvRefs(absFile: string): string[] {
    if (!fs.existsSync(absFile)) return [];
    try {
      const content = fs.readFileSync(absFile, 'utf-8');
      const vars = new Set<string>();
      let m: RegExpExecArray | null;
      ENV_REF_REGEX.lastIndex = 0;
      while ((m = ENV_REF_REGEX.exec(content)) !== null) vars.add(m[1]);
      return [...vars];
    } catch {
      return [];
    }
  }

  private readApiPaths(absFile: string): string[] {
    if (!fs.existsSync(absFile)) return [];
    try {
      const content = fs.readFileSync(absFile, 'utf-8');
      const paths = new Set<string>();
      let m: RegExpExecArray | null;
      API_PATH_REGEX.lastIndex = 0;
      while ((m = API_PATH_REGEX.exec(content)) !== null) paths.add(m[1]);
      return [...paths];
    } catch {
      return [];
    }
  }

  private detectHttpMethods(filePath: string): string[] {
    if (!fs.existsSync(filePath)) return [];
    const methods: string[] = [];
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
      for (const method of httpMethods) {
        // App Router style: export async function GET(...)
        if (
          new RegExp(`export\\s+(?:async\\s+)?function\\s+${method}\\b`).test(content) ||
          // Pages router style: if (req.method === 'GET')
          new RegExp(`req\\.method\\s*===?\\s*['"]${method}['"]`).test(content)
        ) {
          methods.push(method);
        }
      }
    } catch {
      // ignore
    }
    return methods;
  }
}
