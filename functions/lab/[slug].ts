import type { Env } from '../lib/env';

/* GET /lab/:slug — the SPA's HTML with the route's own <title> and meta stamped in.
 *
 * The client already sets document.title per route (src/hooks/usePageTitle.ts), and Google
 * renders JS — but link unfurlers (Slack, X) and slower crawlers read only the static HTML,
 * which carries the site-wide head. This function fetches that same static HTML from ASSETS
 * (Pages' SPA fallback serves index.html for any /lab/* path) and rewrites the head tags at
 * the edge for routes listed here, so the shared preview matches what the page actually is.
 *
 * Routes not in the map — and non-HTML responses — pass through untouched.
 */

interface RouteMeta {
  title: string;
  description: string;
}

const LAB_META: Record<string, RouteMeta> = {
  'pick-a-font': {
    title: 'Find your font pairing by feel — a free font picker · Fei Hu',
    description:
      'Pick what a font is for, drag four sliders — serious to playful, timeless to ' +
      'current, quiet to loud, precise to warm — and get the closest free webfonts with ' +
      'hand-curated pairings, from Google Fonts, Fontshare, and independent foundries.',
  },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const asset = await env.ASSETS.fetch(request);

  const slug = typeof params.slug === 'string' ? params.slug : '';
  const meta = LAB_META[slug];
  if (!meta || !asset.headers.get('content-type')?.includes('text/html')) return asset;

  const canonical = `https://fei.io/lab/${slug}`;
  const setContent = (value: string) => ({
    element(el: Element) {
      el.setAttribute('content', value);
    },
  });

  return new HTMLRewriter()
    .on('title', {
      element(el) {
        el.setInnerContent(meta.title);
      },
    })
    .on('link[rel="canonical"]', {
      element(el) {
        el.setAttribute('href', canonical);
      },
    })
    .on('meta[name="description"]', setContent(meta.description))
    .on('meta[property="og:title"]', setContent(meta.title))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('meta[property="og:url"]', setContent(canonical))
    .on('meta[name="twitter:title"]', setContent(meta.title))
    .on('meta[name="twitter:description"]', setContent(meta.description))
    .transform(asset);
};
