import type { Env } from './lib/env';
import { listPublishedForIndex } from './lib/posts';
import type { PostIndexEntry } from './lib/posts';

/* GET /llms.txt — public/llms.txt still holds the static pages by hand, but posts live in D1.
 * Pages gives a Function precedence over the static file at the same path, so this fetches
 * that file and appends a Writing section after Projects, newest post first.
 *
 * Fails open: if the asset is missing or D1 errors, the static file goes out untouched. */

export function withPosts(text: string, posts: PostIndexEntry[]): string {
  if (posts.length === 0) return text;
  const lines = posts.map(
    // A title is one line in the list whatever whitespace the editor let through.
    (p) => `- https://fei.io/writing/${p.slug} — ${p.title.replace(/\s+/g, ' ').trim()}`,
  );
  return `${text.replace(/\s+$/, '')}\n\n## Writing\n\n${lines.join('\n')}\n`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  /* Unconditional on purpose. Passed straight through, a client's If-None-Match for the old
     static file would come back 304, and the 304 would go out as-is: a crawler holding the
     pre-posts copy would be told to keep it forever. */
  const asset = await env.ASSETS.fetch(new Request(request.url));
  if (!asset.ok) return asset;

  // Queried before the body is read, so a failure can still hand back the untouched asset.
  let posts: PostIndexEntry[];
  try {
    posts = await listPublishedForIndex(env.DB);
  } catch {
    return asset;
  }

  const headers = new Headers(asset.headers);
  // The body's length changes, and the asset's validator no longer describes it.
  headers.delete('content-length');
  headers.delete('etag');
  headers.set('content-type', 'text/plain; charset=utf-8');
  return new Response(withPosts(await asset.text(), posts), { status: asset.status, headers });
};
