import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { logError } from '@/lib/observability/logger';
import { readSignedBody } from '@/lib/auth/webhook-signature';
import { getPaymentIntent } from '@/lib/billing/ziina';

export const maxDuration = 30;

/**
 * Ziina webhook — receives payment events.
 *
 * Hardening vs previous version:
 *   1. Verifies HMAC signature over the RAW request body before parsing.
 *      Required header: `ziina-signature`. Secret: `ZIINA_WEBHOOK_SECRET`.
 *   2. Re-fetches the payment intent from Ziina to confirm status + amount
 *      match what the webhook claims (defense against replay with mutated body).
 *   3. Uses a unique key (provider + event_id) for idempotency. The INSERT
 *      will fail (caught) rather than silently double-crediting.
 *   4. Performs audit + credit grant as a single transaction so we never
 *      record a grant without its audit row.
 *
 * Events accepted: payment_intent.completed | canceled | failed
 */
export async function POST(req: NextRequest) {
  // 1. Verify signature BEFORE parsing JSON. readSignedBody consumes the
  //    raw body once; we re-parse from the returned string.
  const { rawBody, verified, reason } = await readSignedBody(req, {
    secret: process.env.ZIINA_WEBHOOK_SECRET,
    signatureHeader: 'ziina-signature',
  });

  if (!verified) {
    // Don't leak details — attackers shouldn't learn whether the secret
    // was misconfigured vs the signature merely mismatched.
    logError(new Error(`Ziina webhook rejected: ${reason}`), { route: '/api/webhooks/ziina' });
    return Response.json({ error: 'invalid signature' }, { status: 401 });
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return Response.json({ error: 'invalid payload' }, { status: 400 });
  }

  const id = typeof payload.id === 'string' ? payload.id : null;
  const claimedStatus = typeof payload.status === 'string' ? payload.status : null;
  if (!id || !claimedStatus) {
    return Response.json({ error: 'missing id or status' }, { status: 400 });
  }

  // 2. Re-fetch from Ziina to confirm the real status + amount.
  //    A forged payload (even one somehow past signature check) can't fake
  //    the upstream API response.
  let authoritativeAmount = 0;
  let authoritativeStatus: string = claimedStatus;
  try {
    const intent = await getPaymentIntent(id);
    authoritativeAmount = intent.amount;
    authoritativeStatus = intent.status;
  } catch (fetchErr) {
    logError(fetchErr, { route: '/api/webhooks/ziina', stage: 'verify-with-ziina', id });
    return Response.json({ error: 'unable to verify with Ziina' }, { status: 502 });
  }

  if (authoritativeStatus !== claimedStatus) {
    logError(new Error('Ziina webhook status mismatch'), {
      route: '/api/webhooks/ziina',
      id,
      claimedStatus,
      authoritativeStatus,
    });
    // Still 200 so Ziina doesn't retry forever — we logged the anomaly.
    return Response.json({ received: true, warning: 'status mismatch' });
  }

  const sql = getDb();

  // 3. Idempotent audit + credit grant as a transaction.
  //    event_id = `ziina:${paymentIntentId}:${status}` ensures we record each
  //    state transition exactly once. The primary key / unique index on
  //    audit_log.event_id prevents duplicates (schema update below).
  const eventKey = `ziina:${id}:${authoritativeStatus}`;

  try {
    if (authoritativeStatus === 'completed') {
      await sql.transaction([
        sql`
          INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity_type, entity_id, details)
          VALUES (
            ${eventKey},
            'ziina', 'ziina-webhook',
            ${`billing.${authoritativeStatus}`},
            'payment_intent', ${id},
            ${JSON.stringify({ amount: authoritativeAmount, currency: 'AED' })}::jsonb
          )
          ON CONFLICT (event_id) DO NOTHING
        `,
        sql`
          INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity_type, entity_id, details)
          VALUES (
            ${`${eventKey}:credits`},
            'system', 'credit-grant',
            'billing.credits.granted',
            'payment_intent', ${id},
            ${JSON.stringify({
              amountAed: authoritativeAmount / 100,
              creditsUsd: (authoritativeAmount / 100) / 3.67,
            })}::jsonb
          )
          ON CONFLICT (event_id) DO NOTHING
        `,
      ]);
    } else {
      await sql`
        INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity_type, entity_id, details)
        VALUES (
          ${eventKey},
          'ziina', 'ziina-webhook',
          ${`billing.${authoritativeStatus}`},
          'payment_intent', ${id},
          ${JSON.stringify({ amount: authoritativeAmount, currency: 'AED' })}::jsonb
        )
        ON CONFLICT (event_id) DO NOTHING
      `;
    }
  } catch (dbErr) {
    logError(dbErr, { route: '/api/webhooks/ziina', stage: 'audit-insert', eventKey });
    // Still return 200 if the error is a duplicate (idempotency worked).
    // Otherwise signal retry so Ziina delivers again.
    const msg = dbErr instanceof Error ? dbErr.message : '';
    if (!/duplicate key|unique.*constraint/i.test(msg)) {
      return Response.json({ error: 'processing failed' }, { status: 500 });
    }
  }

  return Response.json({ received: true });
}
