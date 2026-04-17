import { NextRequest } from 'next/server';
import { extractFacts, factsToContextBlock } from '@/lib/creative/extract-once';
import { logError } from '@/lib/observability/logger';
import { SsrfBlockedError } from '@/lib/auth/ssrf-guard';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getApiRateLimiter, checkRateLimit } from '@/lib/redis/client';

export const maxDuration = 60;

/**
 * POST /api/creative/extract
 *
 * Extracts structured facts from reference + (optional) inspiration images.
 *
 * Hardening:
 *   1. Admin-gated (requireAdmin) — the endpoint costs real Gemini Vision
 *      tokens per call, so it's a cost-exhaustion target if public.
 *   2. Rate-limited per caller (Upstash sliding window).
 *   3. SSRF-guarded fetch inside extractFacts() — malformed/internal URLs
 *      surface here as SsrfBlockedError → 400, not 500.
 *
 * Body: { referenceImageUrl: string; inspirationImageUrl?: string }
 * Returns: { success, data: { facts, contextBlock } }
 */
export async function POST(req: NextRequest) {
  // Auth first — cheap check before anything else
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  // Rate limit — keyed by admin identity when present, else IP
  const limiter = getApiRateLimiter();
  if (limiter) {
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
    const identifier = `extract:${guard.actor.userId || ip.split(',')[0].trim()}`;
    const rl = await checkRateLimit(limiter, identifier);
    if (rl && !rl.success) {
      return Response.json(
        {
          success: false,
          error: `Rate limit exceeded. ${rl.remaining}/${rl.limit} remaining. Retry in ${Math.ceil((rl.reset - Date.now()) / 1000)}s`,
          code: 'RATE_LIMIT',
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
        },
      );
    }
  }

  try {
    const { referenceImageUrl, inspirationImageUrl } = await req.json();
    if (!referenceImageUrl || typeof referenceImageUrl !== 'string') {
      return Response.json(
        { success: false, error: 'referenceImageUrl required', code: 'MISSING_INPUT' },
        { status: 400 },
      );
    }

    const facts = await extractFacts({ referenceImageUrl, inspirationImageUrl });
    const contextBlock = factsToContextBlock(facts);

    return Response.json({ success: true, data: { facts, contextBlock } });
  } catch (err) {
    if (err instanceof SsrfBlockedError) {
      return Response.json(
        { success: false, error: 'Image URL is not reachable', code: 'INVALID_URL' },
        { status: 400 },
      );
    }
    logError(err, { route: '/api/creative/extract', actor: guard.actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'EXTRACTION_FAILED' }, { status: 500 });
  }
}
