# Landing Redesign — Split-Screen Pet Hero

**Date:** 2026-07-08
**Branch:** `redesign`
**Status:** Design approved pending review

## Goal

Replace the current landing page (`/`) — a single full-screen video with a
centered intro panel and word-cycling canvas loader — with the split-screen
Jojo/Ollie hero designed in Claude Design (project `4a32a7ee-…`, file
`Jojo & Ollie Split.dc.html`).

The new landing is a 50/50 split: **Jojo** (left, light) and **Ollie** (right,
dark), each a short head-turn video clip that the pet's gaze **tracks the cursor
by scrubbing `currentTime`**. A shared center lockup reads "I'm 〔feather〕 Fei".
A liquid-glass loading overlay fills the feather logo bottom→top by the **real
byte-download progress** of both clips, then flips the logo to its colored form
and parts frosted curtains to reveal the videos.

## Scope

**This spec (Phase 1 — core):**
- Split-screen dual-video stage with cursor-driven head-tracking (video scrub)
- Hover-frost on the inactive half + center seam sheen + logo/hairline glow
- Full loading sequence: byte-progress logo fill → 3D flip reveal → curtain part → staggered text/caption reveal
- Center lockup (tagline, "I'm 〔logo〕 Fei", dual role labels) + per-pet captions
- Reduced-motion + touch/no-hover fallback (polished)
- Reuse the global `Header`/`Footer`; port the design's liquid-glass pill-hover onto `Header`

**Phase 2 (separate spec, not now):**
- The two draggable liquid-glass refraction lenses (Snell's-law displacement
  maps, chromatic aberration) and the metaball "merge" bridge when they touch.

**Explicitly out of scope:** changing any other route; the sibling design files
(`Jojo & Ollie Landing`, `Jojo/Ollie Head-Track`) — the Split file is canonical.

## Approach: React shell + ported imperative engine

The design is ~1000 lines of imperative canvas + SVG-filter + rAF physics on a
custom `DCLogic` runtime. It is deliberately **not** rewritten in
framer-motion — a declarative rewrite would be larger and worse. Instead:

- **React shell** — styled-components render the markup/structure and integrate
  with the router, `useReducedMotion`, and the loader lifecycle.
- **Imperative engine** — the `DCLogic` class is ported to a plain TS module
  (`engine/`), instantiated from a single `useEffect` against a container `ref`,
  and fully torn down on unmount.

### Component structure (`src/components/Landing/`)

| File | Responsibility |
|---|---|
| `index.tsx` | Orchestrator. Renders the stage + lockup + captions + loader. Owns the engine lifecycle (`useEffect` create/destroy), reduced-motion + hover detection, and the `hasShownLoading` skip flag. |
| `SplitStage.tsx` | The two halves, `<video>` elements (Jojo/Ollie), frost overlays, center seam. Refs handed to the engine. |
| `Lockup.tsx` | Center "I'm 〔feather〕 Fei" + tagline + dual role labels. Shared geometry with the loader's reveal lockup. |
| `PetCaption.tsx` | Jojo (top-left) / Ollie (bottom-right) caption blocks. |
| `Loader.tsx` | Liquid-glass curtain overlay: frosted curtains, corner-bracket box, fill-logo SVG (front) + colored logo (back) for the 3D flip, reveal lockup. |
| `engine/index.ts` | Engine entry — wires the sub-modules to refs, owns all rAF loops + listeners + teardown. |
| `engine/loader.ts` | Streaming fetch of both clips → byte progress → `setLoaderFill`; time-based creep fallback; `finishLoader` choreography. |
| `engine/headTrack.ts` | `mousemove` → per-side gaze target → eased `currentTime` seek of the active clip. |
| `engine/frostSeam.ts` | Inactive-half frost, seam sheen, hairline + logo glow (per-frame). |

Exact file split may consolidate during implementation (e.g. frost/seam/track
can share one rAF `tick`), but the **engine is one self-contained unit** with a
single create/destroy interface consumed by `index.tsx`.

### Lifecycle / data flow

1. **Mount** → engine starts. Both clips fetched via streaming `fetch` +
   `ReadableStream`; `received/total` bytes drive the logo fill. A time-based
   `creep` (capped 0.9) keeps motion if `content-length` is missing.
2. **Both clips done** → `finishLoader`: fill→1 → logo 3D-flips to colored form
   → curtains part + tagline/labels slide in → corner brackets settle → reveal
   lockup fades out over the live video → captions slide in.
3. **Steady state** → `mousemove` scrubs the active side's clip to the gaze
   frame, frosts the inactive half, lights the seam/hairlines/logo;
   `mouseleave` eases back to rest (each pet holds its last pose).
