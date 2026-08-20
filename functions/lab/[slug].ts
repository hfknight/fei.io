import type { Env } from '../lib/env';
import type { PageMeta } from '../lib/stampMeta';
import { stampMeta } from '../lib/stampMeta';

/* GET /lab/:slug — the SPA's HTML with the route's own <title> and meta stamped in at the
 * edge (see lib/stampMeta.ts for why). One map entry per route that wants its own face;
 * unlisted slugs pass through with the site-wide head. Keep each entry's title in step
 * with the usePageTitle call in its component.
 *
 * Each entry also carries the schema.org type that actually describes it, which is not one
 * type for the whole lab: two of these are tools someone uses, one is a gallery, and three are
 * write-ups about how something was built. `datePublished` mirrors the entry's date in
 * src/data/labEntries.ts — the two lists cannot import each other (that one holds React lazy
 * imports), so they are kept in step by hand. */

const AUTHOR = { '@type': 'Person', name: 'Fei Hu', url: 'https://fei.io' };
const FREE = {
  isAccessibleForFree: true,
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
};

const LAB_META: Record<string, PageMeta> = {
  dither: {
    /* Kept near 155 characters: a search result truncates around there, and the sentence that
       survives should still carry what the tool does and that nothing is uploaded. */
    title: 'Dither — a halftone, dots, ascii, and lattice image tool · Fei Hu',
    description:
      'Turn a photo into halftone, dots, ascii, or lattice marks, tune every control, and ' +
      'download the full-resolution PNG. Runs in your browser; nothing is uploaded.',
    jsonLd: {
      '@type': 'WebApplication',
      name: 'Dither',
      applicationCategory: 'MultimediaApplication',
      operatingSystem: 'Any modern browser',
      browserRequirements: 'Requires JavaScript and canvas support',
      featureList: [
        'Halftone screen with adjustable cell size, angle, and contrast',
        'Lit dot beads',
        'ASCII characters with selectable ramps',
        'Lattice mesh',
        'Duotone ink and paper with presets',
        'Optional photo layer with blend modes',
        'Full-resolution PNG export',
      ],
      author: AUTHOR,
      ...FREE,
    },
  },
  prompted: {
    title: 'everything here was prompted — an AI gallery · Fei Hu',
    description:
      'A gallery of AI-generated images and video, each published with its full verbatim prompt.',
    jsonLd: {
      '@type': 'ImageGallery',
      name: 'everything here was prompted',
      author: AUTHOR,
    },
  },
  'pick-a-font': {
    title: 'Find your font pairing by feel — a free font picker · Fei Hu',
    description:
      'Pick what a font is for, drag four sliders — serious to playful, timeless to ' +
      'current, quiet to loud, precise to warm — and get the closest free webfonts with ' +
      'hand-curated pairings, from Google Fonts, Fontshare, and independent foundries.',
    jsonLd: {
      '@type': 'WebApplication',
      name: 'Pick a font',
      applicationCategory: 'DesignApplication',
      operatingSystem: 'Any modern browser',
      featureList: [
        'Four feel sliders: serious to playful, timeless to current, quiet to loud, precise to warm',
        'Matches free webfonts from Google Fonts, Fontshare, and independent foundries',
        'Hand-curated pairings',
      ],
      author: AUTHOR,
      ...FREE,
    },
  },
  'text-into-picture': {
    title: 'Turn text into a picture — an ASCII halftone scroll effect in React · Fei Hu',
    description:
      'A scroll effect that condenses a page of prose into an ASCII-halftone image — same ' +
      'words, every character reshaded. Why cloning the page beats drawing a grid, and how ' +
      'much picture a page of text can hold.',
    jsonLd: {
      '@type': 'TechArticle',
      headline: 'Turning a page of text into a picture',
      datePublished: '2026-08-10',
      author: AUTHOR,
    },
  },
  'cursor-tracked-video': {
    title: 'Scrub video with the cursor — mouse-driven video playback in React · Fei Hu',
    description:
      'Cursor position drives the video’s playhead — two scroll panes, one light, one ' +
      'dark. Frame-accurate scrubbing, the buffering strategy behind it, and the tuning ' +
      'that makes it feel physical.',
    jsonLd: {
      '@type': 'TechArticle',
      headline: 'Scrubbing video with the cursor',
      datePublished: '2026-08-07',
      author: AUTHOR,
    },
  },
  'interfaces-that-feel-better': {
    title: 'Micro-interaction best practices — details that make interfaces feel better · Fei Hu',
    description:
      'A reference of micro-interaction patterns with live demos: timing, easing, hover, ' +
      'focus, loading — the small mechanics that make an interface feel considered rather ' +
      'than assembled.',
    jsonLd: {
      '@type': 'TechArticle',
      headline: 'Best practices that make interfaces feel better',
      datePublished: '2026-06-26',
      author: AUTHOR,
    },
  },
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env, params }) => {
  const asset = await env.ASSETS.fetch(request);
  const slug = typeof params.slug === 'string' ? params.slug : '';
  const meta = LAB_META[slug];
  if (!meta) return asset;
  return stampMeta(asset, meta, `https://fei.io/lab/${slug}`);
};
