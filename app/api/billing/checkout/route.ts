import { NextRequest } from 'next/server';
import { createPaymentIntent, CREDIT_PACKS, CREDIT_TOPUPS, CreditPackKey, CreditTopupKey, isZiinaConfigured } from '@/lib/billing/ziina';
import { getDb } from '@/lib/db';
import { logError } from '@/lib/observability/logger';
import { requireAdmin } from '@/lib/auth/admin-guard';

export const maxDuration = 30;

const MAX_CUSTOM_AMOUNT_AED = 50_000; // prevent absurd amounts from slipping through

export async function POST(req: NextRequest) {
  // Admin auth — checkout spends real money via Ziina, can't be anonymous.
  // Once Clerk is fully wired and end-customers can buy credits, this gate
  // should become "authenticated user" (any signed-in user) rather than admin.
  const guard = await requireAdmin(req);
  if (!guard.ok) return guard.response;
  const actor = guard.actor;

  try {
    if (!isZiinaConfigured()) {
      return Response.json(
        { success: false, error: 'Ziina not configured. Add ZIINA_API_KEY.', code: 'NOT_CONFIGURED' },
        { status: 503 }
      );
    }

    const body = await req.json().catch(() => ({})) as {
      pack?: string;
      topup?: string;
      amountAed?: number;
      customerEmail?: string;
      customerName?: string;
      metadata?: Record<string, string>;
    };

    let finalAmount: number;
    let message: string;

    if (body.pack && CREDIT_PACKS[body.pack as CreditPackKey]) {
      const p = CREDIT_PACKS[body.pack as CreditPackKey];
      finalAmount = p.aed;
      message = `Caleums ${p.label} pack`;
    } else if (body.topup && CREDIT_TOPUPS[body.topup as CreditTopupKey]) {
      const t = CREDIT_TOPUPS[body.topup as CreditTopupKey];
      finalAmount = t.aed;
      message = `Caleums top-up ${t.aed} AED`;
    } else if (typeof body.amountAed === 'number' && body.amountAed >= 2 && body.amountAed <= MAX_CUSTOM_AMOUNT_AED) {
      finalAmount = Math.round(body.amountAed);
      message = `Caleums top-up ${finalAmount} AED`;
    } else {
      return Response.json(
        { success: false, error: `pack, topup, or amountAed (2-${MAX_CUSTOM_AMOUNT_AED}) required`, code: 'BAD_REQUEST' },
        { status: 400 },
      );
    }

    const origin = new URL(req.url).origin;
    const intent = await createPaymentIntent({
      amountAed: finalAmount,
      message,
      successUrl: `${origin}/billing/success?id={CHECKOUT_ID}`,
      cancelUrl: `${origin}/billing/cancel`,
      customerEmail: typeof body.customerEmail === 'string' ? body.customerEmail : undefined,
      customerName: typeof body.customerName === 'string' ? body.customerName : undefined,
      metadata: {
        // Caller metadata is namespaced under `app_` so we don't let callers
        // overwrite our own tracking keys.
        ...Object.fromEntries(
          Object.entries(body.metadata ?? {}).map(([k, v]) => [`app_${k}`, String(v).slice(0, 200)]),
        ),
        platform: 'caleums-ai-studio',
        submittedBy: actor.userId,
      },
      test: process.env.NODE_ENV !== 'production',
    });

    try {
      const sql = getDb();
      const eventKey = `billing:checkout:${intent.id}`;
      await sql`
        INSERT INTO audit_log (event_id, actor_id, actor_name, action, entity_type, entity_id, details)
        VALUES (
          ${eventKey},
          ${actor.userId}, ${actor.name},
          'billing.checkout.create',
          'payment_intent', ${intent.id},
          ${JSON.stringify({ pack: body.pack, topup: body.topup, amountAed: finalAmount })}::jsonb
        )
        ON CONFLICT (event_id) DO NOTHING
      `;
    } catch (auditErr) {
      logError(auditErr, { route: '/api/billing/checkout', stage: 'audit' });
    }

    return Response.json({
      success: true,
      data: {
        paymentIntentId: intent.id,
        redirectUrl: intent.redirectUrl,
        embeddedUrl: intent.embeddedUrl,
        amountAed: intent.amountAed,
        status: intent.status,
      },
    });
  } catch (err) {
    logError(err, { route: '/api/billing/checkout', actor: actor.userId });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg, code: 'CHECKOUT_FAILED' }, { status: 500 });
  }
}
