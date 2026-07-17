# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 9921
npm run build     # TypeScript compile + Vite production build
npm run lint      # Run ESLint
npm run preview   # Serve production build locally
```

Tests use **Vitest** + React Testing Library (jsdom). Backend logic (`functions/`)
and React components (`src/`) are covered.
```bash
npm run test       # watch mode
npm run test:run   # single run
```

After making code changes, always run:
```bash
npx tsc -b         # type errors across app + functions (project references)
npm run lint       # React/ESLint rules (catches things tsc misses, e.g. setState in effects)
npm run test:run   # tests
```

## Stack

- **React 19** + **TypeScript** (strict mode)
- **styled-components 6** for all styling — no CSS modules or plain CSS
- **framer-motion** for animations
- **React Router DOM 7** for routing
- **Vite 6** as the build tool; SVGs are imported as React components via `vite-plugin-svgr`
- **lucide-react** for icons

## Fonts

Loaded via Google Fonts in `index.html`:
- **Archivo** (400–700) — display face, headings. `--font-display`
- **Inter** (200–500) — body text, inherited copy. `--font-body`
- **JetBrains Mono** (400–500) — chrome and labels. `--font-mono`
- **Big Shoulders Display** (800) — `LoadingScreen` only, in CSS and in a canvas `ctx.font`.
  Deliberately outside the token system: a canvas cannot read a CSS custom property.
- **Anton** (400, its only weight) — the `/readme` cut-out wordmark only, referenced inside
  an SVG `<clipPath>` stencil in `About.tsx`. Outside the token system like Big Shoulders:
  SVG presentation attributes take a literal family name.
- **Playfair Display** (400, 500, italic) — loaded, genuinely unused

The three system faces have exactly one definition each, in `tokens.ts`. Author
`${p => p.theme.font.body}` — never a raw stack. Changing a face is a one-line change there.
Inline style objects (`React.CSSProperties`) cannot reach the theme, so they use
`'var(--font-mono)'` directly. `/changelog` keeps its own `--day-font-*` faces, as it keeps
its own palette.

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Landing` | Video background, loading screen, intro panel |
| `/readme` | `About` | Personal statement, dark editorial layout |
| `/changelog` | `Day` | **Retired.** Route kept, no nav link. |
| `/lab` | `Lab` | Lab index |
| `/lab/:slug` | `LabEntryRoute` | A lab entry |
| `/writing` | `Writing` | Blog index (published posts) |
| `/writing/:slug` | `WritingPost` | A post, rendered in its template |
| `/writing/admin` | `AdminPosts` | Admin post list (Cloudflare Access–gated) |
| `/writing/admin/new`, `/writing/admin/:id` | `AdminEditor` | Create/edit a post |
| `/loading` | `LoadingScreen` | Animated loading overlay |

All routes are wrapped by `Layout` (renders `Header` + `Footer` globally).
Blog routes are lazy-loaded so the markdown/highlighter bundle stays off the landing page.

## Blog system (Cloudflare-backed)

The site is no longer purely static — `/writing` is a dynamic blog backed by
Cloudflare. Posts live in **D1**, media in **R2** (served via the cached
`media.fei.io` custom domain), behind a thin **Pages Functions** API in
`functions/`. The admin (`/writing/admin`) is gated by **Cloudflare Access**
(GitHub login); `functions/api/admin/_middleware.ts` verifies the Access JWT,
with a dev bypass since Access doesn't run under `wrangler pages dev`. Markdown
renders with `react-markdown` (not MDX); each post picks one of three layout
**templates** (`src/components/Blog/templates/`).

- Config + bindings: `wrangler.toml` (project name is `fei-io`); schema in `migrations/`.
- One-time provisioning + troubleshooting: `docs/cloudflare-setup.md`.
- Full design + plan: `docs/brainstorms/` and `docs/plans/`.
- Local dev with the API: `npm run build && npx wrangler pages dev dist` (plain `npm run dev` serves only the SPA, no `/api/*`).

