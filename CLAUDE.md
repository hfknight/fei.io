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
- **Archivo** (400–700) — display face, headings
- **Inter** (200–500) — body text, inherited copy
- **JetBrains Mono** (400–500) — chrome and labels
- **Big Shoulders Display** (800) — loaded, unused
- **Playfair Display** (400, 500, italic) — loaded, unused

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Landing` | Video background, loading screen, intro panel |
| `/readme` | `About` | Personal statement, dark editorial layout |
| `/changelog` | `Day` | **Retired.** Route kept, no nav link. |
| `/work` | `Work` | (placeholder) |
| `/connect` | `Connect` | Contact links from portfolio.json |
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
4. `About.tsx` and `Connect.tsx` also fetch `/data/portfolio.json` — `about.content` (string[]) and `contact.links` respectively

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

The light surface is **grey paper, not white**: `--color-surface` is `--n-3` (`#e3e4e7`), chosen
to sit inside the 0.937–0.875 band of the landing's left plate. Three tokens are tuned against
that ground and move with it — see `docs/adr/0001-grey-light-surface.md`.

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

Light: `/readme`, `/work`, `/connect`, `/lab`, `/writing`, `/writing/:slug`.
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
