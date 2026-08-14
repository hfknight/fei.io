# Design System Implementation Plan

> **Status: executed. Two of its token decisions were later corrected — do not copy the
> glass or `color-scheme` code below.** The plan's `glassVars` takes one tint and emits a
> `--glass-tint` token; shipped code takes two (fill follows the surface, specular is always
> white) and has no `--glass-tint`. The plan also deletes `color-scheme` without replacing
> it; shipped code adds a `--ui-scheme` token. `src/styles/tokens.ts` and `CLAUDE.md` are the
> live truth. See the "Superseded" note atop
> `docs/superpowers/specs/2026-07-09-design-system-design.md`, and commits `651662d`, `17fa1cc`.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the vestigial `theme.ts` with a design system lifted from the landing page — tokens as CSS custom properties generated from one TypeScript source, read through a typed accessor.

**Architecture:** `tokens.ts` is the single source of truth. `tokens.css.ts` emits it as `:root` (light) and `[data-surface="inverted"]` (dark) via `createGlobalStyle`. `theme.ts` becomes a typed accessor returning `var(--x)` strings, so components keep authoring `${p => p.theme.color.ink}`. `Layout` sets `data-surface` on `<html>` from the route; every route is bridged to `inverted` so the site renders unchanged.

**Tech Stack:** React 19, TypeScript (strict), styled-components 6, Vitest + React Testing Library (jsdom), Vite 6.

## Global Constraints

- **Spec:** `docs/superpowers/specs/2026-07-09-design-system-design.md` (committed at `347b99a`).
- **Every token colour is `oklch()`. No hex, no `rgb()`, no `rgba()` anywhere in `tokens.ts`.**
  Conversions were verified to round-trip exactly at 3 decimal places:

  | Was | Becomes | Renders |
  |---|---|---|
  | `#12102a` | `oklch(0.192 0.051 284)` | identical, `[18,16,42]` |
  | `#fdd75e` | `oklch(0.889 0.144 91.7)` | identical |
  | `#fff` | `oklch(1 0 0)` | identical, `#ffffff` |
  | `rgba(0,0,0,α)` | `oklch(0 0 0 / α)` | see below |
  | `rgba(255,255,255,α)` | `oklch(1 0 0 / α)` | see below |

- **Opaque colours are byte-identical; alpha-bearing colours shift by ≤1/255 per channel.**
  Measured in Chrome: `rgba(255,255,255,0.148)` over `#12102a` → `[53,51,73]`;
  `oklch(1 0 0 / 0.148)` → `[53,51,74]`. `rgba()` quantizes alpha to 8 bits
  (`38/255 = 0.14902`); `oklch()` keeps it a float. The oklch result is *more* accurate.
  This is the one accepted deviation from "nothing changes."
- **Otherwise no rendered pixel may change**, except: nav links stop turning amber on hover under a light OS theme; `Changelog` leaves the nav; the footer copyright brightens imperceptibly (`0.45` → `0.5`).
- **Breakpoints must stay literal strings.** CSS custom properties are illegal in `@media` queries. `theme.breakpoints` keeps returning `'640px'`, not `var(--bp-sm)`.
- **jsdom cannot resolve `var()` or parse `oklch()`.** Verified: `getComputedStyle(el).color` returns the literal string `"var(--x)"`. Therefore **no test may assert on rendered colors.** The drift guard tests the token module directly; the contrast test does `oklch → sRGB` math in TypeScript.
- **Chrome preserves oklch in `getComputedStyle`** — it serializes `oklch(1 0 0 / 0.148)` verbatim rather than converting to `rgba`. Browser assertions therefore compare exact strings, with no 8-bit tolerance.
- **No color library is installed.** The contrast test carries its own `oklch → sRGB` converter.
- **`--chrome-ink-muted` inverted is `oklch(1 0 0 / 0.5)`**, bumped from the footer's current `0.45`. Measured on the deep surface: `0.45` → `4.49:1` (fails AA), `0.5` → `5.28:1` (passes).
- After every task: `npx tsc -b && npm run lint && npm run test:run` must be clean.
- Never `git commit` without the user's sign-off. Each task's commit step is staged for the user to approve.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/styles/tokens.ts` | **New.** Primitive ramp, glass recipe, and the three var maps (`staticVars`, `lightVars`, `invertedVars`). No React, no styled-components. |
| `src/styles/tokens.test.ts` | **New.** Drift guard + contrast assertions. Pure functions, no DOM. |
| `src/styles/tokens.css.ts` | **New.** `createGlobalStyle` wrapping the maps. Nothing else. |
| `src/styles/theme.ts` | **Rewritten.** Typed `var()` accessor + literal breakpoints. |
| `src/styles/styled.d.ts` | Unchanged (still re-exports `Theme` from `theme.ts`). Verify only. |
| `src/styles/GlobalStyles.ts` | Body/reset read tokens. Dead `Container`/`Section`/`Button` deleted. |
| `src/styles/index.ts` | **No edit.** It uses `export * from './GlobalStyles'`, so the deleted symbols drop out automatically. Verified by grep in Task 4. |
| `src/components/Layout/Layout.tsx` | Sets `document.documentElement.dataset.surface` from the route. |
| `src/components/Layout/Layout.test.tsx` | **New.** Asserts the surface bridge. |
| `src/components/Layout/Header.tsx` | Chrome + glass tokens; `Changelog` nav item removed. |
| `src/components/Layout/Header.test.tsx` | Updated — its Changelog assertion breaks. |
| `src/components/Layout/Footer.tsx` | `--chrome-ink-muted`, `--font-mono`. |
| `src/components/Logo.tsx` | `#fdd75e` → `var(--accent-logo)`. |
| `src/App.tsx` | Renders `<TokenStyles />`. |
| `index.html` | `<html data-surface="inverted">` boot value. |
| `src/index.css` | Vite scaffold deleted. Day-journey `@import` and vars kept. |
| `CLAUDE.md` | Corrected. |

