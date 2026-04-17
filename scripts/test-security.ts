#!/usr/bin/env tsx
/**
 * Security helper tests — no test framework, just Node's assert.
 *
 * Run:  pnpm dlx tsx scripts/test-security.ts
 *   or: npm run test:security
 *
 * Covers:
 *   • requireAdmin() — bypass-token mode (401 missing, 401 wrong, 200 correct,
 *     403 when token not configured)
 *   • readSignedBody() — 401 missing header, 401 wrong sig, 200 correct sig,
 *     length-mismatch bypass attempt (timing-safe comparison)
 *   • assertSafeUrl() — blocks loopback, private ranges, metadata endpoints
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import assert from 'node:assert/strict';
import { createHmac, randomBytes } from 'node:crypto';

dotenvConfig({ path: '.env.local' });

import { readSignedBody } from '../lib/auth/webhook-signature';
import { assertSafeUrl, SsrfBlockedError } from '../lib/auth/ssrf-guard';

// Dynamically import requireAdmin so we can control CLERK_SECRET_KEY before load
async function loadAdminGuard() {
  // Force bypass-token mode by ensuring Clerk is NOT considered configured
  delete process.env.CLERK_SECRET_KEY;
  delete process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  const mod = await import('../lib/auth/admin-guard');
  return mod.requireAdmin;
}

let passed = 0;
let failed = 0;

function check(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve(fn()).then(
    () => { passed++; console.log(`  ✓ ${name}`); },
    (err: Error) => {
      failed++;
      console.error(`  ✗ ${name}`);
      console.error(`     ${err.message}`);
    },
  );
}

function mockReq(init: { headers?: Record<string, string>; body?: string }): Request {
  return new Request('http://localhost/test', {
    method: 'POST',
    headers: init.headers ?? {},
    body: init.body ?? '',
  });
}

async function main() {
  console.log('\n── requireAdmin (bypass-token mode) ──\n');
  process.env.ADMIN_BYPASS_TOKEN = 'correct-horse-battery-staple-1234567890abcdef';
  const requireAdmin = await loadAdminGuard();

  await check('rejects when no token supplied', async () => {
    const r = await requireAdmin(mockReq({}) as never);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.response.status, 401);
  });

  await check('rejects wrong-length token', async () => {
    const r = await requireAdmin(mockReq({ headers: { 'x-admin-token': 'short' } }) as never);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.response.status, 401);
  });

  await check('rejects wrong-value token', async () => {
    const bad = 'x'.repeat(process.env.ADMIN_BYPASS_TOKEN!.length);
    const r = await requireAdmin(mockReq({ headers: { 'x-admin-token': bad } }) as never);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.response.status, 401);
  });

  await check('accepts correct token', async () => {
    const r = await requireAdmin(mockReq({ headers: { 'x-admin-token': process.env.ADMIN_BYPASS_TOKEN! } }) as never);
    assert.equal(r.ok, true);
    if (r.ok) assert.equal(r.actor.source, 'bypass-token');
  });

  await check('rejects 403 when ADMIN_BYPASS_TOKEN unset', async () => {
    const saved = process.env.ADMIN_BYPASS_TOKEN;
    delete process.env.ADMIN_BYPASS_TOKEN;
    const r = await requireAdmin(mockReq({ headers: { 'x-admin-token': 'whatever' } }) as never);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.response.status, 403);
    process.env.ADMIN_BYPASS_TOKEN = saved;
  });

  console.log('\n── readSignedBody ──\n');
  // Generate a fresh HMAC secret per test run — avoids hardcoded credentials in source.
  const secret = randomBytes(32).toString('hex');
  const body = '{"id":"pi_123","status":"completed"}';
  const validSig = createHmac('sha256', secret).update(body).digest('hex');

  await check('rejects missing header', async () => {
    const r = await readSignedBody(mockReq({ body }), { secret, signatureHeader: 'x-sig' });
    assert.equal(r.verified, false);
    assert.match(r.reason ?? '', /missing/);
  });

  await check('rejects wrong signature (same length)', async () => {
    const bad = 'f'.repeat(validSig.length);
    const r = await readSignedBody(
      mockReq({ body, headers: { 'x-sig': bad } }),
      { secret, signatureHeader: 'x-sig' },
    );
    assert.equal(r.verified, false);
  });

  await check('rejects length-mismatched signature (timing-safe bypass attempt)', async () => {
    // Short signature — must fail fast without a timingSafeEqual throw
    const r = await readSignedBody(
      mockReq({ body, headers: { 'x-sig': 'abc' } }),
      { secret, signatureHeader: 'x-sig' },
    );
    assert.equal(r.verified, false);
  });

  await check('accepts correct signature', async () => {
    const r = await readSignedBody(
      mockReq({ body, headers: { 'x-sig': validSig } }),
      { secret, signatureHeader: 'x-sig' },
    );
    assert.equal(r.verified, true);
    assert.equal(r.rawBody, body);
  });

  await check('rejects when secret is undefined', async () => {
    const r = await readSignedBody(
      mockReq({ body, headers: { 'x-sig': validSig } }),
      { secret: undefined, signatureHeader: 'x-sig' },
    );
    assert.equal(r.verified, false);
    assert.match(r.reason ?? '', /secret/);
  });

  console.log('\n── assertSafeUrl ──\n');

  await check('blocks loopback 127.0.0.1', async () => {
    await assert.rejects(
      () => assertSafeUrl('http://127.0.0.1/x', { allowedProtocols: ['http:'], resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('blocks link-local 169.254.169.254 (cloud metadata)', async () => {
    await assert.rejects(
      () => assertSafeUrl('http://169.254.169.254/latest/meta-data/', { allowedProtocols: ['http:'], resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('blocks private 10.0.0.1', async () => {
    await assert.rejects(
      () => assertSafeUrl('http://10.0.0.1/x', { allowedProtocols: ['http:'], resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('blocks localhost hostname', async () => {
    await assert.rejects(
      () => assertSafeUrl('http://localhost/x', { allowedProtocols: ['http:'], resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('blocks file:// scheme', async () => {
    await assert.rejects(
      () => assertSafeUrl('file:///etc/passwd', { resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('blocks javascript: scheme', async () => {
    await assert.rejects(
      () => assertSafeUrl('javascript:alert(1)', { resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('blocks IPv6 loopback ::1', async () => {
    await assert.rejects(
      () => assertSafeUrl('http://[::1]/x', { allowedProtocols: ['http:'], resolveHost: false }),
      SsrfBlockedError,
    );
  });

  await check('allows public https url (no dns resolution)', async () => {
    const url = await assertSafeUrl('https://example.com/image.jpg', { resolveHost: false });
    assert.equal(url.hostname, 'example.com');
  });

  console.log(`\n── Results ──\n  Passed: ${passed}\n  Failed: ${failed}\n`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
