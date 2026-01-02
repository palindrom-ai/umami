'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { signOut } from 'next-auth/react';
import { useApi } from '@/components/hooks';
import { removeClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

export function LogoutPage() {
  const router = useRouter();
  const { post } = useApi();

  useEffect(() => {
    async function logout() {
      // Clear Umami session
      await post('/auth/logout');

      // Clear NextAuth session (for OAuth users)
      try {
        await signOut({ redirect: false });
      } catch {
        // Ignore errors if NextAuth is not configured
      }

      window.location.href = `${process.env.basePath || ''}/login`;
    }

    removeClientAuthToken();
    setUser(null);
    logout();
  }, [router, post]);

  return null;
}
