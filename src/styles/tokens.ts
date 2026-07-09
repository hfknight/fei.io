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

/** Surface-independent. Emitted once, in :root. */
export const staticVars: Record<string, string> = {
  ...RAMP,
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
  // exact conversion of the legacy #fdd75e
  '--accent-logo': 'oklch(0.889 0.144 91.7)',
  '--glass-blur': `${GLASS.blur}px`,
  '--glass-shadow': `oklch(0 0 0 / ${GLASS.shadow})`,
};

/** :root — the light theme. Authored now, consumed once pages migrate. */
export const lightVars: Record<string, string> = {
  // Drives the `color-scheme` property, so the UA themes native controls (the admin's
  // <select> popups) and scrollbars to match the surface. Not a colour: deliberately
  // named outside the `--color-*` family so the "all colours are oklch" guard skips it.
  '--ui-scheme': 'light',
  '--color-surface': 'var(--n-0)',
  '--color-ink': 'var(--n-11)',
  '--color-ink-muted': 'var(--n-9)',
  '--color-border': 'var(--n-4)',
  '--chrome-ink': 'var(--n-11)',
  '--chrome-ink-muted': 'var(--n-8)',
  '--glass-tint': 'var(--n-11)',
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
  '--glass-tint': WHITE,
  // fill === specular === white here, so this is the original single-tint recipe, unchanged.
  ...glassVars(white, white),
};
