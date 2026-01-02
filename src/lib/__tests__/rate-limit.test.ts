/**
 * Tests for rate limiting utility
 */

describe('rate-limit', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  describe('checkRateLimit', () => {
    test('allows requests under the limit', () => {
      const { checkRateLimit } = require('../rate-limit');

      // Should allow 5 requests (default)
      expect(checkRateLimit('test-key-1')).toBe(true);
      expect(checkRateLimit('test-key-1')).toBe(true);
      expect(checkRateLimit('test-key-1')).toBe(true);
      expect(checkRateLimit('test-key-1')).toBe(true);
      expect(checkRateLimit('test-key-1')).toBe(true);
    });

    test('blocks requests over the limit', () => {
      const { checkRateLimit } = require('../rate-limit');

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key-2');
      }

      // 6th request should be blocked
      expect(checkRateLimit('test-key-2')).toBe(false);
    });

    test('uses separate limits for different keys', () => {
      const { checkRateLimit } = require('../rate-limit');

      // Use up limit for key-a
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key-a');
      }
      expect(checkRateLimit('test-key-a')).toBe(false);

      // key-b should still be allowed
      expect(checkRateLimit('test-key-b')).toBe(true);
    });

    test('respects custom maxAttempts', () => {
      const { checkRateLimit } = require('../rate-limit');

      // Allow only 2 attempts
      expect(checkRateLimit('test-key-3', 2)).toBe(true);
      expect(checkRateLimit('test-key-3', 2)).toBe(true);
      expect(checkRateLimit('test-key-3', 2)).toBe(false);
    });
  });

  describe('clearRateLimit', () => {
    test('clears rate limit for a key', () => {
      const { checkRateLimit, clearRateLimit } = require('../rate-limit');

      // Use up the limit
      for (let i = 0; i < 5; i++) {
        checkRateLimit('test-key-4');
      }
      expect(checkRateLimit('test-key-4')).toBe(false);

      // Clear and try again
      clearRateLimit('test-key-4');
      expect(checkRateLimit('test-key-4')).toBe(true);
    });
  });

  describe('getRateLimitResetTime', () => {
    test('returns 0 for unknown keys', () => {
      const { getRateLimitResetTime } = require('../rate-limit');
      expect(getRateLimitResetTime('unknown-key')).toBe(0);
    });

    test('returns remaining time for rate limited keys', () => {
      const { checkRateLimit, getRateLimitResetTime } = require('../rate-limit');

      // Make a request to start the timer
      checkRateLimit('test-key-5', 1, 60000); // 1 minute window

      const resetTime = getRateLimitResetTime('test-key-5');
      expect(resetTime).toBeGreaterThan(0);
      expect(resetTime).toBeLessThanOrEqual(60);
    });
  });

  describe('getRateLimitKey', () => {
    test('extracts IP from x-forwarded-for header', () => {
      const { getRateLimitKey } = require('../rate-limit');

      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1, 10.0.0.1',
        },
      });

      expect(getRateLimitKey(request)).toBe('192.168.1.1');
    });

    test('uses unknown when no IP available', () => {
      const { getRateLimitKey } = require('../rate-limit');

      const request = new Request('http://localhost');
      expect(getRateLimitKey(request)).toBe('unknown');
    });

    test('appends suffix when provided', () => {
      const { getRateLimitKey } = require('../rate-limit');

      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
        },
      });

      expect(getRateLimitKey(request, 'login')).toBe('192.168.1.1:login');
    });
  });
});
