// Upstash Redis client + rate limiter
// Used for: rate limiting per IP/user, session cache, counters

import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redis: Redis | null = null;

export function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
  return redis;
}

export function isRedisConfigured(): boolean {
  return !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

// Pre-configured rate limiters
// Each tier has different limits

let imageGenLimiter: Ratelimit | null = null;
let videoGenLimiter: Ratelimit | null = null;
let apiLimiter: Ratelimit | null = null;

export function getImageGenRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!imageGenLimiter) {
    imageGenLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(50, '1 m'),   // 50 images per minute
      analytics: true,
      prefix: 'ratelimit:image',
    });
  }
  return imageGenLimiter;
}

export function getVideoGenRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!videoGenLimiter) {
    videoGenLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(10, '1 m'),   // 10 videos per minute
      analytics: true,
      prefix: 'ratelimit:video',
    });
  }
  return videoGenLimiter;
}

export function getApiRateLimiter(): Ratelimit | null {
  const r = getRedis();
  if (!r) return null;
  if (!apiLimiter) {
    apiLimiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(200, '1 m'),   // 200 API calls per minute
      analytics: true,
      prefix: 'ratelimit:api',
    });
  }
  return apiLimiter;
}

// Helper: check rate limit, return 429 if exceeded
export async function checkRateLimit(
  limiter: Ratelimit | null,
  identifier: string,
): Promise<{ success: boolean; limit: number; remaining: number; reset: number } | null> {
  if (!limiter) return null; // not configured, allow through
  const result = await limiter.limit(identifier);
  return result;
}
