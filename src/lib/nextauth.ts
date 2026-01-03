import debug from 'debug';
import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { uuid } from '@/lib/crypto';
import {
  getDefaultRole,
  isAllowedDomain,
  shouldAutoCreateUsers,
  shouldRequireApproval,
} from '@/lib/nextauth-utils';
import prisma from '@/lib/prisma';

const log = debug('umami:auth:sso');

// Validate NEXTAUTH_SECRET at runtime (not build time)
function validateSecrets() {
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    throw new Error('NEXTAUTH_SECRET environment variable is required in production');
  }
}

// Generic auth error to prevent account enumeration
const AUTH_ERROR_URL = '/login?error=auth_failed';

// Build providers array conditionally - only add Google if credentials exist
const providers: NextAuthOptions['providers'] = [];

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;

// Log configuration status (masked for security)
console.log('[NextAuth] Configuration check:', {
  hasGoogleClientId: !!googleClientId,
  googleClientIdLength: googleClientId?.length || 0,
  hasGoogleClientSecret: !!googleClientSecret,
  googleClientSecretLength: googleClientSecret?.length || 0,
  hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
  nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
});

if (googleClientId && googleClientSecret) {
  providers.push(
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
  );
  console.log('[NextAuth] Google provider registered successfully');
} else {
  console.warn('[NextAuth] Google SSO credentials not configured - SSO will be disabled');
  log('Google SSO credentials not configured - SSO will be disabled');
}

async function getUserByEmail(email: string) {
  return prisma.client.user.findFirst({
    where: {
      email,
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      provider: true,
      providerId: true,
      role: true,
      approved: true,
      createdAt: true,
    },
  });
}

async function getUserByProviderId(provider: string, providerId: string) {
  return prisma.client.user.findFirst({
    where: {
      provider,
      providerId,
      deletedAt: null,
    },
    select: {
      id: true,
      username: true,
      email: true,
      provider: true,
      providerId: true,
      role: true,
      approved: true,
      createdAt: true,
    },
  });
}

export const authOptions: NextAuthOptions = {
  debug: process.env.NEXTAUTH_DEBUG === 'true',
  providers,
  callbacks: {
    async signIn({ user, account }) {
      // Validate secrets at runtime
      validateSecrets();

      if (account?.provider !== 'google') {
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }

      // Domain whitelist check
      if (!isAllowedDomain(email)) {
        log('Auth rejected: domain not allowed for email %s', email);
        return AUTH_ERROR_URL;
      }

      // Check for existing user by provider ID or email
      let existingUser = await getUserByProviderId('google', account.providerAccountId);

      if (!existingUser) {
        existingUser = await getUserByEmail(email);
      }

      if (existingUser) {
        // Check if user is approved
        if (existingUser.approved === false) {
          log('Auth rejected: user pending approval for email %s', email);
          return AUTH_ERROR_URL;
        }

        // Update provider info if not set
        if (!existingUser.providerId) {
          await prisma.client.user.update({
            where: { id: existingUser.id },
            data: {
              provider: 'google',
              providerId: account.providerAccountId,
              email: email,
            },
          });
        }
        return true;
      }

      // New user flow
      if (!shouldAutoCreateUsers()) {
        log('Auth rejected: auto-create disabled, no existing account for email %s', email);
        return AUTH_ERROR_URL;
      }

      // Create new user
      const requireApproval = shouldRequireApproval();
      await prisma.client.user.create({
        data: {
          id: uuid(),
          username: email,
          password: null,
          email: email,
          provider: 'google',
          providerId: account.providerAccountId,
          role: getDefaultRole(),
          displayName: user.name || null,
          approved: !requireApproval,
        },
      });

      if (requireApproval) {
        log('Auth pending: new user %s requires admin approval', email);
        return AUTH_ERROR_URL;
      }

      return true;
    },
    async jwt({ token, user, account }) {
      if (account && user) {
        const dbUser = await getUserByEmail(user.email?.toLowerCase() || '');
        if (dbUser) {
          token.userId = dbUser.id;
          token.role = dbUser.role;
          token.username = dbUser.username;
        }
        // Set token expiration (24 hours)
        const now = Math.floor(Date.now() / 1000);
        token.iat = now;
        token.exp = now + 24 * 60 * 60;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.userId as string;
        session.user.role = token.role as string;
        session.user.username = token.username as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
