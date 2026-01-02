import {
  Column,
  Form,
  FormButtons,
  FormField,
  FormSubmitButton,
  Heading,
  Icon,
  PasswordField,
  Row,
  Text,
  TextField,
} from '@umami/react-zen';
import { AlertTriangle } from '@/components/icons';
import { useRouter, useSearchParams } from 'next/navigation';
import { useMessages, useUpdateQuery } from '@/components/hooks';
import { Logo } from '@/components/svg';
import { setClientAuthToken } from '@/lib/client';
import { setUser } from '@/store/app';

const SSO_ERROR_MAP: Record<string, string> = {
  domain_not_allowed: 'domainNotAllowed',
  no_account: 'noAccountExists',
  pending_approval: 'pendingApproval',
};

export function LoginForm() {
  const { formatMessage, labels, messages, getErrorMessage } = useMessages();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { mutateAsync, error } = useUpdateQuery('/auth/login');

  const ssoError = searchParams.get('error');
  const ssoErrorKey = ssoError ? SSO_ERROR_MAP[ssoError] : null;
  const ssoErrorMessage = ssoErrorKey
    ? formatMessage(messages[ssoErrorKey as keyof typeof messages])
    : null;

  const handleSubmit = async (data: any) => {
    await mutateAsync(data, {
      onSuccess: async ({ token, user }) => {
        setClientAuthToken(token);
        setUser(user);
        router.push('/');
      },
    });
  };

  return (
    <Column justifyContent="center" alignItems="center" gap="6">
      <Icon size="lg">
        <Logo />
      </Icon>
      <Heading>umami</Heading>
      {ssoErrorMessage && (
        <Row
          alignItems="center"
          justifyContent="center"
          gap="2"
          style={{
            width: 300,
            padding: '12px 16px',
            backgroundColor: 'var(--red50)',
            borderRadius: 4,
          }}
        >
          <Icon size="sm">
            <AlertTriangle />
          </Icon>
          <Text>{ssoErrorMessage}</Text>
        </Row>
      )}
      <Form onSubmit={handleSubmit} error={getErrorMessage(error)}>
        <FormField
          label={formatMessage(labels.username)}
          data-test="input-username"
          name="username"
          rules={{ required: formatMessage(labels.required) }}
        >
          <TextField autoComplete="username" />
        </FormField>

        <FormField
          label={formatMessage(labels.password)}
          data-test="input-password"
          name="password"
          rules={{ required: formatMessage(labels.required) }}
        >
          <PasswordField autoComplete="current-password" />
        </FormField>
        <FormButtons>
          <FormSubmitButton
            data-test="button-submit"
            variant="primary"
            style={{ flex: 1 }}
            isDisabled={false}
          >
            {formatMessage(labels.login)}
          </FormSubmitButton>
        </FormButtons>
      </Form>
    </Column>
  );
}
