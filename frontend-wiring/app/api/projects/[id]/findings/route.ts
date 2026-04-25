import { NextResponse } from 'next/server';
import { getFindings } from '@/lib/backend';
import { MOCK_FINDINGS } from '@/lib/mock-data';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const severity  = url.searchParams.get('severity');

  try {
    const findings = await getFindings(id, category, severity);
    return NextResponse.json({ data: findings, meta: { total: findings.length } });
  } catch (err) {
    console.warn(`[/api/projects/${id}/findings] Backend unavailable:`, err);
    const filtered = category
      ? MOCK_FINDINGS.filter((f) => f.category === category)
      : MOCK_FINDINGS;
    return NextResponse.json({ data: filtered, meta: { total: filtered.length } });
  }
}
