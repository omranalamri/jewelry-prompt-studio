import { NextRequest } from 'next/server';
import { scoreBrief } from '@/lib/quality/scorer';
import { guardRoute } from '@/lib/auth/route-guard';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const guard = await guardRoute(req, { limiter: 'api', prefix: 'score-brief' });
  if (!guard.ok) return guard.response;

  try {
    const brief = await req.json();
    const score = await scoreBrief(brief);
    return Response.json({ success: true, data: score });
  } catch (err) {
    logError(err, { route: '/api/campaigns/score-brief', actor: guard.actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'SCORE_FAILED' }, { status: 500 });
  }
}
