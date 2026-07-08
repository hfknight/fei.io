# Landing Redesign (Split-Screen Pet Hero) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the `/` landing with the split-screen Jojo/Ollie video hero (cursor-scrub head-tracking, hover-frost, liquid-glass progress loader) from the Claude Design "Split" file, as a thin React shell wrapping a ported imperative engine.

**Architecture:** styled-components + React components render the markup structure (with `data-*` hooks); a single ported imperative module (`landingEngine.ts`) does all per-frame work (video-scrub head-track, frost/seam/glow, streaming loader choreography) against the container ref, with complete teardown. Draggable refraction lenses are **out of scope** (Phase 2).

**Tech Stack:** React 19 (strict TS), styled-components 6, framer-motion, React Router 7, Vite 6.

**Spec:** `docs/brainstorms/2026-07-08-landing-redesign-requirements.md`
**Design source (reference, cited by line below):** `docs/brainstorms/2026-07-08-landing-redesign-source.dc.html`

## Global Constraints

- **Branch:** `redesign` (already checked out).
- **Palette is intentionally off-theme** (like `/readme`, `/contact`) — use the design's literal `oklch(...)`/hex values; do NOT force `theme` tokens (per `CLAUDE.md`).
- **Styling:** styled-components for structural chrome; **engine-controlled elements** (frost, seam, curtains, fill-rect, reveal lockup, captions) carry their initial inline styles in JSX and are mutated via `element.style.*` by the engine — this mirrors the source and is the lowest-risk port. No `.css` files / CSS modules. (ESLint has no inline-style rule and 8 existing `src` files already use `style={{}}`, so this is lint-clean.)
- **StrictMode:** the app is wrapped in `<StrictMode>` (`main.tsx`), so dev mounts every effect twice and runs `destroy()` in between. The engine's teardown must be idempotent and abort in-flight fetches (built into the registry above) — treat a clean double-mount in dev as the teardown correctness test.
- **Reduced motion + touch:** gate with `useReducedMotion()` and `matchMedia('(hover: hover) and (pointer: fine)')`. Reduced-motion OR no fine-hover → static path (no loader choreography, no scrub, no frost).
- **Engine teardown is mandatory:** every rAF loop, `setTimeout`, and event listener registered by the engine MUST be cancelled/removed in `destroy()`. All DOM lookups scoped to the container root — never `document`/`window` for owned nodes. (The source's `componentWillUnmount` at source line 1094 only removes 2 of them; that leak must not be ported.)
- **Loader replays only on fresh page load:** preserve a module-scope `hasShownLoading` flag so SPA re-navigation to `/` skips the intro.
- **Clips:** `/jojo-clip-2.mp4` (3.89 MB) and `/ollie-clip-3.mp4` (3.34 MB), already in `public/`, all-keyframe, 6.5s.
- **Verify after every task:** `npx tsc -b` (clean), `npm run lint` (clean), `npm run test:run` (green). Dev server: `npm run dev` → http://localhost:9921/.
- **Standard easing** for any *new* entrance animation is `cubic-bezier(0.16, 1, 0.3, 1)`; the loader choreography keeps the source's own cubic-beziers (they are the design's intended motion).

---

## File Structure

**Create:**
- `src/components/Landing/landingConfig.ts` — tuning constants + per-clip gaze windows.
- `src/components/Landing/landingEngine.ts` — `createLandingEngine(root, opts) → { destroy }`. The ported imperative engine + teardown registry.
- `src/components/Landing/SplitStage.tsx` — the two halves, both `<video>`, frost overlays, center seam.
- `src/components/Landing/Lockup.tsx` — center "I'm 〔feather〕 Fei" + tagline + role labels + corner-bracket frame.
- `src/components/Landing/PetCaption.tsx` — one caption block (Jojo / Ollie via props).
- `src/components/Landing/Loader.tsx` — liquid-glass curtain overlay (curtains, bracket box, fill-logo front + colored back for the flip, reveal lockup).
- `src/components/Landing/landing.test.tsx` — seam tests (skip logic, reduced-motion/touch branch, teardown).

