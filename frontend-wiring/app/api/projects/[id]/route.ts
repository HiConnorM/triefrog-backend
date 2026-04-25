import { NextResponse } from 'next/server';
import { getProject } from '@/lib/backend';
import { MOCK_PROJECTS } from '@/lib/mock-data';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const project = await getProject(id);
    return NextResponse.json({ data: project });
  } catch (err) {
    console.warn(`[/api/projects/${id}] Backend unavailable, using mock:`, err);
    const project = MOCK_PROJECTS.find((p) => p.id === id) ?? MOCK_PROJECTS[0];
    return NextResponse.json({ data: project });
  }
}
