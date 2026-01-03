import { getServerSession } from 'next-auth';
import { saveAuth } from '@/lib/auth';
import { secret } from '@/lib/crypto';
import { createSecureToken } from '@/lib/jwt';
import { authOptions } from '@/lib/nextauth';
import { checkRateLimit, clearRateLimit, getRateLimitKey } from '@/lib/rate-limit';
import redis from '@/lib/redis';
import { tooManyRequests, unauthorized } from '@/lib/response';
import { getAllUserTeams, getUserByEmail } from '@/queries/prisma';

export async function GET(request: Request) {
  // Rate limiting: 10 attempts per 15 minutes per IP (higher limit for OAuth flow)
  const rateLimitKey = getRateLimitKey(request, 'google-callback');
  if (!checkRateLimit(rateLimitKey, 10, 15 * 60 * 1000)) {
    return tooManyRequests({ code: 'rate-limited' });
  }

  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
    return unauthorized({ code: 'no-session' });
  }

  const user = await getUserByEmail(session.user.email.toLowerCase());

  if (!user) {
    return unauthorized({ code: 'user-not-found' });
  }

  if (user.approved === false) {
    return unauthorized({ code: 'pending-approval' });
  }

  const { id, role } = user;

  let token: string;

  if (redis.enabled) {
    token = await saveAuth({ userId: id, role });
  } else {
    token = createSecureToken({ userId: id, role }, secret());
  }

  await getAllUserTeams(id);

  // Clear rate limit on successful OAuth
  clearRateLimit(rateLimitKey);

  // Redirect to SSO page with token
  // Use forwarded headers or NEXTAUTH_URL to get correct origin behind reverse proxy
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const baseUrl = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : process.env.NEXTAUTH_URL || new URL(request.url).origin;
  const redirectUrl = new URL('/sso', baseUrl);
  redirectUrl.searchParams.set('token', token);
  redirectUrl.searchParams.set('url', '/');

  return Response.redirect(redirectUrl.toString());
}
