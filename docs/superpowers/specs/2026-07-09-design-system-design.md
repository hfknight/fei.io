# Design system derived from the landing page

**Date:** 2026-07-09
**Status:** implemented, then partly superseded — see below.
**Scope:** token layer + global chrome. Migrating individual pages off the inverted
surface is deferred to follow-up specs.

> ### Superseded in two places
>
> This document records the design as approved. Implementation and review found two of its
> decisions wrong. The corrections shipped; `CLAUDE.md` and `src/styles/tokens.ts` are the
> live truth. The body below is left unedited so the record shows what changed and why.
>
> **1. Glass has two tints, not one.** This spec says the alphas are tint-agnostic and only
> the tint colour changes per surface, via a single `--glass-tint` token. That is wrong for
> the light surface: the top highlight and the bottom sheen model *reflected light*, not
> pigment. Tinted with ink they become hard dark lines — `--glass-hi` at alpha `.304`
> composites to `rgb(187,189,190)` over a `rgb(251,252,253)` ground, reading as a pressed
> inset rather than glass. Shipped instead: the fill and rim follow the surface, the
> highlight and sheen are always white, and the drop shadow stays black because it is cast,
> not reflected. `--glass-tint` was never read by any component and has been deleted.
>
> **2. Deleting `color-scheme` left a gap.** This spec puts `color-scheme: light dark` on the
> must-delete list for `index.css`, but nothing re-declares it, so native `<select>` popups
> in the admin rendered light chrome under a dark OS. Shipped instead: a `--ui-scheme` token
> (`light` / `dark`) per surface, with `:root { color-scheme: var(--ui-scheme) }`.
>
> Both corrections are in commits `651662d` and `17fa1cc`.

## Context

The repo has no design system. It has a token file that nothing uses.

Evidence, measured against the current tree:

- Every reference to `theme.colors`, `theme.fonts`, `theme.fontSizes`, and
  `theme.spacing` — 21 in total — is inside `src/styles/GlobalStyles.ts`. No component
  outside that file reads them.
- `theme.shadows` has **zero** references.
- `theme.breakpoints` has 16 references across 5 files. It is the only load-bearing token.
- `Container`, `Section`, and `Button` are exported from `GlobalStyles.ts` and imported
  nowhere. They are dead.
- `CLAUDE.md` claims the amber/cream palette "applies to the day-journey sections."
  It does not. `src/components/DayJourney/` references the theme zero times and hardcodes
  82 hex values, dominated by `#00ffff` and `#bc13fe`.

The result is four unrelated hardcoded palettes with a vestigial token file beside them:

| Surface | Palette | Source |
|---|---|---|
| Landing, Header, Footer | Swiss neutral, 41 `oklch()` decls | the design being systematized |
| `/changelog` (DayJourney) | neon cyan/magenta, 82 hex | hardcoded |
| `/readme`, `/connect`, `/work`, `/lab` | dark indigo `#12102a` | hardcoded |
| `/writing` templates | dark `#0c0a1f` | hardcoded |

Replacing `theme.ts` is therefore cheap. The real work is the global chrome.

## Decisions

1. **Light is the default theme** (`:root`). It is authored now but consumed by nothing
   until pages migrate — see "What this spec does and does not change."
2. **Dark is authored now, not later.** Every page is dark today; those values already
   exist. Dark ships as the `inverted` surface context.
3. **`/changelog` is retired** — the route stays, its nav link is removed. Its neon
   palette is untouched and outside the system.
4. **Token values live in CSS custom properties, generated from a single TypeScript
   source, read through a typed accessor.** (Option C.)

### Why Option C

- **A — CSS custom properties only.** Runtime theming is an attribute flip; plain CSS can
  read tokens. Costs the typed autocomplete `styled.d.ts` already provides; a misspelled
  var fails silently to `unset`.
- **B — `ThemeProvider` objects only.** Fully typed, matches existing components. But a
  theme swap re-renders the tree, and plain CSS cannot see the tokens — so `index.css` and
  global keyframes stay outside the system. That is how the current split arose.
