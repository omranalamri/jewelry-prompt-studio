import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAdmin } from '@/lib/auth/admin-guard';
import { logError } from '@/lib/observability/logger';

// Which states a workflow item is allowed to transition FROM for each decision.
// Anything already decided (approved/rejected) is terminal — no re-decide.
const VALID_FROM_STATES: Record<string, string[]> = {
  approve: ['draft', 'submitted', 'in_review', 'revisions_needed'],
  reject: ['draft', 'submitted', 'in_review', 'revisions_needed'],
  revise: ['submitted', 'in_review'],
};

const DECISION_TO_STATUS: Record<string, string> = {
  approve: 'approved',
  reject: 'rejected',
  revise: 'revisions_needed',
};

function bad(msg: string, code = 'BAD_REQUEST', status = 400): Response {
  return Response.json({ success: false, error: msg, code }, { status });
}

export async function POST(req: NextRequest) {
  // ── Auth: reviewer identity is derived from session, never trusted from body ──
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const reviewer = guard.actor;

  const body = await req.json().catch(() => ({})) as {
    workflowId?: string;
    decision?: string;
    comments?: string;
  };

  const workflowId = typeof body.workflowId === 'string' ? body.workflowId : '';
  const decision = typeof body.decision === 'string' ? body.decision : '';
  const comments = typeof body.comments === 'string' ? body.comments.slice(0, 4000) : null;

  if (!workflowId || !decision) return bad('workflowId + decision required');
  if (!(decision in DECISION_TO_STATUS)) return bad('decision must be approve|reject|revise');

  const newStatus = DECISION_TO_STATUS[decision];
  const validFrom = VALID_FROM_STATES[decision];
  const sql = getDb();

  try {
    const prev = await sql`SELECT * FROM workflow_items WHERE id = ${workflowId}`;
    if (!prev[0]) return bad('Workflow not found', 'NOT_FOUND', 404);
    const previous = prev[0] as Record<string, unknown>;

    // ── Compliance gate — must match the real ComplianceReport shape.
    // Block approvals when:
    //   • report.status is 'rejected'
    //   • any issue has severity 'error'
    //   • requiredChanges array is non-empty (unresolved work items)
    if (decision === 'approve') {
      const report = previous.compliance_report as {
        status?: string;
        issues?: Array<{ severity?: string }>;
        requiredChanges?: unknown[];
      } | null;

      if (report) {
        if (report.status === 'rejected') {
          return bad('Cannot approve — compliance rejected', 'COMPLIANCE_REJECTED', 409);
        }
        const errorIssues = Array.isArray(report.issues)
          ? report.issues.filter(i => i?.severity === 'error')
          : [];
        if (errorIssues.length > 0) {
          return bad(
            `Cannot approve — ${errorIssues.length} unresolved compliance error(s)`,
            'COMPLIANCE_ERRORS',
            409,
          );
        }
        const pendingChanges = Array.isArray(report.requiredChanges) ? report.requiredChanges.length : 0;
        if (pendingChanges > 0) {
          return bad(
            `Cannot approve — ${pendingChanges} required change(s) still open`,
            'COMPLIANCE_CHANGES_REQUIRED',
            409,
          );
        }
      }
    }

    // ── Conditional UPDATE: only applies if current_status is still a valid
    // source state. Prevents races (two reviewers deciding simultaneously)
    // and double-decides (already-approved item being re-approved).
    const updated = await sql`
      UPDATE workflow_items
      SET
        current_status = ${newStatus},
        reviewer = ${reviewer.userId},
        comments = ${comments},
        completed_at = CASE WHEN ${decision} = 'approve' THEN NOW() ELSE completed_at END,
        updated_at = NOW()
      WHERE id = ${workflowId}
        AND current_status = ANY(${validFrom}::text[])
      RETURNING *
    `;

    if (!updated[0]) {
      return bad(
        `Cannot ${decision} from current state '${previous.current_status}'`,
        'INVALID_TRANSITION',
        409,
      );
    }

    // Audit with server-derived actor, not client-supplied.
    const eventKey = `workflow:${workflowId}:${newStatus}:${Date.now()}`;
    await sql`
      INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity_type, entity_id, entity_name, details, previous_state, new_state)
      VALUES (
        ${eventKey},
        ${reviewer.userId}, ${reviewer.name},
        ${`workflow.${decision}`},
        ${previous.entity_type}, ${previous.entity_id}, ${previous.entity_name},
        ${JSON.stringify({ decision, comments, source: reviewer.source })}::jsonb,
        ${JSON.stringify(previous)}::jsonb,
        ${JSON.stringify(updated[0])}::jsonb
      )
      ON CONFLICT (event_id) DO NOTHING
    `;

    return Response.json({ success: true, data: updated[0] });
  } catch (err) {
    logError(err, { route: '/api/governance/approve', workflowId, decision, actor: reviewer.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'APPROVE_FAILED' }, { status: 500 });
  }
}
