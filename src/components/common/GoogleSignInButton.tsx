'use client';
import { Button, Icon, Loading, Row } from '@umami/react-zen';
import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useMessages } from '@/components/hooks';
import { Google } from '@/components/svg';

export function GoogleSignInButton() {
  const { formatMessage, labels } = useMessages();
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = () => {
    setIsLoading(true);
    signIn('google', {
      callbackUrl: '/api/auth/google/callback',
    });
  };

  const buttonLabel = formatMessage(labels.signInWithGoogle);

  return (
    <Button
      onClick={handleClick}
      variant="quiet"
      style={{ width: '100%' }}
      disabled={isLoading}
      aria-label={buttonLabel}
      data-test="button-google-signin"
    >
      <Row gap="3" alignItems="center" justifyContent="center">
        {isLoading ? (
          <Loading size="sm" />
        ) : (
          <Icon>
            <Google />
          </Icon>
        )}
        <span>{buttonLabel}</span>
      </Row>
    </Button>
  );
}