- **C — one TS source, emitted as CSS variables, read through a typed accessor.**
  Chosen. Authoring stays identical to today (`${p => p.theme.color.ink}`) and stays typed;
  values live in CSS so theme switching is an attribute flip with no re-render, and plain
  CSS can use the same vars. The CSS is generated from the TS, so they cannot drift.

## Architecture

```
tokens.ts ──┬─→ createGlobalStyle  →  :root                     { --color-ink: … }  light
            │                         [data-surface="inverted"] { --color-ink: … }  dark
            │
            └─→ theme object       →  theme.color.ink === "var(--color-ink)"
                                      passed to ThemeProvider, typed via styled.d.ts
```

`tokens.css.ts` is a **runtime module**, not a codegen step: it imports `tokens.ts` and
builds the `createGlobalStyle` declaration block at import time. There is no generated
file to check in and no build hook.

Three layers, each with one job:

- **Primitives** — the raw ramp. No meaning attached, never varies by theme.
- **Semantic tokens** — meaning, resolved per surface. `--color-ink`, `--color-surface`,
  `--color-border`, `--chrome-ink`, `--glass-tint`. Both surfaces define every name.
- **Surface context** — `[data-surface="inverted"]` redefines the semantic layer for a
  dark ground. Primitives do not move.

### The hazard this design exists to solve

`Header` and `Footer` render on every route with hardcoded white — `NavLink` is
`color: #fff` (`Header.tsx:62`), `Footer` is `rgba(255,255,255,0.45)` (`Footer.tsx:19`).
That works today only because every page is dark. Under a light default the global chrome
goes invisible, while the landing's nav must *stay* white because it sits over video.

So the landing is not "a page with a dark background." It is a page whose chrome sits on
an **inverted surface**. `Header` and `Footer` read `--chrome-ink` and never learn which
route they are on.

### `inverted` is the dark theme

`GlobalStyles` sets body `color` from the theme, and every route today is dark. Inverting
only the chrome would leave body ink light on a dark page, so every element relying on
inherited color would vanish. Therefore `inverted` redefines the full semantic layer, not
just chrome — which makes it exactly a dark theme, whose values are the ones the site
already uses.

Consequences:

- **Bridge.** Every route starts on `inverted`, so the site renders unchanged. Each
  follow-up spec moves one page to the light default.
- **Landing stays inverted permanently** — its chrome sits over video, not paper.
- **A future user-facing dark mode** is the same token set applied at `:root`. No second
  palette to author.

### Where the attribute lives

Not on the page. `Layout` returns a Fragment, and `Header`/`Footer` are siblings *outside*
the page content — so a surface set on a page element would never reach the chrome, which
is precisely the thing that needs it.

The attribute therefore lives on `<html>`, set from the route:

```ts
// Layout.tsx
const SURFACE: Record<string, Surface> = { '/': 'inverted' };  // landing: permanent
const surface = SURFACE[pathname] ?? 'inverted';               // bridge: everything else
useLayoutEffect(() => { document.documentElement.dataset.surface = surface; }, [surface]);
```

Migrating a page to light is then a one-line deletion from the bridge fallback, not a
component rewrite. `useLayoutEffect` rather than `useEffect` so the attribute is present
before paint and no route flashes light chrome on a dark ground.

## Token inventory

All values are lifted from the current implementation, not invented.

### Primitives — color

A neutral ramp at hue `265`, chroma rising as lightness falls. Near-duplicates in the
source (`0.99`/`0.985`, `0.54`/`0.55`/`0.56`) are collapsed.

| Token | Value | | Token | Value |
|---|---|---|---|---|
| `--n-0` | `oklch(0.99 0.002 265)` | | `--n-7`  | `oklch(0.60 0.008 265)` |
| `--n-1` | `oklch(0.96 0.004 265)` | | `--n-8`  | `oklch(0.55 0.008 265)` |
| `--n-2` | `oklch(0.94 0.004 265)` | | `--n-9`  | `oklch(0.45 0.008 265)` |
| `--n-3` | `oklch(0.92 0.004 265)` | | `--n-10` | `oklch(0.40 0.009 265)` |
| `--n-4` | `oklch(0.88 0.004 265)` | | `--n-11` | `oklch(0.30 0.008 265)` |
| `--n-5` | `oklch(0.80 0.006 265)` | | `--n-12` | `oklch(0.26 0.010 265)` |
| `--n-6` | `oklch(0.70 0.006 265)` | | | |

