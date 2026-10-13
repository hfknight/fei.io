// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { onRequestGet, postMeta } from './[slug]';
import { makeCtx, makeTestDB } from '../test/d1';
import type { PostDTO } from '../lib/posts';

const post: PostDTO = {
  id: '1',
  slug: 'hello',
  title: 'Hello World',
  body: '![x](y)\n\n# Heading\n\nA first paragraph with [a link](https://fei.io).',
  template: 'standard',
  coverImageUrl: 'https://media.fei.io/cover.webp',
  status: 'published',
  publishedAt: Date.UTC(2026, 5, 1),
  createdAt: Date.UTC(2026, 5, 1),
  updatedAt: Date.UTC(2026, 6, 2),
};

describe('postMeta', () => {
  it('describes a post with a cover as a BlogPosting article', () => {
    const meta = postMeta(post);

    expect(meta.title).toBe('Hello World · Fei Hu');
    expect(meta.description).toBe('A first paragraph with a link.');
    expect(meta.ogType).toBe('article');
    expect(meta.image).toBe('https://media.fei.io/cover.webp');
    expect(meta.jsonLd).toEqual({
      '@type': 'BlogPosting',
      headline: 'Hello World',
      datePublished: '2026-06-01T00:00:00.000Z',
      dateModified: '2026-07-02T00:00:00.000Z',
      image: 'https://media.fei.io/cover.webp',
      author: { '@id': 'https://fei.io/#person' },
      mainEntityOfPage: 'https://fei.io/writing/hello',
    });
  });

  it('omits image keys without a cover, and falls back to the title without prose', () => {
    const meta = postMeta({ ...post, coverImageUrl: null, body: '# Only a heading' });

    expect(meta).not.toHaveProperty('image');
    expect(meta.jsonLd).not.toHaveProperty('image');
    expect(meta.description).toBe('Hello World');
  });
});

describe('GET /writing/:slug', () => {
  const asset = new Response('<html></html>', { headers: { 'content-type': 'text/plain' } });
  const assets = { fetch: async () => asset } as unknown as Fetcher;

  it('returns the asset untouched for an unknown slug', async () => {
    const res = await onRequestGet(
      makeCtx(makeTestDB([]), { params: { slug: 'nope' }, env: { ASSETS: assets } }),
    );

    expect(res).toBe(asset);
  });

  it('returns the asset untouched for a draft', async () => {
    const db = makeTestDB([{ id: '2', slug: 'secret', title: 'Secret', status: 'draft' }]);
    const res = await onRequestGet(makeCtx(db, { params: { slug: 'secret' }, env: { ASSETS: assets } }));

    expect(res).toBe(asset);
  });

  it('returns the asset untouched when the database throws', async () => {
    const db = {
      prepare() {
        throw new Error('D1 down');
      },
    } as unknown as D1Database;
    const res = await onRequestGet(makeCtx(db, { params: { slug: 'hello' }, env: { ASSETS: assets } }));

    expect(res).toBe(asset);
  });
});
