import { jwtVerify, createRemoteJWKSet } from 'jose';
import type { Env } from './env';

export interface AccessIdentity {
  email: string;
  sub?: string;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// One JWKS per team domain, reused across requests in the same isolate.
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function getJwks(teamDomain: string) {
  let jwks = jwksCache.get(teamDomain);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL(`${teamDomain}/cdn-cgi/access/certs`));
    jwksCache.set(teamDomain, jwks);
  }
  return jwks;
}

// Verifies the Cloudflare Access JWT on the request and returns the identity.
// Throws AuthError when the token is missing or invalid. In local dev — where
// Access does not run — a DEV_AUTH_BYPASS flag returns a fixed identity.
export async function verifyAccess(request: Request, env: Env): Promise<AccessIdentity> {
  if (env.DEV_AUTH_BYPASS === 'true') {
    return { email: 'dev@localhost', sub: 'dev' };
  }

  const token = request.headers.get('cf-access-jwt-assertion');
  if (!token) {
    throw new AuthError('Missing Cf-Access-Jwt-Assertion header');
  }

  try {
    const { payload } = await jwtVerify(token, getJwks(env.TEAM_DOMAIN), {
      issuer: env.TEAM_DOMAIN,
      audience: env.POLICY_AUD,
    });
    return { email: typeof payload.email === 'string' ? payload.email : '', sub: payload.sub };
  } catch (err) {
    throw new AuthError(`Invalid Access token: ${(err as Error).message}`);
  }
}
