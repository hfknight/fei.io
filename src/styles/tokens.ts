/**
 * Single source of truth for the design system.
 *
 * Values are lifted from the landing page implementation, not invented. The neutral
 * ramp is oklch at hue 265 with chroma rising as lightness falls, exactly as the
 * landing authored it.
 *
 * Consumed by tokens.css.ts (emits CSS) and theme.ts (typed var() accessor).
 * This module must stay free of React and styled-components so it can be unit tested.
 */

/** The design source's `pillHover` prop. 0 = bare rim, 1 = frosted slab. */
export const GLASS_K = 0.2;

/**
 * The dark surface every page uses today. Exact oklch conversion of the legacy #12102a
 * (verified: round-trips to [18,16,42]). Off the 265-hue ramp on purpose — folding it on
 * is a page-migration decision.
 */
export const SURFACE_DEEP = 'oklch(0.192 0.051 284)';

/** Pure white / pure black, exact. */
const WHITE = 'oklch(1 0 0)';

/** The light-surface glass tint. Identical to --n-11, inlined: CSS cannot nest var() inside oklch(). */
const INK_L = '0.30 0.008 265';

const RAMP = {
  '--n-0': 'oklch(0.99 0.002 265)',
  '--n-1': 'oklch(0.96 0.004 265)',
  '--n-2': 'oklch(0.94 0.004 265)',
  '--n-3': 'oklch(0.92 0.004 265)',
  '--n-4': 'oklch(0.88 0.004 265)',
  '--n-5': 'oklch(0.80 0.006 265)',
  '--n-6': 'oklch(0.70 0.006 265)',
  '--n-7': 'oklch(0.60 0.008 265)',
  '--n-8': 'oklch(0.55 0.008 265)',
  '--n-9': 'oklch(0.45 0.008 265)',
  '--n-10': 'oklch(0.40 0.009 265)',
  '--n-11': 'oklch(0.30 0.008 265)',
  '--n-12': 'oklch(0.26 0.010 265)',
};

/** Port of the design source's applyPill(), including its rounding. */
export const GLASS = {
  top: +(0.08 + 0.34 * GLASS_K).toFixed(3),
  bot: +(0.02 + 0.11 * GLASS_K).toFixed(3),
  blur: +(3 + 13 * GLASS_K).toFixed(1),
  hi: +(0.22 + 0.42 * GLASS_K).toFixed(3),
  rim: +(0.06 + 0.18 * GLASS_K).toFixed(3),
  shadow: +(0.06 + 0.2 * GLASS_K).toFixed(3),
};

/** The -1px inset sheen has no variable in the design source; its alpha is fixed. */
const GLASS_SHEEN_ALPHA = 0.14;

const white = (a: number) => `oklch(1 0 0 / ${a})`;
const ink = (a: number) => `oklch(${INK_L} / ${a})`;

/**
 * Glass has two tints, not one.
 *
 * `fill` (the gradient and the rim) follows the surface — white over video, ink over paper.
 * `specular` (the top highlight and the bottom sheen) is *always* white, because those layers
 * model reflected light, not pigment. Tinting them with ink turns a highlight into a hard dark
 * line: on the light surface, `hi` at alpha .304 composites to rgb(187,189,190) over a
 * rgb(251,252,253) ground, which reads as a pressed inset rather than glass.
 *
 * On the inverted surface both tints are white, so this reduces to the original single-tint
 * recipe and the dark theme is byte-for-byte unchanged.
 */
const glassVars = (fill: (a: number) => string, specular: (a: number) => string) => ({
  '--glass-top': fill(GLASS.top),
  '--glass-bot': fill(GLASS.bot),
  '--glass-rim': fill(GLASS.rim),
  '--glass-hi': specular(GLASS.hi),
  '--glass-sheen': specular(GLASS_SHEEN_ALPHA),
});

/**
 * The frost skin's blur. Distinct from `--glass-blur` (5.6px, derived from GLASS_K): frost is
 * a thicker, textured material, not a thin pill. Consumed by the landing's inactive-half
 * overlay and by the chrome's nav track, so the two read as the same glass.
 */
export const FROST_BLUR = 11;

/**
 * Monochrome micro-texture, blended `soft-light` under the frost gradient. Real frosted glass
 * has grain; without it the blur reads as a plain translucent panel. Authored as an inline SVG
 * so it costs no request.
 *
 * Named `--frost-*`, not `--glass-*`, on purpose. It is not part of the pill's glass recipe,
 * and the glass family is asserted exhaustively so no bare tint can rejoin it. It is also a
 * texture rather than a colour, so the "every colour is oklch" guard skips it.
 */
export const FROST_NOISE =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E\")";