**Modify:**
- `src/components/Landing/index.tsx` — rewrite as orchestrator (owns engine lifecycle + fallback detection + `hasShownLoading`).
- `index.html:49` — extend the Google Fonts URL (Manrope, more Cormorant/JetBrains weights).
- `src/components/Layout/Header.tsx` — add the design's liquid-glass pill-hover.

**Delete (orphaned by the rewrite — confirm no other importers first):**
- `src/components/Landing/VideoBackground.tsx`
- `src/components/Landing/IntroPanel.tsx`

**Leave as-is:** `src/components/Landing/LoadingScreen.tsx` (still used by the `/loading` route in `AppRoutes.tsx:41`).

---

## Shared code (authored in Task 1, referenced by later tasks)

### `landingConfig.ts` (complete)

```ts
// Tuning constants ported from the design's data-props defaults (source line 164)
// and the per-clip gaze windows (source line 936-943).
export interface ClipCfg { src: string; T0: number; T1: number; rest: number; dur: number; }

const mk = (src: string, T0: number, T1: number, rest: number): ClipCfg => ({ src, T0, T1, rest, dur: T1 - T0 });

export const JOJO = mk('/jojo-clip-2.mp4', 0.15, 6.0, 0.015);
export const OLLIE = mk('/ollie-clip-3.mp4', 0.2, 6.2, 0.01);

export const TRACKING_SPEED = 0.14; // active-side ease-in rate
export const SCOPE_INSET_Y = 0;     // % vertical dead-zone at top/bottom
export const FROST_BLUR = 11;       // px
export const FROST_STYLE: 'Liquid glass' | 'Frosted' | 'Dim only' = 'Liquid glass';
export const SEAM_SHEEN = true;
export const LOGO_GLOW = true;
```

### `landingEngine.ts` — skeleton + teardown registry (complete; method bodies filled across tasks)

```ts
import { JOJO, OLLIE, ClipCfg /* + constants as needed */ } from './landingConfig';

export interface EngineOpts {
  reducedMotion: boolean;
  canHover: boolean;   // matchMedia('(hover: hover) and (pointer: fine)').matches
  playIntro: boolean;  // false when hasShownLoading → skip loader, jump to steady state
}
export interface LandingEngine { destroy(): void; }

export function createLandingEngine(root: HTMLElement, opts: EngineOpts): LandingEngine {
  // ---- teardown registry (fixes the source's leak) ----
  // App runs under <StrictMode>, so dev double-mounts and calls destroy() between
  // mounts — teardown must abort in-flight work and be idempotent.
  let destroyed = false;
  const cleanups: Array<() => void> = [];
  const abort = new AbortController();                    // cancels in-flight clip fetches
  cleanups.push(() => abort.abort());
  const objectUrls: string[] = [];                        // revoked on destroy
  cleanups.push(() => objectUrls.forEach(URL.revokeObjectURL));
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const qa = <T extends HTMLElement = HTMLElement>(sel: string) =>
    Array.from(root.querySelectorAll<T>(sel));
  const on = <T extends EventTarget>(t: T, type: string, fn: EventListener, o?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, o);
    cleanups.push(() => t.removeEventListener(type, fn, o));
  };
  // self-rescheduling rAF loop that stops cleanly on destroy
  const loop = (step: (now: number) => void) => {
    let id = 0, alive = true;
    const frame = (now: number) => { if (!alive) return; step(now); id = requestAnimationFrame(frame); };
    id = requestAnimationFrame(frame);
    cleanups.push(() => { alive = false; cancelAnimationFrame(id); });
  };
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    cleanups.push(() => clearTimeout(id));
  };

  // ---- engine body (filled in Tasks 1-5) ----
  // Task 1: head-track (video load, onMove/onLeave, main tick's seek portion)
  // Task 3: frost/seam/glow (main tick's effect portion, applyFrost)
  // Task 4: loader (loaderTick, streaming load, finishLoader) — replaces Task 1's direct load
  // Task 5: opts.reducedMotion / !opts.canHover / !opts.playIntro gating

  return {
    destroy() { destroyed = true; cleanups.splice(0).forEach((fn) => fn()); },
  };
}
```

