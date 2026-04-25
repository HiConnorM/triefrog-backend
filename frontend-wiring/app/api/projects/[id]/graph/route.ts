import { NextResponse } from 'next/server';
import { getGraph } from '@/lib/backend';
import { MOCK_NODES, MOCK_EDGES } from '@/lib/mock-data';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const { nodes, edges } = await getGraph(id);
    return NextResponse.json({ data: { nodes, edges } });
  } catch (err) {
    console.warn(`[/api/projects/${id}/graph] Backend unavailable:`, err);
    return NextResponse.json({ data: { nodes: MOCK_NODES, edges: MOCK_EDGES } });
  }
}
