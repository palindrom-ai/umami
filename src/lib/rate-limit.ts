import debug from 'debug';

const log = debug('umami:auth:rate-limit');

/**
 * Simple in-memory rate limiter for authentication endpoints.
 * For production deployments with multiple instances, consider using Redis.
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const attempts = new Map<string, RateLimitRecord>();

// Cleanup expired entries periodically (every 5 minutes)
const CLEANUP_INTERVAL = 5 * 60 * 1000;
let cleanupTimer: NodeJS.Timeout | null = null;

function startCleanup() {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of attempts.entries()) {
      if (now > record.resetAt) {
        attempts.delete(key);
      }
    }
  }, CLEANUP_INTERVAL);
  // Don't prevent process from exiting
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }
}

/**
 * Check if a request should be rate limited.
 *
 * @param key - Unique identifier for the rate limit (e.g., IP address, IP + username)
 * @param maxAttempts - Maximum number of attempts allowed within the window (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns true if the request is allowed, false if rate limited
 */
export function checkRateLimit(key: string, maxAttempts = 5, windowMs = 15 * 60 * 1000): boolean {
  startCleanup();

  const now = Date.now();
  const record = attempts.get(key);

  // New key or expired window
  if (!record || now > record.resetAt) {
    attempts.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  // Within window, check if under limit
  if (record.count >= maxAttempts) {
    log('Rate limit exceeded for key: %s', key);
    return false;
  }

  // Increment counter
  record.count++;
  return true;
}

/**
 * Get the remaining time until the rate limit resets.
 *
 * @param key - Unique identifier for the rate limit
 * @returns Remaining time in seconds, or 0 if not rate limited
 */
export function getRateLimitResetTime(key: string): number {
  const record = attempts.get(key);
  if (!record) return 0;

  const remaining = record.resetAt - Date.now();
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0;
}

/**
 * Clear rate limit for a specific key.
 * Useful after successful authentication.
 *
 * @param key - Unique identifier to clear
 */
export function clearRateLimit(key: string): void {
  attempts.delete(key);
}

/**
 * Create a rate limit key from request headers.
 * Uses X-Forwarded-For if behind a proxy, falls back to a default.
 *
 * @param request - The incoming request
 * @param suffix - Optional suffix to append (e.g., username)
 * @returns A rate limit key string
 */
export function getRateLimitKey(request: Request, suffix?: string): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown';
  return suffix ? `${ip}:${suffix}` : ip;
}
