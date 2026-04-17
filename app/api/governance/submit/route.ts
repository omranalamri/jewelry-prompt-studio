import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { runComplianceCheck, type ComplianceInput } from '@/lib/governance/compliance';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

/**
 * POST /api/governance/submit
 *
 * Submits an entity into the compliance workflow. ALWAYS runs the compliance
 * check — the downstream approve endpoint relies on a non-null
 * `compliance_report` to enforce its gate.
 *
 * Hardening:
 *   1. Admin-gated (requireAdmin). Middleware also protects this group.
 *   2. `submittedBy` is derived from the session, never from the body.
 *   3. `complianceInput` is required — we can't let callers skip the check
 *      by omitting the input. If they have nothing to declare, we still run
 *      the check with empty input so the report shape is valid.
 */
export async function POST(req: NextRequest) {
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const actor = guard.actor;

  try {
    const body = await req.json().catch(() => ({})) as {
      entityType?: string;
      entityId?: string;
      entityName?: string;
      priority?: string;
      complianceInput?: ComplianceInput;
    };

    const entityType = typeof body.entityType === 'string' ? body.entityType : '';
    const entityId = typeof body.entityId === 'string' ? body.entityId : '';
    const entityName = typeof body.entityName === 'string' ? body.entityName : null;
    const priority = typeof body.priority === 'string' ? body.priority : 'normal';

    if (!entityType || !entityId) {
      return Response.json(
        { success: false, error: 'entityType and entityId required', code: 'MISSING_INPUT' },
        { status: 400 },
      );
    }

    // Always run the compliance check. Empty ComplianceInput is still a
    // well-formed input — runComplianceCheck() handles it and produces a
    // report the approve endpoint can inspect.
    const complianceReport = runComplianceCheck(body.complianceInput ?? {} as ComplianceInput);

    // Rejected compliance lands in 'revisions_needed' so the approve gate
    // can only move it forward after the underlying issues are fixed and
    // a new submission replaces the report.
    const initialStatus = complianceReport.status === 'rejected' ? 'revisions_needed' : 'submitted';

    const sql = getDb();
    const rows = await sql`
      INSERT INTO workflow_items
        (entity_type, entity_id, entity_name, current_status, submitted_by, priority, compliance_report)
      VALUES
        (${entityType}, ${entityId}, ${entityName}, ${initialStatus}, ${actor.userId}, ${priority}, ${JSON.stringify(complianceReport)}::jsonb)
      RETURNING *
    `;

    // Audit with server-derived actor and deterministic event key.
    const eventKey = `workflow:${rows[0].id}:submit`;
    await sql`
      INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity_type, entity_id, entity_name, details)
      VALUES (
        ${eventKey},
        ${actor.userId}, ${actor.name},
        'workflow.submit',
        ${entityType}, ${entityId}, ${entityName},
        ${JSON.stringify({ initialStatus, complianceStatus: complianceReport.status, source: actor.source })}::jsonb
      )
      ON CONFLICT (event_id) DO NOTHING
    `;

    return Response.json({ success: true, data: rows[0] });
  } catch (err) {
    logError(err, { route: '/api/governance/submit', actor: actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'SUBMIT_FAILED' }, { status: 500 });
  }
}