---

### Task 1: Token source

**Files:**
- Create: `src/styles/tokens.ts`
- Test: `src/styles/tokens.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `GLASS_K: number` (0.2)
  - `GLASS: { top: number; bot: number; blur: number; hi: number; rim: number; shadow: number }`
  - `staticVars: Record<string, string>` — ramp + type + space + radius + motion + accent + surface-independent glass
  - `lightVars: Record<string, string>` — semantic tokens for `:root`
  - `invertedVars: Record<string, string>` — semantic tokens for `[data-surface="inverted"]`
  - `SURFACE_DEEP: string` (`'oklch(0.192 0.051 284)'` — exact conversion of the legacy `#12102a`)

- [ ] **Step 1: Write the failing test**

Create `src/styles/tokens.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { staticVars, lightVars, invertedVars, GLASS, GLASS_K, SURFACE_DEEP } from './tokens';

// --- oklch -> sRGB -> relative luminance. No colour library is installed. ---
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** OKLCh -> sRGB channels in 0..255 (unrounded, to keep precision through compositing). */
function oklchToSrgb(L: number, C: number, hDeg: number): [number, number, number] {
  const h = (hDeg * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const linear = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const encode = (v: number) => {
    const c = clamp01(v);
    return (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055) * 255;
  };
  return [encode(linear[0]), encode(linear[1]), encode(linear[2])];
}

const srgbLin = (channel: number): number => {
  const v = channel / 255;
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const rgbY = ([r, g, b]: number[]) => 0.2126 * srgbLin(r) + 0.7152 * srgbLin(g) + 0.0722 * srgbLin(b);
const contrast = (y1: number, y2: number) => { const [hi, lo] = y1 > y2 ? [y1, y2] : [y2, y1]; return (hi + 0.05) / (lo + 0.05); };

/** Parse `oklch(L C H)` or `oklch(L C H / A)`, following `var(--x)` into staticVars. */
function parse(value: string): { rgb: [number, number, number]; alpha: number } {
  const v = value.match(/^var\((--[\w-]+)\)$/);
  if (v) return parse(staticVars[v[1]]);
  const m = value.match(/^oklch\(([\d.]+) ([\d.]+) ([\d.]+)(?: \/ ([\d.]+))?\)$/);
  if (!m) throw new Error(`not an oklch colour: ${value}`);
  return { rgb: oklchToSrgb(+m[1], +m[2], +m[3]), alpha: m[4] === undefined ? 1 : +m[4] };
}

/** Luminance of `value`, composited over `bg` when it carries alpha. Browsers blend in sRGB. */
function luminance(value: string, bg?: [number, number, number]): number {
  const { rgb, alpha } = parse(value);
  if (alpha === 1) return rgbY(rgb);
  if (!bg) throw new Error(`${value} has alpha and needs a background`);
  return rgbY([0, 1, 2].map((i) => alpha * rgb[i] + (1 - alpha) * bg[i]));
}

/** The landing's right plate, from SplitStage.tsx. #54565b / #33343a, exact. */
const PLATES = ['oklch(0.453 0.008 268.5)', 'oklch(0.326 0.011 278.3)'];

describe('tokens: no hex or rgb anywhere', () => {
  it('every token colour is oklch', () => {
    for (const map of [staticVars, lightVars, invertedVars]) {
      for (const [name, value] of Object.entries(map)) {
        if (!/^(--n-|--color|--chrome|--glass-(top|bot|hi|rim|sheen|shadow|tint)|--accent)/.test(name)) continue;
        expect(value, `${name} = ${value}`).not.toMatch(/#[0-9a-f]{3,8}|rgba?\(/i);
        expect(value, `${name} = ${value}`).toMatch(/^(oklch\(|var\(--n-)/);
      }
    }
  });
});

describe('tokens: drift guard', () => {
  it('inverted overrides only names that light defines', () => {
    for (const name of Object.keys(invertedVars)) {
      expect(lightVars, `${name} overrides a name light never defines`).toHaveProperty(name);
    }
  });

  it('light semantic values reference only vars that staticVars defines', () => {
    for (const [name, value] of Object.entries(lightVars)) {
      const m = value.match(/^var\((--[\w-]+)\)$/);
      if (m) expect(staticVars, `${name} -> ${m[1]} is not a primitive`).toHaveProperty(m[1]);
    }
  });

  it('derives the glass recipe from GLASS_K', () => {
    expect(GLASS_K).toBe(0.2);
    expect(GLASS).toEqual({ top: 0.148, bot: 0.042, blur: 5.6, hi: 0.304, rim: 0.096, shadow: 0.1 });
  });

  it('keeps the deep surface an exact conversion of the legacy #12102a', () => {
    const { rgb } = parse(SURFACE_DEEP);
    expect(rgb.map(Math.round)).toEqual([18, 16, 42]);
  });
});

describe('tokens: contrast', () => {
  it('light ink and muted ink clear AA on the light surface', () => {
    const bg = parse(lightVars['--color-surface']).rgb;
    const surface = rgbY(bg);
    expect(contrast(surface, luminance(lightVars['--color-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(lightVars['--color-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(lightVars['--chrome-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    // 4.72:1 — passes, but the tightest pair in the system.
    expect(contrast(surface, luminance(lightVars['--chrome-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('inverted ink and muted ink clear AA on the deep surface', () => {
    const bg = parse(SURFACE_DEEP).rgb;
    const surface = rgbY(bg);
    expect(contrast(surface, luminance(invertedVars['--color-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    expect(contrast(surface, luminance(invertedVars['--color-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
    // The 0.45 -> 0.5 bump. At 0.45 this is 4.49:1 and fails.
    expect(contrast(surface, luminance(invertedVars['--chrome-ink-muted'], bg))).toBeGreaterThanOrEqual(4.5);
  });

  it('chrome ink clears AA on the landing right plate', () => {
    for (const plate of PLATES) {
      const bg = parse(plate).rgb;
      expect(contrast(rgbY(bg), luminance(invertedVars['--chrome-ink'], bg))).toBeGreaterThanOrEqual(4.5);
    }
  });

  // --color-border is decorative (1.22:1 on the deep surface) and is deliberately not asserted.
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: FAIL — `Failed to resolve import "./tokens"`.

- [ ] **Step 3: Write minimal implementation**

Create `src/styles/tokens.ts`:

```ts
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

