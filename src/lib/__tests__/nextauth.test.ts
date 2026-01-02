/**
 * Tests for Google SSO / NextAuth configuration
 */

describe('isAllowedDomain', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('allows all domains when GOOGLE_ALLOWED_DOMAINS is not set', () => {
    delete process.env.GOOGLE_ALLOWED_DOMAINS;
    const { isAllowedDomain } = require('../nextauth-utils');
    expect(isAllowedDomain('user@example.com')).toBe(true);
    expect(isAllowedDomain('user@anything.org')).toBe(true);
  });

  test('allows all domains when GOOGLE_ALLOWED_DOMAINS is empty', () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = '';
    const { isAllowedDomain } = require('../nextauth-utils');
    expect(isAllowedDomain('user@example.com')).toBe(true);
  });

  test('allows only whitelisted domains', () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = 'company.com,partner.org';
    const { isAllowedDomain } = require('../nextauth-utils');
    expect(isAllowedDomain('user@company.com')).toBe(true);
    expect(isAllowedDomain('user@partner.org')).toBe(true);
    expect(isAllowedDomain('user@other.com')).toBe(false);
  });

  test('handles domain comparison case-insensitively', () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = 'Company.COM';
    const { isAllowedDomain } = require('../nextauth-utils');
    expect(isAllowedDomain('user@company.com')).toBe(true);
    expect(isAllowedDomain('user@COMPANY.COM')).toBe(true);
  });

  test('trims whitespace from domain list', () => {
    process.env.GOOGLE_ALLOWED_DOMAINS = ' company.com , partner.org ';
    const { isAllowedDomain } = require('../nextauth-utils');
    expect(isAllowedDomain('user@company.com')).toBe(true);
    expect(isAllowedDomain('user@partner.org')).toBe(true);
  });
});

describe('getDefaultRole', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns "user" as default when GOOGLE_DEFAULT_ROLE is not set', () => {
    delete process.env.GOOGLE_DEFAULT_ROLE;
    const { getDefaultRole } = require('../nextauth-utils');
    expect(getDefaultRole()).toBe('user');
  });

  test('returns configured role when GOOGLE_DEFAULT_ROLE is set', () => {
    process.env.GOOGLE_DEFAULT_ROLE = 'view-only';
    const { getDefaultRole } = require('../nextauth-utils');
    expect(getDefaultRole()).toBe('view-only');
  });
});

describe('shouldAutoCreateUsers', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns false when GOOGLE_AUTO_CREATE_USERS is not set', () => {
    delete process.env.GOOGLE_AUTO_CREATE_USERS;
    const { shouldAutoCreateUsers } = require('../nextauth-utils');
    expect(shouldAutoCreateUsers()).toBe(false);
  });

  test('returns true only when GOOGLE_AUTO_CREATE_USERS is "true"', () => {
    process.env.GOOGLE_AUTO_CREATE_USERS = 'true';
    const { shouldAutoCreateUsers } = require('../nextauth-utils');
    expect(shouldAutoCreateUsers()).toBe(true);
  });

  test('returns false for other values', () => {
    process.env.GOOGLE_AUTO_CREATE_USERS = 'false';
    const { shouldAutoCreateUsers } = require('../nextauth-utils');
    expect(shouldAutoCreateUsers()).toBe(false);

    process.env.GOOGLE_AUTO_CREATE_USERS = '1';
    jest.resetModules();
    const { shouldAutoCreateUsers: fn2 } = require('../nextauth-utils');
    expect(fn2()).toBe(false);
  });
});

describe('shouldRequireApproval', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('returns false when GOOGLE_REQUIRE_APPROVAL is not set', () => {
    delete process.env.GOOGLE_REQUIRE_APPROVAL;
    const { shouldRequireApproval } = require('../nextauth-utils');
    expect(shouldRequireApproval()).toBe(false);
  });

  test('returns true only when GOOGLE_REQUIRE_APPROVAL is "true"', () => {
    process.env.GOOGLE_REQUIRE_APPROVAL = 'true';
    const { shouldRequireApproval } = require('../nextauth-utils');
    expect(shouldRequireApproval()).toBe(true);
  });
});
