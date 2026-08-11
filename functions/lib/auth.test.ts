// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { jwtVerifyMock, createRemoteJWKSetMock } = vi.hoisted(() => ({
  jwtVerifyMock: vi.fn(),
  createRemoteJWKSetMock: vi.fn(() => 'JWKS'),
}));
vi.mock('jose', () => ({
  jwtVerify: jwtVerifyMock,
  createRemoteJWKSet: createRemoteJWKSetMock,
}));

import { verifyAccess, AuthError } from './auth';
import type { Env } from './env';

function makeEnv(over: Partial<Env> = {}): Env {
  return {
    DB: {} as D1Database,
    MEDIA: {} as R2Bucket,
    ASSETS: {} as Fetcher,
    TEAM_DOMAIN: 'https://team.cloudflareaccess.com',
    POLICY_AUD: 'aud-tag',
    R2_ACCOUNT_ID: 'acc',
    R2_BUCKET: 'bucket',
    R2_PUBLIC_BASE: 'https://media.example',
    R2_ACCESS_KEY_ID: 'key',
    R2_SECRET_ACCESS_KEY: 'secret',
    ...over,
  };
}

function reqWith(token?: string): Request {
  const headers = new Headers();
  if (token) headers.set('cf-access-jwt-assertion', token);
  return new Request('https://site/api/admin/posts', { method: 'POST', headers });
}

beforeEach(() => {
  jwtVerifyMock.mockReset();
  createRemoteJWKSetMock.mockClear();
});

describe('verifyAccess', () => {
  it('bypasses verification in dev and never calls jose', async () => {
    const identity = await verifyAccess(reqWith(), makeEnv({ DEV_AUTH_BYPASS: 'true' }));
    expect(identity.email).toBe('dev@localhost');
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it('throws when the Access header is missing', async () => {
    await expect(verifyAccess(reqWith(), makeEnv())).rejects.toBeInstanceOf(AuthError);
    expect(jwtVerifyMock).not.toHaveBeenCalled();
  });

  it('returns the identity for a valid token and checks issuer + audience', async () => {
    jwtVerifyMock.mockResolvedValue({ payload: { email: 'a@b.com', sub: 'u1' } });
    const env = makeEnv();

    const identity = await verifyAccess(reqWith('good-token'), env);

    expect(identity).toEqual({ email: 'a@b.com', sub: 'u1' });
    expect(jwtVerifyMock).toHaveBeenCalledWith('good-token', 'JWKS', {
      issuer: env.TEAM_DOMAIN,
      audience: env.POLICY_AUD,
    });
  });

  it('throws AuthError when verification rejects (bad audience/issuer/expiry)', async () => {
    jwtVerifyMock.mockRejectedValue(new Error('audience mismatch'));
    await expect(verifyAccess(reqWith('bad-token'), makeEnv())).rejects.toBeInstanceOf(AuthError);
  });
});
