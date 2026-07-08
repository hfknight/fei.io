# Landing Redesign — Phase 2: Draggable Liquid-Glass Lenses

**Date:** 2026-07-08
**Branch:** `redesign` (continues after Phase 1, HEAD `40d5c80`)
**Status:** Design approved (all-in scope) pending spec review
**Depends on:** Phase 1 (`docs/brainstorms/2026-07-08-landing-redesign-requirements.md`) — shipped.

## Goal

Add the deferred marquee interaction to the split-screen landing: **two draggable
liquid-glass lenses** that refract the live hero beneath them (Snell's-law
displacement + chromatic aberration), deform with a liquid spring while dragged,
and **merge into a single metaball blob** when dragged together — with a
split-from-center **intro** at the end of the loading reveal. Ported full-fidelity
from the design source into the existing imperative engine.

**Scope: all-in** — both the lenses (2a) and the metaball merge (2b) in one pass.
The merge is the performance risk; it is measured and, if needed, its per-frame
map round-trip is optimized (see Performance) rather than shipped janky.

## Source of truth

Design source (in-repo): `docs/brainstorms/2026-07-08-landing-redesign-source.dc.html`.
Phase 2 ports these (verified line anchors):

| Concern | Source lines |
|---|---|
| Lens markup (`data-lens="1"/"2"`, clip/fx/rim) | 134–149 |
| `generateLensMap` (Snell displacement, per lens, cached) | 278–337 |
| `generateBlobMap` (metaball smooth-union map, per-frame while merged) | 226–277 |
| `metaballPath` (SVG connector path) | 641–688 |
| `shiftPath` | 790–796 |
| `buildLensFilter` / `lensPropsKey` / `applyLensProps` / `injectLensFilter` | 338–414 |
| `buildLensWorld` (hero clone + per-frame video→canvas) | 509–546 |
| `setupLens` (drag + spring deform) | 547–640 |
| `initBridge` (metaball rAF loop) | 689–789 |
| `initLens` / `captionRect` / `lensDefaultPos` | 415–450 |
| `playLensIntro` (single → split → spring out) | 451–508 |
| main-tick video→canvas paint (Phase 1 skipped) | 1041–1050 |
| `finishLoader` → `playLensIntro` (Phase 1 omitted) | 860 |

## Architecture

Same **React shell + imperative engine**. Phase 2 additions:

- **`src/components/Landing/Lenses.tsx`** (new) — renders the two lens `<div>`s
  (`data-lens="1"/"2"` each with `[data-lens-clip]` → `[data-lens-fx]`,
  `[data-lens-rim]`), initial inline styles (`opacity:0`) verbatim from source
  134–149, **plus** an empty container-scoped SVG filter host
  (`[data-lens-filter-host]`, width/height 0) that the engine populates. Rendered
  by `index.tsx` **only when `interactive`** (reduced-motion/touch get no lens DOM).
