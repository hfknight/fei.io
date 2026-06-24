// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import { onRequest } from './_middleware';
import { makeTestDB, makeCtx } from '../../test/d1';

describe('admin _middleware', () => {
  it('returns 403 without a valid Access token', async () => {
    const ctx = makeCtx(makeTestDB(), {
      request: new Request('https://site/api/admin/posts', { method: 'POST' }),
    });

    const res = await onRequest(ctx);

    expect(res.status).toBe(403);
  });

  it('calls next() when authorized', async () => {
    const next = vi.fn(async () => new Response('ok'));
    const ctx = makeCtx(makeTestDB(), { env: { DEV_AUTH_BYPASS: 'true' }, next });

    const res = await onRequest(ctx);

    expect(next).toHaveBeenCalledOnce();
    expect(await res.text()).toBe('ok');
  });
});