All ported method bodies use `q`/`qa`/`on`/`loop`/`later` instead of the source's `document.querySelector`/`addEventListener`/`requestAnimationFrame`/`setTimeout`, and instead of `this.props.X ?? d` use the `landingConfig` constants. **Any clip fetch** passes `{ signal: abort.signal }`, pushes each created object URL into `objectUrls`, and guards its `.then` callback with `if (destroyed) return;` — so a fetch that resolves after a StrictMode/navigate teardown never mutates dead DOM or leaks a URL.

**Strict-TS accommodations (verified during Task 1 — apply throughout):**
- `tsconfig.app.json` has `noUnusedLocals`, so each helper closure is declared only in the task that first uses it. **Task 1 declares `q`, `on`, `loop` only; `qa` is added in Task 3; `later` is added in Task 4** (each alongside its first use). The skeleton above lists all five for reference — do not paste an unused one.
- The custom `on(target, type, fn)` types `fn` as `EventListener`, so it can't infer `MouseEvent` the way DOM `addEventListener` overloads do. Ported pointer handlers (`onMove`/`onLeave`) are therefore typed `(e: Event) => void` and narrow internally (`const me = e as MouseEvent`). `vid.dataset.src` (`string | undefined`) is asserted/guarded before `fetch` (the JSX guarantees the attribute). No runtime/behavior change.

---

### Task 1: Split stage + head-track spike (de-risk)

**Highest-risk assumption first:** cursor-scrub head-tracking is smooth on the real all-keyframe clips. Build the minimal stage + scrub and *observe it* before investing in the rest.

**Files:**
- Create: `src/components/Landing/landingConfig.ts` (complete, above)
- Create: `src/components/Landing/landingEngine.ts` (skeleton above + head-track body)
- Create: `src/components/Landing/SplitStage.tsx`
- Modify: `src/components/Landing/index.tsx` (minimal orchestrator)
- Modify: `index.html:49`

**Interfaces:**
- Produces: `createLandingEngine(root, opts): LandingEngine`; `SplitStage` renders `[data-jojo]`, `[data-ollie]` `<video>` (each with `data-src`), inside `[data-stage]`.
- Consumes: `landingConfig` exports.

- [ ] **Step 1: Fonts.** In `index.html:49`, replace the Cormorant weight and add Manrope + JetBrains Mono. New `href`:

```
https://fonts.googleapis.com/css2?family=Big+Shoulders+Display:wght@800&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400&family=Inter:wght@200;300;400;500&family=JetBrains+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;1,400&display=swap
```

- [ ] **Step 2: `landingConfig.ts`** — paste the complete file from "Shared code" above.

- [ ] **Step 3: `SplitStage.tsx`.** Port markup from source lines 80–99 (halves + videos) and 100–102 (seam), plus frost divs (source 86–88, 96–99). Structure (styled-components for the halves; inline styles preserved on engine-controlled `data-*` nodes exactly as the source has them):

```tsx
import styled from 'styled-components';

const Stage = styled.div`position:relative;width:100%;height:100dvh;overflow:hidden;display:flex;background:#26272b;`;
const Half = styled.div`position:relative;width:50%;height:100%;overflow:hidden;`;
const Left = styled(Half)`background:linear-gradient(120deg,#e9eaeb 0%,#d4d6d8 100%);`;
const Right = styled(Half)`background:linear-gradient(120deg,#54565b 0%,#33343a 100%);`;
const Vid = styled.video`position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0;transition:opacity .9s ease;`;

