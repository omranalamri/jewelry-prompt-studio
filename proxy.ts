// Auth middleware — Clerk when configured, admin-bypass fallback otherwise.
//
// Key invariant: a PROTECTED route is NEVER publicly reachable, regardless of
// whether Clerk is configured. If CLERK_SECRET_KEY is absent, the middleware
// falls back to requiring `x-admin-token` for the same set of routes. Non-
// protected routes are allowed through in both modes.
//
// Defense in depth: handler-level `requireAdmin()` is still mandatory — this
// middleware is the first line, not the only line.

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextRequest, NextResponse } from 'next/server';

// Routes that require authentication at the edge.
// Webhooks are deliberately excluded — they authenticate by HMAC signature.
const PROTECTED_PATTERNS = [
  // Studio pages
  '/studio/governance(.*)',
  '/studio/publish(.*)',

  // Privileged API groups — external state mutation, billing, publishing,
  // schema changes, agent orchestration, governance decisions, vision extract
  // (cost-exhaustion target).
  '/api/governance(.*)',
  '/api/publish(.*)',
  '/api/db-migrate(.*)',
  '/api/billing/checkout',
  '/api/billing/portal(.*)',
  '/api/agents(.*)',
  '/api/creative/extract',
  '/api/generate/from-facts',
];

const isProtectedRoute = createRouteMatcher(PROTECTED_PATTERNS);

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

// Fallback middleware used when Clerk isn't configured. Still gates the
// protected routes behind an admin bypass token so preview deploys aren't
// left anonymous-writable.
function fallbackMiddleware(req: NextRequest): NextResponse | undefined {
  if (!isProtectedRoute(req)) {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_BYPASS_TOKEN;
  if (!expected) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Admin auth not configured', code: 'NO_AUTH_CONFIG' }),
      { status: 503, headers: { 'content-type': 'application/json' } },
    );
  }

  const provided = req.headers.get('x-admin-token') ?? '';
  if (!constantTimeEqual(provided, expected)) {
    return new NextResponse(
      JSON.stringify({ success: false, error: 'Admin token required', code: 'UNAUTHORIZED' }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  }

  return NextResponse.next();
}

export default process.env.CLERK_SECRET_KEY
  ? clerkMiddleware(async (auth, req) => {
      if (isProtectedRoute(req)) {
        await auth.protect();
      }
    })
  : fallbackMiddleware;

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
