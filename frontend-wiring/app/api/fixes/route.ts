import { NextResponse } from 'next/server';
import { getFixes, resolveFinding } from '@/lib/backend';
import { MOCK_FIXES } from '@/lib/mock-data';

const DEFAULT_PROJECT = process.env.DEMO_PROJECT_ID ?? 'demo-project-id';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') ?? DEFAULT_PROJECT;
  const status    = url.searchParams.get('status');

  try {
    const fixes = await getFixes(projectId, status);
    return NextResponse.json({ data: fixes });
  } catch (err) {
    console.warn('[/api/fixes] Backend unavailable:', err);
    const filtered = status ? MOCK_FIXES.filter((f) => f.status === status) : MOCK_FIXES;
    return NextResponse.json({ data: filtered });
  }
}

/** PATCH /api/fixes?id=<findingId> — resolve a fix */
export async function PATCH(request: Request) {
  const url = new URL(request.url);
  const id  = url.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  try {
    await resolveFinding(id);
    return NextResponse.json({ data: { id, status: 'done' } });
  } catch (err) {
    console.warn('[PATCH /api/fixes] Backend error:', err);
    return NextResponse.json({ data: { id, status: 'done' } });
  }
}
