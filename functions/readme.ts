import type { Env } from './lib/env';
import type { PageMeta } from './lib/stampMeta';
import { stampMeta } from './lib/stampMeta';

/* GET /readme — without this the route serves index.html's head verbatim, whose canonical
 * and og:url both name https://fei.io, so crawlers fold /readme into the home page as a
 * duplicate. Keep the title in step with About.tsx's usePageTitle call.
 *
 * A ProfilePage rather than a second Person: the site-wide head already carries the Person,
 * and stampMeta appends rather than replaces. The Person here shares that one's @id, so the
 * two read as one entity, not two people with conflicting urls. */

export const README_META: PageMeta = {
  title: "About · Fei Hu, full-stack engineer with a designer's touch",
  description:
    "Fei Hu is a full-stack engineer with a designer's touch: over a decade of " +
    'brand-defining websites and SaaS platforms, now building AI products in production.',
  jsonLd: {
    '@type': 'ProfilePage',
    mainEntity: {
      '@type': 'Person',
      '@id': 'https://fei.io/#person',
      name: 'Fei Hu',
      url: 'https://fei.io',
      jobTitle: 'Full-Stack & AI Product Engineer',
      sameAs: [
        'https://github.com/hfknight',
        'https://www.linkedin.com/in/feihu/',
        'https://x.com/Parn_Fe',
      ],
    },
  },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const asset = await env.ASSETS.fetch(request);
  return stampMeta(asset, README_META, 'https://fei.io/readme');
};
