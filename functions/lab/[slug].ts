import type { Env } from '../lib/env';
import type { PageMeta } from '../lib/stampMeta';
import { stampMeta } from '../lib/stampMeta';

/* GET /lab/:slug — the SPA's HTML with the route's own <title> and meta stamped in at the
 * edge (see lib/stampMeta.ts for why). One map entry per route that wants its own face;
 * unlisted slugs pass through with the site-wide head. Keep each entry's title in step
 * with the usePageTitle call in its component. */

const LAB_META: Record<string, PageMeta> = {
  prompted: {
    title: 'everything here was prompted — an AI gallery · Fei Hu',
    description:
      'A gallery of AI-generated images and video, each published with its full verbatim prompt.',
  },
  'pick-a-font': {
    title: 'Find your font pairing by feel — a free font picker · Fei Hu',
    description:
      'Pick what a font is for, drag four sliders — serious to playful, timeless to ' +
      'current, quiet to loud, precise to warm — and get the closest free webfonts with ' +
      'hand-curated pairings, from Google Fonts, Fontshare, and independent foundries.',
  },
  'text-into-picture': {
    title: 'Turn text into a picture — an ASCII halftone scroll effect in React · Fei Hu',
    description:
      'A scroll effect that condenses a page of prose into an ASCII-halftone image — same ' +
      'words, every character reshaded. Why cloning the page beats drawing a grid, and how ' +
      'much picture a page of text can hold.',
  },
  'cursor-tracked-video': {
    title: 'Scrub video with the cursor — mouse-driven video playback in React · Fei Hu',
    description:
      'Cursor position drives the video’s playhead — two scroll panes, one light, one ' +
      'dark. Frame-accurate scrubbing, the buffering strategy behind it, and the tuning ' +
      'that makes it feel physical.',
  },
  'interfaces-that-feel-better': {
    title: 'Micro-interaction best practices — details that make interfaces feel better · Fei Hu',
    description:
      'A reference of micro-interaction patterns with live demos: timing, easing, hover, ' +
      'focus, loading — the small mechanics that make an interface feel considered rather ' +
      'than assembled.',
  },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const asset = await env.ASSETS.fetch(request);
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const meta = LAB_META[slug];
  if (!meta) return asset;
  return stampMeta(asset, meta, `https://fei.io/lab/${slug}`);
};
