import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

/**
 * Security response headers — Helmet-equivalent for Next.js.
 * Applied to every route. The CSP is deliberately broad for now
 * because the app loads images/video from Vercel Blob, Replicate, and
 * Google's generative-language endpoints; tighten once those origins
 * are consolidated behind our own domain.
 */
const SECURITY_HEADERS = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // No cameras, mics, geolocation, payment, usb by default.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()",
  },
  {
    key: "X-DNS-Prefetch-Control",
    value: "on",
  },
  {
    // Report-only CSP first — we'll upgrade to enforcing after a week of logs
    // show no false positives from Sentry, Clerk, Vercel Blob, or Google.
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.sentry.io https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      // Blob images, inspiration references, Replicate outputs, Gemini outputs
      "img-src 'self' data: blob: https://*.public.blob.vercel-storage.com https://*.replicate.delivery https://storage.googleapis.com https://*.googleusercontent.com https://generativelanguage.googleapis.com https://images.unsplash.com",
      "media-src 'self' blob: https://*.public.blob.vercel-storage.com https://*.replicate.delivery",
      "connect-src 'self' https://api.anthropic.com https://generativelanguage.googleapis.com https://api.replicate.com https://api-v2.ziina.com https://*.clerk.accounts.dev https://*.sentry.io https://*.ingest.sentry.io wss://*.sentry.io",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply to every route EXCEPT webhooks — they should accept POST
        // from external providers and not be framed anyway.
        source: "/:path*",
        headers: SECURITY_HEADERS,
      },
    ];
  },
};

// Only wrap with Sentry if DSN is configured (avoids build errors locally)
export default process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      org: process.env.SENTRY_ORG || "caleums",
      project: process.env.SENTRY_PROJECT || "jewelry-prompt-studio",
      silent: !process.env.CI,
      widenClientFileUpload: true,
      disableLogger: true,
      automaticVercelMonitors: true,
    })
  : nextConfig;
