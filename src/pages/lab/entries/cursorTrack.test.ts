import { describe, it, expect } from 'vitest';
import {
  JOJO,
  OLLIE,
  JOJO_WEIGHTS,
  OLLIE_WEIGHTS,
  CLIP_FPS,
  DEAD_ZONE,
  advance,
  clamp01,
  frameCount,
  mapToFraction,
  needsSeek,
  normalizeInPane,
  quantize,
  scrollFraction,
} from './cursorTrack';

const rect = { left: 100, top: 50, width: 800, height: 400 };

describe('normalizeInPane', () => {
  it('measures against the pane box, not the viewport', () => {
    expect(normalizeInPane(500, 250, rect)).toEqual({ xn: 0.5, yn: 0.5 });
  });

  it('clamps a cursor outside the pane', () => {
    expect(normalizeInPane(0, 0, rect)).toEqual({ xn: 0, yn: 0 });
    expect(normalizeInPane(9999, 9999, rect)).toEqual({ xn: 1, yn: 1 });
  });

  it('survives a zero-sized rect without dividing by zero', () => {
    expect(normalizeInPane(10, 10, { left: 0, top: 0, width: 0, height: 0 })).toEqual({
      xn: 0,
      yn: 0,
    });
  });
});

describe('mapToFraction', () => {
  it('blends both axes for Jojo', () => {
    expect(mapToFraction(1, 0, JOJO_WEIGHTS)).toBeCloseTo(0.42);
    expect(mapToFraction(0, 1, JOJO_WEIGHTS)).toBeCloseTo(0.58);
    expect(mapToFraction(1, 1, JOJO_WEIGHTS)).toBeCloseTo(1);
  });

  it('inverts x for Ollie, whose footage is mirrored', () => {
    expect(mapToFraction(0, 0, OLLIE_WEIGHTS)).toBeCloseTo(0.15);
    expect(mapToFraction(1, 0, OLLIE_WEIGHTS)).toBeCloseTo(0);
  });

  it('gives Ollie far less horizontal response than Jojo — the page thesis', () => {
    const jojoSwing = Math.abs(
      mapToFraction(1, 0.5, JOJO_WEIGHTS) - mapToFraction(0, 0.5, JOJO_WEIGHTS),
    );
    const ollieSwing = Math.abs(
      mapToFraction(1, 0.5, OLLIE_WEIGHTS) - mapToFraction(0, 0.5, OLLIE_WEIGHTS),
    );
    expect(ollieSwing).toBeLessThan(jojoSwing / 2);
  });

  it('never leaves [0,1]', () => {
    expect(mapToFraction(5, 5, JOJO_WEIGHTS)).toBe(1);
    expect(mapToFraction(-5, -5, JOJO_WEIGHTS)).toBe(0);
  });
});

describe('quantize', () => {
  it('lands on a real source frame', () => {
    const { time, frame } = quantize(0.5, JOJO, CLIP_FPS);
    expect(Number.isInteger(frame)).toBe(true);
    expect(time * CLIP_FPS).toBeCloseTo(Math.round(time * CLIP_FPS));
  });

  it('maps the window ends to its first and last frame', () => {
    expect(quantize(0, JOJO, CLIP_FPS).frame).toBe(0);
    expect(quantize(1, JOJO, CLIP_FPS).frame).toBe(frameCount(JOJO, CLIP_FPS));
  });

  it('stays inside the window for out-of-range fractions', () => {
    expect(quantize(-1, OLLIE, CLIP_FPS).time).toBeCloseTo(
      Math.round(OLLIE.T0 * CLIP_FPS) / CLIP_FPS,
    );
    expect(quantize(2, OLLIE, CLIP_FPS).time).toBeLessThanOrEqual(OLLIE.T1);
  });

  it('collapses sub-frame fractions onto the same frame', () => {
    const a = quantize(0.5, JOJO, CLIP_FPS);
    const b = quantize(0.5 + 0.2 / (JOJO.dur * CLIP_FPS), JOJO, CLIP_FPS);
    expect(b.frame).toBe(a.frame);
  });
});

describe('needsSeek', () => {
  it('ignores a move smaller than half a frame', () => {
    expect(needsSeek(1.0, 1.0 + 0.4 / CLIP_FPS, CLIP_FPS)).toBe(false);
  });

  it('fires once the displayed frame would change', () => {
    expect(needsSeek(1.0, 1.0 + 1 / CLIP_FPS, CLIP_FPS)).toBe(true);
  });
});

describe('advance', () => {
  it('holds inside the dead zone rather than chasing', () => {
    const cur = 0.5;
    expect(advance(cur, cur + DEAD_ZONE / 2, 0.14)).toBe(cur);
  });

  it('moves toward the target outside the dead zone', () => {
    const next = advance(0.5, 0.9, 0.14);
    expect(next).toBeGreaterThan(0.5);
    expect(next).toBeLessThan(0.9);
  });

  it('converges and then locks — jitter cannot keep toggling a frame', () => {
    let cur = 0;
    for (let i = 0; i < 500; i += 1) cur = advance(cur, 1, 0.14);
    const settled = cur;
    expect(advance(settled, 1, 0.14)).toBe(settled);
    expect(settled).toBeGreaterThan(0.99);
  });
});

describe('scrollFraction', () => {
  it('is inert when the pane is not taller than the viewport', () => {
    expect(scrollFraction({ top: 0, height: 800 }, 800)).toBe(0);
  });

  it('runs 0→1 across a tall pane travelling under a sticky viewport', () => {
    const height = 2400;
    expect(scrollFraction({ top: 0, height }, 800)).toBe(0);
    expect(scrollFraction({ top: -800, height }, 800)).toBeCloseTo(0.5);
    expect(scrollFraction({ top: -1600, height }, 800)).toBe(1);
  });

  it('clamps once the pane has left the viewport', () => {
    expect(scrollFraction({ top: -9999, height: 2400 }, 800)).toBe(1);
    expect(scrollFraction({ top: 9999, height: 2400 }, 800)).toBe(0);
  });
});

describe('clamp01', () => {
  it('clamps both ends', () => {
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(0.3)).toBe(0.3);
  });
});
