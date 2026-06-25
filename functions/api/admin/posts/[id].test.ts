// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPut, onRequestDelete } from './[id]';
import { makeTestDB, makeCtx, jsonRequest } from '../../../test/d1';

interface PostResp {
  post: { id: string; title: string; status: string; publishedAt: number | null };
}

const seed = () => [
  { id: 'p1', slug: 'post', title: 'Post', status: 'draft' as const },
];

const put = (body: unknown) => jsonRequest('https://s/api/admin/posts/p1', 'PUT', body);

describe('admin single post', () => {
  it('updates fields', async () => {
    const db = makeTestDB(seed());
    const res = await onRequestPut(makeCtx(db, { params: { id: 'p1' }, request: put({ title: 'Renamed' }) }));
    const { post } = (await res.json()) as PostResp;
    expect(post.title).toBe('Renamed');
  });

  it('stamps publishedAt once on publish and keeps it across later edits', async () => {
    const db = makeTestDB(seed());

    const published = await onRequestPut(makeCtx(db, { params: { id: 'p1' }, request: put({ status: 'published' }) }));
    const first = ((await published.json()) as PostResp).post.publishedAt;
    expect(typeof first).toBe('number');

    const edited = await onRequestPut(makeCtx(db, { params: { id: 'p1' }, request: put({ title: 'Edited' }) }));
    const second = ((await edited.json()) as PostResp).post.publishedAt;
    expect(second).toBe(first);
  });

  it('deletes a post; subsequent GET 404s', async () => {
    const db = makeTestDB(seed());

    const del = await onRequestDelete(makeCtx(db, { params: { id: 'p1' } }));
    expect(del.status).toBe(200);

    const get = await onRequestGet(makeCtx(db, { params: { id: 'p1' } }));
    expect(get.status).toBe(404);
  });

  it('404s an update to an unknown id', async () => {
    const db = makeTestDB(seed());
    const res = await onRequestPut(makeCtx(db, { params: { id: 'nope' }, request: put({ title: 'x' }) }));
    expect(res.status).toBe(404);
  });
});
