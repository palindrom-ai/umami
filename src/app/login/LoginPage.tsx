'use client';
import { Column, Row, Text } from '@umami/react-zen';
import { useConfig } from '@/components/hooks';
import { GoogleSignInButton } from '@/components/common/GoogleSignInButton';
import { LoginForm } from './LoginForm';

export function LoginPage() {
  const { googleSsoEnabled } = useConfig();

  return (
    <Column alignItems="center" height="100vh" backgroundColor="2" paddingTop="12">
      <LoginForm />
      {googleSsoEnabled && (
        <Column gap="4" style={{ width: 300, marginTop: 16 }}>
          <Row alignItems="center" gap="3">
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--base400)' }} />
            <Text color="muted">or</Text>
            <div style={{ flex: 1, height: 1, backgroundColor: 'var(--base400)' }} />
          </Row>
          <GoogleSignInButton />
        </Column>
      )}
    </Column>
  );
}
