import { lightVars, invertedVars } from './tokens';

/**
 * Route → surface, and route → the colour the page actually paints behind itself.
 *
 * These used to live in Layout, which was the only consumer. PageTransition needs them
 * too: its curtain is painted in the DESTINATION's colours, and it can only do that
 * without waiting for <html> to flip if it can resolve the destination itself.
 */

/**
 * Routes migrated to the light theme. The landing is never added — its chrome sits over
 * video, not paper. `/changelog` is retired and keeps its own neon palette.
 *
 * Post slugs live in D1 and are fetched at runtime, so `/writing/:slug` cannot be
 * enumerated here — hence the prefix. Lab entries are bespoke and stay dark.
 */
const LIGHT_EXACT = new Set(['/readme', '/lab', '/writing']);
const LIGHT_PREFIXES = ['/writing/'];

/**
 * Consulted first, and the ordering is load-bearing: `/writing/admin` is itself matched by
 * the `/writing/` prefix, so without this it would resolve to light.
 */
const DARK_PREFIXES = ['/writing/admin', '/lab/'];

/**
 * Exact paths that win over DARK_PREFIXES — the deny-then-allow order above has one
 * exception ahead of it, and this is the list.
 *
 * `/lab/cursor-tracked-video` is a lab entry, so `/lab/` would make it inverted, but it
 * OPENS on a light video pane. Its dark parts (Ollie's pane, the closing article) hardcode
 * their own grounds, and its nav wears a plate with pinned ink rather than relying on
 * --chrome-ink, so nothing there depends on the route being inverted.
 *
 * `/lab/text-into-picture` is light for a reason its own subject supplies: the effect it
 * documents is dark type on paper, and the inverted version of it was tried on /readme and
 * dropped — a dark panel in a light page reads as a foreign card dropped onto it. The entry
 * would be arguing with its own demo.
 *
 * `/lab/pick-a-font` is light because paper is the native habitat for evaluating type:
 * the page exists to judge letterforms, and subtle serif detail reads truest as dark ink
 * on a light ground.
 */
const LIGHT_OVERRIDE = new Set([
  '/lab/cursor-tracked-video',
  '/lab/text-into-picture',
  '/lab/pick-a-font',
]);

/**
 * Falls through to `inverted`, never to `default`. An unmigrated page still hardcodes
 * #12102a, so a route that matches nothing must land on dark or it paints dark ink on a
 * dark ground.
 */
export const surfaceFor = (pathname: string): 'default' | 'inverted' => {
  if (LIGHT_OVERRIDE.has(pathname)) return 'default';
  if (DARK_PREFIXES.some(prefix => pathname.startsWith(prefix))) return 'inverted';
  if (LIGHT_EXACT.has(pathname)) return 'default';
  if (LIGHT_PREFIXES.some(prefix => pathname.startsWith(prefix))) return 'default';
  return 'inverted';
};

/**
 * The colour a route paints as its own background, which is NOT always its surface's
 * `--color-surface`.
 *
 * Lab entries deliberately ground themselves in `--n-11`, the neutral grey of the
 * landing's right plate, rather than the deep indigo the rest of the inverted surface
 * uses (see LabEntryRoute). That disagreement is what made entering one look like a
 * blackout: the body and the transition curtain painted `#12102a` while the page that
 * arrived was the lighter plate grey, with a blank Suspense gap in between.
 *
 * Both this and `inkFor` return SURFACE-SPECIFIC values, never a bare
 * `var(--color-surface)`. The whole point is to describe a route other than the one
 * <html> is currently wearing, and a surface-following token would resolve to the wrong
 * side of the transition. `var(--n-11)` is safe because the neutral ramp is static —
 * it does not vary by surface.
 */
/**
 * The writing pages' ground: the shared paper with ~4% of the light accent washed in,
 * sunlit like their hero's wall. Defined here, beside groundFor, because the curtain and
 * the pages must paint the SAME value for the hand-off to stay invisible — Writing and
 * WritingPost import it rather than re-mixing their own. Built from lightVars literals,
 * not surface-following tokens, for the same reason groundFor's values are.
 */
export const WRITING_GROUND = `color-mix(in srgb, ${lightVars['--color-surface']} 96%, ${lightVars['--accent']})`;

const isWritingLight = (pathname: string) =>
  pathname === '/writing' || pathname.startsWith('/writing/');

export const groundFor = (pathname: string): string => {
  if (surfaceFor(pathname) === 'default') {
    return isWritingLight(pathname) ? WRITING_GROUND : lightVars['--color-surface'];
  }
  return pathname.startsWith('/lab/') ? 'var(--n-11)' : invertedVars['--color-surface'];
};

/** The destination's ink, for the shade the curtain's leading edge carries. */
export const inkFor = (pathname: string): string =>
  surfaceFor(pathname) === 'default' ? lightVars['--color-ink'] : invertedVars['--color-ink'];
