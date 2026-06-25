// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestGet } from './[slug]';
import { makeTestDB, makeCtx } from '../../test/d1';

interface PostBody {
  post: { slug: string; status: string };
}

describe('GET /api/posts/:slug', () => {
  it('returns a published post by slug', async () => {
    const db = makeTestDB([
      { id: '1', slug: 'hello', title: 'Hello', status: 'published', published_at: 1 },
    ]);

    const res = await onRequestGet(makeCtx(db, { params: { slug: 'hello' } }));
    const body = (await res.json()) as PostBody;

    expect(res.status).toBe(200);
    expect(body.post.slug).toBe('hello');
  });

  it('404s a draft slug', async () => {
    const db = makeTestDB([{ id: '2', slug: 'secret', title: 'Secret', status: 'draft' }]);

    const res = await onRequestGet(makeCtx(db, { params: { slug: 'secret' } }));

    expect(res.status).toBe(404);
  });

  it('404s an unknown slug', async () => {
    const db = makeTestDB([]);

    const res = await onRequestGet(makeCtx(db, { params: { slug: 'nope' } }));

    expect(res.status).toBe(404);
  });
});
