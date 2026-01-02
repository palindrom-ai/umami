'use client';
import { Button, Icon, Row } from '@umami/react-zen';
import { signIn } from 'next-auth/react';
import { Google } from '@/components/svg';
import { useMessages } from '@/components/hooks';

export function GoogleSignInButton() {
  const { formatMessage, labels } = useMessages();

  const handleClick = () => {
    signIn('google', {
      callbackUrl: '/api/auth/google/callback',
    });
  };

  return (
    <Button onClick={handleClick} variant="quiet" style={{ width: '100%' }}>
      <Row gap="3" alignItems="center" justifyContent="center">
        <Icon>
          <Google />
        </Icon>
        <span>{formatMessage(labels.signInWithGoogle)}</span>
      </Row>
    </Button>
  );
}