4. **Unmount** → cancel **every** rAF (main tick, loader tick, and Phase-2 lens
   ticks), remove **every** listener (`mousemove`/`mouseleave`/`resize` and
   Phase-2 `pointer*`), and remove any injected DOM (Phase-2 `#lensRefractSvg`).

### Fixing the source's teardown leak (required)

The source's `componentWillUnmount` only removes `mousemove`/`mouseleave` and
the main `raf`. Ported verbatim into an SPA, every visit to `/` and back would
leak listeners, rAF loops, and injected nodes. **The port must:**
- Scope all element lookups to the container `ref`, never `document`/`window`
  globals for owned nodes.
- Track and cancel every rAF handle and remove every added listener/node in the
  effect's cleanup.

## Reconciliations with the existing app

- **Nav/footer:** Reuse the global `Header`/`Footer` (rendered by `Layout` on
  every route). Do **not** bake the design's own nav/footer into the landing.
  Port the design's `.glassnav` liquid-glass pill-hover onto `Header` so it
  matches. Links already align (Readme/Changelog/Lab/Work/Writing/Connect).
  - **Verify during build:** the design's footer copyright sits over the *light*
    left half (dark text); the global `Footer` is styled light-on-dark for the
    current video. Confirm legibility on `/`; add a landing-specific footer
    treatment only if needed.
- **Loader gating:** Replace `MIN_LOADING_MS` + `videoReady` with real
  byte-progress + `done` gate. **Preserve** the `hasShownLoading` module flag so
  SPA re-navigation to `/` skips the intro (fresh page load replays it).
- **Palette:** Keep the design's `oklch(...)`/gray values verbatim. Like
  `/readme` and `/contact`, the landing is intentionally off-theme; do not force
  theme tokens (per `CLAUDE.md`).
- **Fonts:** `Cormorant Garamond` + `JetBrains Mono` already load. Add
  `Manrope` (design body font) to `index.html` Google Fonts only if a visible
  element needs it; otherwise skip.
- **Feather asset:** `src/assets/fei-feather-outlined.svg` is already present and
  byte-identical to the design's copy. Reuse it.

## Reduced-motion + touch/mobile fallback (polished)

Gate on `useReducedMotion()` and `matchMedia('(hover: hover) and (pointer: fine)')`.

When reduced-motion **or** no fine-hover pointer:
- **Loader:** skip the streaming choreography; show the colored logo + a quick
  fade once the first playable frame is ready. No curtain/flip sequence.
- **Head-track:** clips parked at their resting frame (`T0 + dur*rest`); no
  per-frame seeking.
- **Frost/seam/lenses:** off. Seam is a static hairline.
- **Layout:** keep the 50/50 split with static resting poses and the centered
  lockup. On narrow screens, scale the lockup down and simplify/hide captions
  so nothing overlaps. (No horizontal page scroll.)

## Performance risks

1. **Seek storms (was highest risk — mitigated).** The clips shipped as
   single-keyframe H.264 (decode-from-0 on every seek → guaranteed stutter).
   Both were re-encoded **all-keyframe (GOP=1), trimmed to 6.5s** (156/156
   keyframes each), so every seek is zero-decode. Still confirm the live feel on
   the first build spike; if anything, fall back to throttled seeks.
2. **Loader download gate.** The reveal waits for *both* clips to fully
   download — now ~7.2 MB total (jojo 3.89 MB + ollie 3.34 MB). The animated
   fill masks it; the creep fallback covers missing `content-length`.
3. **Phase-2 lens cost** (per-frame canvas paint + displacement-map regen on
   merge) — deferred.

## Testing

The engine is imperative/canvas — not meaningfully unit-testable frame-by-frame.
Coverage focuses on the seams:
- Reduced-motion / no-hover branch selection picks the static path.
- `hasShownLoading` skip logic (loader shows on fresh mount, skips on re-nav).
- Mount→unmount removes listeners and cancels rAF (assert via spies) — guards
  the teardown-leak fix.

Manual verification (dev server): loader fill → flip → curtain reveal →
head-track → inactive-half frost → seam sheen; reduced-motion path; mobile
layout; no console errors; navigate away and back to `/` twice — no double-play,
no leaked listeners, no growing rAF count.

## Dependencies / open items

- ~~**BLOCKER:** video clips~~ — **resolved.** `public/jojo-clip-2.mp4` (3.89 MB)
  and `public/ollie-clip-3.mp4` (3.34 MB) are in place, re-encoded all-keyframe
  and trimmed to 6.5s. Originals backed up in the session scratchpad.
- Footer legibility over the light half — verify during build.
- `Manrope` font — add only if required by a visible element.