- **`src/components/Landing/lensEngine.ts`** (new, flat — matches Phase 1's file layout) — the ported lens physics as
  `createLenses(ctx) → { playIntro(), paintWorlds(), destroy() }`, where `ctx`
  carries the shared registry helpers (`root`, `q`, `qa`, `on`, `loop`, `later`,
  `opts`, and a getter for the live `[data-jojo]`/`[data-ollie]` video elements).
  All rAF loops (per-lens `springTick` ×2, bridge `loop`) and listeners
  (`pointerdown` per lens, `pointermove`/`pointerup` on window, `resize`) route
  through the shared registry — nothing is created outside it. Keeping this in its
  own module keeps `landingEngine.ts` focused (it would otherwise ~double).
- **`landingEngine.ts`** (modify) — when `interactive`, call `createLenses(ctx)` at
  setup; in the main tick call `lenses.paintWorlds()` (re-adds source 1041–1050);
  in `finishLoader` call `lenses.playIntro()` when `playIntro` (re-adds source
  860). On a non-`playIntro` interactive mount, lenses **place at rest** (no split
  choreography). Expose the video-pair getter to `ctx`.
- **`landingConfig.ts`** (modify) — add the lens tuning constants from the source's
  `data-props` defaults: `surfaceProfile:'Convex circle'`, `refractiveIndex:1.5`,
  `glassThickness:10`, `bezelWidth:45`, `magnify:0.05`, `lensSize:128`,
  `magnifyScale:1`, `liquidEnabled:true`, `liquidStretch:0.16`,
  `chromaticAberration:true`, `chromaticStrength:0.2`.

### The SVG filter host (fixes the source's StrictMode bug)

The source's `injectLensFilter` appends `#lensRefractSvg` to `document.body` and
guards re-entry with `if (document.getElementById('lensRefractSvg')) return` — which
**breaks under StrictMode** (mount 2 sees mount 1's stray node and skips, or mount
1's cleanup strips mount 2's filter). Fix: React renders the host inside the
container; the engine finds it via `q('[data-lens-filter-host]')` and sets its
`innerHTML`. React removes it on unmount. No `document.body`, no id guard,
container-scoped, StrictMode-safe.

## Lifecycle / gating

- **`interactive` (`!reducedMotion && canHover`)** — the only path with lenses.
  Reduced-motion/touch render no `<Lenses/>` and the engine skips `createLenses`.
- **Intro**: on a `playIntro` mount, `finishLoader` triggers `playLensIntro`
  (one lens fades in at viewport center, then both split out and spring to rest
  anchored to the pet captions, rendering the connected metaball blob en route).
  On an `interactive && !playIntro` re-nav mount (no loader), lenses **place at
  their rest positions immediately**, no split animation.
- **Teardown** (first-class, verified like Phase 1): every `springTick`/bridge
  rAF via `loop`; every `pointer*`/`resize` listener via `on`; the SVG filter host
  removed by React; the three full-hero clones (`buildLensWorld` ×2 lenses + bridge)
  and the bridge/rim DOM nodes removed on destroy; `destroy()` idempotent. A
  navigate-away mid-drag or StrictMode double-mount must leak nothing and leave no
  stray filter/clone.

## Performance (the gate)

The single-lens path is cheap: `generateLensMap` is generated once and cached by
`lensPropsKey`; per frame it only pays the video→canvas paint of the hero clone +
the filter re-run. **The cost is the merged state**: `initBridge`'s loop calls
`generateBlobMap` → **`canvas.toDataURL()`** (synchronous PNG *encode* of a
~1000px supersampled canvas) → `feImage` href → decode + full `feDisplacementMap`
re-render, **every frame**.

- **Gate:** with two lenses **forced into overlap and held**, measure frame time
  in that merged state (dev server is fine — this is render cost, not module-load).
  A single dragged lens will pass and give false confidence — measure the merge.
- **If it holds ~60fps:** ship as-is.
- **If close:** replace the per-frame PNG round-trip — reuse a persistent
  `<canvas>` and feed the filter via `createImageBitmap`/direct canvas source
  instead of `toDataURL()` re-encode.
- Three full-hero DOM clones repainted per frame is also non-trivial even
  un-merged; watch single-lens drag FPS too.

## Testing

Engine/canvas physics isn't meaningfully unit-testable frame-by-frame (same as
Phase 1). Coverage focuses on the seams: `<Lenses/>` renders only when
`interactive`; the engine calls `createLenses`/`playIntro` on the right paths;
mount→unmount tears the lenses down (no leaked rAF/listener/filter host). Manual
browser verification (controller): single-lens drag + refraction + chromatic
aberration; liquid spring deform + jelly settle; the split-from-center intro; the
metaball merge on overlap (with a frame-time measurement in the held-merge state);
reduced-motion/touch shows no lenses; navigate-away mid-drag leaks nothing.

## Out of scope / open items

- Nothing beyond the lenses (Phase 1 is complete and shipped on the branch).
- **Merge frame-time** is the open risk — measured during the build; the round-trip
  is optimized if needed (user chose all-in, so 2b is not cut — it's made to work).
- Mobile/touch: no lenses (by design).
