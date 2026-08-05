// @vitest-environment node
import { describe, it, expect, afterEach, vi } from 'vitest';
import { onRequestGet } from './plugin-stats';

/* The registry's shape, cut down: a cumulative total, a refresh stamp, and one key per version.
 * The versions are deliberately out of order and include the case string compare gets wrong. */
const REGISTRY = {
  'x-bookmarks-sync': {
    downloads: 1171,
    updated: 1_784_736_079_000,
    '1.1.9': 107,
    '1.3.4': 153,
    '1.1.12': 72,
    '1.0.0': 2,
  },
  'other-plugin': { downloads: 9, updated: 1, '1.0.0': 9 },
};

function stubFetch(body: unknown, ok = true) {
  return vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify(body), { status: ok ? 200 : 503 }),
  );
}

/* No `caches` under the node environment, which is the case the handler guards for — so these
 * exercise the uncached path end to end. */
function call(url = 'https://fei.io/api/plugin-stats') {
  return onRequestGet({
    request: new Request(url),
    waitUntil: () => {},
    // The handler touches nothing else on the context.
  } as unknown as Parameters<typeof onRequestGet>[0]) as Promise<Response>;
}

interface Body {
  id: string;
  downloads: number;
  releases: number;
  version?: string;
  updated: number | null;
}

afterEach(() => vi.restoreAllMocks());

describe('GET /api/plugin-stats', () => {
  it('returns the default plugin, with the newest version by semver', async () => {
    stubFetch(REGISTRY);

    const body = (await (await call()).json()) as Body;

    expect(body).toEqual({
      id: 'x-bookmarks-sync',
      downloads: 1171,
      releases: 4,
      // 1.3.4 over 1.1.12, which a string compare would rank below 1.1.9.
      version: '1.3.4',
      updated: 1_784_736_079_000,
    });
  });

  it('honours an explicit id', async () => {
    stubFetch(REGISTRY);

    const body = (await (
      await call('https://fei.io/api/plugin-stats?id=other-plugin')
    ).json()) as Body;

    expect(body.id).toBe('other-plugin');
    expect(body.downloads).toBe(9);
  });

  it('400s an id that is not a plugin id, without asking upstream', async () => {
    const f = stubFetch(REGISTRY);

    const res = await call('https://fei.io/api/plugin-stats?id=../../etc/passwd');

    expect(res.status).toBe(400);
    expect(f).not.toHaveBeenCalled();
  });

  it('404s a plugin the registry does not list', async () => {
    stubFetch(REGISTRY);

    const res = await call('https://fei.io/api/plugin-stats?id=not-a-plugin');

    expect(res.status).toBe(404);
  });

  it('502s when the registry is unreachable', async () => {
    stubFetch(REGISTRY, false);

    const res = await call();

    expect(res.status).toBe(502);
  });
});
