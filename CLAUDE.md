# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server on port 9921
npm run build     # TypeScript compile + Vite production build
npm run lint      # Run ESLint
npm run preview   # Serve production build locally
```

No test suite is configured.

After making code changes, always run both:
```bash
npx tsc --noEmit   # type errors
npm run lint       # React/ESLint rules (catches things tsc misses, e.g. setState in effects)
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
- **Inter** (200–500) — body text, used in `/readme` and `/contact`
- **JetBrains Mono** (400–500) — nav, footer, labels, monospace accents
- **Cormorant Garamond** (400) — loaded, available
- **Big Shoulders Display** (800) — loaded, available
- **Playfair Display** (400, 500, italic) — loaded, available

Additional fonts loaded via `src/index.css` (used in `/changelog` day sections):
- **Outfit** — primary day section font (`--day-font-primary`)
- **Exo 2** — day section secondary (`--day-font-secondary`)
- **Audiowide**, **Neonderthaw**, **Press Start 2P** — special section effects

## Routes

| Path | Component | Description |
|---|---|---|
| `/` | `Landing` | Video background, loading screen, intro panel |
| `/readme` | `About` | Personal statement, dark editorial layout |
| `/changelog` | `Day` | Day-journey scroll visualization |
| `/contact` | `Contact` | Contact links from portfolio.json |
| `/work` | `Work` | (placeholder) |

All routes are wrapped by `Layout` (renders `Header` + `Footer` globally).

## Architecture

The portfolio is structured as a **day-journey visualization** — five time-of-day sections (Dawn, Morning, Afternoon, Evening, Midnight) that the user scrolls through, each representing a different facet of the developer's story.

### Key data flow

1. `Day.tsx` fetches `/data/portfolio.json` and transforms it into `TimeSection` objects via `transformJsonToTimeSections()` in `src/utils/`
2. Scroll position on `Day.tsx` drives `activeSection` + `scrollProgress` state, which gates animations and conditional rendering throughout the tree
3. Components consume `scrollProgress` as a 0–1 progress value passed as props
4. `About.tsx` and `Contact.tsx` also fetch `/data/portfolio.json` — `about.content` (string[]) and `contact.links` respectively

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
- `src/styles/theme.ts` — single source of truth for the warm amber/cream color palette, spacing scale, and responsive breakpoints (`sm` 640 / `md` 768 / `lg` 1024 / `xl` 1280)
- `src/styles/styled.d.ts` — TypeScript augmentation so the theme is fully typed in all styled-components
- `src/types/index.ts` — shared interfaces: `JsonSection`, `TimeSection`, `Constellation`

### Styling conventions

The `theme` object (amber/cream palette) applies to the day-journey sections. The standalone pages (`/readme`, `/contact`) use a **dark indigo palette** (`#12102a` background) that intentionally does not use theme tokens — this is by design to match the cinematic landing video aesthetic. Do not "fix" hardcoded colors on these pages.

All responsive work is done with styled-components media queries referencing `theme.breakpoints`.

Animation conventions:
- Use `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo) as the standard easing — never bounce or elastic
- Always handle `useReducedMotion()` for entrance animations
- Pause CSS keyframe animations when sections are off-screen using `animationPlayState`
