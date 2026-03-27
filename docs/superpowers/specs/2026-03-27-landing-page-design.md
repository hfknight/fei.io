# Landing Page Design Spec

**Date:** 2026-03-27
**Approach:** Option B — Glassmorphism
**Status:** Approved

---

## Overview

Replace the root `/` route with a new cinematic landing page. The existing day-journey portfolio moves to `/journey`. The landing page features a full-screen looping video background, a centered glassmorphism identity panel, a glass navigation bar, and a twilight-themed loading screen.

---

## Routing

- `/` → new `LandingPage` component (`src/components/Landing/`)
- `/journey` → existing `Day` component (currently mounted at `/`)
- Update route definitions in `App.tsx`

---

## Video Background

- `<video>` element: `autoPlay`, `loop`, `muted`, `playsInline`
- Source: `/intro.mp4`
- Positioned absolutely, fills `100vw` / `100vh`, `object-fit: cover`
- A subtle dark overlay sits on top: `rgba(0, 0, 0, 0.3)`, also absolutely positioned, full size
- Video layer is behind all content (z-index stacking: video → overlay → nav → panel)

---

## Loading Screen

Shown while the video is buffering; hidden once the video's `canplay` event fires.

- **Background:** twilight gradient, top to bottom: `#0d1b2a` (deep navy) → `#1a1025` (indigo-charcoal)
- **Content:** outlined logo (`logo-outlined.svg`) centered horizontally and vertically
- **Logo animation:** fades in over `800ms` on mount; slow opacity pulse to signal loading
- **Exit transition:** cross-fades out over `600ms` once `canplay` fires, revealing video beneath
- Loading screen sits above everything else during load (highest z-index), then unmounts after fade

---

## Glass Identity Panel

Centered absolutely on screen (both axes), layered above the video overlay.

| Property | Value |
|---|---|
| `backdrop-filter` | `blur(12px)` |
| Background | `rgba(255, 255, 255, 0.08)` |
| Border | `1px solid rgba(255, 255, 255, 0.15)` |
| `border-radius` | `16px` |
| Padding | `40px` vertical / `48px` horizontal |

**Contents (top to bottom):**

1. Outlined logo SVG (`logo-outlined.svg`) — `~120px` wide, centered
2. `32px` gap
3. Tagline text, centered:
   > "Web Developer based in Texas, US.
   > creating aesthetical and intuitive user interfaces that blend thoughtful design with robust engineering."
   - Font: `Inter`
   - Color: `rgba(255, 255, 255, 0.85)`
   - Size: `~1rem`, line-height `~1.6`

---

## Navigation Bar

Fixed top bar, full width, sits above video content.

| Property | Value |
|---|---|
| `backdrop-filter` | `blur(8px)` |
| Background | `rgba(255, 255, 255, 0.06)` |
| Bottom border | `1px solid rgba(255, 255, 255, 0.1)` |
| Position | `fixed`, `top: 0`, `width: 100%` |

**Layout:**
- Left: outlined logo (~32px tall), links to `/`
- Right: nav link list (extensible)
  - "Journey" → `/journey`
- Link style: white, `opacity: 0.75`, hover transitions to `opacity: 1`

---

## Component Structure

```
src/components/Landing/
  index.tsx          # LandingPage root — composes all sub-components
  VideoBackground.tsx
  LoadingScreen.tsx
  GlassPanel.tsx
  NavBar.tsx
```

---

## Implementation Notes

- All styling via styled-components (project convention)
- No theme color tokens needed for this page — all values are bespoke dark/glass values
- Loading state managed in `LandingPage` via a `useState<boolean>` flag, set to `false` on video `canplay`
- The outlined logo SVG is already at `src/assets/logo-outlined.svg` and imported as a React component via `vite-plugin-svgr`
- No audio on the video (`muted` attribute is sufficient; no need for JS volume control)
