import type { Env } from './lib/env';
import type { PageMeta } from './lib/stampMeta';
import { stampMeta } from './lib/stampMeta';
import { ALL_PROJECTS } from '../src/data/projects';

/* GET /readme — without this the route serves index.html's head verbatim, whose canonical
 * and og:url both name https://fei.io, so crawlers fold /readme into the home page as a
 * duplicate. Keep the title in step with About.tsx's usePageTitle call.
 *
 * A ProfilePage rather than a second Person: the site-wide head already carries the Person,
 * and stampMeta appends rather than replaces. The Person here shares that one's @id, so the
 * two read as one entity, not two people with conflicting urls.
 *
 * The page's project list is declared here too, as an ItemList read from the same data the
 * page renders (src/data/projects.ts). The links on the page are in the DOM at rest, but a
 * list in the head says what they are, each under the schema.org type that describes it. */

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
    hasPart: [
      {
        '@type': 'ItemList',
        name: 'Selected side projects',
        itemListElement: ALL_PROJECTS.filter(p => p.url).map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          item: {
            '@type': p.schemaType,
            name: p.name,
            url: p.url,
            description: p.blurb,
            creator: { '@id': 'https://fei.io/#person' },
          },
        })),
      },
    ],
  },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const asset = await env.ASSETS.fetch(request);
  return stampMeta(asset, README_META, 'https://fei.io/readme');
};