## Architecture

The portfolio is structured as a **day-journey visualization** — five time-of-day sections (Dawn, Morning, Afternoon, Evening, Midnight) that the user scrolls through, each representing a different facet of the developer's story.

### Key data flow

1. `Day.tsx` fetches `/data/portfolio.json` and transforms it into `TimeSection` objects via `transformJsonToTimeSections()` in `src/utils/`
2. Scroll position on `Day.tsx` drives `activeSection` + `scrollProgress` state, which gates animations and conditional rendering throughout the tree
3. Components consume `scrollProgress` as a 0–1 progress value passed as props
4. `About.tsx` also fetches `/data/portfolio.json` — `about.content` (string[])

### `public/data/portfolio.json` shape

```
{
  about:   { content: string[] }
  contact: { links: [{ name, link, icon }] }
  sections: [{ id, title, subtitle, gradient }]  // drives Day journey
}
```

### Directory roles

- `src/components/Layout/` — global shell rendered on every route
  - `Header.tsx` — fixed top-right nav bar; active link state, Home link when not on `/`
  - `Footer.tsx` — fixed bottom bar with copyright
  - `Layout.tsx` — renders `<Header> + {children} + <Footer>`
- `src/components/Landing/` — landing page (`/`) only
  - `index.tsx` — orchestrates video, loading screen, intro panel
  - `VideoBackground.tsx` — `<video>` with WebM + MP4 fallback
  - `LoadingScreen.tsx` — animated loading overlay
  - `IntroPanel.tsx` — hero text over video
- `src/components/DayJourney/TimeSection/` — one subdirectory per time period; each owns its own visuals and animations
- `src/components/DayJourney/TimeSection/Midnight/Constellation/` — animated constellation component featuring pets (Chinchilla, TabbyCat, Samoyed)
- `src/styles/tokens.ts` — the single source of truth: neutral oklch ramp at hue 265, type/space/radius/motion primitives, and the glass recipe driven by `GLASS_K`.
- `src/styles/tokens.css.ts` — emits the tokens as `:root` (light) and `[data-surface="inverted"]` (dark).
- `src/styles/theme.ts` — typed accessor over the tokens, returning `var(--x)` strings; `breakpoints` returns literal px strings (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280)
- `src/styles/styled.d.ts` — TypeScript augmentation so the theme is fully typed in all styled-components
- `src/types/index.ts` — shared interfaces: `JsonSection`, `TimeSection`, `Constellation`

### Landing lens reveals

The landing hides elements that surface **only under a draggable lens**. Give a node
`data-lens-reveal` and base `opacity: 0` (invisible on the page); `lensEngine.ts`'s
`buildLensWorld` flips it visible inside every refracted lens clone — one hook covers both
lenses and the metaball bridge. `TravelPath` (the travel-path reveal: Huangshan → Beijing →
Shanghai maps joined by a dashed two-tone route, terminating at the Dallas pin in the
lower-left light half — everything but Dallas hides below the `xl` breakpoint, all-or-nothing,
via CSS media query so the gate also works inside the clones), `MoodClock`
(Dallas time + mood-of-the-day, upper-right dark half), and `StackReveal` (tech-stack chips) ride
this. `StackReveal` renders once per role (`role="frontend"` under "Sr. Frontend Engineer",
`role="ai"` under "AI Product Engineer") and is nested *inside* that role's `<span>` in `Lockup`
rather than positioned at a page percentage — the role text is a fixed 14px, so its centre is a
fixed pixel offset from centre that drifts as a percentage; nesting keeps the chip row centred
under the text at every width. It is gated by `Lockup`'s `interactive` prop, so like the others it
never ships to touch / reduced-motion. Two deliberate calls: the row is laid out **flat** and lets
the convex refraction supply the arc (a baked-in arc only lines up at one lens position); and the
chip is **surface-aware** so each stack echoes its role text — light-glass / dark-ink on the light
half (frontend, like `DallasPin`), dark-glass / light-ink on the dark half (AI, like `MoodClock`).
The dark chip must be dark *and* fairly opaque: the lens's chromatic-aberration filter screen-blends
the split channels and washes a thin, translucent chip toward light (which greyed out an earlier
attempt), so its light marks only stay legible on a deep, near-opaque fill.

