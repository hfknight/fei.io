import type { Env } from '../lib/env';
import { stampMeta } from '../lib/stampMeta';

/* GET /lab — the index gets its own head too. Deliberately topic-free: the shelf keeps
 * gaining pieces, and a description that enumerates subjects goes stale with every new
 * entry. Keep the title in step with Lab.tsx's usePageTitle call. */

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const asset = await env.ASSETS.fetch(request);
  return stampMeta(
    asset,
    {
      title: 'Lab — interactive experiments and case studies · Fei Hu',
      description:
        'A shelf of interactive experiments and case studies — small pieces of interface ' +
        'engineering, each one built, demoed live, and explained.',
    },
    'https://fei.io/lab',
  );
};
