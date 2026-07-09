import type { ReactElement } from 'react';
import { render as rtlRender, type RenderOptions } from '@testing-library/react';
import { ThemeProvider } from 'styled-components';
import { theme } from '../styles/theme';

/**
 * React Testing Library's custom-render pattern.
 *
 * Any component that authors `${p => p.theme.color.ink}` throws without a ThemeProvider
 * above it, so tests that render page bodies or blog templates must supply one. Re-export
 * this as `render` and the call sites stay unchanged.
 *
 * The theme only hands out `var(--x)` strings, so nothing here resolves to a real colour —
 * jsdom never paints. Contrast is asserted against the token values directly, in
 * tokens.test.ts.
 */
export const render = (ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) =>
  rtlRender(ui, { wrapper: ({ children }) => <ThemeProvider theme={theme}>{children}</ThemeProvider>, ...options });