Two values stay outside the ramp:

- **Media plates.** `#26272b` (stage), `#e9eaeb → #d4d6d8` (left), `#54565b → #33343a`
  (right). These are photographic backdrops, not UI surfaces.
- **Ink indigo.** `#12102a` is the dark surface every page uses today. It is *not* on the
  265-hue ramp. It is retained verbatim as the inverted surface so the bridge reproduces
  today's pixels exactly. Whether to fold it onto the ramp is a question for the
  page-migration specs, not this one.

`#fdd75e` (logo) is the sole accent → `--accent-logo`, consumed only by `Logo.tsx`. It is
not a link or focus color. The `a:hover { color: #fdd75e }` in `index.css` is a Vite
scaffold artifact, not a design decision, and is deleted.

### Primitives — type

```
--font-display: 'Archivo','Helvetica Neue',Helvetica,Arial,sans-serif
--font-mono:    'JetBrains Mono','Fira Code',monospace
```

| Role | Size | Weight | Tracking |
|---|---|---|---|
| hero | `clamp(52px, 6vw, 104px)` | 700 | `-0.045em` |
| eyebrow | `10.5px` | 600 | `0.34em` |
| roles | `14px` | 600 | `0.05em` |
| nav | `0.72rem` | 400 | `0.05em` |
| micro-label | `12px` | 700 | `0.16em` |
| body | `13px` | 400 | normal |

### Primitives — space, radius, motion

```
--space-1: 8px      (pill padding block, nav gap)
--space-2: 15px     (pill padding inline)
--space-3: 2rem     (bar inline padding)
--bar-height: 60px
--radius-pill: 7px

--ease-expo:  cubic-bezier(0.16, 1, 0.3, 1)    entrances; 7 uses; CLAUDE.md standard
--ease-glass: cubic-bezier(0.22, 1, 0.36, 1)   glass/pill; 7 uses
```

Component-specific curves stay local and are **not** promoted: the shake
`cubic-bezier(0.36, 0.07, 0.19, 0.97)` and the bounce `cubic-bezier(0.34, 1.36, 0.64, 1)`
are single-purpose and would mislead as system tokens.

Breakpoints move verbatim from `theme.ts`: `sm 640px`, `md 768px`, `lg 1024px`, `xl 1280px`.

### Primitives — glass

`Header.tsx` derives six values from one dial, `PILL_HOVER`. That formula becomes the
glass recipe rather than six literals:

```
top  = 0.08 + 0.34k     hi     = 0.22 + 0.42k
bot  = 0.02 + 0.11k     rim    = 0.06 + 0.18k
blur = 3 + 13k  (px)    shadow = 0.06 + 0.20k
```

`k = 0.2` today. The `inset 0 -1px 2px rgba(255,255,255,.14)` layer has no variable in the
design source and stays fixed.

The alphas are tint-agnostic; only the tint colour changes per surface, via `--glass-tint`.

### Semantic tokens

| Token | `:root` (light) | `[data-surface="inverted"]` (dark) | Inverted value grounded in |
|---|---|---|---|
| `--color-surface` | `--n-0` | `#12102a` | every page background |
| `--color-ink` | `--n-11` | `#fff` | `GlobalStyles` body color |
| `--color-ink-muted` | `--n-9` | `rgba(255,255,255,0.5)` | 15 uses, the dominant muted ink |
| `--color-border` | `--n-4` | `rgba(255,255,255,0.08)` | 10 uses, the dominant border |
| `--chrome-ink` | `--n-11` | `#fff` | `Header.tsx:62` |
| `--chrome-ink-muted` | `--n-8` | `rgba(255,255,255,0.45)` | `Footer.tsx:19` |
| `--glass-tint` | `--n-11` | `#fff` | the pill recipe |