const SplitStage: React.FC = () => (
  <Stage data-stage>
    <Left>
      <Vid data-jojo data-src="/jojo-clip-2.mp4" muted playsInline preload="auto"
           style={{ objectPosition: '14% 66%' }} />
      {/* light-side gradient + inner shadow + frost overlay — source 84-88 */}
      <div style={{ position:'absolute', inset:0, background:'linear-gradient(90deg,rgba(233,234,235,0) 50%,rgba(233,234,235,.35) 84%,rgba(226,227,229,.7) 100%)', pointerEvents:'none' }} />
      <div data-frost-l style={{ position:'absolute', inset:0, opacity:0, transition:'opacity .55s ease', pointerEvents:'none', zIndex:4 }} />
    </Left>
    <Right>
      <Vid data-ollie data-src="/ollie-clip-3.mp4" muted playsInline preload="auto"
           style={{ objectPosition: '36% 70%', transform: 'scaleX(-1)' }} />
      {/* dark-side gradients + light bleed — source 92-95 */}
      <div data-frost-r style={{ position:'absolute', inset:0, opacity:0, transition:'opacity .55s ease', pointerEvents:'none', zIndex:4 }} />
    </Right>
    {/* center seam — source 100-102 */}
    <div data-seam style={{ position:'absolute', top:0, bottom:0, left:'50%', width:1, transform:'translateX(-.5px)', background:'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.28) 30%,rgba(255,255,255,.28) 70%,rgba(255,255,255,0) 100%)', pointerEvents:'none', zIndex:6 }} />
  </Stage>
);
export default SplitStage;
```

Copy the exact gradient/shadow overlay divs verbatim from source lines 84–88 (left) and 92–95 (right); only the two shown above carry `data-*`.

- [ ] **Step 4: head-track engine body.** In `landingEngine.ts`, after the skeleton helpers, add (adapted from source `componentDidMount` lines 874–1064, head-track subset only — video load + `onMove`/`onLeave` at 957–986 + the `seekTo` at 988–993 + the tick's easing/seek portion at 1003–1013):

  - `const cfg = { j: {...JOJO}, o: {...OLLIE} };` state: `curJ,tgtJ,curO,tgtO` are **fractions in [0,1]**, init to `cfg.rest` (NOT `T0+dur*rest` — `seekTo` maps fraction→time via `T0 + dur*cur`, and `onMove` sets targets as fractions like `0.42*xn + 0.58*yn`; the video *playhead* is separately settled to `T0 + dur*rest`). Also `active=false, side=null, seekJ=false, seekO=false`.
  - **Blob load** (deliberately the *same* seek path as production — Task 4 only adds byte-progress on top, so this spike gate tests the real thing): `fetch(vid.dataset.src, { signal: abort.signal }).then(r => r.blob())`; guard the `.then` with `if (destroyed) return;`; then `const url = URL.createObjectURL(blob); objectUrls.push(url); vid.src = url;` and on `loadeddata` (once) run `settle`: pause, `vid.currentTime = cfg.T0 + cfg.dur*cfg.rest`, `vid.style.opacity='1'`. Register the `seeked` listener that clears the seek mark (source 1002). Add `.catch(e => { if (e.name !== 'AbortError') throw e; })`.
  - `onMove` (source 957–984): map cursor → per-side gaze target; set only the active side's target. (Skip the frost lines 979–981 and hint line 982 for now — added Task 3.) Register via `on(window,'mousemove',onMove)`.
  - `onLeave` (source 985): `active=false; side=null`. Register via `on(window,'mouseleave',onLeave)`.
  - `seekTo` (source 988–993): guard `readyState>=2 && !mark && |currentTime - t|>0.012`.
  - main `loop((_)=>{ ... })`: only the easing + seek portion (source 1003–1013): ease active side fast (`TRACKING_SPEED`), resting side slow (`min(TRACKING_SPEED,0.10)`), `seekTo` both.

- [ ] **Step 5: `index.tsx`** minimal orchestrator:

```tsx
import { useRef, useEffect } from 'react';
import SplitStage from './SplitStage';
import { createLandingEngine } from './landingEngine';

