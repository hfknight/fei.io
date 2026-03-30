# Loading Screen

## Visual Effect

### While loading

A minimum 5-second loading screen (gated on the background video firing `canPlay`) shows over a dark gradient background (`#0d1b2a → #1a0f28 → #2d1018`).

- A random word cycles every 0.5–1s, drawn from: `Coding`, `Crafting`, `Intellectualizing`, `Jojo`, `Ollie`, `2026`, `1984`. Each word animates in with a blur + upward slide and out with a blur + upward exit (Big Shoulders Display 800, all-caps, `clamp(72px, 16vw, 200px)`).
- A subtitle phrase cycles every 2.5s below the word: `"composing the view"`, `"setting the scene"`, `"almost there"`, followed by three blinking dots.

### Exit sequence (3 phases)

**Phase 1 — `exit-word` (600ms)**
Word cycling stops. "UNFOLDING" slides in using the same animation as any other word.

**Phase 2 — Transition (450ms overlap)**
Phase switches to `canvas`. An HTML canvas (z-index 100) mounts *behind* the LoadingBg (z-index 101) and immediately draws the dark gradient with "UNFOLDING" punched out as a transparent hole — the video is visible through the letterforms. Meanwhile, LoadingBg fades out (`opacity: 0`, 450ms). As the white word dissolves, the video bleeding through the canvas cutout is revealed: the word visually transforms from solid white into a transparent window onto the landing page.

**Phase 3 — Canvas zoom (2600ms)**
Only the canvas remains. "UNFOLDING" grows from 1× to `maxScale` using a cubic ease-in (`t³`) — starts near-still, then surges toward the viewer. As the word expands it reveals progressively more of the landing page behind it. At 72% through the animation, the dark overlay's `globalAlpha` fades from 1→0 (while the text hole stays punched at full strength), so the landing page fully materialises without a sudden pop. A final `ctx.clearRect` at `t = 1` wipes any residual pixels.

---

## Implementation

### State machine

```ts
type Phase = 'loading' | 'exit-word' | 'canvas';
```

The component runs a phase state rather than a simple boolean. This keeps each stage isolated and makes the timing explicit:

```
loading  ──(isVisible=false)──▶  exit-word  ──(600ms)──▶  canvas  ──(2600ms+400ms)──▶  unmounted
```

### Word cycling

Random word, different from the previous one, scheduled via nested `setTimeout` (500–1000ms jitter). Cycling only runs during the `loading` phase — a `useEffect` with `phase` as the dependency returns early otherwise.

### Canvas punch-through

The key primitive is `globalCompositeOperation = 'destination-out'`. Each animation frame:

1. `ctx.clearRect` — reset canvas to fully transparent
2. Draw dark gradient at `globalAlpha = overlayAlpha` (1.0 until FADE_START, then decays to 0)
3. Set `globalAlpha = 1`, switch to `destination-out`
4. Draw "UNFOLDING" text at current scale — this removes alpha from every pixel the text covers, punching a transparent hole through the gradient
5. Restore `globalCompositeOperation = 'source-over'`

The text hole is always punched at full strength (`globalAlpha = 1` before step 3) so the video shows through clearly even while the surrounding overlay is fading.

```ts
function easeIn(t: number): number {
  return t * t * t; // cubic — starts slow, surges at the end
}

const scale = 1 + (maxScale - 1) * easeIn(t);
const overlayAlpha = t < FADE_START ? 1 : 1 - (t - FADE_START) / (1 - FADE_START);
```

`maxScale` is computed from the actual viewport corner distance so the text is guaranteed to overflow the canvas at full zoom regardless of screen size:

```ts
const cornerDist = Math.sqrt(cx * cx + cy * cy);
const maxScale = Math.ceil((cornerDist / baseFontSize) * 3.5);
```

### Layered z-index for the white→cutout transition

```
z-index 101  LoadingBg (motion.div, fades out via AnimatePresence)
z-index 100  ExitCanvas (canvas, starts drawing immediately)
```

Canvas is rendered first in the DOM (behind), LoadingBg second (on top). When phase becomes `canvas`, AnimatePresence plays the LoadingBg exit animation. The cross-fade of the two layers — white word fading out, video cutout fading in — produces the "word becomes a window" effect with no abrupt jump.

### Why canvas and not CSS/SVG

| Approach | Why it failed |
|---|---|
| `mix-blend-mode: destination-out` on a DOM element | framer-motion promotes animated elements to GPU compositing layers, which breaks blend mode containment |
| SVG `<mask>` + CSS `@keyframes` | Browsers do not run CSS animations on elements inside SVG masks or clipPaths |
| SVG `<mask>` + SMIL `<animateTransform>` | Same browser restriction — animations inside SVG masks do not execute |
| CSS `background` on `<canvas>` as a fallback | The CSS background fills through transparent canvas pixels, overriding the `destination-out` cutout on every frame |

HTML Canvas `globalCompositeOperation` is evaluated in JavaScript per frame, entirely outside the browser's CSS compositing pipeline — the only approach that works reliably across browsers.
