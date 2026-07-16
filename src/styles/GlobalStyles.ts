import { createGlobalStyle } from 'styled-components';

/**
 * Paper grain — a full-strength fractal-noise tile, distinct from the landing's `--frost-noise`
 * (which is deliberately faint at 0.42 alpha for a translucent veil). Used in exactly one place
 * below, so it lives here rather than as a token. Final amplitude is set by the layer's blend
 * and opacity: overlay at 0.65 lands around sd 1.6 of luminance — clearly grained on the flat
 * paper, imperceptible on text. (soft-light stays truer to the base colour but caps near sd 1.2,
 * too faint to read; overlay is a touch brighter but the only mode that shows.)
 */
const PAPER_GRAIN =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='p'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.6' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23p)'/%3E%3C/svg%3E\")";

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
    overflow-x: hidden;
  }

  body {
    font-family: var(--font-body);
    font-size: 1rem;
    line-height: 1.6;
    color: var(--color-ink);
    background-color: var(--color-surface);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /*
   * Paper grain. The light pages paint an opaque surface, so rather than thread a texture
   * through six page components, a single fixed layer sits over the viewport — the same
   * --frost-noise the landing's frost wears, blended soft-light so it only nudges the
   * luminance a percent or two. pointer-events:none and it is imperceptible on text (a high-
   * contrast glyph swamps a 1% wobble), so it reads as grain on the flat paper and nowhere else.
   *
   * Scoped to the light surface: the deep pages and the landing keep their own treatments, and
   * data-surface="default" is exactly the set of routes that show this paper.
   *
   * The layer exists on BOTH surfaces and only its opacity is scoped, crossfaded over the
   * curtain sweep's 0.75s: Layout flips data-surface eagerly on navigation (the sweep's
   * paint depends on it), so a grain gated by the attribute alone pops in over the still-
   * visible exiting page — most visibly over the landing, which wears no grain of its own.
   * Ramped across the sweep, it reaches full strength as the curtain reaches full cover.
   */
  body::after {
    content: '';
    position: fixed;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background-image: ${PAPER_GRAIN};
    mix-blend-mode: overlay;
    opacity: 0;
    transition: opacity 0.75s ease;
  }

  :root[data-surface='default'] body::after {
    opacity: 0.65;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
  }
`;
