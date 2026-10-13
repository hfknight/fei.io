import type { Env } from './lib/env';

/* GET /changelog — retired: the route still resolves but has no nav link. It serves
 * index.html's head verbatim, canonical included, so left alone it is indexable as a
 * duplicate of the home page. noindex tells crawlers to drop it without breaking the page
 * for anyone who still has the link. */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const asset = await env.ASSETS.fetch(request);
  const res = new Response(asset.body, asset);
  res.headers.set('X-Robots-Tag', 'noindex');
  return res;
};
