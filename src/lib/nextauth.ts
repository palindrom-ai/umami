import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { ROLES } from '@/lib/constants';
import { uuid } from '@/lib/crypto';
import prisma from '@/lib/prisma';

function isAllowedDomain(email: string): boolean {
  const allowedDomains = process.env.GOOGLE_ALLOWED_DOMAINS?.split(',').map(d => d.trim().toLowerCase());
  if (!allowedDomains || allowedDomains.length === 0 || allowedDomains[0] === '') {
    return true;
  }
  const emailDomain = email.split('@')[1]?.toLowerCase();
  return allowedDomains.includes(emailDomain);
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
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== 'google') {
        return false;
      }

      const email = user.email?.toLowerCase();
      if (!email) {
        return false;
      }

      // Domain whitelist check
      if (!isAllowedDomain(email)) {
        return '/login?error=domain_not_allowed';
      }

      // Check for existing user by provider ID or email
      let existingUser = await getUserByProviderId('google', account.providerAccountId);

      if (!existingUser) {
        existingUser = await getUserByEmail(email);
      }

      if (existingUser) {
        // Check if user is approved
        if (existingUser.approved === false) {
          return '/login?error=pending_approval';
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
      const autoCreate = process.env.GOOGLE_AUTO_CREATE_USERS === 'true';
      const requireApproval = process.env.GOOGLE_REQUIRE_APPROVAL === 'true';

      if (!autoCreate) {
        return '/login?error=no_account';
      }

      // Create new user
      const defaultRole = process.env.GOOGLE_DEFAULT_ROLE || ROLES.user;
      await prisma.client.user.create({
        data: {
          id: uuid(),
          username: email,
          password: null,
          email: email,
          provider: 'google',
          providerId: account.providerAccountId,
          role: defaultRole,
          displayName: user.name || null,
          approved: !requireApproval,
        },
      });

      if (requireApproval) {
        return '/login?error=pending_approval';
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
