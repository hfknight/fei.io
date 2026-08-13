// Pure data module for /lab/prompted — no React. The gallery imports promptedByDate()
// for display order and thumbUrl() for grid/lightbox thumbnails; the page itself carries
// no data of its own so new pieces are added here, not in the component.

export type PromptedItem = {
  id: string; // stable unique id, used as React key and for prev/next
  title?: string; // optional display title
  prompt: string; // the full verbatim prompt
  model: string; // e.g. 'Midjourney v7'
  date: string; // YYYY-MM-DD
} & (
  | { type: 'image'; src: string } // full-size webp URL
  | { type: 'video'; webm: string; mp4: string; poster: string } // poster doubles as grid thumb
);

/**
 * The shelf. Empty for now — curated by hand as pieces are picked, not generated or
 * scraped. Two examples below (never rendered; promptedItems stays []) show the shape
 * each media type takes.
 *
 * const examples: PromptedItem[] = [
 *   {
 *     id: 'foxfire-lantern',
 *     title: 'foxfire lantern',
 *     prompt: 'a paper lantern shaped like a fox, lit from within, floating over a still lake at night, ink wash style',
 *     model: 'Midjourney v7',
 *     date: '2026-08-01',
 *     type: 'image',
 *     src: 'https://media.fei.io/lab/prompted/foxfire-lantern.webp',
 *   },
 *   {
 *     id: 'tide-clock',
 *     title: 'tide clock',
 *     prompt: 'a brass clock whose hands are made of slow-moving water, macro shot, studio lighting',
 *     model: 'Runway Gen-4',
 *     date: '2026-08-05',
 *     type: 'video',
 *     webm: 'https://media.fei.io/lab/prompted/tide-clock.webm',
 *     mp4: 'https://media.fei.io/lab/prompted/tide-clock.mp4',
 *     poster: 'https://media.fei.io/lab/prompted/tide-clock-poster.webp',
 *   },
 * ];
 */
export const promptedItems: PromptedItem[] = [
  {
    id: 'fwc26-dallas',
    title: 'dallas in six letters',
    prompt: `Create an ultra-high-resolution typography-based FIFA World cup 2026 poster design themed around Dallas.

Aspect ratio: (16:9 poster)

IMPORTANT:

All visible text inside the poster must be in English only.

Typography must be perfectly spelled and professionally typeset.

Absolutely no distorted letters, random symbols, broken text, or AI-generated gibberish.

Aspect ratio: 16:9 poster

CORE COMPOSITION:

Place the giant English word “Dallas” prominently in the center of the composition

Each individual letter should contain a different illustrated scene related to world cup from the city

Letters should be tall, elongated, bold sans-serif forms

The typography itself should feel like a series of “city gallery windows”

Distribute landmarks, streets, transportation, nature, culture, and architecture naturally across the letters

Scenes should visually flow from one letter into another like one connected urban panorama

TOP HORIZONTAL STRIP:
At the top of the poster, include a thin panoramic horizontal strip containing:

city skyline silhouettes
Soccer
cars
trams or trains
boats if relevant
birds
clouds
sun

All elements should appear minimalist, elegant, and rhythmically balanced.

STYLE:
modern sport editorial poster,
Swiss graphic design,
minimal vector illustration,
architectural infographic aesthetic,
travel typography poster,
flat geometric illustration,
ultra clean composition,
premium magazine design,
screen print poster feeling,
retro-futuristic travel branding

ILLUSTRATION STYLE:

flat vector shapes only

no realism

no gradients

no texture noise

clean geometric shadows

simplified architectural forms

map-like top-down illustration mixed with side-view cityscape

subtle line-art details

perfectly clean vector edges

strong negative space usage

harmonious visual rhythm between letters

TYPOGRAPHY:

giant bold sans-serif typography

letters occupy most of the canvas height

ultra precise alignment

each letter acts as an independent framed illustration panel

smooth rounded corners where appropriate

editorial spacing

highly balanced composition

typography must look professionally designed, print-ready, and geometrically perfect

COLOR PALETTE:
Automatically derive a cohesive palette inspired by Dallas.

Examples:

coastal city → aqua, sand, coral, muted teal

desert city → terracotta, beige, warm cream

cyber city → mint, navy, steel blue

historic European city → dusty rose, olive green, parchment

Use:

muted pastel tones

soft vintage travel poster colors

elegant low-saturation combinations

maximum 4–6 colors only

CONTENT GENERATION:
Automatically include:

Stadium that hosts world cup matches

iconic landmarks of Dallas

famous streets and transportation

local urban patterns

nearby nature elements

skyline silhouettes

bridges, rivers, or coastline if relevant

culturally symbolic architecture

recognizable local atmosphere

COMPOSITION:

centered typography composition

white or soft ivory background

lots of breathing room

top panoramic strip balances the heavy typography below

asymmetrical but visually balanced layout

each letter contains different scene depth and perspective

premium poster hierarchy with museum-quality layout

MOOD:
premium,
intellectual,
Energetic,
design-forward,
travel editorial aesthetic,
stylish enough for a stadium gift shop poster

QUALITY:
8K ultra detailed,
print-ready,
extremely sharp vector edges,
perfect typography rendering,
clean professional graphic design,
high-end editorial poster quality,
no distorted text,
no random characters,
no spelling errors,
no AI artifacts`,
    model: 'ChatGPT',
    date: '2026-05-16',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/fwc26-dallas.webp',
  },
  {
    id: 'folk-flat-illustration',
    title: 'folk flat illustration',
    prompt:
      'Please transform the entire image into a single Decorative Folk Flat Illustration ' +
      'with Doodle elements. Use a bold and playful color palette, completely different ' +
      'from the original image. Simplify all details into clean, flat shapes with a ' +
      'handmade, slightly imperfect feel, as if drawn on a sheet of white paper. The ' +
      'overall style should look cute, childlike, and whimsical',
    model: 'ChatGPT',
    date: '2026-06-18',
    type: 'image',
    src: 'https://media.fei.io/lab/prompted/folk-flat-illustration.webp',
  },
];

/** Newest-first. Pure so it's unit-testable with fixtures; does not mutate the input. */
export function sortNewestFirst(items: PromptedItem[]): PromptedItem[] {
  return [...items].sort((a, b) => b.date.localeCompare(a.date));
}

export const promptedByDate = (): PromptedItem[] => sortNewestFirst(promptedItems);

/**
 * Cloudflare Image Transformations, inserted into a media.fei.io URL:
 * https://media.fei.io/foo/bar.webp -> https://media.fei.io/cdn-cgi/image/width=640,quality=80,format=auto/foo/bar.webp
 * Falls back to the source URL unchanged if it isn't parseable.
 */
export function thumbUrl(src: string, width = 640): string {
  try {
    const url = new URL(src);
    url.pathname = `/cdn-cgi/image/width=${width},quality=80,format=auto${url.pathname}`;
    return url.toString();
  } catch {
    return src;
  }
}
