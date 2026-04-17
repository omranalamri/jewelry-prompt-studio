// Ziina Payments integration — UAE-native payment gateway
// Docs: https://docs.ziina.com/
// Amounts in Ziina are always in fils (1 AED = 100 fils)

const ZIINA_BASE = 'https://api-v2.ziina.com';

function getKey(): string {
  const key = process.env.ZIINA_API_KEY;
  if (!key) throw new Error('ZIINA_API_KEY not set. Get one at https://business.ziina.com');
  return key;
}

export function isZiinaConfigured(): boolean {
  return !!process.env.ZIINA_API_KEY;
}

export interface CreatePaymentIntentRequest {
  amountAed: number;           // Amount in AED (will be converted to fils)
  message: string;             // Description shown to customer
  successUrl?: string;         // Where to redirect on success
  cancelUrl?: string;          // Where to redirect on cancel
  customerEmail?: string;
  customerName?: string;
  metadata?: Record<string, string>;
  test?: boolean;              // Sandbox mode
}

export interface PaymentIntent {
  id: string;
  amount: number;              // in fils
  amountAed: number;           // in AED
  currencyCode: string;
  status: 'requires_payment_instrument' | 'requires_user_action' | 'processing' | 'completed' | 'canceled' | 'failed';
  redirectUrl: string;         // Where to send user to pay
  embeddedUrl?: string;        // For iframe/embed
  successUrl?: string;
  cancelUrl?: string;
  message: string;
  createdAt: number;
}

export async function createPaymentIntent(req: CreatePaymentIntentRequest): Promise<PaymentIntent> {
  const key = getKey();
  const amountFils = Math.round(req.amountAed * 100);
  if (amountFils < 200) throw new Error('Minimum payment is 2 AED');

  const resp = await fetch(`${ZIINA_BASE}/api/payment_intent`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: amountFils,
      currency_code: 'AED',
      message: req.message,
      success_url: req.successUrl,
      cancel_url: req.cancelUrl,
      customer_email: req.customerEmail,
      customer_name: req.customerName,
      metadata: req.metadata,
      test: req.test ?? false,
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error((err as { message?: string }).message || `Ziina error ${resp.status}`);
  }

  const data = await resp.json();
  return {
    id: data.id,
    amount: data.amount,
    amountAed: data.amount / 100,
    currencyCode: data.currency_code,
    status: data.status,
    redirectUrl: data.redirect_url,
    embeddedUrl: data.embedded_url,
    successUrl: data.success_url,
    cancelUrl: data.cancel_url,
    message: data.message,
    createdAt: Number(data.created_at),
  };
}

export async function getPaymentIntent(id: string): Promise<PaymentIntent> {
  const key = getKey();
  const resp = await fetch(`${ZIINA_BASE}/api/payment_intent/${id}`, {
    headers: { 'Authorization': `Bearer ${key}` },
  });
  if (!resp.ok) throw new Error(`Ziina GET error ${resp.status}`);
  const data = await resp.json();
  return {
    id: data.id,
    amount: data.amount,
    amountAed: data.amount / 100,
    currencyCode: data.currency_code,
    status: data.status,
    redirectUrl: data.redirect_url,
    embeddedUrl: data.embedded_url,
    message: data.message,
    createdAt: Number(data.created_at),
  };
}

// Credit packs — 70% gross margin target
// Generation COGS: Gemini 3 Pro Image ($0.05) + Veo 3.1 ($0.50/sec)
// Conversation COGS: Claude Haiku 4.5 ≈ $0.009/turn (cheap info-gathering)
// Synthesis COGS: Claude Sonnet 4.5 ≈ $0.034/turn (final prompt generation, council)
// 1 USD ≈ 3.67 AED
// 70% margin means COGS ≈ 30% of revenue
//
// Conversation turns are a soft cap — the chat handler routes through Haiku
// which is ~4x cheaper than Sonnet, so the pack price covers heavy chat use.

export const CREDIT_PACKS = {
  starter: {
    aed: 450,
    label: 'Starter',
    creditsUSD: 122,
    images: 450,             // 450 × $0.05 = $22.50
    videos: 30,              // 30 × $0.50 = $15
    conversationTurns: 3000, // 3000 × $0.009 = $27 (Haiku chat)
    synthesisTurns: 50,      // 50 × $0.034 = $1.70 (final prompt gen)
    cogsUsd: 66,             // images + videos + chat + synthesis + buffer
    marginPercent: 46,       // honest revised margin w/ chat tokens counted
  },
  pro: {
    aed: 1850,
    label: 'Pro',
    creditsUSD: 504,
    images: 2000,              // 2000 × $0.05 = $100
    videos: 100,               // 100 × $0.50 = $50
    conversationTurns: 15000,  // 15000 × $0.009 = $135 (Haiku chat)
    synthesisTurns: 200,       // 200 × $0.034 = $6.80 (final prompt gen)
    cogsUsd: 292,
    marginPercent: 42,
  },
  enterprise: {
    aed: 8000,
    label: 'Enterprise',
    creditsUSD: 2180,
    images: 10000,              // 10000 × $0.05 = $500
    videos: 300,                // 300 × $0.50 = $150
    conversationTurns: 80000,   // 80000 × $0.009 = $720 (Haiku chat)
    synthesisTurns: 1000,       // 1000 × $0.034 = $34 (final prompt gen)
    cogsUsd: 1404,
    marginPercent: 36,
  },
} as const;

// Credit top-ups — buy more when you run out
export const CREDIT_TOPUPS = {
  topup_100: { aed: 100, label: 'Quick top-up', images: 100, videos: 0, cogsUsd: 5, marginPercent: 82 },
  topup_250: { aed: 250, label: 'Medium top-up', images: 250, videos: 10, cogsUsd: 17.5, marginPercent: 75 },
  topup_500: { aed: 500, label: 'Large top-up', images: 500, videos: 30, cogsUsd: 40, marginPercent: 70 },
  topup_1000: { aed: 1000, label: 'Pro top-up', images: 1000, videos: 70, cogsUsd: 85, marginPercent: 69 },
} as const;

export type CreditPackKey = keyof typeof CREDIT_PACKS;
export type CreditTopupKey = keyof typeof CREDIT_TOPUPS;
