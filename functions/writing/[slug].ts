import type { Env } from '../lib/env';
import type { PageMeta } from '../lib/stampMeta';
import { stampMeta } from '../lib/stampMeta';
import { excerpt } from '../lib/excerpt';
import { getPublishedBySlug } from '../lib/posts';
import type { PostDTO } from '../lib/posts';

/* GET /writing/:slug — without this every post serves index.html's head verbatim, whose
 * canonical and og:url both name https://fei.io, so search engines fold each post into the
 * home page as a duplicate. The client renders the post and sets its own title, but crawlers
 * and link unfurlers read only the static head, so the post's own is stamped in here from D1.
 *
 * Fails open: the asset is fetched first, and an unknown slug, a draft, or any database error
 * returns it untouched. The page must still load whatever D1 is doing, and the SPA renders
 * its own not-found. /writing/admin is a single-segment path this route matches too; it
 * passes through the same way, because no published post has that slug. (The deeper admin
 * paths, /writing/admin/new and /writing/admin/:id, are not matched at all.) */

export function postMeta(post: PostDTO, canonical = `https://fei.io/writing/${post.slug}`): PageMeta {
  return {
    title: `${post.title} · Fei Hu`,
    description: excerpt(post.body) || post.title,
    ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
    ogType: 'article',
    jsonLd: {
      '@type': 'BlogPosting',
      headline: post.title,
      ...(post.publishedAt != null
        ? { datePublished: new Date(post.publishedAt).toISOString() }
        : {}),
      dateModified: new Date(post.updatedAt).toISOString(),
      ...(post.coverImageUrl ? { image: post.coverImageUrl } : {}),
      author: { '@id': 'https://fei.io/#person' },
      mainEntityOfPage: canonical,
    },
  };
}

export const onRequestGet: PagesFunction<Env, 'slug'> = async ({ request, env, params }) => {
  const asset = await env.ASSETS.fetch(request);
  const slug = String(params.slug);

  let post: PostDTO | null;
  try {
    post = await getPublishedBySlug(env.DB, slug);
  } catch {
    return asset;
  }
  if (!post) return asset;

  return stampMeta(asset, postMeta(post), `https://fei.io/writing/${post.slug}`);
};
