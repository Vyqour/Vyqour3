import { ServiceUnavailableException } from '@nestjs/common';
import { GoogleConfiguredGuard } from './auth.controller';

describe('GoogleConfiguredGuard', () => {
  const makeGuard = (values: Record<string, string | undefined>) =>
    new GoogleConfiguredGuard({
      get: (key: string) => values[key.replace(/^google\./, '')] ?? values[key],
    } as any);

  it('allows Google OAuth only when credentials and valid URLs are configured', () => {
    const guard = makeGuard({
      'google.clientId': 'client-id',
      'google.clientSecret': 'client-secret',
      'google.callbackUrl': 'https://api.vyqour.example/api/v1/auth/google/callback',
      webUrl: 'https://vyqour.example',
      nodeEnv: 'production',
    });

    expect(guard.canActivate()).toBe(true);
  });

  it('rejects malformed callback URLs instead of starting a broken OAuth redirect', () => {
    const guard = makeGuard({
      'google.clientId': 'client-id',
      'google.clientSecret': 'client-secret',
      'google.callbackUrl': 'ttps\\://api.vyqour.example/api/v1/auth/google/callback',
      webUrl: 'https://vyqour.example',
      nodeEnv: 'production',
    });

    expect(() => guard.canActivate()).toThrow(ServiceUnavailableException);
  });

  it('rejects missing credentials with a clear configuration error', () => {
    const guard = makeGuard({
      'google.callbackUrl': 'https://api.vyqour.example/api/v1/auth/google/callback',
      webUrl: 'https://vyqour.example',
      nodeEnv: 'production',
    });

    expect(() => guard.canActivate()).toThrow(ServiceUnavailableException);
  });
});
