// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { onRequestGet } from './changelog';
import { makeCtx, makeTestDB } from './test/d1';

describe('GET /changelog', () => {
  it('adds noindex and keeps the asset otherwise intact', async () => {
    const assets = {
      fetch: async () =>
        new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html' } }),
    } as unknown as Fetcher;

    const res = await onRequestGet(makeCtx(makeTestDB([]), { env: { ASSETS: assets } }));

    expect(res.headers.get('x-robots-tag')).toBe('noindex');
    expect(res.headers.get('content-type')).toBe('text/html');
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('<html></html>');
  });
});
