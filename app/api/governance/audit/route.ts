import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 100;

export async function GET(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  try {
    const params = new URL(req.url).searchParams;
    const entityType = params.get('entityType');
    const entityId = params.get('entityId');
    const action = params.get('action');

    // Bound the limit so a single request can't exfiltrate the full audit log.
    const rawLimit = parseInt(params.get('limit') || String(DEFAULT_LIMIT));
    const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), MAX_LIMIT) : DEFAULT_LIMIT;

    const sql = getDb();

    let rows;
    if (entityType && entityId) {
      rows = await sql`SELECT * FROM audit_log WHERE entity_type = ${entityType} AND entity_id = ${entityId} ORDER BY created_at DESC LIMIT ${limit}`;
    } else if (action) {
      rows = await sql`SELECT * FROM audit_log WHERE action = ${action} ORDER BY created_at DESC LIMIT ${limit}`;
    } else {
      rows = await sql`SELECT * FROM audit_log ORDER BY created_at DESC LIMIT ${limit}`;
    }

    return Response.json({ success: true, data: rows });
  } catch (err) {
    logError(err, { route: '/api/governance/audit' });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, data: [] }, { status: 500 });
  }
}
