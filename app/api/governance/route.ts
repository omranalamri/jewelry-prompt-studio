import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

const ALLOWED_STATUSES = new Set([
  'draft', 'submitted', 'in_review',
  'approved', 'rejected', 'revisions_needed',
]);

// GET all workflow items (for kanban)
export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const sql = getDb();
    const status = new URL(req.url).searchParams.get('status');

    // Validate the status filter so the caller can only constrain along
    // known values — prevents accidental information leakage via odd filters.
    if (status && !ALLOWED_STATUSES.has(status)) {
      return Response.json(
        { success: false, error: 'Invalid status filter', code: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const rows = status
      ? await sql`SELECT * FROM workflow_items WHERE current_status = ${status} ORDER BY submitted_at DESC LIMIT 100`
      : await sql`SELECT * FROM workflow_items ORDER BY submitted_at DESC LIMIT 100`;

    return Response.json({ success: true, data: rows });
  } catch (err) {
    logError(err, { route: '/api/governance' });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, data: [] }, { status: 500 });
  }
}