The inverted column is exactly what the site renders today, so the bridge is a no-op
visually. Every inverted value is the most frequent existing usage, counted across
`src/pages/` and `src/components/Blog/` — none is invented.

There is deliberately **no** `--color-surface-raised`. The codebase has three competing
raised fills (`rgba(255,255,255,0.06)` ×4, `0.04` ×3, `0.05` ×2) and nothing in this spec
consumes one. Picking a winner is a page-migration decision, not a token-layer decision.

## File layout

```
src/styles/
  tokens.ts        primitives + semantic maps + glass recipe    (new, single source)
  tokens.css.ts    createGlobalStyle emitting :root / [data-*]  (new, runtime module)
  theme.ts         REPLACED — typed var() accessor + breakpoints
  styled.d.ts      updated to the new Theme shape
  GlobalStyles.ts  body/reset read semantic tokens; dead exports removed
  index.ts         stops re-exporting the deleted Container/Section/Button

src/components/Layout/
  Layout.tsx       sets document.documentElement.dataset.surface from the route
  Header.tsx       chrome tokens + glass tokens; Changelog NavItem removed
  Footer.tsx       chrome tokens

index.html         <html data-surface="inverted">  — boot value, avoids first-paint flash
```

## Changes in this spec

1. Add `tokens.ts` and `tokens.css.ts`; emit `:root` and `[data-surface="inverted"]`.
2. Rewrite `theme.ts` as the typed accessor. Delete `colors`, `fonts`, `fontSizes`,
   `spacing`, `shadows`. Keep `breakpoints`.
3. Update `styled.d.ts` to the new shape.
4. `GlobalStyles.ts`: body reads `--color-surface` / `--color-ink`. Delete the dead
   `Container`, `Section`, `Button` exports; drop them from `styles/index.ts`.
5. `Header.tsx`: `#fff` → `var(--chrome-ink)`; the six `PILL_*` literals → glass tokens;
   remove the `Changelog` `NavItem` (route stays in `AppRoutes.tsx`).
6. `Footer.tsx`: `rgba(255,255,255,0.45)` → `var(--chrome-ink-muted)`.
7. `Layout.tsx` sets `document.documentElement.dataset.surface` from the route in a
   `useLayoutEffect` — the bridge. Landing is pinned `inverted`; every other route falls
   back to `inverted` until its migration spec lands.
8. `Logo.tsx`: `#fdd75e` → `var(--accent-logo)`.
9. `index.css`: delete the Vite scaffold — `:root` `color`/`background-color`,
   `a { color: #646cff }`, `a:hover { color: #535bf2 }`, `button` styling, and the whole
   `@media (prefers-color-scheme: light)` block (which holds the
   `a:hover { color: #fdd75e }` rule currently tinting nav links amber). Keep the
   `@import` of Outfit/Exo 2/Audiowide/Neonderthaw/Press Start 2P — `/changelog` still
   renders.
10. Drop the `color: #fff` shield on `NavLink:hover`; it exists only to outrank the
    `a:hover` rule deleted in step 9.
11. `CLAUDE.md`: correct the DayJourney theme claim; fix the route table (`/contact` does
    not exist — it is `/connect`; `/lab` and `/loading` are missing); replace the Fonts
    section (Cormorant and Manrope are gone, Archivo is the display face); document the
    token layer, the `data-surface` contract, and that `/changelog` is retired.

## What this spec does and does not change

**Does not change:** any rendered pixel, except that nav links stop turning amber on hover
under a light OS theme, and `Changelog` leaves the nav. Because `Layout` is bridged to
`inverted`, every page keeps its current colors.

**Does change:** where those colors come from. After this spec, the light theme exists and
is emitted but is consumed by nothing. That is intentional and is the one uncomfortable
property of this plan — an unused theme is how `theme.ts` died. The mitigation is that the
next spec (`/readme` → light) lands immediately after, and the contrast test below asserts
the light tokens are internally valid even while unused.

## Non-goals