Two gotchas. The clone is a **static snapshot**, so live/dynamic content freezes at
clone-build time unless synced into every `[data-lens-world]` copy each tick — see `MoodClock`
driving `[data-time-reveal]` nodes from a `setInterval`. And a revealed node may set its own
opacity via `data-reveal-opacity` (default `1`; the map rides `0.8`). Reveals are gated with
the lenses: desktop only (hover + fine pointer), never shipped to touch / reduced-motion.

### Route transitions

`AppRoutes` wraps the routes in `AnimatePresence mode="wait"` and feeds the **destination
path** to exiting pages via the `custom` prop; every page wraps itself in `PageTransition`
(the landing is wrapped in `AppRoutes` instead — it needs the wrapper only for its exit),
whose exit variants are functions of that destination. (Reading `useLocation()` inside the
exiting tree does NOT work — exit variants are captured before that re-render lands;
`custom` is the supported channel.)

Three exit paths:

- **To any non-home route** — the `Curtain` sweep: a 170vw box painted in the *destination*
  surface slides over the old page. It depends on `Layout` flipping `data-surface` eagerly,
  so the new page's background is pixel-identical to the curtain at hand-off.
- **To home, first visit this page load** — exit immediately, no sweep: the landing's own
  `Loader` overlay is the transition. "First visit" is `introState.ts`'s module flag, latched
  by the landing engine's `onRevealed`.
- **To home, landing already revealed** — `HomeCurtains` (mounted in `AppRoutes` *outside*
  `AnimatePresence`, because it must outlive the exiting page): two half-screen curtains
  mirroring SplitStage's gradients slide in from the sides, meet in the middle, and part over
  the freshly mounted landing. The old page holds until covered (an exit to `opacity: 0.999`
  for `HOME_CURTAIN_IN` — the change must be real for framer to spend the duration; same-value
  keyframes complete instantly), and `Layout` defers the `data-surface` flip by the same
  interval so the surface swaps under full cover.

### Styling conventions

Animation conventions:
- Use `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) as the standard easing — never bounce or elastic
- Always handle `useReducedMotion()` for entrance animations
- Pause CSS keyframe animations when sections are off-screen using `animationPlayState`

### Design system

`src/styles/tokens.ts` is the single source of truth: a neutral oklch ramp at hue 265,
type/space/radius/motion primitives, and a glass recipe driven by one dial (`GLASS_K`).
`tokens.css.ts` emits it as `:root` (light) and `[data-surface="inverted"]` (dark).
`theme.ts` is a typed accessor returning `var(--x)` strings — author
`${p => p.theme.color.ink}` as before.

`theme.breakpoints` returns literal px strings, because CSS custom properties are
illegal inside `@media` queries.

Glass has **two** tints, not one. The fill and rim (`--glass-top/bot/rim`) follow the
surface; the highlight and sheen (`--glass-hi`, `--glass-sheen`) are always white, because
they model reflected light rather than pigment. Tinting them with ink turns a highlight
into a hard dark line. The drop shadow stays black on both surfaces — it is cast, not
reflected. On the inverted surface both tints are white, so the recipe reduces to the
original single-tint one and the dark theme is byte-for-byte unchanged.

`--ui-scheme` (`light` / `dark`) drives the CSS `color-scheme` property, so the UA themes
native controls — the admin's `<select>` popups — and scrollbars to match the surface.
It is deliberately named outside the `--color-*` family so the "every colour is oklch"
test guard skips it.

The light surface is **near-neutral grey paper, not white**: `--color-surface` is
`oklch(0.913 0.0013 106.4)` (`#e2e2e1`) — a bespoke off-ramp value, a hair darker than the old
`--n-3` and essentially hueless. Three tokens are tuned against its *lightness* and move only if
that changes — see `docs/adr/0001-grey-light-surface.md`.

