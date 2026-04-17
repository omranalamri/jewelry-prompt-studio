/**
 * Combined route guard — admin auth + rate limit in one call.
 *
 * Usage in a handler:
 *   const guard = await guardRoute(req, { limiter: 'video', prefix: 'video-gen' });
 *   if (!guard.ok) return guard.response;
 *   // guard.actor.userId is safe to use
 *
 * The rate limiter is selected by tier:
 *   'image' → 50/min  (slower gen, still expensive)
 *   'video' → 10/min  (very expensive, $4+ per Veo call)
 *   'api'   → 200/min (default for admin endpoints)
 */

import { NextRequest } from 'next/server';
import { requireAdmin, type AdminActor } from '@/lib/auth/admin-guard';
import {
  getImageGenRateLimiter,
  getVideoGenRateLimiter,
  getApiRateLimiter,
  checkRateLimit,
} from '@/lib/redis/client';

export type LimiterTier = 'image' | 'video' | 'api';

export interface GuardOptions {
  limiter?: LimiterTier;
  /** Prefix for the rate-limit identifier — helps split buckets per route. */
  prefix?: string;
}

export type GuardResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: Response };

export async function guardRoute(req: NextRequest, opts: GuardOptions = {}): Promise<GuardResult> {
  // 1. Admin auth first — cheapest check
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth;

  // 2. Rate limit
  const tier = opts.limiter ?? 'api';
  const limiter =
    tier === 'video' ? getVideoGenRateLimiter() :
    tier === 'image' ? getImageGenRateLimiter() :
    getApiRateLimiter();

  if (limiter) {
    const identifier = `${opts.prefix ?? 'route'}:${auth.actor.userId}`;
    const rl = await checkRateLimit(limiter, identifier);
    if (rl && !rl.success) {
      return {
        ok: false,
        response: Response.json(
          {
            success: false,
            error: `Rate limit exceeded. ${rl.remaining}/${rl.limit} remaining. Retry in ${Math.ceil((rl.reset - Date.now()) / 1000)}s`,
            code: 'RATE_LIMIT',
          },
          {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) },
          },
        ),
      };
    }
  }

  return auth;
}