const Landing: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const engine = createLandingEngine(ref.current, { reducedMotion: false, canHover, playIntro: true });
    return () => engine.destroy();
  }, []);
  return <div ref={ref}><SplitStage /></div>;
};
export default Landing;
```

- [ ] **Step 6: Verify (the spike).** `npm run dev` → http://localhost:9921/. **Wait for both clips to finish downloading first** (Network tab idle) — production seeks a fully-downloaded blob, which seeks far more reliably than a mid-buffer stream, so judging before the buffer completes risks a false negative that kills a sound approach. Then move the cursor across the **left** half: Jojo's gaze should follow **smoothly** (no stutter/flash). Same on the right for Ollie. Then `npx tsc -b` and `npm run lint` — both clean. Open DevTools console: no errors.
  - **GATE:** if scrubbing visibly stutters *after full buffer*, STOP. Re-encode already maximised keyframes, so fall back to throttling seeks (e.g. only seek when `|Δ| > 1 frame`) or a poster+parallax treatment, and note it before continuing.
  - Navigate to `/readme` and back to `/` twice; confirm no console errors and gaze still tracks (no doubled/leaked listeners).

- [ ] **Step 7: Commit.**

```bash
# include the clips — they're the assets this feature loads (repo already versions intro.mp4 in plain git)
git add index.html public/jojo-clip-2.mp4 public/ollie-clip-3.mp4 \
  src/components/Landing/landingConfig.ts src/components/Landing/landingEngine.ts \
  src/components/Landing/SplitStage.tsx src/components/Landing/index.tsx
