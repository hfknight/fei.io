// @vitest-environment node
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { onRequestGet, withPosts } from './llms.txt';
import { makeCtx, makeTestDB } from './test/d1';

const staticTxt = readFileSync(resolve(process.cwd(), 'public/llms.txt'), 'utf8');
const assets = {
  fetch: async () => new Response(staticTxt, { headers: { 'content-type': 'text/plain' } }),
} as unknown as Fetcher;

describe('withPosts', () => {
  it('appends a Writing section after the existing content, one line per post', () => {
    const out = withPosts('# Site\n\n## Projects\n\n- x\n', [
      { slug: 'new', title: 'Newest', publishedAt: 2, updatedAt: 2 },
      { slug: 'old', title: 'Older\n one', publishedAt: 1, updatedAt: 1 },
    ]);

    expect(out).toBe(
      '# Site\n\n## Projects\n\n- x\n\n## Writing\n\n' +
        '- https://fei.io/writing/new — Newest\n- https://fei.io/writing/old — Older one\n',
    );
  });

  it('adds no section when there are no posts', () => {
    expect(withPosts(staticTxt, [])).toBe(staticTxt);
  });
});

describe('GET /llms.txt', () => {
  it('lists published posts newest first, after Projects', async () => {
    const db = makeTestDB([
      { id: '1', slug: 'older', title: 'Older', status: 'published', published_at: 1 },
      { id: '2', slug: 'newer', title: 'Newer', status: 'published', published_at: 2 },
      { id: '3', slug: 'draft-post', title: 'Draft', status: 'draft' },
    ]);

    const res = await onRequestGet(makeCtx(db, { env: { ASSETS: assets } }));
    const text = await res.text();

    expect(res.headers.get('content-type')).toBe('text/plain; charset=utf-8');
    expect(text.indexOf('## Projects')).toBeLessThan(text.indexOf('## Writing'));
    expect(text.indexOf('writing/newer')).toBeLessThan(text.indexOf('writing/older'));
    expect(text).not.toContain('draft-post');
  });

  it('returns the static file when the database throws', async () => {
    const db = {
      prepare() {
        throw new Error('D1 down');
      },
    } as unknown as D1Database;

    const res = await onRequestGet(makeCtx(db, { env: { ASSETS: assets } }));

    expect(await res.text()).toBe(staticTxt);
  });
});
