import * as fs from 'fs';
import * as path from 'path';
import type { SnapshotEntity } from '@triefrog/shared-types';
import type { Analyzer, AnalyzerContext, AnalyzerResult } from '../types';

function filePathToRoute(filePath: string, basePath: string): string {
  let route = filePath
    .replace(basePath, '')
    .replace(/\\/g, '/')
    .replace(/^\//, '');

  // Remove file extension
  route = route.replace(/\.(tsx|ts|js|jsx)$/, '');

  // Next.js App Router: strip /page suffix
  route = route.replace(/\/page$/, '');

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

    return { entities, edges: [], findings: [] };
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