/** Surface-independent. Emitted once, in :root. */
export const staticVars: Record<string, string> = {
  ...RAMP,
  '--frost-noise': FROST_NOISE,
  '--frost-blur': `${FROST_BLUR}px`,
  '--font-display': "'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif",
  '--font-body': "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
  '--font-mono': "'JetBrains Mono','Fira Code',monospace",
  '--radius-pill': '7px',
  '--space-1': '8px',
  '--space-2': '15px',
  '--space-3': '2rem',
  '--bar-height': '60px',
  '--ease-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
  '--ease-glass': 'cubic-bezier(0.22, 1, 0.36, 1)',
  '--glass-blur': `${GLASS.blur}px`,
  '--glass-shadow': `oklch(0 0 0 / ${GLASS.shadow})`,
};

/** :root — the light theme. Authored now, consumed once pages migrate. */
export const lightVars: Record<string, string> = {
  // Drives the `color-scheme` property, so the UA themes native controls (the admin's
  // <select> popups) and scrollbars to match the surface. Not a colour: deliberately
  // named outside the `--color-*` family so the "all colours are oklch" guard skips it.
  '--ui-scheme': 'light',
  // Near-neutral grey paper (#e2e2e1), a bespoke off-ramp value at hue 106 but chroma so low
  // (0.0013) it reads neutral. A hair darker than the old --n-3, and given a faint grain overlay
  // in GlobalStyles — the same --frost-noise the landing wears. Every value below is tuned
  // against this ground's *lightness*: moving that moves them all. See docs/adr/0001.
  '--color-surface': 'oklch(0.913 0.0013 106.4)',
  '--color-ink': 'var(--n-11)',
  '--color-ink-muted': 'var(--n-9)',
  // n-4 measured 1.39:1 against the near-white surface this theme was first authored on. On the
  // 0.92 surface it falls to 1.13:1 — fainter than the inverted surface's own border — and
  // hairlines vanish. n-5 restores the separation at 1.44:1. Decorative, so no test asserts it.
  '--color-border': 'var(--n-5)',
  '--chrome-ink': 'var(--n-11)',
  // n-8 was picked for near-white paper and gives only 3.83:1 here. n-9 gives 5.87:1, which
  // makes this identical to --color-ink-muted — exactly as the inverted surface already has it.
  '--chrome-ink-muted': 'var(--n-9)',
  // The accent is warm on purpose: hue 92 sits 173° from the ramp's 265, i.e. near its
  // complement. It cannot be one value across surfaces — a yellow light enough to read on
  // #12102a (12.85:1) drops to 1.14:1 on the light surface, and no lightness clears AA on both.
  // Here it is darkened to 4.63:1 on the light surface, which at this hue necessarily reads olive-bronze
  // rather than butter: a yellow dark enough to be legible on grey paper is not yellow any
  // more. This is the link colour on every light page.
  '--accent': 'oklch(0.50 0.111 92)',
  // white on that accent measures 6.00:1
  '--accent-ink': 'oklch(1 0 0)',
  // The MARK — the warm highlight, currently the /lab index's link hover.
  //
  // Its origin is /readme's Aesthetic clause, whose shimmer band is #f04d22/#f15b24,
  // sampled from the portrait's own vivid strip so the colour reads as the page's rather
  // than an import. The raw orange cannot be reused directly: it measures 2.80:1 on this
  // surface and 3.75:1 on --n-11, failing AA as text on both. Hue and chroma are kept and
  // lightness moved per surface, the same bargain --accent already makes above. Darkened
  // here to 4.55:1, which at this hue necessarily reads rust rather than hot orange.
  //
  // Distinct from --accent on purpose: the yellow is the system's link colour, this is a
  // warmer mark borrowed from the portrait. Do not collapse them.
  '--color-mark': 'oklch(0.525 0.19 35)',
  ...glassVars(ink, white),
};

/** [data-surface="inverted"] — the dark theme. These are the values the site renders today. */
export const invertedVars: Record<string, string> = {
  '--ui-scheme': 'dark',
  '--color-surface': SURFACE_DEEP,
  '--color-ink': WHITE,
  '--color-ink-muted': white(0.5),
  '--color-border': white(0.08),
  '--chrome-ink': WHITE,
  // Bumped from the footer's 0.45 (4.49:1, fails AA) to 0.5 (5.28:1).
  '--chrome-ink-muted': white(0.5),
  // Exact conversion of the legacy #fcd34d — the yellow every dark page already renders for
  // links, code highlights and button fills. 12.85:1 on the deep surface. Needs 4 decimals
  // of chroma to round-trip to [252,211,77]; 3 gives #fcd34e.
  '--accent': 'oklch(0.879 0.1534 91.61)',
  // dark ink on the yellow fill, as the admin buttons already do — 12.85:1
  '--accent-ink': SURFACE_DEEP,
  // The mark on the deep side. Lifted rather than darkened, and tuned against --n-11
  // (4.69:1) rather than the deep surface (6.39:1): --n-11 is the lighter of the two dark
  // grounds, so it binds. Lands within a few points of the source #f04d22, which the
  // light side cannot manage. Declared for both surfaces even though today's only use is
  // a light page — a token that exists on one surface is a trap for the next caller.
  '--color-mark': 'oklch(0.70 0.19 35)',
  // fill === specular === white here, so this is the original single-tint recipe, unchanged.
  ...glassVars(white, white),
};
