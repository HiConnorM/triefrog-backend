import { NextResponse } from 'next/server';
import { getIntegrations } from '@/lib/backend';
import { MOCK_INTEGRATIONS } from '@/lib/mock-data';

const DEFAULT_PROJECT = process.env.DEMO_PROJECT_ID ?? 'demo-project-id';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const projectId = url.searchParams.get('projectId') ?? DEFAULT_PROJECT;

  try {
    const integrations = await getIntegrations(projectId);

    // If backend has no integrations yet, fall back to mock so UI isn't empty
    if (!integrations.length) {
      return NextResponse.json({ data: MOCK_INTEGRATIONS });
    }

    return NextResponse.json({ data: integrations });
  } catch (err) {
    console.warn('[/api/integrations] Backend unavailable:', err);
    return NextResponse.json({ data: MOCK_INTEGRATIONS });
  }
}
