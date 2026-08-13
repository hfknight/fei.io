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
export const promptedItems: PromptedItem[] = [];

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
