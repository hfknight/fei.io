import { json, badRequest } from '../../../lib/http';
import { listAll, insertPost } from '../../../lib/posts';
import { parseCreatePost } from '../../../lib/validate';
import type { Env } from '../../../lib/env';

// GET /api/admin/posts — all posts including drafts, newest-edited first.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const posts = await listAll(env.DB);
  return json({ posts });
};

// POST /api/admin/posts — create a post (slug generated, defaults to draft).
export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return badRequest('Invalid JSON');
  }

  const input = parseCreatePost(payload);
  if (!input) return badRequest('Missing or invalid fields');

  const post = await insertPost(env.DB, input);
  return json({ post }, { status: 201 });
};
