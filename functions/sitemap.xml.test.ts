// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { onRequestGet, withPosts } from './sitemap.xml';
import { makeCtx, makeTestDB } from './test/d1';

const staticXml = readFileSync(resolve(process.cwd(), 'public/sitemap.xml'), 'utf8');
const assets = {
  fetch: async () => new Response(staticXml, { headers: { 'content-type': 'text/xml' } }),
} as unknown as Fetcher;

describe('withPosts', () => {
  it('inserts a url per post before the closing tag, escaping the slug', () => {
    const out = withPosts(staticXml, [
      { slug: 'a&b<c>"d\'', title: 't', publishedAt: 1, updatedAt: Date.UTC(2026, 6, 2) },
    ]);

    expect(out).toContain('<loc>https://fei.io/writing/a&amp;b&lt;c&gt;&quot;d&apos;</loc>');
    expect(out).toContain('<lastmod>2026-07-02</lastmod>');
    expect(out).toContain('    <priority>0.7</priority>\n    <changefreq>yearly</changefreq>\n  </url>\n</urlset>');
  });

  it('leaves the file alone when there are no posts', () => {
    expect(withPosts(staticXml, [])).toBe(staticXml);
  });
});

describe('GET /sitemap.xml', () => {
  it('lists published posts only', async () => {
    const db = makeTestDB([
      { id: '1', slug: 'live-post', title: 'Live', status: 'published', published_at: 5, updated_at: 86_400_000 },
      { id: '2', slug: 'draft-post', title: 'Draft', status: 'draft' },
    ]);

    const res = await onRequestGet(makeCtx(db, { env: { ASSETS: assets } }));
    const xml = await res.text();

    expect(res.headers.get('content-type')).toBe('application/xml; charset=utf-8');
    expect(xml).toContain('https://fei.io/writing/live-post');
    expect(xml).toContain('<lastmod>1970-01-02</lastmod>');
    expect(xml).not.toContain('draft-post');
    expect(xml).toContain('https://fei.io/lab/dither');
  });

  it('fetches the static file unconditionally, so a stale validator cannot pin a 304', async () => {
    // The failure this guards: a crawler's If-None-Match for the pre-posts file, passed through,
    // comes back 304 from the asset store and goes out as-is, so it never sees a post.
    const seen: Request[] = [];
    const recording = {
      fetch: async (req: Request) => {
        seen.push(req);
        return new Response(staticXml, { headers: { 'content-type': 'text/xml' } });
      },
    } as unknown as Fetcher;
    const request = new Request('https://fei.io/sitemap.xml', {
      headers: { 'if-none-match': '"static-etag"' },
    });

    await onRequestGet(makeCtx(makeTestDB([]), { request, env: { ASSETS: recording } }));

    expect(seen[0].url).toBe('https://fei.io/sitemap.xml');
    expect(seen[0].headers.get('if-none-match')).toBeNull();
  });

  it('returns the static file when the database throws', async () => {
    const db = {
      prepare() {
        throw new Error('D1 down');
      },
    } as unknown as D1Database;

    const res = await onRequestGet(makeCtx(db, { env: { ASSETS: assets } }));

    expect(await res.text()).toBe(staticXml);
  });
});
