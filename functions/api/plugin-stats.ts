import { json, badRequest, notFound } from '../lib/http';

/* GET /api/plugin-stats?id=<plugin-id> — download numbers for an Obsidian community plugin.
 *
 * Obsidian publishes no API for this. The one canonical source is a static file in the
 * obsidianmd/obsidian-releases repo, which is what the in-app plugin browser itself reads: an
 * object keyed by plugin id, each entry carrying a cumulative `downloads`, an `updated`
 * timestamp, and one count per released version.
 *
 * It has to be read server-side. The file is the WHOLE registry — ~1.9 MB, 6,000-odd plugins —
 * so a page that wanted one number would download all of them, on every visit, to throw away
 * 99.98% of it. Here it is fetched once a day and answered from cache.
 */
const REGISTRY =
  'https://raw.githubusercontent.com/obsidianmd/obsidian-releases/master/community-plugin-stats.json';

const DEFAULT_ID = 'x-bookmarks-sync';
/* Plugin ids in the registry are lowercase kebab. Not a security boundary — the data behind
 * this is public either way — but it keeps a junk id from becoming a cache entry. */
const ID = /^[a-z0-9-]{1,64}$/;

const DAY = 86_400;

/* What the registry gives per plugin: a cumulative total, the moment the numbers were last
 * refreshed, and then one key per version. The version keys are what makes this an index
 * signature rather than a shape. */
interface PluginStats {
  downloads?: number;
  updated?: number;
  [version: string]: number | undefined;
}

/* Newest by SEMVER, not by key order or by string compare — the registry's order is not
 * meaningful and "1.1.12" sorts below "1.1.9" as text. Missing or non-numeric parts count as 0,
 * so a malformed key loses rather than throwing. */
function latest(versions: string[]): string | undefined {
  return versions.reduce<string | undefined>((best, v) => {
    if (!best) return v;
    const a = v.split('.').map(Number);
    const b = best.split('.').map(Number);
    for (let i = 0; i < Math.max(a.length, b.length); i++) {
      const x = a[i] || 0;
      const y = b[i] || 0;
      if (x !== y) return x > y ? v : best;
    }
    return best;
  }, undefined);
}

export const onRequestGet: PagesFunction = async ({ request, waitUntil }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id') ?? DEFAULT_ID;
  if (!ID.test(id)) return badRequest('Bad plugin id');

  /* Keyed on the id alone, so the same plugin is one entry however the caller spelled the rest
   * of the URL. `caches` is absent under vitest's node environment, hence the guard — the
   * handler still answers there, it just answers from upstream every time. */
  const key = new Request(`https://plugin-stats.local/${id}`);
  const store = typeof caches !== 'undefined' ? caches.default : undefined;
  const hit = await store?.match(key);
  if (hit) return hit;

  /* cacheTtl on the subrequest as well as our own cache entry: the two protect different
   * things. Ours keeps us from parsing 1.9 MB again; this keeps a cold colo from pulling the
   * file over the wire when another already has it. */
  const upstream = await fetch(REGISTRY, {
    cf: { cacheTtl: DAY, cacheEverything: true },
  } as RequestInit);
  if (!upstream.ok) return json({ error: 'Upstream unavailable' }, { status: 502 });

  const all = (await upstream.json()) as Record<string, PluginStats>;
  const stats = all[id];
  if (!stats) return notFound('Unknown plugin');

  const versions = Object.keys(stats).filter((k) => k !== 'downloads' && k !== 'updated');
  const body = {
    id,
    downloads: stats.downloads ?? 0,
    /* Every version the plugin has ever shipped, which is the honest reading of these keys:
     * the registry keeps a count per release and never drops one. */
    releases: versions.length,
    version: latest(versions),
    /* When the NUMBERS were last refreshed — not when the plugin was last updated. Passed
     * through because a stale total should be showable as stale, but it must not be labelled
     * as a release date. */
    updated: stats.updated ?? null,
  };

  const res = json(body, { headers: { 'cache-control': `public, max-age=${DAY}` } });
  /* Cached after the response is built, not before: waitUntil lets the put outlive the
   * request, and the clone is required because a Response body can only be read once. */
  if (store) waitUntil(store.put(key, res.clone()));
  return res;
};