const glassVars = (tint: (a: number) => string) => ({
  '--glass-top': tint(GLASS.top),
  '--glass-bot': tint(GLASS.bot),
  '--glass-hi': tint(GLASS.hi),
  '--glass-rim': tint(GLASS.rim),
  '--glass-sheen': tint(GLASS_SHEEN_ALPHA),
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
  '--color-surface': 'var(--n-0)',
  '--color-ink': 'var(--n-11)',
  '--color-ink-muted': 'var(--n-9)',
  '--color-border': 'var(--n-4)',
  '--chrome-ink': 'var(--n-11)',
  '--chrome-ink-muted': 'var(--n-8)',
  '--glass-tint': 'var(--n-11)',
  ...glassVars(ink),
};

/** [data-surface="inverted"] — the dark theme. These are the values the site renders today. */
export const invertedVars: Record<string, string> = {
  '--color-surface': SURFACE_DEEP,
  '--color-ink': WHITE,
  '--color-ink-muted': white(0.5),
  '--color-border': white(0.08),
  '--chrome-ink': WHITE,
  // Bumped from the footer's 0.45 (4.49:1, fails AA) to 0.5 (5.28:1).
  '--chrome-ink-muted': white(0.5),
  '--glass-tint': WHITE,
  ...glassVars(white),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: PASS, 8 tests.

Note: `luminance()` resolves `var(--n-N)` against `staticVars`, so `lightVars['--color-surface'] = 'var(--n-0)'` works. The `ink()` helper produces `oklch(0.30 0.008 265 / 0.148)`, which the test never parses (only `--glass-*` uses it, and glass is not contrast-asserted).

- [ ] **Step 5: Verify the whole suite and types**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean; 74 existing + 8 new tests pass.

- [ ] **Step 6: Commit (await user sign-off)**

```bash
git add src/styles/tokens.ts src/styles/tokens.test.ts
git commit -m "feat(design-system): token source with drift + contrast guards"
```

---

### Task 2: Emit tokens as CSS

**Files:**
- Create: `src/styles/tokens.css.ts`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `staticVars`, `lightVars`, `invertedVars` from Task 1.
- Produces: `TokenStyles` — a `createGlobalStyle` component, rendered once in `App`.

- [ ] **Step 1: Write `tokens.css.ts`**

There is no unit test here: `createGlobalStyle` output is not introspectable, and jsdom cannot resolve the variables it declares. Task 1's drift guard already proves the maps are consistent; this file only concatenates them. Correctness is verified in the browser in Task 10.

```ts
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
```

- [ ] **Step 2: Render it in `App.tsx`**

Modify `src/App.tsx` — add the import and render `<TokenStyles />` **before** `<GlobalStyles />`, so `GlobalStyles` can consume the variables:

```tsx
import { BrowserRouter as Router } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from './styles/theme';
import { TokenStyles } from './styles/tokens.css';
import { GlobalStyles } from './styles/GlobalStyles';
import Layout from './components/Layout/Layout';
import AppRoutes from './AppRoutes';

function App() {
  return (
    <ThemeProvider theme={theme}>
      <TokenStyles />
      <GlobalStyles />
      <Router>
        <Layout>
          <AppRoutes />
        </Layout>
      </Router>
    </ThemeProvider>
  );
}

export default App;
```

- [ ] **Step 3: Verify**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 82 tests pass. Nothing renders differently yet — no component reads the vars.

- [ ] **Step 4: Commit (await user sign-off)**

```bash
git add src/styles/tokens.css.ts src/App.tsx
git commit -m "feat(design-system): emit tokens as :root and [data-surface] blocks"
```

---

### Task 3: Typed accessor replaces `theme.ts`

**Files:**
- Modify: `src/styles/theme.ts` (full rewrite)
- Test: `src/styles/tokens.test.ts` (append a describe block)
- Verify: `src/styles/styled.d.ts` (expected: no change)

**Interfaces:**
- Consumes: `staticVars`, `lightVars` from Task 1.
- Produces: `theme` object and `Theme` type. Accessor shape:
  - `theme.color.{surface,ink,inkMuted,border}`
  - `theme.chrome.{ink,inkMuted}`
  - `theme.glass.{top,bot,hi,rim,sheen,blur,shadow,tint}`
  - `theme.font.{display,body,mono}`
  - `theme.radius.pill`, `theme.space.{1,2,3}`, `theme.barHeight`
  - `theme.ease.{expo,glass}`, `theme.accent.logo`
  - `theme.breakpoints.{sm,md,lg,xl}` — **literal px strings, not vars**

- [ ] **Step 1: Write the failing test**

Add `import { theme } from './theme';` to the **existing import block at the top** of
`src/styles/tokens.test.ts` (ESM imports must be top-level; `eslint` `import/first` will
reject one placed mid-file). Then append this `describe` block to the end of the file:

```ts
describe('theme accessor', () => {
  /** Every var() the accessor hands out must be a name the CSS actually declares. */
  const declared = new Set([...Object.keys(staticVars), ...Object.keys(lightVars)]);

  const collectVars = (node: unknown, acc: string[] = []): string[] => {
    if (typeof node === 'string') {
      const m = node.match(/^var\((--[\w-]+)\)$/);
      if (m) acc.push(m[1]);
      return acc;
    }
    if (node && typeof node === 'object') {
      for (const value of Object.values(node as Record<string, unknown>)) collectVars(value, acc);
    }
    return acc;
  };

  it('references only declared custom properties', () => {
    const used = collectVars(theme);
    expect(used.length).toBeGreaterThan(10);
    for (const name of used) expect(declared, `${name} is used but never declared`).toContain(name);
  });

  it('keeps breakpoints as literal strings — var() is illegal in @media', () => {
    expect(theme.breakpoints).toEqual({ sm: '640px', md: '768px', lg: '1024px', xl: '1280px' });
    expect(JSON.stringify(theme.breakpoints)).not.toContain('var(');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: FAIL — `theme.color` is undefined (old theme exports `colors`).

- [ ] **Step 3: Rewrite `src/styles/theme.ts`**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/styles/tokens.test.ts`
Expected: PASS.

- [ ] **Step 5: Confirm the build breaks where expected**

Run: `npx tsc -b`
Expected: FAIL, only in `src/styles/GlobalStyles.ts` — `theme.fonts`, `theme.fontSizes`, `theme.colors`, `theme.spacing` no longer exist. Task 4 fixes exactly these. No other file should error; `theme.breakpoints` consumers (`Header`, `Lockup`, `PetCaption`, `InterfacesThatFeelBetter`) are unaffected.

If any other file errors, stop — it means an unaudited consumer exists.

- [ ] **Step 6: Do not commit yet.** The tree does not compile. Task 4 completes this change.

---

### Task 4: `GlobalStyles` reads tokens; dead exports removed

**Files:**
- Modify: `src/styles/GlobalStyles.ts`
- Modify: `src/styles/index.ts`

**Interfaces:**
- Consumes: `theme` accessor from Task 3.
- Produces: `GlobalStyles` only. `Container`, `Section`, and `Button` cease to exist.

Confirmed dead: `git grep -nwE "Container|Section|Button"` shows no importer outside `GlobalStyles.ts`. The `Container` in `DayJourney/ScrollIndicator.tsx` is a distinct local `styled(motion.div)`.

- [ ] **Step 1: Rewrite `src/styles/GlobalStyles.ts`**

Body keeps `--font-body` (Inter), not `--font-display` (Archivo). Changing the inherited body face would restyle `/readme` and `/connect`, which this spec forbids.

```ts
import { createGlobalStyle } from 'styled-components';

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
```

- [ ] **Step 2: Update `src/styles/index.ts`**

`export * from './GlobalStyles'` now exports only `GlobalStyles`, so the file needs no edit — but verify it still type-checks and that nothing imported the deleted names:

```bash
git grep -nE "from .*styles.*(Container|Section|Button)" -- src/ || echo "no importers"
```

Expected: `no importers`.

- [ ] **Step 3: Verify the build is green again**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 84 tests pass (74 baseline + 8 from Task 1 + 2 from Task 3).

- [ ] **Step 4: Commit (await user sign-off)**

```bash
git add src/styles/theme.ts src/styles/GlobalStyles.ts src/styles/tokens.test.ts
git commit -m "refactor(design-system): theme.ts becomes a typed var() accessor"
```

---

### Task 5: The surface bridge

**Files:**
- Modify: `src/components/Layout/Layout.tsx`
- Modify: `index.html`
- Test: `src/components/Layout/Layout.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `document.documentElement.dataset.surface` is `'inverted'` on every route, and `LIGHT_ROUTES` — the empty set that migration specs will populate.

- [ ] **Step 1: Write the failing test**

Create `src/components/Layout/Layout.test.tsx`:

```tsx
import { describe, it, expect, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from 'styled-components';
import { theme } from '../../styles/theme';
import Layout from './Layout';

const renderAt = (path: string) =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Layout>
          <main>content</main>
        </Layout>
      </MemoryRouter>
    </ThemeProvider>,
  );

afterEach(() => {
  delete document.documentElement.dataset.surface;
});

describe('Layout surface bridge', () => {
  it('marks the landing as an inverted surface (chrome over video)', () => {
    renderAt('/');
    expect(document.documentElement.dataset.surface).toBe('inverted');
  });

  it('bridges every unmigrated route to inverted, since all pages are still dark', () => {
    for (const path of ['/readme', '/work', '/writing', '/lab', '/connect']) {
      renderAt(path);
      expect(document.documentElement.dataset.surface, path).toBe('inverted');
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Layout/Layout.test.tsx`
Expected: FAIL — `expected undefined to be 'inverted'`.

- [ ] **Step 3: Implement the bridge**

Rewrite `src/components/Layout/Layout.tsx`:

```tsx
import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Routes that have been migrated to the light theme. Empty for now: every page still
 * hardcodes a dark background, so everything is bridged to `inverted`. Each page's
 * migration spec adds its path here.
 *
 * The landing is never added — its chrome sits over video, not paper.
 */
const LIGHT_ROUTES = new Set<string>();

/**
 * The surface attribute lives on <html>, not on the page. Header and Footer are
 * siblings of the page content, so a surface set on a page element would never reach
 * the chrome — which is the thing that needs it.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const surface = LIGHT_ROUTES.has(pathname) ? 'default' : 'inverted';

  // useLayoutEffect, not useEffect: the attribute must exist before paint or a route
  // change would flash light chrome over a dark page.
  useLayoutEffect(() => {
    document.documentElement.dataset.surface = surface;
  }, [surface]);

  return (
    <>
      <Header />
      <div className="layout-content">{children}</div>
      <Footer />
    </>
  );
};

export default Layout;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Layout/Layout.test.tsx`
Expected: PASS, 2 tests.

- [ ] **Step 5: Add the boot value to `index.html`**

The effect runs after hydration; without a boot value the first paint has no attribute and would use light tokens. Change the opening tag:

```html
<html lang="en" data-surface="inverted">
```

- [ ] **Step 6: Verify**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 86 tests pass.

- [ ] **Step 7: Commit (await user sign-off)**

```bash
git add src/components/Layout/Layout.tsx src/components/Layout/Layout.test.tsx index.html
git commit -m "feat(design-system): route-driven data-surface bridge on <html>"
```

---

### Task 6: `Header` on chrome + glass tokens; retire the Changelog link

**Files:**
- Modify: `src/components/Layout/Header.tsx`
- Modify: `src/components/Layout/Header.test.tsx`

**Interfaces:**
- Consumes: `theme.chrome.ink`, `theme.glass.*`, `theme.font.mono`, `theme.radius.pill`, `theme.ease.glass`, `theme.space.*` from Task 3.
- Produces: nothing consumed downstream.

`Header.test.tsx` currently asserts `Lab` sits between `Changelog` and `Work`. Removing the Changelog link breaks it; the test is updated to anchor on `Readme` instead.

- [ ] **Step 1: Update the failing test first**

Replace the first test in `src/components/Layout/Header.test.tsx`:

```tsx
describe('Header nav', () => {
  it('renders a Lab link sitting between Readme and Work', () => {
    renderHeader();

    const order = navOrder();
    expect(order).toContain('Lab');
    expect(order.indexOf('Lab')).toBeGreaterThan(order.indexOf('Readme'));
    expect(order.indexOf('Lab')).toBeLessThan(order.indexOf('Work'));
  });

  it('links Lab to /lab', () => {
    renderHeader();

    expect(screen.getByRole('link', { name: 'Lab' })).toHaveAttribute('href', '/lab');
  });

  it('does not link to the retired /changelog page', () => {
    renderHeader();

    expect(navOrder()).not.toContain('Changelog');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/Layout/Header.test.tsx`
Expected: FAIL on `does not link to the retired /changelog page` — `Changelog` is still rendered.

- [ ] **Step 3: Update `Header.tsx`**

Delete the `PILL_HOVER` / `PILL` constants (they now live in `tokens.ts`), remove the `Changelog` `NavItem` and its `isChangelog` variable, and swap literals for tokens.

`NavLink` becomes:

```ts
const NavLink = styled(Link)<{ $active?: boolean }>`
  position: relative;
  color: ${p => p.theme.chrome.ink};
  opacity: ${p => (p.$active ? 1 : 0.72)};
  text-decoration: none;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: ${p => p.theme.space[1]} ${p => p.theme.space[2]};
  border-radius: ${p => p.theme.radius.pill};
  transition:
    opacity 0.35s ease,
    background 0.4s ${p => p.theme.ease.glass},
    box-shadow 0.4s ${p => p.theme.ease.glass},
    backdrop-filter 0.4s ${p => p.theme.ease.glass};
  outline: none;

  /* Glass is driven by GLASS_K in tokens.ts, mirroring the design source's applyPill().
     The tint follows the surface, so this reads as white on video and as ink on paper. */
  &:hover,
  &:focus-visible {
    opacity: 1;
    background: linear-gradient(140deg, ${p => p.theme.glass.top}, ${p => p.theme.glass.bot});
    -webkit-backdrop-filter: blur(${p => p.theme.glass.blur}) saturate(205%);
    backdrop-filter: blur(${p => p.theme.glass.blur}) saturate(205%);
    box-shadow:
      inset 0 1px 0 ${p => p.theme.glass.hi},
      inset 0 -1px 2px ${p => p.theme.glass.sheen},
      inset 0 0 0 1px ${p => p.theme.glass.rim},
      0 6px 20px ${p => p.theme.glass.shadow};
  }
`;
```

The `color: #fff` shield inside `&:hover` is **dropped** — it existed only to outrank `index.css`'s `a:hover`, which Task 9 deletes. `color` is now inherited from the base rule.

`Underline` becomes:

```ts
const Underline = styled(motion.span)`
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 1px;
  background: ${p => p.theme.chrome.ink};
  opacity: 0.6;
`;
```

`Bar` uses tokens for its box metrics:

```ts
const Bar = styled.header`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 ${p => p.theme.space[3]};
  height: ${p => p.theme.barHeight};
  background: transparent;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    left: 0;
    height: auto;
    min-height: ${p => p.theme.barHeight};
    align-items: flex-start;
    padding: 0.6rem 1.25rem;
  }
`;
```

In the component body, delete:

```tsx
const isChangelog = pathname === '/changelog';
```

and the whole `NavItem` containing the Changelog `NavLink`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/Layout/Header.test.tsx`
Expected: PASS, 3 tests.

- [ ] **Step 5: Verify**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 87 tests pass.

- [ ] **Step 6: Commit (await user sign-off)**

```bash
git add src/components/Layout/Header.tsx src/components/Layout/Header.test.tsx
git commit -m "refactor(header): chrome + glass tokens; retire Changelog nav link"
```

---

### Task 7: `Footer` and `Logo` on tokens

**Files:**
- Modify: `src/components/Layout/Footer.tsx`
- Modify: `src/components/Logo.tsx:116`

**Interfaces:**
- Consumes: `theme.chrome.inkMuted`, `theme.font.mono`, `theme.space[3]`, `theme.accent.logo`.

- [ ] **Step 1: Update `Footer.tsx`**

This is the `0.45 → 0.5` bump: `--chrome-ink-muted` is `oklch(1 0 0 / 0.5)` on the inverted surface, so the copyright brightens imperceptibly and clears AA (`4.49:1` → `5.28:1`).

```tsx
import styled from 'styled-components';

const Bar = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 ${p => p.theme.space[3]};
  height: 48px;
  background: transparent;
  pointer-events: none;
`;

const Copyright = styled.span`
  color: ${p => p.theme.chrome.inkMuted};
  font-family: ${p => p.theme.font.mono};
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: auto;
`;

const Footer: React.FC = () => (
  <Bar>
    <Copyright>Copyright {new Date().getFullYear()} Fei Hu</Copyright>
  </Bar>
);

export default Footer;
```

- [ ] **Step 2: Update `Logo.tsx` line 116**

```tsx
<LogoFilled className='logo logo-filled' $color="var(--accent-logo)" />
```

- [ ] **Step 3: Verify**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 87 tests pass.

- [ ] **Step 4: Commit (await user sign-off)**

```bash
git add src/components/Layout/Footer.tsx src/components/Logo.tsx
git commit -m "refactor(chrome): footer + logo on tokens; fix footer AA (4.49 -> 5.28)"
```

---

### Task 8: Delete the Vite scaffold from `index.css`

**Files:**
- Modify: `src/index.css`

**Interfaces:** none.

This removes the `a:hover { color: #fdd75e }` rule that currently tints nav links amber under a light OS theme, plus the `:root` color/background that `GlobalStyles` already overrides.

**Keep:** the `@import` (day-journey fonts, `/changelog` still renders), `--day-font-*`, `--logo-color`, `--day-text-*`, `#root`, `body` box rules, and the scrollbar rules.

- [ ] **Step 1: Audit before deleting**

Run: `npm run dev`, then visit `/`, `/readme`, `/work`, `/writing`, `/lab`, `/connect`, `/changelog`.
Confirm each page sets its own `background` and text `color` and does not rely on `:root`'s `#242424` / `rgba(255,255,255,0.87)`.

Expected: every page has its own background (verified: all six set `background: #12102a` or `#0c0a1f`).

- [ ] **Step 2: Delete lines 3–15 partially, 38–45, 60–77, and 79–90**

The resulting `src/index.css`:

```css
@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=Audiowide&family=Neonderthaw&family=Press+Start+2P&family=Exo+2:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

:root {
  font-synthesis: none;
  text-rendering: optimizeLegibility;

  --day-font-primary: 'Outfit', system-ui, sans-serif;
  --day-font-secondary: 'Exo 2', system-ui, sans-serif;
  --day-font-mono: 'JetBrains Mono', 'Courier New', monospace;
  --day-font-starwars: 'Audiowide', system-ui, sans-serif;
  --day-font-retro: 'Press Start 2P', system-ui, sans-serif;
  --day-font-neon: 'Neonderthaw', cursive;

  --logo-color: #FFD166;
  --day-text-morning-primary: #ff8c69;
  --day-text-morning-secondary: #e74c3c;
}

#root {
  min-height: 100dvh;
  max-width: 100dvw;
  overflow-x: hidden;
}

body {
  margin: 0;
  min-width: 320px;
  min-height: 100dvh;
  scrollbar-width: none;
  -ms-overflow-style: none;
}

::-webkit-scrollbar {
  display: none;
}
```

Removed: `font-family`/`line-height`/`font-weight`/`color-scheme`/`color`/`background-color` from `:root` (all set by `GlobalStyles` body); `-webkit-font-smoothing` + `-moz-osx-font-smoothing` (duplicated in `GlobalStyles`); the `a` and `a:hover` rules; the `h1 { font-size: 3.2em }` rule (every `h1` sets its own size); all `button` rules; the entire `@media (prefers-color-scheme: light)` block.

- [ ] **Step 3: Verify no page regressed**

Run: `npm run dev`, reload `/`, `/readme`, `/writing`, `/lab`.
Expected: identical rendering. Hover a nav link — it stays white, never amber, regardless of OS theme.

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 87 tests pass.

- [ ] **Step 4: Commit (await user sign-off)**

```bash
git add src/index.css
git commit -m "chore(styles): drop Vite scaffold CSS incl. amber a:hover override"
```

---

### Task 9: Correct `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md`

**Interfaces:** none.

- [ ] **Step 1: Fix the Routes table**

`/contact` does not exist — the route is `/connect` (`AppRoutes.tsx:40`). `/lab`, `/lab/:slug`, and `/loading` are missing. Replace those rows:

| Path | Component | Description |
|---|---|---|
| `/connect` | `Connect` | Contact links from portfolio.json |
| `/lab` | `Lab` | Lab index |
| `/lab/:slug` | `LabEntryRoute` | A lab entry |
| `/changelog` | `Day` | **Retired.** Route kept, no nav link. |

- [ ] **Step 2: Fix the Fonts section**

Cormorant Garamond and Manrope were removed by the Swiss variant. Archivo is the display face. Replace the list with: Archivo (400–700, display + body headings), Inter (200–500, inherited body copy), JetBrains Mono (400–500, chrome/labels), Big Shoulders Display and Playfair Display (loaded, unused).

- [ ] **Step 3: Replace the Styling conventions paragraph**

Delete the claim that the amber/cream `theme` applies to the day-journey sections — `DayJourney/` never reads the theme. Delete "Do not fix hardcoded colors on these pages" for `/readme` and `/connect`; those pages are scheduled for migration to the light theme.

Add:

```markdown
### Design system

`src/styles/tokens.ts` is the single source of truth: a neutral oklch ramp at hue 265,
type/space/radius/motion primitives, and a glass recipe driven by one dial (`GLASS_K`).
`tokens.css.ts` emits it as `:root` (light) and `[data-surface="inverted"]` (dark).
`theme.ts` is a typed accessor returning `var(--x)` strings — author
`${p => p.theme.color.ink}` as before.

`theme.breakpoints` returns literal px strings, because CSS custom properties are
illegal inside `@media` queries.

`Layout` sets `data-surface` on `<html>` from the route. Every page is currently bridged
to `inverted` because every page is still dark; the landing stays `inverted` permanently
since its chrome sits over video. Migrating a page to light means adding its path to
`LIGHT_ROUTES` in `Layout.tsx` and reworking that page's hardcoded colors.

`/changelog` is retired: the route still resolves, but it has no nav link and its neon
palette is deliberately outside the system.
```

- [ ] **Step 4: Commit (await user sign-off)**

```bash
git add CLAUDE.md
git commit -m "docs: correct CLAUDE.md routes, fonts, and design-system conventions"
```

---

### Task 10: Browser regression verification

**Files:** none modified.

jsdom cannot resolve `var()`, so the only place the tokens can be proven correct is a real browser. This task has no code — it is the acceptance gate.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev` (port 9921).

- [ ] **Step 2: Assert the nav pill still resolves to the `k=0.2` values**

Use `Writing` (the `Changelog` link is gone). Synthetic `MouseEvent`s do **not** trigger
CSS `:hover` — move a real pointer over the link, or select it in the Elements panel and
use *Toggle Element State → `:hover`*. Then, in the console:

```js
const link = [...document.querySelectorAll('header a')].find(a => a.textContent === 'Writing');
const cs = getComputedStyle(link);
console.log(cs.backgroundImage, cs.backdropFilter, cs.boxShadow);
```

Chrome preserves oklch verbatim in computed style, so these are **exact string matches** —
no 8-bit tolerance (that caveat applied only to the old `rgba` authoring):

| Value | Expected |
|---|---|
| gradient start | `oklch(1 0 0 / 0.148)` |
| gradient end | `oklch(1 0 0 / 0.042)` |
| `backdrop-filter` | `blur(5.6px) saturate(2.05)` |
| highlight | `oklch(1 0 0 / 0.304)` |
| sheen (fixed) | `oklch(1 0 0 / 0.14)` |
| rim | `oklch(1 0 0 / 0.096)` |
| shadow | `oklch(0 0 0 / 0.1)` |

Full computed `box-shadow` reads:
`oklch(1 0 0 / 0.304) 0px 1px 0px 0px inset, oklch(1 0 0 / 0.14) 0px -1px 2px 0px inset, oklch(1 0 0 / 0.096) 0px 0px 0px 1px inset, oklch(0 0 0 / 0.1) 0px 6px 20px 0px`

Pixels shift by ≤1/255 versus `main` here, because alpha is no longer 8-bit quantized.
That is expected and accepted (see Global Constraints).

- [ ] **Step 3: Assert the surface attribute**

```js
document.documentElement.dataset.surface  // => "inverted"
getComputedStyle(document.documentElement).getPropertyValue('--chrome-ink').trim()  // => "oklch(1 0 0)"
getComputedStyle(document.documentElement).getPropertyValue('--color-surface').trim() // => "oklch(0.192 0.051 284)"
```

Navigate to `/readme` and re-check: still `"inverted"`.

- [ ] **Step 4: Assert the amber bug is gone**

In DevTools, emulate `prefers-color-scheme: light` (Rendering panel). Force `:hover` on a nav link.
Expected: `getComputedStyle(link).color === "rgb(255, 255, 255)"`, not `rgb(253, 215, 94)`.

- [ ] **Step 5: Eyeball every route**

Visit `/`, `/readme`, `/work`, `/writing`, `/lab`, `/connect`, `/changelog`.
Expected: pixel-identical to `main`, except the missing `Changelog` nav link and the very slightly brighter footer copyright.

- [ ] **Step 6: Final gate**

Run: `npx tsc -b && npm run lint && npm run test:run`
Expected: clean, 87 tests pass.

- [ ] **Step 7: Commit (await user sign-off)**

Nothing to commit; this task gates the branch.

---

## Deferred to follow-up specs

- `/readme` + `/connect` → light theme (add paths to `LIGHT_ROUTES`, rework hardcoded colors).
- The three blog templates → light theme + type scale.
- Whether `#12102a` folds onto the 265-hue ramp.
- Choosing a single `--color-surface-raised` from the three competing fills (`0.06` ×4, `0.04` ×3, `0.05` ×2).
- A user-facing dark-mode toggle (apply `invertedVars` at `:root`).

## Known sharp edges

- **`--chrome-ink-muted` on light is `4.72:1`** — the tightest pair in the system. It passes AA but has no headroom. If the light `/readme` design darkens its surface at all, re-run the contrast test.
- **`--color-border` is `1.22:1`** on the inverted surface. Fine for hairline dividers, wrong for any control boundary that conveys state. Deliberately not contrast-asserted.
- **The light theme has no consumer** until the `/readme` spec lands. The contrast test is what keeps it honest in the meantime.