git commit -m "feat(landing): split-screen stage with video-scrub head-tracking"
```

---

### Task 2: Center lockup + pet captions

**Files:**
- Create: `src/components/Landing/Lockup.tsx`, `src/components/Landing/PetCaption.tsx`
- Modify: `src/components/Landing/index.tsx` (render them over the stage)

**Interfaces:**
- Produces: `Lockup` renders `[data-logo]`, four `[data-hair]`, `[data-brk-frame]`. `PetCaption` renders `[data-pet-cap="j"|"o"]`.

- [ ] **Step 1: `Lockup.tsx`** — port source lines 113–126 (the center-top lockup). Render: the `[data-brk-frame]` wrapper with four `[data-hair]` corners (source 115–120, `opacity:0`), the tagline "Elegance. Precision. Intuition" (gradient text), the `<h1>` grid with `span "I'm"` + inline feather `<svg data-logo data-logo-variant="split">` (source 122, paths verbatim) + `span "Fei"`, and the dual role labels (source 124). Use styled-components for the `<h1>`/wrapper; keep the `oklch(...)` gradient-text inline styles verbatim. Position: `position:absolute; left:50%; top:50%; transform:translate(-50%,-50%); z-index:8; pointer-events:none`.

- [ ] **Step 2: `PetCaption.tsx`** — port source lines 127–149. Props `{ pet: 'j' | 'o' }`. Jojo variant: left/top position + light-side colors + arrow (source 127–138); Ollie: right/bottom + dark-side colors + arrow (source 150–156). Root carries `data-pet-cap={pet}` and the initial `opacity:0; transform:translateX(±26px); transition:...` inline styles verbatim (revealed by the loader in Task 4).

- [ ] **Step 3: Render in `index.tsx`.** Inside the ref'd container, after `<SplitStage/>`, add `<Lockup/>`, `<PetCaption pet="j"/>`, `<PetCaption pet="o"/>`.

- [ ] **Step 4: Verify.** `npm run dev`: the center "I'm 〔feather〕 Fei" lockup + tagline + roles render crisply over the seam (fonts loaded). Captions are in the DOM but invisible (`opacity:0`) — expected; reveal comes in Task 4. `npx tsc -b`, `npm run lint` clean.

- [ ] **Step 5: Commit.**

```bash
git add src/components/Landing/Lockup.tsx src/components/Landing/PetCaption.tsx src/components/Landing/index.tsx
git commit -m "feat(landing): center lockup and pet captions"
```

---

### Task 3: Frost, seam sheen, hairline + logo glow

**Files:** Modify `src/components/Landing/landingEngine.ts`.

**Interfaces:** Consumes `[data-frost-l]`, `[data-frost-r]`, `[data-seam]`, `[data-hair]`, `[data-logo]` (Tasks 1–2).

- [ ] **Step 1: `applyFrost`** — port source lines 1066–1092 as a local function (uses `FROST_BLUR`/`FROST_STYLE`); apply once at setup to `[data-frost-l]`/`[data-frost-r]`.
- [ ] **Step 2: onMove frost** — re-add the frost toggle (source **972–974**): frost the half the cursor is NOT on (`frostL.style.opacity = side==='R'?'1':'0'`, etc.). The source's adjacent `[data-hint]` lines (975–977) are null-guarded and there is no `[data-hint]` in our markup — skip or keep, it's a no-op.
- [ ] **Step 3: main-tick effects** — add to the existing `loop`, BEFORE the easing/seek portion, the seam sheen (source **999–1014**), hairline glow (source **1015–1030**), and logo glow (source **1031–1040**). **SKIP** the lens-world canvas paint (source 1041–1050 — Phase 2). Use `SEAM_SHEEN`/`LOGO_GLOW`; treat `_loaderDone` as `true` here via a local `const loaderDone = true` (the real loader flag lands in Task 4; until then the "steady soft glow" base state is correct). This step first uses `qa` — add the `qa` helper to the registry now (per the Strict-TS note). Needs refs to `[data-seam]`, `[data-hair]` (via `qa`), `[data-logo]` (via `qa`), `[data-frost-l]`, `[data-frost-r]`.
- [ ] **Step 4: Verify.** `npm run dev`: cursor on the left half frosts the right (liquid-glass), seam brightens, feather + active hairlines glow; leaving the window clears frost. `npx tsc -b`, `npm run lint` clean.
- [ ] **Step 5: Commit.**

```bash
git add src/components/Landing/landingEngine.ts
git commit -m "feat(landing): inactive-half frost, seam sheen, logo/hairline glow"
```

---

### Task 4: Liquid-glass loader (streaming progress + reveal)

**Files:**
- Create: `src/components/Landing/Loader.tsx`
- Modify: `src/components/Landing/landingEngine.ts` (streaming load + loaderTick + finishLoader), `src/components/Landing/index.tsx` (render `<Loader/>`)

**Interfaces:** `Loader` renders `[data-loader]`, `[data-curtain="l"|"r"]`, `[data-loader-fx]`, `[data-brk-box]`, `[data-load-lockup]`, `[data-lk-fade]` (several), `[data-flip]`, `[data-flip-front]` with `[data-fill-rect]` in its clip, `[data-flip-back]`.

- [ ] **Step 1: `Loader.tsx`** — port source lines 30–79 verbatim (curtains, `[data-loader-fx]`, `[data-brk-box]` with 4 corner brackets, `[data-load-lockup]` containing the `[data-lk-fade]` tagline, the `<h1>` with the `[data-flip]` 3D-flip element — `[data-flip-front]` SVG carrying the `loadFillClip` + `[data-fill-rect]` and `[data-flip-back]` colored SVG — and role labels). Keep all inline styles/transitions verbatim; these are engine-driven.
- [ ] **Step 2: Render `<Loader/>`** first inside the container in `index.tsx` (it is `position:fixed; z-index:60`, so DOM order is cosmetic, but render it so it overlays).
- [ ] **Step 3: add byte-progress to the existing blob load.** Task 1 already loads each clip as a fully-downloaded blob (identical seek path). Here, only instrument it: swap the single `.then(r => r.blob())` for the source's streaming pump (lines 924–952) — read `res.body.getReader()`, accumulate chunks, set `prog[key] = received/total`, then build the Blob exactly as before (still via `abort.signal`, still pushing to `objectUrls`, still guarding `destroyed`). Set `done[key]=true` on settle. Keep the `catch` fallback (`prog=1; done=true`; ignore `AbortError`). The objectURL/settle/rest-frame path is unchanged from Task 1.
- [ ] **Step 4: `setLoaderFill` + `loaderTick`** — port source 798–804 (`setLoaderFill`) and 908–920 (`loaderTick`: eased catch-up of `dispProg` toward real/creep progress; when both done and `dispProg≈1` → `finishLoader`). Grab `[data-fill-rect]` via `q`. Start with `loop`.
- [ ] **Step 5: `finishLoader`** — port source 806–861 **omitting the lens intro** (skip line 860's `playLensIntro`). Keep: fill→1, flip logo (`[data-flip]` → `rotateY(180deg)`), size `[data-brk-box]` to the reveal lockup's rect, stagger `[data-lk-fade]`, part curtains (`translateX(∓100%)`), `bounceBrackets` (source 501–506: reveal `[data-brk-frame]`), fade the reveal lockup out, hide `[data-loader]`, reveal `[data-pet-cap]` captions (source 847–855). Use `later` for every `setTimeout` so they're cancellable.
- [ ] **Step 6: Verify.** Hard-reload `/`: the feather fills bottom→top as the clips download, flips to colored, curtains part to reveal the videos, brackets frame the lockup, the reveal lockup fades into the live hero, captions slide in, head-track + frost work. Reduce network (DevTools throttling) to watch the fill track real bytes. Navigate away and back → loader does NOT replay (once `hasShownLoading` lands in Task 5; for now it may replay — acceptable this task). `npx tsc -b`, `npm run lint` clean.
- [ ] **Step 7: Commit.**

```bash
git add src/components/Landing/Loader.tsx src/components/Landing/landingEngine.ts src/components/Landing/index.tsx
git commit -m "feat(landing): liquid-glass streaming loader with curtain reveal"
```

---

### Task 5: Reduced-motion + touch fallback + `hasShownLoading`

**Files:** Modify `src/components/Landing/index.tsx`, `src/components/Landing/landingEngine.ts`. Create `src/components/Landing/landing.test.tsx`.

**Interfaces:** `index.tsx` computes `{ reducedMotion, canHover, playIntro }` and passes to the engine; engine honours them.

- [ ] **Step 1: Test — skip + fallback branches.** Write `landing.test.tsx` (Vitest + RTL):
  - Renders `<Landing/>` once → loader present; a module flag makes a second mount omit the loader choreography. (Assert on a `data-loader` presence / a passed `playIntro` — mock `createLandingEngine` to capture opts.)
  - With `matchMedia` mocked to reduced-motion, `createLandingEngine` receives `reducedMotion:true`.
  - Mount→unmount calls `engine.destroy()` (mock returns a spy; assert called).
- [ ] **Step 2: Run test — fails.** `npm run test:run src/components/Landing/landing.test.tsx` → FAIL (branching not implemented).
- [ ] **Step 3: `index.tsx` detection.** Add module `let hasShownLoading = false;`. Compute `reducedMotion` via `useReducedMotion()`, `canHover` via matchMedia. `playIntro = !hasShownLoading && !reducedMotion`. After the engine signals reveal-done (or on mount when `!playIntro`), set `hasShownLoading = true`. Pass all three in opts. Only render `<Loader/>` when `playIntro`.
- [ ] **Step 4: engine gating.** In `landingEngine.ts`: if `!opts.playIntro`, skip `loaderTick`/`finishLoader` — instead load clips directly, park at rest frame, and immediately reveal captions/brackets (no choreography). If `opts.reducedMotion || !opts.canHover`, do NOT register `mousemove`/`mouseleave`, do NOT run the frost/seam/glow effect portion, and leave videos parked at their rest frame (still show them). Keep teardown intact.
- [ ] **Step 5: Run tests — pass.** `npm run test:run src/components/Landing/landing.test.tsx` → PASS.
- [ ] **Step 6: Verify.** DevTools → emulate `prefers-reduced-motion: reduce`: `/` shows the split hero at rest, no loader choreography, no scrub, no frost, no errors. Emulate a touch device (no hover): same static path. Normal desktop: full experience, and re-nav to `/` skips the loader. `npx tsc -b`, `npm run lint` clean.
- [ ] **Step 7: Commit.**

```bash
git add src/components/Landing/index.tsx src/components/Landing/landingEngine.ts src/components/Landing/landing.test.tsx
git commit -m "feat(landing): reduced-motion/touch fallback and one-shot loader"
```

---

### Task 6: Header glass-pill hover + footer legibility

**Files:** Modify `src/components/Layout/Header.tsx`; possibly `src/components/Layout/Footer.tsx`.

- [ ] **Step 1: Pill hover.** Port the design's `.glassnav:hover` (source lines 20–26) into `Header.tsx`'s `NavLink` styled-component as a `&:hover, &:focus-visible` block: liquid-glass background gradient, `backdrop-filter: blur(11px) saturate(205%)`, inset highlight/rim + drop shadow, `border-radius: 7px`, `padding: 8px 15px`. Keep the existing active-underline behaviour.
- [ ] **Step 2: Footer check.** `npm run dev`, view `/`: confirm the bottom-left copyright is legible over the **light** left half. If it's washed out (the global `Footer` is styled light-on-dark), add a landing-only treatment (e.g. dark text + subtle light text-shadow, matching source line 159) gated on `pathname === '/'`.
- [ ] **Step 3: Verify.** Hover nav pills on `/` and on another route (e.g. `/readme`) — glass pill appears, active underline still slides. Footer legible on both halves. `npx tsc -b`, `npm run lint` clean.
- [ ] **Step 4: Commit.**

```bash
git add src/components/Layout/Header.tsx src/components/Layout/Footer.tsx
git commit -m "feat(landing): liquid-glass nav pill hover + footer legibility on /"
```

---

### Task 7: Cleanup + full verification

**Files:** Delete `src/components/Landing/VideoBackground.tsx`, `src/components/Landing/IntroPanel.tsx`.

- [ ] **Step 1: Confirm orphans.** `grep -rn "VideoBackground\|IntroPanel" src` → only self-references. (`LoadingScreen` stays — `AppRoutes.tsx:41`.)
- [ ] **Step 2: Delete** the two orphaned files.
- [ ] **Step 3: Full gate.** `npx tsc -b` clean; `npm run lint` clean; `npm run test:run` green.
- [ ] **Step 4: Manual pass.** Hard-reload `/`: loader → reveal → head-track → frost → seam. Reduced-motion path. Mobile viewport (DevTools) — no horizontal scroll, lockup fits. Navigate `/ → /readme → /` twice: no console errors, no growing listener/rAF count (DevTools Performance monitor), loader shown once.
- [ ] **Step 5: Commit.**

```bash
git add -A src/components/Landing
git commit -m "chore(landing): remove orphaned VideoBackground/IntroPanel"
```

---

## Self-Review

**Spec coverage:** split stage + head-track (T1) · lockup + captions (T2) · frost/seam/glow (T3) · streaming loader + reveal (T4) · reduced-motion/touch + hasShownLoading (T5) · global Header/Footer reuse + pill hover (T6) · orphan cleanup + teardown verification (T1 gate + T7). Palette-off-theme, clips, fonts all covered. Lenses correctly excluded (Phase 2). ✓

**Placeholder scan:** engine method bodies are cited to exact source line ranges in the in-repo reference file rather than transcribed — deliberate for a faithful port, not a placeholder; every task names the exact lines and the exact adaptation (`q/qa/on/loop/later`, config constants, container scoping). ✓

**Type consistency:** `createLandingEngine(root, opts: EngineOpts) → LandingEngine`, `EngineOpts { reducedMotion, canHover, playIntro }`, `ClipCfg`, and the `data-*` contract are used consistently across index.tsx and all tasks. ✓

**Risk gate:** Task 1 Step 6 stops the plan if scrub jank appears — the one assumption that could invalidate the approach is tested first.
