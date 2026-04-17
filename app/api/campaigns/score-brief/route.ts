import { NextRequest } from 'next/server';
import { scoreBrief } from '@/lib/quality/scorer';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const brief = await req.json();
    const score = await scoreBrief(brief);
    return Response.json({ success: true, data: score });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg }, { status: 500 });
  }
}
