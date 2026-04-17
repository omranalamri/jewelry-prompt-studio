/**
 * HMAC-SHA256 webhook signature verification.
 *
 * Used by provider webhooks (Ziina, and any future Stripe/Creatomate hooks)
 * to confirm a payload actually came from the provider and wasn't forged
 * by an unauthenticated caller.
 *
 * Usage:
 *   const { rawBody, verified } = await readSignedBody(req, {
 *     secret: process.env.ZIINA_WEBHOOK_SECRET,
 *     signatureHeader: 'ziina-signature',
 *   });
 *   if (!verified) return new Response('invalid signature', { status: 401 });
 *   const payload = JSON.parse(rawBody);
 */

import { createHmac, timingSafeEqual } from 'crypto';

export interface VerifyOptions {
  secret: string | undefined;
  /** Header name that carries the hex HMAC (case-insensitive). */
  signatureHeader: string;
  /** Optional: header prefix like "sha256=" that the provider strips before compare. */
  headerPrefix?: string;
}

export interface SignedBodyResult {
  rawBody: string;
  verified: boolean;
  reason?: string;
}

/**
 * Reads the raw body from a Request (only safe to call ONCE per request —
 * after this, req.json() will fail because the stream is consumed). Computes
 * the expected HMAC and compares against the provider-supplied header.
 */
export async function readSignedBody(
  req: Request,
  opts: VerifyOptions,
): Promise<SignedBodyResult> {
  const rawBody = await req.text();

  if (!opts.secret) {
    return { rawBody, verified: false, reason: 'webhook secret not configured' };
  }

  const header = req.headers.get(opts.signatureHeader);
  if (!header) {
    return { rawBody, verified: false, reason: `missing ${opts.signatureHeader} header` };
  }

  const providedHex = opts.headerPrefix && header.startsWith(opts.headerPrefix)
    ? header.slice(opts.headerPrefix.length)
    : header;

  const expected = createHmac('sha256', opts.secret).update(rawBody).digest('hex');

  // timingSafeEqual requires equal-length Buffers. A length mismatch is already
  // a failure — treat it as such instead of throwing.
  if (providedHex.length !== expected.length) {
    return { rawBody, verified: false, reason: 'signature length mismatch' };
  }

  const providedBuf = Buffer.from(providedHex, 'hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  if (providedBuf.length !== expectedBuf.length) {
    return { rawBody, verified: false, reason: 'signature length mismatch' };
  }

  const verified = timingSafeEqual(providedBuf, expectedBuf);
  return { rawBody, verified, reason: verified ? undefined : 'signature mismatch' };
}
