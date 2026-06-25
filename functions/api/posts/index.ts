import { json } from '../../lib/http';
import { listPublished } from '../../lib/posts';
import type { Env } from '../../lib/env';

// GET /api/posts — published posts, newest first.
export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const posts = await listPublished(env.DB);
  return json({ posts });
};
