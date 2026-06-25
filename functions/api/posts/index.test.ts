// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestGet } from './index';
import { makeTestDB, makeCtx } from '../../test/d1';

interface ListBody {
  posts: { slug: string }[];
}

describe('GET /api/posts', () => {
  it('returns only published posts, newest first', async () => {
    const db = makeTestDB([
      { id: '1', slug: 'older', title: 'Older', status: 'published', published_at: 100 },
      { id: '2', slug: 'newer', title: 'Newer', status: 'published', published_at: 300 },
      { id: '3', slug: 'draft', title: 'Draft', status: 'draft' },
    ]);

    const res = await onRequestGet(makeCtx(db));
    const body = (await res.json()) as ListBody;

    expect(body.posts.map((p) => p.slug)).toEqual(['newer', 'older']);
  });

  it('returns an empty array when nothing is published', async () => {
    const db = makeTestDB([{ id: '3', slug: 'draft', title: 'Draft', status: 'draft' }]);

    const res = await onRequestGet(makeCtx(db));
    const body = (await res.json()) as ListBody;

    expect(body.posts).toEqual([]);
  });
});
