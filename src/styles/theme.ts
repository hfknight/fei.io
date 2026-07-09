/**
 * Typed accessor over the CSS custom properties emitted by tokens.css.ts.
 *
 * Every value is a `var(--x)` string, so components keep authoring
 * `${p => p.theme.color.ink}` and the value resolves per surface at paint time.
 *
 * breakpoints are the exception: they are literal strings because CSS custom
 * properties are not permitted inside @media queries.
 */
export const theme = {
  color: {
    surface: 'var(--color-surface)',
    ink: 'var(--color-ink)',
    inkMuted: 'var(--color-ink-muted)',
    border: 'var(--color-border)',
  },
  chrome: {
    ink: 'var(--chrome-ink)',
    inkMuted: 'var(--chrome-ink-muted)',
  },
  glass: {
    tint: 'var(--glass-tint)',
    top: 'var(--glass-top)',
    bot: 'var(--glass-bot)',
    hi: 'var(--glass-hi)',
    rim: 'var(--glass-rim)',
    sheen: 'var(--glass-sheen)',
    blur: 'var(--glass-blur)',
    shadow: 'var(--glass-shadow)',
  },
  font: {
    display: 'var(--font-display)',
    body: 'var(--font-body)',
    mono: 'var(--font-mono)',
  },
  radius: { pill: 'var(--radius-pill)' },
  space: { 1: 'var(--space-1)', 2: 'var(--space-2)', 3: 'var(--space-3)' },
  barHeight: 'var(--bar-height)',
  ease: { expo: 'var(--ease-expo)', glass: 'var(--ease-glass)' },
  accent: { logo: 'var(--accent-logo)' },
  breakpoints: { sm: '640px', md: '768px', lg: '1024px', xl: '1280px' },
} as const;

export type Theme = typeof theme;
