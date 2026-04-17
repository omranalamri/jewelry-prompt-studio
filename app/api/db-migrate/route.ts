import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

// Full list of allowed categories — single source of truth for the constraint.
const ALLOWED_CATEGORIES = [
  'jewelry', 'reference', 'mood', 'model',
  'generated', 'scene', 'campaign', 'video',
  'training', 'dataset',
];

/**
 * POST /api/db-migrate
 *
 * One-off schema upgrade for the repository.category constraint.
 *
 * Hardening vs previous version:
 *   1. Requires admin auth (requireAdmin). Middleware also protects this group.
 *   2. Preflights existing rows — aborts BEFORE dropping the old constraint if
 *      any row holds a category that wouldn't satisfy the new one.
 *   3. Wraps the DROP + ADD in a single transaction so a failure leaves the
 *      table with its pre-existing constraint intact.
 *   4. Idempotent — running twice is safe (new constraint matches old name).
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const actor = guard.actor;

  const sql = getDb();

  try {
    // ── Preflight: ensure no existing rows would violate the new constraint ──
    const violations = await sql`
      SELECT DISTINCT category
      FROM repository
      WHERE category IS NOT NULL
        AND category <> ALL(${ALLOWED_CATEGORIES}::text[])
    `;
    if (violations.length > 0) {
      return Response.json(
        {
          success: false,
          error: 'Preflight failed — existing rows hold disallowed categories',
          code: 'PREFLIGHT_FAILED',
          disallowedCategories: violations.map(v => v.category),
        },
        { status: 409 },
      );
    }

    // ── Atomic: drop + re-add inside a single non-interactive transaction ──
    // @neondatabase/serverless dispatches the batch over one HTTP request and
    // rolls back automatically if any statement fails, so a failure mid-way
    // leaves the original constraint in place.
    await sql.transaction([
      sql`ALTER TABLE repository DROP CONSTRAINT IF EXISTS repository_category_check`,
      sql`
        ALTER TABLE repository
        ADD CONSTRAINT repository_category_check
        CHECK (category = ANY(${ALLOWED_CATEGORIES}::text[]))
      `,
    ]);

    // Audit the schema change
    try {
      await sql`
        INSERT INTO audit_log (actor_id, actor_name, action, entity_type, entity_id, details)
        VALUES (
          ${actor.userId},
          ${actor.name},
          'db.migrate.category_constraint',
          'schema',
          'repository_category_check',
          ${JSON.stringify({ allowed: ALLOWED_CATEGORIES, source: actor.source })}::jsonb
        )
      `;
    } catch (auditErr) {
      logError(auditErr, { route: '/api/db-migrate', stage: 'audit' });
    }

    return Response.json({
      success: true,
      message: 'Category constraint updated',
      allowedCategories: ALLOWED_CATEGORIES,
    });
  } catch (error) {
    logError(error, { route: '/api/db-migrate', actor: actor.userId });
    const msg = error instanceof Error ? error.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'MIGRATION_FAILED' }, { status: 500 });
  }
}
