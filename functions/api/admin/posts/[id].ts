import { json, notFound, badRequest } from '../../../lib/http';
import { getById, updatePost, deletePost } from '../../../lib/posts';
import { parseUpdatePost } from '../../../lib/validate';
import type { Env } from '../../../lib/env';

function idOf(params: Record<string, string | string[]>): string {
  return Array.isArray(params.id) ? params.id[0] : params.id;
}

// GET /api/admin/posts/:id — a single post of any status.
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const post = await getById(env.DB, idOf(params));
  return post ? json({ post }) : notFound('Post not found');
};

// PUT /api/admin/posts/:id — partial update; publishing stamps published_at.
export const onRequestPut: PagesFunction<Env> = async ({ env, params, request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const input = parseUpdatePost(payload);
  if (!input) return badRequest('Invalid fields');

  const post = await updatePost(env.DB, idOf(params), input);
  return post ? json({ post }) : notFound('Post not found');
};

// DELETE /api/admin/posts/:id
export const onRequestDelete: PagesFunction<Env> = async ({ env, params }) => {
  const ok = await deletePost(env.DB, idOf(params));
  return ok ? json({ ok: true }) : notFound('Post not found');
};
