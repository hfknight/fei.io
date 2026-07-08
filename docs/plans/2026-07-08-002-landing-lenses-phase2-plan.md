# Landing Phase 2 — Draggable Liquid-Glass Lenses — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add two draggable liquid-glass refraction lenses that merge into a metaball blob, with a split-from-center intro — ported full-fidelity into the existing landing engine.

**Architecture:** Same React shell + imperative engine. A new `Lenses.tsx` renders the lens DOM + a container-scoped SVG filter host; a new `lenses.ts` holds the ported physics as `createLenses(ctx)`, sharing the engine's teardown registry. `landingEngine.ts` wires it in (paint in the tick, intro from `finishLoader`).

**Tech Stack:** React 19 (strict TS), styled-components 6, framer-motion, Vite 6. Canvas 2D + SVG `feImage`/`feDisplacementMap` filters for the refraction.

**Spec:** `docs/brainstorms/2026-07-08-landing-lenses-phase2-requirements.md`
**Design source (cite by line):** `docs/brainstorms/2026-07-08-landing-redesign-source.dc.html`

## Global Constraints

- **Branch:** `redesign` (Phase 1 shipped, HEAD `13dedc1`).
- **Off-theme palette** — all lens colors/shadows/filter values ported verbatim from the source; no `theme` tokens.
- **Styling:** styled-components for any chrome; the lens `[data-*]` nodes carry their source inline styles in JSX and are mutated via `element.style.*` by the engine (matches Phase 1). Inline `style={{}}` is lint-clean.
- **Teardown is a FIRST-CLASS, per-task requirement** (StrictMode double-mounts; users navigate away mid-drag): EVERY rAF (per-lens `springTick` ×2, bridge `loop`), EVERY listener (`pointerdown` per lens, `pointermove`/`pointerup` on window, `resize`), the three full-hero clones (`buildLensWorld` ×2 + bridge), and the bridge/rim DOM nodes MUST route through the shared registry (`ctx.on`/`ctx.loop`/`ctx.later`/`ctx.addCleanup`) and be gone after `destroy()`. **Do NOT** append the filter SVG to `document.body` and **do NOT** port the `if (document.getElementById('lensRefractSvg')) return` guard — use the container-scoped React host (below). All element lookups scoped to `ctx.root`, never `document`.
- **Gating:** lenses exist only on the `interactive` path (`!reducedMotion && canHover`). Reduced-motion/touch render no `<Lenses/>`. The split intro runs only when `playIntro`; otherwise lenses place at rest.
- **Strict TS:** helpers typed as in Phase 1 (`(e: Event) => void` + internal narrowing for pointer handlers; `type`-only imports under `verbatimModuleSyntax`; no unused locals — declare a helper only where first used).
- **Verify after every task:** `npx tsc -b`, `npm run lint`, `npm run test:run` (must stay ≥70). Dev server `npm run dev` on 9921. The merge gate uses the dev server (render cost, not module-load).

---

## File Structure

**Create:**
- `src/components/Landing/Lenses.tsx` — two lens `<div>`s (`data-lens="1"/"2"` → `[data-lens-clip]`→`[data-lens-fx]`, `[data-lens-rim]`) + an empty container-scoped `<svg [data-lens-filter-host] width=0 height=0>`. Initial inline styles verbatim from source 134–149.
- `src/components/Landing/lenses.ts` — `createLenses(ctx: LensCtx): { playIntro(): void; paintWorlds(): void }`. All ported lens physics. Registers all teardown into the shared registry via `ctx`.

**Modify:**
- `src/components/Landing/landingConfig.ts` — add lens tuning constants.
- `src/components/Landing/landingEngine.ts` — build a `ctx`, call `createLenses(ctx)` when `interactive`; call `lenses.paintWorlds()` in the main tick; call `lenses.playIntro()` in `finishLoader` when `playIntro` (else lenses place at rest via `createLenses`); expose the live video elements to `ctx`.
- `src/components/Landing/index.tsx` — render `<Lenses/>` only when `interactive`.
- `src/components/Landing/landing.test.tsx` — add lens gating + teardown tests.

---

## Shared code (authored in Task 1)

### `landingConfig.ts` additions (complete)

```ts
// Lens tuning — ported from the design's data-props defaults (source line 164).
export const LENS = {
  surfaceProfile: 'Convex circle' as 'Convex circle' | 'Convex squircle' | 'Concave' | 'Lip',
  refractiveIndex: 1.5,
  glassThickness: 10,
  bezelWidth: 45,
  magnify: 0.05,
  lensSize: 128,        // base; lens 1 is rendered 1.45× larger (see setupLens)
  magnifyScale: 1,
  liquidEnabled: true,
  liquidStretch: 0.16,
  chromaticAberration: true,
  chromaticStrength: 0.2,
};
```

