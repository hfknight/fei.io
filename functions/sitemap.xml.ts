import type { Env } from './lib/env';
import { listPublishedForIndex } from './lib/posts';
import type { PostIndexEntry } from './lib/posts';

/* GET /sitemap.xml — public/sitemap.xml still holds the static pages by hand, but posts live
 * in D1 and would otherwise never be listed. Pages gives a Function precedence over the
 * static file at the same path, so this fetches that file and splices one <url> per
 * published post in before the closing tag.
 *
 * Fails open: if the asset is missing or D1 errors, the static file goes out untouched. */

const escapeXml = (s: string) =>
  s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export function withPosts(xml: string, posts: PostIndexEntry[]): string {
  if (posts.length === 0) return xml;
  const entries = posts
    .map(
      (p) =>
        `  <url>\n` +
        `    <loc>https://fei.io/writing/${escapeXml(p.slug)}</loc>\n` +
        `    <lastmod>${new Date(p.updatedAt).toISOString().slice(0, 10)}</lastmod>\n` +
        `    <priority>0.7</priority>\n` +
        `    <changefreq>yearly</changefreq>\n` +
        `  </url>\n`,
    )
    .join('');
  return xml.replace('</urlset>', `${entries}</urlset>`);
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
  headers.set('content-type', 'application/xml; charset=utf-8');
  return new Response(withPosts(await asset.text(), posts), { status: asset.status, headers });
};
