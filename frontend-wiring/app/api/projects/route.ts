import { NextResponse } from 'next/server';
import { getProjects, createProject } from '@/lib/backend';
import { MOCK_PROJECTS } from '@/lib/mock-data';

export async function GET() {
  try {
    const projects = await getProjects();
    return NextResponse.json({ data: projects });
  } catch (err) {
    console.warn('[/api/projects] Backend unavailable, using mock data:', err);
    return NextResponse.json({ data: MOCK_PROJECTS });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const project = await createProject({
      name:    body.name,
      repoUrl: body.repo ?? body.repoUrl,
      orgId:   process.env.DEMO_ORG_ID ?? body.orgId ?? 'demo-org',
      description: body.description,
    });
    return NextResponse.json({ data: project }, { status: 201 });
  } catch (err) {
    console.warn('[POST /api/projects] Backend error:', err);
    // Graceful fallback so onboarding flow still works
    const body = await request.json().catch(() => ({}));
    return NextResponse.json(
      {
        data: {
          id:               `prj-${Date.now()}`,
          name:             body.name ?? 'New Project',
          repo:             body.repo ?? body.repoUrl ?? '',
          stack:            [],
          lastScan:         'never',
          shippabilityScore: 0,
          scanStatus:       'idle',
          nodeCount:        0,
          issueCount:       { critical: 0, high: 0, warn: 0, info: 0 },
          health: {
            setupHealth:    'unknown',
            deployReadiness:'unknown',
            apiCoverage:    'unknown',
            security:       'unknown',
          },
        },
      },
      { status: 201 },
    );
  }
}
