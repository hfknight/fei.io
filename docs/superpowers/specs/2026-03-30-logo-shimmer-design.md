# Logo Shimmer Animation — Design Spec

**Date:** 2026-03-30
**Status:** Approved

## Overview

Add a diagonal shimmer sweep to the landing page logo that activates after the entrance animation settles. The shimmer is a continuous idle animation — a light beam that crosses the logo, pauses, then repeats.

## Visual Behaviour

A narrow diagonal white-to-transparent gradient strip sweeps left→right across the logo. The beam is masked to the exact SVG shape so it only appears within the logo boundaries. After the sweep completes, the logo sits still for ~4.4 seconds before the next sweep.

## Implementation

**File changed:** `src/components/Landing/IntroPanel.tsx` only.

### Structure

Wrap the existing `LogoIcon` in a new `LogoShimmerWrap` container:

```
<LogoShimmerWrap>
  <LogoIcon />
  <ShimmerBeam />
</LogoShimmerWrap>
```

### `LogoShimmerWrap` (styled-component)

- `position: relative`, `width: 88px`, `height: 88px`
- `overflow: hidden` to clip the beam
- CSS `mask-image` using the logo SVG as an inline data URI, sized to `88px 88px` — this masks both the logo fill and the shimmer beam to the exact SVG shape

### `ShimmerBeam` (styled-component)

- `position: absolute`, `top: -10px`, `left: 0`, `width: 36px`, `height: 108px`
- Background: `linear-gradient(90deg, transparent, rgba(255, 240, 200, 0.5), transparent)`
- `transform: rotate(-20deg)` for the diagonal angle
- `transform-origin: top left`
- CSS keyframe animation:
  - `0%` → `translateX(-88px)` with `animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1)` — applies ease-out-expo only to the sweep
  - `12%` → `translateX(124px)` with `animation-timing-function: linear` — holds position for the idle pause
  - `100%` → `translateX(124px)` (beam stays off-screen right until next cycle)
  - Duration: `5s`, overall `animation-timing-function: linear`
  - `animation-delay: 1.5s` — waits for entrance to fully settle (fadeUp delay 0.4s + duration 0.9s = 1.3s, plus 0.2s buffer)
  - `animation-iteration-count: infinite`
  - `animation-fill-mode: both`

### Reduced Motion

```css
@media (prefers-reduced-motion: reduce) {
  ShimmerBeam { display: none; }
}
```

Or via framer-motion's `useReducedMotion()` hook — pass a prop to conditionally render the beam.

## Timing Summary

| Phase | Duration |
|---|---|
| Entrance settles | 0 → 1.3s |
| Buffer before first shimmer | 1.3s → 1.5s |
| Sweep (left to right) | 0.6s (12% of 5s cycle) |
| Idle pause | ~4.4s |
| Loop repeats | every 5s |

## Constraints

- No changes outside `IntroPanel.tsx`
- No new dependencies
- Existing `LogoIcon` hover glow effect is preserved
- Existing `Logo` (motion.div) entrance animation is unchanged
