import { NextResponse } from 'next/server';
import { getDocs, generateDocs } from '@/lib/backend';
import { MOCK_DOCS } from '@/lib/mock-data';

const DEFAULT_PROJECT = process.env.DEMO_PROJECT_ID ?? 'demo-project-id';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') ?? DEFAULT_PROJECT;

  try {
    let docs = await getDocs(projectId);

    // If no docs exist yet, trigger generation then return mock while it processes
    if (!docs.length) {
      generateDocs(projectId).catch(() => {});
      return NextResponse.json({ data: MOCK_DOCS });
    }

    return NextResponse.json({ data: docs });
  } catch (err) {
    console.warn('[/api/docs] Backend unavailable:', err);
    return NextResponse.json({ data: MOCK_DOCS });
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') ?? DEFAULT_PROJECT;
  try {
    await generateDocs(projectId);
    const docs = await getDocs(projectId);
    return NextResponse.json({ data: docs });
  } catch (err) {
    console.warn('[POST /api/docs] Backend error:', err);
    return NextResponse.json({ data: MOCK_DOCS });
  }
}