- No light redesign of any page. Separate specs, one page at a time.
- No migration of the three blog templates.
- No touching `/changelog`'s neon or its five fonts.
- No new component library. Tokens only.
- No decision on folding `#12102a` onto the 265-hue ramp.

## Testing

- **Drift guard (unit).** Every semantic name defined in `tokens.ts` is emitted in both
  `:root` and `[data-surface="inverted"]`, and the accessor returns `var(--x)` strings
  matching emitted names. A token defined but not emitted fails here.
- **Contrast (unit).** Computed from the oklch/hex values, asserting ≥ 4.5:1 for
  `--color-ink` on `--color-surface` in **both** surfaces (inverted measures `18.53:1`),
  for `--color-ink-muted` in both (inverted measures `5.28:1`), and for `--chrome-ink` on
  the landing's right plate (`#54565b → #33343a`). This is what keeps the unused light
  theme honest. `--color-border` is excluded (decorative, `1.22:1`); `--chrome-ink-muted`
  is excluded only if the decision above keeps it at `0.45` (`4.49:1`), and that exclusion
  must carry a comment naming the measured value.
- **Regression (browser).** The landing renders identically. Assert the nav pill's
  computed values under `[data-surface="inverted"]` still equal the `k=0.2` outputs: fill
  `0.148 → 0.042`, blur `5.6px`, highlight `0.304`, rim `0.096`, shadow `0.100`. Chrome
  quantizes alpha to 8 bits, so compare within `1/255`.
- **Existing suite.** All 74 tests pass. `Header.test.tsx` and `landing.test.tsx` mount
  `ThemeProvider` with `theme` and need the new shape.

## Success criteria

- `grep -rE "theme\.(colors|fonts|fontSizes|spacing|shadows)" src/` returns nothing.
- No hardcoded `#fff` or `rgba(255,255,255,…)` in `Header.tsx` or `Footer.tsx`.
- Every route renders unchanged, verified by the nav-pill assertion and by eye on
  `/`, `/readme`, `/writing`, `/lab`.
- Nav links no longer turn amber on hover in a light OS theme.
- `Changelog` absent from the nav; `/changelog` still reachable by URL.

## Risks

- **`index.css` deletions are site-wide.** The Vite `:root` sets
  `background-color: #242424` and `color: rgba(255,255,255,0.87)`. `GlobalStyles` (injected
  later by styled-components) already overrides both, so removal should be inert. Verify
  by rendering each route with `index.css` stripped before deleting.
- **The bridge is imperative.** `data-surface` is set on `<html>` by an effect, so it does
  not exist in the initial HTML. A route that paints before the effect runs would flash
  light chrome; `useLayoutEffect` prevents this in the SPA, but the attribute should also
  be hardcoded on `<html>` in `index.html` as the boot value. Unit tests that mount
  components without `Layout` must set the attribute themselves or they will assert
  against light tokens.
- **Collapsing the ramp** (`0.99`/`0.985`, `0.54`/`0.55`/`0.56`) shifts those exact pixels
  by a hair. Intentional; flag in review rather than chasing the diff.
- **Muted ink has no single truth.** The dominant alpha is `0.5` (15 uses) but `0.85`,
  `0.8`, `0.45`, `0.9`, and `0.55` all appear. The token takes the dominant value; pages
  keep their local alphas until migrated. Measured on `#12102a`,
  `rgba(255,255,255,0.5)` is `5.28:1` — comfortably AA.
- **`--chrome-ink-muted` fails AA today.** The footer's existing
  `rgba(255,255,255,0.45)` measures `4.49:1` on `#12102a` — under the 4.5:1 bar by a
  hair. Tokenizing it preserves the failure. Raising it to `0.5` (`5.28:1`) would fix it
  in one place and match the dominant muted ink, at the cost of a barely-perceptible
  brightening of the copyright line. Decide during implementation; do not tokenize a
  known-failing value silently.
- **`--color-border` is decorative.** `rgba(255,255,255,0.08)` on `#12102a` is `1.22:1`,
  far under the 3:1 non-text bar. That is acceptable for hairline dividers but must not be
  used for a control boundary that conveys state. The contrast test therefore excludes it.
