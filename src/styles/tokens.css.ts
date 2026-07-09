import { createGlobalStyle } from 'styled-components';
import { staticVars, lightVars, invertedVars } from './tokens';

const declare = (vars: Record<string, string>) =>
  Object.entries(vars)
    .map(([name, value]) => `${name}: ${value};`)
    .join('\n    ');

/**
 * `:root` is light. `[data-surface="inverted"]` is dark.
 *
 * Both selectors have specificity (0,1,0), so the later block wins when the attribute
 * is present. Removing the attribute (or setting it to anything but "inverted") falls
 * back to light — no `[data-surface="default"]` block is needed.
 */
export const TokenStyles = createGlobalStyle`
  :root {
    ${declare(staticVars)}
    ${declare(lightVars)}
  }

  [data-surface='inverted'] {
    ${declare(invertedVars)}
  }
`;