### `LensCtx` interface (define in `lenses.ts`, construct in `landingEngine.ts`)

```ts
export interface LensCtx {
  root: HTMLElement;
  q: <T extends HTMLElement = HTMLElement>(sel: string) => T | null;
  qa: <T extends HTMLElement = HTMLElement>(sel: string) => T[];
  on: (t: EventTarget, type: string, fn: (e: Event) => void, o?: AddEventListenerOptions) => void;
  loop: (step: (now: number) => void) => void;
  later: (fn: () => void, ms: number) => void;
  addCleanup: (fn: () => void) => void;   // for removing clones / DOM nodes on destroy
  opts: EngineOpts;                        // reducedMotion, canHover, playIntro
  getVideos: () => HTMLVideoElement[];     // live [data-jojo], [data-ollie]
}
```

`landingEngine.ts` already has `cleanups`/`on`/`loop`/`later` (Phase 1). Add `addCleanup: (fn) => cleanups.push(fn)` and `getVideos: () => qa<HTMLVideoElement>('[data-jojo],[data-ollie]')`, then build `ctx` from them. `createLenses` uses ONLY `ctx` (never its own `document`/rAF/listener), so the engine's `destroy()` tears everything down.

---

### Task 1: Lens config + `Lenses.tsx` + static refraction core

**Goal:** two lenses sit at fixed rest positions and **refract the live hero beneath them** (Snell displacement map + chromatic aberration), video painting into their world clones each frame. No drag, no merge, no intro yet. Establishes + gates the refraction infrastructure.

**Files:** create `Lenses.tsx`, `lenses.ts`; modify `landingConfig.ts`, `landingEngine.ts`, `index.tsx`.

**Interfaces:**
- Produces: `createLenses(ctx): { playIntro, paintWorlds }`; `Lenses` renders `[data-lens="1"|"2"]`, `[data-lens-fx]`, `[data-lens-rim]`, `[data-lens-filter-host]`.
- Consumes: `LENS` config; the engine's `ctx`.

- [ ] **Step 1: `landingConfig.ts`** — add the `LENS` block above.
- [ ] **Step 2: `Lenses.tsx`** — port lens markup from source **134–149** (two lenses; each: outer `[data-lens="n"]` with the inline styles verbatim incl. `opacity:0`; inner `[data-lens-clip]` with the radial `mask`; `[data-lens-fx]` with `filter:url(#lensRefract)`; `[data-lens-rim]` with the inset rim shadow). Add a container-scoped filter host: `<svg data-lens-filter-host width="0" height="0" style={{position:'absolute',width:0,height:0,pointerEvents:'none'}} />`. Functional component, no props.
- [ ] **Step 3: `index.tsx`** — render `<Lenses/>` inside the container **only when `interactive`** (`!reducedMotion && canHover`; compute the same way the engine will, or lift the value). Pass nothing.
- [ ] **Step 4: `lenses.ts` — refraction core.** Author `createLenses(ctx)` porting:
  - `generateLensMap` (source **278–337**) — the Snell displacement map (256², cached). Uses `LENS.*` in place of `this.props.*`.
  - `lensPropsKey` (**368–373**), `buildLensFilter` (**374–403**, incl. chromatic aberration + the three filter instances `lensRefract1/2/Bridge`), `applyLensProps` (**338–367**) — but `injectLensFilter`/filter mount targets the **React host**: `const svg = ctx.q('[data-lens-filter-host]'); svg.innerHTML = buildLensFilter()`. NO `document.body`, NO id-guard.
  - `buildLensWorld` (**509–546**) — clone the hero `root`, strip `[data-lens]`/`[data-lens-bridge]`/frost/loader nodes, replace `<video>` with `<canvas>` painted from the originals. Register every `resize` listener via `ctx.on` and the appended world node via `ctx.addCleanup(() => world.remove())`.
  - A minimal `setupLens` placing each lens at a **fixed** rest position (`lensDefaultPos` source **436–450** / `captionRect` **425–435**), sizing lens 1 at `1.45×` (source `applyLensProps` note), wiring `[data-lens-fx]` `filter:url(#lensRefract{i+1})`, appending its world, and a `sync()` that transforms the world under the lens. **Omit** drag + spring (Task 2). Set `opacity:1`.
  - `initLens` (**415–421** minus `initBridge`): inject filter into the host, setup both lenses. `applyLensProps` once.
  - `paintWorlds()` — the per-frame body from source **1041–1050**: for each `[original video, world canvas]` pair, `drawImage` the current video frame into the canvas (guard `readyState>=2`).
