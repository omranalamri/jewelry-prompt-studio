import { NextRequest } from 'next/server';
import { runAgent, runCreativeCouncil } from '@/lib/agents/orchestrator';
import type { AgentName } from '@/lib/agents/personas';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { getApiRateLimiter, checkRateLimit } from '@/lib/redis/client';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 300;

/**
 * POST /api/agents/orchestrate
 *
 * Runs a single agent or a full Creative Council debate. Council debates are
 * ~$0.23/run (Sonnet + Haiku + Gemini), so this endpoint is a cost-exhaustion
 * target if left public.
 *
 * Hardening:
 *   • Admin-gated (requireAdmin)
 *   • Rate-limited per caller
 *   • Accepted modes restricted to an allowlist
 */

const MAX_TOPIC_LEN = 1_000;
const MAX_CONTEXT_BYTES = 20_000;

export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const limiter = getApiRateLimiter();
  if (limiter) {
    const identifier = `agents:${guard.actor.userId}`;
    const rl = await checkRateLimit(limiter, identifier);
    if (rl && !rl.success) {
      return Response.json(
        { success: false, error: 'Rate limit exceeded', code: 'RATE_LIMIT' },
        { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } },
      );
    }
  }

  try {
    const body = await req.json().catch(() => ({})) as {
      mode?: string;
      agent?: string;
      task?: string;
      context?: Record<string, unknown>;
      topic?: string;
      subject?: Record<string, unknown>;
      participants?: string[];
    };

    // Validate mode
    const mode = body.mode === 'debate' ? 'debate' : 'single';

    if (mode === 'debate') {
      const topic = typeof body.topic === 'string' ? body.topic.slice(0, MAX_TOPIC_LEN) : '';
      if (!topic) {
        return Response.json(
          { success: false, error: 'topic required for debate mode', code: 'MISSING_INPUT' },
          { status: 400 },
        );
      }
      const result = await runCreativeCouncil(
        topic,
        body.subject ?? {},
        (Array.isArray(body.participants) ? body.participants : undefined) as AgentName[] | undefined,
      );
      return Response.json({ success: true, data: result });
    }

    // Single-agent mode
    if (!body.agent || !body.task) {
      return Response.json(
        { success: false, error: 'agent + task required', code: 'MISSING_INPUT' },
        { status: 400 },
      );
    }

    const task = String(body.task).slice(0, MAX_TOPIC_LEN);
    const context = body.context ?? {};
    // Cheap size cap on context to prevent oversized prompts
    if (JSON.stringify(context).length > MAX_CONTEXT_BYTES) {
      return Response.json(
        { success: false, error: 'context too large', code: 'CONTEXT_TOO_LARGE' },
        { status: 413 },
      );
    }

    const result = await runAgent(body.agent as AgentName, task, context);
    return Response.json({ success: true, data: result });
  } catch (err) {
    logError(err, { route: '/api/agents/orchestrate', actor: guard.actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return Response.json({ success: false, error: msg, code: 'ORCHESTRATE_FAILED' }, { status: 500 });
  }
}
