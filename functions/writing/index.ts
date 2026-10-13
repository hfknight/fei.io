import type { Env } from '../lib/env';
import type { PageMeta } from '../lib/stampMeta';
import { stampMeta } from '../lib/stampMeta';

/* GET /writing — without this the index serves index.html's head verbatim, canonical
 * included, so crawlers fold it into the home page as a duplicate. Deliberately topic-free:
 * the posts keep coming, and a description that names subjects goes stale with each one.
 * Keep the title in step with Writing.tsx's usePageTitle call. */

export const WRITING_META: PageMeta = {
  title: 'Writing · Fei Hu',
  description:
    'Notes, essays, and postmortems from Fei Hu on building products for the web and with AI.',
  jsonLd: {
    '@type': 'Blog',
    name: 'Writing',
    author: { '@id': 'https://fei.io/#person' },
  },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const asset = await env.ASSETS.fetch(request);
  return stampMeta(asset, WRITING_META, 'https://fei.io/writing');
};
