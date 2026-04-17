import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

/**
 * One-time (idempotent) migration: governance tables.
 *
 * Creates `workflow_items` + `audit_log`, plus the unique `event_id` column
 * on `audit_log` that payment webhooks rely on for idempotent inserts.
 *
 * Hardening:
 *   1. Admin-gated (requireAdmin). Middleware also protects the group.
 *   2. Every statement is `IF NOT EXISTS` — safe to re-run.
 *   3. Adds `audit_log.event_id` + unique index for idempotent webhook writes.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;

  const sql = getDb();

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS workflow_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        entity_name TEXT,
        current_status TEXT NOT NULL DEFAULT 'draft',
        submitted_by TEXT NOT NULL,
        submitted_at TIMESTAMPTZ DEFAULT NOW(),
        completed_at TIMESTAMPTZ,
        priority TEXT DEFAULT 'normal',
        reviewer TEXT,
        comments TEXT,
        compliance_report JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        event_id TEXT,
        actor_id TEXT NOT NULL,
        actor_name TEXT,
        actor_role TEXT,
        action TEXT NOT NULL,
        entity_type TEXT,
        entity_id TEXT,
        entity_name TEXT,
        details JSONB,
        previous_state JSONB,
        new_state JSONB,
        regulatory_check JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Retrofit event_id on any audit_log table created before this column existed.
    // Both statements are safe no-ops when already present.
    await sql`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS event_id TEXT`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS audit_event_id_uidx ON audit_log(event_id) WHERE event_id IS NOT NULL`;

    await sql`CREATE INDEX IF NOT EXISTS audit_entity_idx ON audit_log(entity_type, entity_id)`;
    await sql`CREATE INDEX IF NOT EXISTS audit_time_idx ON audit_log(created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS workflow_status_idx ON workflow_items(current_status)`;

    return Response.json({ success: true, message: 'Governance tables ready' });
  } catch (err) {
    logError(err, { route: '/api/db-migrate-governance' });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'MIGRATION_FAILED' }, { status: 500 });
  }
}
