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

`Layout` sets `data-surface` on `<html>` from the route. Every page is currently bridged
to `inverted` because every page is still dark; the landing stays `inverted` permanently
since its chrome sits over video. Migrating a page to light means adding its path to
`LIGHT_ROUTES` in `Layout.tsx` and reworking that page's hardcoded colors.

`/changelog` is retired: the route still resolves, but it has no nav link and its neon
palette is deliberately outside the system.

**Known limitation:** `LIGHT_ROUTES` uses exact-string pathname matching, so adding `/lab`
would not match `/lab/foo` — a future migration needs prefix matching or per-slug enumeration.
