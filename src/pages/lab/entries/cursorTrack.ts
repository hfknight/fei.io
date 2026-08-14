/**
 * Cursor→clip-time math for the /lab/cursor-tracked-video entry.
 *
 * This is a DELIBERATE COPY of the tracking math inside
 * `src/components/Landing/landingEngine.ts` (see its `onMove`, `seekTo`, and the
 * `advance` closure in the main tick) plus the clip windows from
 * `src/components/Landing/landingConfig.ts`. The landing is deliberately left
 * untouched, so the two will not stay in lockstep automatically — if a constant
 * changes there, it must be changed here too.
 *
 * Everything below is DOM-free on purpose: it is what the entry's code blocks
 * quote, and what `cursorTrack.test.ts` covers. The engine that calls it (rAF
 * loop, blob load, seek) lives in the page component.
 */

/** A scrub window into a clip. `rest` is the resting fraction, `dur` = T1 - T0. */
export interface Clip {
  src: string;
  T0: number;
  T1: number;
  rest: number;
  dur: number;
}

/**
 * How a pane's normalized cursor position becomes a single clip fraction.
 * `invertX` mirrors the horizontal term for footage rendered with scaleX(-1).
 */
export interface Weights {
  x: number;
  y: number;
  invertX: boolean;
}

const mk = (src: string, T0: number, T1: number, rest: number): Clip => ({
  src,
  T0,
  T1,
  rest,
  dur: T1 - T0,
});

export const JOJO = mk('/jojo-clip-2.mp4', 0.15, 6.0, 0.015);
export const OLLIE = mk('/ollie-clip-4.mp4', 0.2, 4.85, 0.01);

/** Both clips are 24fps, all-intra. A clip at another rate needs its own value. */
export const CLIP_FPS = 24;

/**
 * Jojo's window carries genuine two-axis gaze, so x is weighted heavily.
 * Ollie's clip-4 is a near-pure pitch sweep — the vertical axis does the work and
 * x survives only as a mild bias. landingConfig.ts records two failed attempts at
 * a heavier x term here, in both directions; this page treats the asymmetry as the
 * lesson rather than re-litigating it.
 */
export const JOJO_WEIGHTS: Weights = { x: 0.42, y: 0.58, invertX: false };
export const OLLIE_WEIGHTS: Weights = { x: 0.15, y: 0.85, invertX: true };

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

/**
 * Cursor position as a fraction of the pane's own box — NOT the viewport. The
 * landing can use window coordinates because its two halves always fill the
 * screen; stacked full-height sections cannot, since a section is only sometimes
 * the viewport.
 */
export function normalizeInPane(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): { xn: number; yn: number } {
  return {
    xn: rect.width > 0 ? clamp01((clientX - rect.left) / rect.width) : 0,
    yn: rect.height > 0 ? clamp01((clientY - rect.top) / rect.height) : 0,
  };
}

/** The weighted blend — the formula each pane's HUD prints live. */
export function mapToFraction(xn: number, yn: number, w: Weights): number {
  const xt = w.invertX ? 1 - xn : xn;
  return clamp01(w.x * xt + w.y * yn);
}

/** Total source frames in the scrub window; the denominator in the HUD readout. */
export function frameCount(clip: Clip, fps: number): number {
  return Math.round(clip.dur * fps);
}

/**
 * Snap a fraction to a real source frame. Scrubbing 24fps footage through
 * arbitrary timestamps strobes: mid-frame targets repaint the video without
 * changing what it shows — cost, no pixels.
 */
export function quantize(
  fraction: number,
  clip: Clip,
  fps: number,
): { time: number; frame: number } {
  const time = Math.round((clip.T0 + clip.dur * clamp01(fraction)) * fps) / fps;
  return { time, frame: Math.round((time - clip.T0) * fps) };
}

/** Seek only when the *displayed* frame would change. */
export function needsSeek(currentTime: number, targetTime: number, fps: number): boolean {
  return Math.abs(currentTime - targetTime) > 0.5 / fps;
}

/**
 * The dead zone, in clip fractions — roughly 50ms of footage, under ~4px of
 * cursor travel. Below it the ease HOLDS rather than chasing.
 */
export const DEAD_ZONE = 0.008;

/**
 * Exponential ease with a hold. The hold is the least obvious constant in the
 * whole engine and the reason it exists is jitter: an exponential never lands on
 * its target, so when the resting pose sits near a frame boundary, ±3px of hand
 * tremor toggles the displayed frame forever. Holding freezes the video between
 * real moves.
 */
export function advance(cur: number, tgt: number, ease: number): number {
  return Math.abs(tgt - cur) < DEAD_ZONE ? cur : cur + (tgt - cur) * ease;
}

export const TRACKING_SPEED = 0.14;
/** The pane the cursor left eases home more gently than the one it is on. */
export const REST_SPEED = 0.1;

/**
 * Scroll-driven equivalent of the cursor map, for touch: how far a tall sticky
 * pane has travelled through its own scroll range. Returns 0 when the pane is not
 * taller than the viewport (the desktop layout), so it is inert there.
 */
export function scrollFraction(
  rect: { top: number; height: number },
  viewportH: number,
): number {
  const travel = rect.height - viewportH;
  if (travel <= 0) return 0;
  return clamp01(-rect.top / travel);
}