Light pages also wear a faint **paper grain**: a single fixed noise layer (`body::after`, scoped
to `data-surface="default"`) blended `overlay` at low opacity — a heavier cousin of the landing's
`--frost-noise`, defined in `GlobalStyles.ts`. It sits over content but is imperceptible on text
and shows only as texture on the flat paper. Contrast is unaffected; the deep pages and the
landing keep their own treatments.

`--accent` is the warm yellow, and it is **surface-aware** — it has to be. On the inverted
surface it is the legacy `#fcd34d` (12.85:1); on the light surface that same yellow drops to
1.14:1, and no lightness of it clears AA on both, so the light value is darkened to
`oklch(0.50 0.111 92)` (4.73:1), which at that hue necessarily reads olive-bronze. It is the
link colour on every light page. `--accent-ink` is text placed *on* an accent fill: the deep
surface on dark, white on light. Hue 92 sits 173° from the ramp's 265, i.e. near its
complement — the warmth is deliberate.

On light, `--chrome-ink-muted` equals `--color-ink-muted` (both `--n-9`), exactly as on the
inverted surface. There is no separate chrome-muted weight on either surface any more.

Never hardcode the accent. For a translucent accent use
`color-mix(in srgb, var(--accent) 35%, transparent)`, which renders byte-identically to the
old `rgba(252,211,77,0.35)` and follows the surface. `/changelog`'s neon is out of the system
and keeps its own hex.

`Layout` sets `data-surface` on `<html>` from the route, resolving it deny-then-allow:
`DARK_PREFIXES` (`/writing/admin`, `/lab/`) is consulted first, then `LIGHT_EXACT` and the
`/writing/` prefix, falling through to `inverted`. **The ordering is load-bearing** —
`/writing/admin` is itself matched by the `/writing/` prefix. Post slugs come from D1 at
runtime, so they cannot be enumerated. The fall-through must stay `inverted`, because an
unmigrated page still hardcodes `#12102a`.

The flip is immediate on location change — PageTransition's sweep depends on that (see
"Route transitions" below) — with one exception: a *return* to home defers the flip by
`HOME_CURTAIN_IN` so the surface swaps while HomeCurtains has the viewport covered;
flipped eagerly, the old page inverts on screen before the curtains arrive.

Light: `/readme`, `/lab`, `/writing`, `/writing/:slug`.
Inverted: `/` (chrome over video, permanently), `/loading`, `/changelog`, `/lab/:slug`
(bespoke entries), `/writing/admin*`. Migrating one of those means adding its path and
reworking that page's hardcoded colors.

`data-surface` is a plain attribute selector, not bound to `<html>`. Any element can flip its
own surface, and two do: `PostBody`'s `<pre>` (a dark code island, so `.hljs-title`'s accent
stays yellow) and `PhotoEssay`'s `Overlay` (a scrim over a photograph, where the title and
date shared with the no-cover header must read white). Both re-declare `color`, because CSS
inherits the *computed* ink from the ancestor and the attribute alone would not override it.

`/changelog` is retired: the route still resolves, but it has no nav link and its neon
palette is deliberately outside the system.

## Agent skills

### Issue tracker

Issues live as GitHub issues in `hfknight/fei.io`, driven by the `gh` CLI. External PRs are
not a triage surface. See `docs/agents/issue-tracker.md`.

### Triage labels

The five canonical triage roles map 1:1 onto identically-named labels. See
`docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` + `docs/adr/` at the repo root, both created lazily. See
`docs/agents/domain.md`.
