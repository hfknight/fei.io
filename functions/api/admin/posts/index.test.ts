// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { onRequestGet, onRequestPost } from './index';
import { makeTestDB, makeCtx, jsonRequest } from '../../../test/d1';

interface PostResp {
  post: { id: string; slug: string; status: string; publishedAt: number | null };
}
interface ListResp {
  posts: { slug: string; status: string }[];
}

const post = (body: unknown) => jsonRequest('https://s/api/admin/posts', 'POST', body);

describe('admin posts collection', () => {
  it('creates a draft and lists it among all posts', async () => {
    const db = makeTestDB();

    const created = await onRequestPost(makeCtx(db, { request: post({ title: 'Hello World', body: '# hi' }) }));
    expect(created.status).toBe(201);
    const { post: p } = (await created.json()) as PostResp;
    expect(p.slug).toBe('hello-world');
    expect(p.status).toBe('draft');
    expect(p.publishedAt).toBeNull();

    const list = await onRequestGet(makeCtx(db));
    const { posts } = (await list.json()) as ListResp;
    expect(posts.map((x) => x.slug)).toContain('hello-world');
  });

  it('stamps publishedAt when created as published', async () => {
    const db = makeTestDB();
    const res = await onRequestPost(makeCtx(db, { request: post({ title: 'Live', body: 'x', status: 'published' }) }));
    const { post: p } = (await res.json()) as PostResp;
    expect(p.status).toBe('published');
    expect(typeof p.publishedAt).toBe('number');
  });

  it('generates a unique slug on collision', async () => {
    const db = makeTestDB([
      { id: '1', slug: 'hello-world', title: 'Hello World', status: 'published', published_at: 1 },
    ]);
    const res = await onRequestPost(makeCtx(db, { request: post({ title: 'Hello World', body: 'x' }) }));
    const { post: p } = (await res.json()) as PostResp;
    expect(p.slug).toBe('hello-world-2');
  });

  it('400s a body with no title', async () => {
    const db = makeTestDB();
    const res = await onRequestPost(makeCtx(db, { request: post({ body: 'no title' }) }));
    expect(res.status).toBe(400);
  });
});