- [ ] **Step 5: `landingEngine.ts` wiring.** Add `addCleanup`/`getVideos`; build `ctx`; when `interactive`, `const lenses = createLenses(ctx)` at setup; in the main effect tick call `lenses.paintWorlds()` each frame (only when lenses exist). Guard everything so the non-interactive path never constructs lenses.
- [ ] **Step 6: Verify + GATE (single-lens render/paint).** `npx tsc -b`, `npm run lint` clean; `npm run test:run` ≥70. Controller (browser) confirms: two lenses visible at rest, each **refracting** the live video beneath (visible magnification + edge bending + chromatic fringing), video updating inside them. Measure FPS with both lens worlds painting — should hold ~60fps un-merged. (This is the cheap path; the real gate is Task 3.)
- [ ] **Step 7: Commit.**

```bash
git add src/components/Landing/landingConfig.ts src/components/Landing/lenses.ts \
  src/components/Landing/Lenses.tsx src/components/Landing/landingEngine.ts src/components/Landing/index.tsx
git commit -m "feat(landing): static liquid-glass refraction lenses (Phase 2 core)"
```

---

### Task 2: Drag + liquid-spring deformation

**Goal:** both lenses draggable; each deforms with the spring (directional stretch + jelly wobble), refraction tracking.

**Files:** modify `lenses.ts`.

- [ ] **Step 1: Full `setupLens`** — replace Task 1's minimal placement with the full source **547–640**: the `springTick` rAF (directional stretch + decaying jelly wobble), `_clickBounce`/`_wobbleKick`/`_pushMotion`, and the `onDown`/`onMove`/`onUp` pointer drag. **Register via `ctx`:** the `springTick` via `ctx.loop`; `pointerdown` on the lens + `pointermove`/`pointerup` on `window` via `ctx.on`; use `setPointerCapture`. Handlers typed `(e: Event) => void`, narrow to `PointerEvent` internally.
- [ ] **Step 2: Verify + GATE (drag feel/FPS).** tsc/lint/tests clean. Controller: drag each lens — it follows the cursor, the refraction world tracks, the glass stretches along motion and settles with a jelly wobble; a click gives a bounce. Single-lens drag holds ~60fps.
- [ ] **Step 3: Commit.**

```bash
git add src/components/Landing/lenses.ts
git commit -m "feat(landing): lens drag + liquid-spring deformation"
```

---

### Task 3: Metaball merge (the performance gate)

**Goal:** dragging the two lenses together renders a single connected metaball blob with continuous refraction across the neck + a unified rim. **This is the perf-critical task.**

**Files:** modify `lenses.ts`.

- [ ] **Step 1: Port the bridge.** Add `metaballPath` (source **641–688**), `shiftPath` (**790–796**), `generateBlobMap` (**226–277**), and `initBridge` (**689–789**): the blob refraction layer (a third `buildLensWorld` clone clipped to the metaball path + `filter:url(#lensRefractBridge)`), the rim SVG (`rimSoft`/`rimHair`), and the rAF `loop` that — while the two lenses overlap — computes the metaball path, regenerates the bridge displacement map, positions/clips the blob layer, draws the rim, and hides the two disc filters; when apart, hides the blob and restores the discs. **Register:** the bridge `loop` via `ctx.loop`; the blob/rim/osvg nodes via `ctx.addCleanup(() => node.remove())`; any `resize` via `ctx.on`. Call `initBridge()` from `initLens` (after both lenses are set up).
- [ ] **Step 2: MERGED-STATE PERF GATE (controller).** Run the dev server; drag/force the two lenses into overlap and **hold them merged**; measure frame time in that held state (the merge, not a single lens, is the cost). Record fps + worst frame.
  - **Holds ~60fps** → done, proceed.
  - **Close / janky** → optimize the per-frame round-trip: `generateBlobMap` currently ends with `canvas.toDataURL()` (synchronous PNG encode) fed to `feImage href`. Replace with a persistent reused `<canvas>` + `createImageBitmap(canvas)` (or a direct canvas/blob-URL source) to avoid the encode/decode round-trip each frame; re-measure. Keep the SDF math identical.
  - Log the before/after fps in the report. (Per the spec + user's all-in choice, 2b is not cut — it's made to hold; escalate to the controller only if no optimization gets it acceptable.)
- [ ] **Step 3: Verify.** tsc/lint/tests clean. Controller confirms the merge reads as one liquid blob with refraction flowing across the neck, snapping back to two discs when pulled apart.
- [ ] **Step 4: Commit.**

