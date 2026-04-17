/**
 * Admin authorization guard for privileged API routes.
 *
 * Every route that mutates production state (publishing, billing, governance
 * approvals, DB migrations) must call requireAdmin() before doing anything.
 *
 * Behavior:
 *   • When CLERK_SECRET_KEY is set → require Clerk auth + userId in ADMIN_USER_IDS
 *   • When Clerk is unconfigured (dev/preview) → allow only if ADMIN_BYPASS_TOKEN
 *     header is present and matches env. This keeps the preview deploy usable
 *     for Omran while forbidding anonymous access.
 *
 * Returns either { ok: true, actor } or a Response that the handler MUST
 * return immediately (401 / 403).
 */

import { NextRequest } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { isClerkConfigured } from '@/lib/auth/clerk';

export interface AdminActor {
  userId: string;
  email: string | null;
  name: string;
  source: 'clerk' | 'bypass-token';
}

export type AdminGuardResult =
  | { ok: true; actor: AdminActor }
  | { ok: false; response: Response };

function unauthorized(reason: string): Response {
  return Response.json(
    { success: false, error: reason, code: 'UNAUTHORIZED' },
    { status: 401 },
  );
}

function forbidden(reason: string): Response {
  return Response.json(
    { success: false, error: reason, code: 'FORBIDDEN' },
    { status: 403 },
  );
}

function parseAdminList(): Set<string> {
  const raw = process.env.ADMIN_USER_IDS || '';
  return new Set(raw.split(',').map(s => s.trim()).filter(Boolean));
}

export async function requireAdmin(req: NextRequest): Promise<AdminGuardResult> {
  // Path A — Clerk auth is live
  if (isClerkConfigured()) {
    let userId: string | null = null;
    let sessionClaims: Record<string, unknown> | null = null;
    try {
      const session = await auth();
      userId = session.userId ?? null;
      sessionClaims = (session.sessionClaims as Record<string, unknown>) ?? null;
    } catch {
      return { ok: false, response: unauthorized('Auth error') };
    }

    if (!userId) {
      return { ok: false, response: unauthorized('Sign in required') };
    }

    const admins = parseAdminList();
    // Allow either explicit allowlist OR a role claim with 'admin'
    const roleClaim = sessionClaims?.role || (sessionClaims?.metadata as Record<string, unknown> | undefined)?.role;
    const hasAllowlist = admins.size > 0;
    const isAllowlisted = hasAllowlist && admins.has(userId);
    const isRoleAdmin = typeof roleClaim === 'string' && roleClaim === 'admin';

    // Fail closed: if ADMIN_USER_IDS is set, require membership. Otherwise, require role claim.
    if (hasAllowlist && !isAllowlisted) {
      return { ok: false, response: forbidden('Admin access required') };
    }
    if (!hasAllowlist && !isRoleAdmin) {
      return { ok: false, response: forbidden('Admin role required') };
    }

    const email = typeof sessionClaims?.email === 'string' ? sessionClaims.email : null;
    const name = typeof sessionClaims?.name === 'string' ? sessionClaims.name : userId;

    return {
      ok: true,
      actor: { userId, email, name, source: 'clerk' },
    };
  }

  // Path B — Clerk not yet configured. Accept only a matching bypass token.
  // This lets the preview deploy keep working for Omran without leaving
  // privileged endpoints open to anonymous callers.
  const bypassExpected = process.env.ADMIN_BYPASS_TOKEN;
  if (!bypassExpected) {
    return { ok: false, response: forbidden('Admin auth not configured (set CLERK_SECRET_KEY or ADMIN_BYPASS_TOKEN)') };
  }

  const provided = req.headers.get('x-admin-token') ?? '';
  if (!constantTimeEqual(provided, bypassExpected)) {
    return { ok: false, response: unauthorized('Invalid admin token') };
  }

  return {
    ok: true,
    actor: { userId: 'admin-bypass', email: null, name: 'admin-bypass', source: 'bypass-token' },
  };
}

// Constant-time string comparison to avoid timing oracles on the bypass token.
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
