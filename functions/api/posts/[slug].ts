import { json, notFound } from '../../lib/http';
import { getPublishedBySlug } from '../../lib/posts';
import type { Env } from '../../lib/env';

// GET /api/posts/:slug — a single published post. Drafts/unknown slugs 404.
export const onRequestGet: PagesFunction<Env> = async ({ env, params }) => {
  const slug = Array.isArray(params.slug) ? params.slug[0] : params.slug;
  const post = await getPublishedBySlug(env.DB, slug);
  if (!post) return notFound('Post not found');
  return json({ post });
};
