# Page Transitions Design

**Date:** 2026-03-30
**Status:** Approved

---

## Overview

Add animated slide-up page transitions between all non-landing routes. The landing page (`/`) is excluded from enter animations because it manages its own loading state. Transitions use framer-motion's `AnimatePresence` with `mode="wait"` so the exiting page fully completes before the entering page begins.

---

## Animation Spec

| Property | Value |
|---|---|
| Style | Slide up + fade |
| Direction | Always up (no directional awareness) |
| Duration | 380ms |
| Easing | `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out-expo — matches existing project standard) |
| Mode | `mode="wait"` — sequential, not overlapping |
| Reduced motion | Instant opacity-only transition (no translate, duration 0) |

**Exit:** `translateY(0) → translateY(-24px)`, `opacity 1 → 0`
**Enter:** `translateY(24px) → translateY(0)`, `opacity 0 → 1`

---

## Architecture

### New Files

**`src/components/PageTransition.tsx`**
A `motion.div` wrapper that applies slide-up enter/exit variants. Used by every page component except `LandingPage`. Handles `useReducedMotion()` — when reduced motion is preferred, variants use instant opacity-only transitions.

```
<PageTransition>
  {page content}
</PageTransition>
```

**`src/AppRoutes.tsx`**
An inner component rendered inside `<Router>` so it can call `useLocation()`. Wraps `<Routes>` in `<AnimatePresence mode="wait">` keyed by `location.pathname`. This triggers a remount (and therefore exit + enter animations) on every route change.

```
const location = useLocation();
<AnimatePresence mode="wait">
  <Routes location={location} key={location.pathname}>
    ...all routes...
  </Routes>
</AnimatePresence>
```

### Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Replace inline `<Routes>` block with `<AppRoutes />` |
| `src/pages/About.tsx` | Wrap root element with `<PageTransition>` |
| `src/pages/Contact.tsx` | Wrap root element with `<PageTransition>` |
| `src/pages/Work.tsx` | Wrap root element with `<PageTransition>` |
| `src/pages/Day.tsx` | Wrap root element with `<PageTransition>` |
| `src/components/Landing/index.tsx` | No changes — intentionally excluded |

---

## Landing Page Exception

`LandingPage` does not use `<PageTransition>`, so it has no enter animation. When navigating *to* `/`, the previously active page will still animate out (slides up and fades) — this is intentional and clean, since the loading screen begins immediately after. When navigating *from* `/`, the landing has no exit animation; the destination page enters normally.

---

## Constraints & Notes

- framer-motion is already a project dependency — no new packages needed
- `useReducedMotion()` is already used in the project (IntroPanel, LoadingScreen) — follow the same pattern
- The `cubic-bezier(0.16, 1, 0.3, 1)` easing is the project-wide animation standard per CLAUDE.md
- `mode="wait"` ensures no visual overlap between pages during transition
- `PageTransition` wraps the outermost element of each page — it must be a block-level container so it fills the page correctly
