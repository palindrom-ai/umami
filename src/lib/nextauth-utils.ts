import { ROLES } from '@/lib/constants';

/**
 * Check if an email domain is allowed based on GOOGLE_ALLOWED_DOMAINS env var.
 * Returns true if no domain restriction is configured or if the email domain is whitelisted.
 */
export function isAllowedDomain(email: string): boolean {
  const allowedDomains = process.env.GOOGLE_ALLOWED_DOMAINS?.split(',').map(d =>
    d.trim().toLowerCase(),
  );
  if (!allowedDomains || allowedDomains.length === 0 || allowedDomains[0] === '') {
    return true;
  }
  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(emailDomain);
}

/**
 * Get the default role for auto-created OAuth users.
 */
export function getDefaultRole(): string {
  return process.env.GOOGLE_DEFAULT_ROLE || ROLES.user;
}

/**
 * Check if auto-creation of users is enabled.
 */
export function shouldAutoCreateUsers(): boolean {
  return process.env.GOOGLE_AUTO_CREATE_USERS === 'true';
}

/**
 * Check if admin approval is required for new OAuth users.
 */
export function shouldRequireApproval(): boolean {
  return process.env.GOOGLE_REQUIRE_APPROVAL === 'true';
}
