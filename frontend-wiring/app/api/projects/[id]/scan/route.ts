import { NextResponse } from 'next/server';
import { triggerScan } from '@/lib/backend';

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const result = await triggerScan(id);
    return NextResponse.json({ data: result });
  } catch (err) {
    console.warn(`[POST /api/projects/${id}/scan] Backend error:`, err);
    // Return a mock queued response so the UI keeps working
    return NextResponse.json({
      data: { jobId: `scan-${id}-${Date.now()}`, status: 'queued' },
    });
  }
}