```bash
git add src/components/Landing/lenses.ts
git commit -m "feat(landing): metaball merge bridge with continuous refraction"
```

---

### Task 4: Split-from-center intro + loader/re-nav wiring

**Goal:** on the loading reveal, one lens fades in at center then splits into two that spring out to rest; on interactive re-nav (no loader), lenses place at rest with no split.

**Files:** modify `lenses.ts`, `landingEngine.ts`.

- [ ] **Step 1: `playLensIntro`** — port source **451–508**: start both lenses stacked concentric at viewport center (only lens 1 visible), then after a hold reveal lens 2 and spring both out to their `_restPos` via an rAF (feeding travel velocity to `_pushMotion` so they stretch in flight; a `_wobbleKick` on arrival). Register the rAF/timeouts via `ctx.loop`/`ctx.later`. Expose as `lenses.playIntro()`.
- [ ] **Step 2: place-at-rest default** — in `createLenses`, when `!ctx.opts.playIntro`, set each lens directly to its `_restPos` + `opacity:1` (no animation). When `playIntro`, start them hidden/stacked (so `playIntro()` can run the split).
- [ ] **Step 3: `landingEngine.ts`** — in `finishLoader`, after the existing reveal steps, `if (lenses) lenses.playIntro()` at the source's timing (replaces the Phase-1-omitted source line 860 `setTimeout(..., 820)`). Ensure the non-`playIntro` interactive path already shows lenses at rest (Step 2).
- [ ] **Step 4: Verify.** tsc/lint/tests clean. Controller: on a fresh load the reveal ends with the single lens splitting into two that fly to rest (metaball connects them mid-flight); on re-nav to `/` the lenses are simply present at rest.
- [ ] **Step 5: Commit.**

```bash
git add src/components/Landing/lenses.ts src/components/Landing/landingEngine.ts
git commit -m "feat(landing): lens split-from-center intro + loader wiring"
```

---

### Task 5: Gating tests + teardown verification

**Goal:** lock the interactive-gating and the (critical) teardown with tests + a verified StrictMode/navigate-away pass.

**Files:** modify `landing.test.tsx`.

- [ ] **Step 1: Tests (write first, watch fail, implement/adjust, pass).** In `landing.test.tsx`:
  - `<Lenses/>` is rendered when `interactive` (hover + no reduced-motion) and NOT rendered on reduced-motion or `hover:none` (assert `[data-lens]` presence/absence).
  - The engine constructs lenses only on the interactive path (spy/mock `createLenses` if structured to allow, else assert via DOM effect).
  - Mount→unmount tears down cleanly: after unmount, no `[data-lens-filter-host]` content leaks and the destroy spy fired (extends the Phase-1 teardown test).
  Run `npm run test:run` — RED, then implement any missing gating, then GREEN.
- [ ] **Step 2: Teardown verification (controller, browser).** With the dev server: (a) navigate `/` → `/readme` → `/` twice while a lens is mid-drag; confirm via DevTools no growing rAF/listener count, no stray `[data-lens-filter-host]`/clone nodes, no console errors; (b) confirm reduced-motion + touch emulation show zero lenses. The engine's `destroy()` must leave nothing behind.
- [ ] **Step 3: Full gate.** `npx tsc -b`, `npm run lint`, `npm run test:run` all clean.
- [ ] **Step 4: Commit.**

```bash
git add src/components/Landing/landing.test.tsx
git commit -m "test(landing): lens interactive-gating + teardown coverage"
```

---

## Self-Review

**Spec coverage:** refraction core + config + host (T1) · drag + spring (T2) · metaball merge + perf gate + createImageBitmap fallback (T3) · intro + loader/re-nav wiring (T4) · gating tests + teardown verification (T5). Container-scoped filter host (fixes StrictMode `document.body` bug) in T1. Reduced-motion/touch gating in T1+T5. All source line anchors cited and verified. ✓

**Placeholder scan:** method bodies cite exact in-repo source line ranges (a faithful port, as in Phase 1), with the exact adaptation named (`ctx.*` registry, `LENS` constants, container-scoped host). No TODO/TBD. ✓

**Type consistency:** `createLenses(ctx: LensCtx) → { playIntro, paintWorlds }`, `LensCtx` fields, and the `[data-*]` contract are consistent across `Lenses.tsx`, `lenses.ts`, `landingEngine.ts`. `LENS` config keys match their `this.props.*` origins. ✓

**Risk gate:** Task 3 Step 2 is the merged-state frame-time gate with a concrete optimization (createImageBitmap) before any escalation — the one thing that could sink the approach is measured with a named fix path, not left to chance.
