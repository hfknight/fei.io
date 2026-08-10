import { describe, expect, it } from 'vitest';
import { coverageAt, fitMark, levelAt, type Raster } from './asciiSample';

/**
 * A 4x4 alpha field, transparent except for a solid 2x2 block in the middle. Small enough
 * to reason about by hand, which is the point — the mapping's failures are all off-by-a-cell.
 *
 *   . . . .
 *   . # # .
 *   . # # .
 *   . . . .
 */
const raster = (): Raster => {
  const alpha = new Uint8ClampedArray(16);
  [5, 6, 9, 10].forEach(i => (alpha[i] = 255));
  return { alpha, w: 4, h: 4 };
};

describe('fitMark', () => {
  it('binds a tall mark by the block height', () => {
    // A block twice as wide as it is tall, and a mark half as wide as it is tall: height
    // runs out first, so the mark fills it and leaves paper either side.
    expect(fitMark(200, 100, 0.5)).toEqual({ x: 75, y: 0, w: 50, h: 100 });
  });

  it('binds a wide mark by the block width instead of cropping it', () => {
    // The case that made this a contain fit rather than a height-bound one. Bound by height,
    // a 3:1 mark in a square block comes out 300 wide and two thirds of it is thrown away.
    const m = fitMark(100, 100, 3);
    expect(m.x).toBe(0);
    expect(m.w).toBe(100);
    expect(m.h).toBeCloseTo(100 / 3, 6);
    expect(m.y).toBeCloseTo(100 / 3, 6);
  });

  it('centres on both axes', () => {
    const tall = fitMark(200, 100, 0.5);
    expect(tall.x + tall.w / 2).toBe(100);
    expect(tall.y + tall.h / 2).toBe(50);
    const wide = fitMark(100, 100, 3);
    expect(wide.x + wide.w / 2).toBe(50);
    expect(wide.y + wide.h / 2).toBe(50);
  });

  it('leaves a mark of the same proportions as the block filling it exactly', () => {
    expect(fitMark(200, 100, 2)).toEqual({ x: 0, y: 0, w: 200, h: 100 });
  });
});

describe('levelAt', () => {
  // The mark occupies the block's full width and height, so block coords are raster coords
  // scaled by 25 — one raster cell per 25 units.
  const mark = { x: 0, y: 0, w: 100, h: 100 };

  it('reads the densest ink at the centre', () => {
    expect(levelAt(50, 50, mark, raster(), 8)).toBe(8);
  });

  it('reads nothing in the transparent corner', () => {
    expect(levelAt(12, 12, mark, raster(), 8)).toBe(0);
  });

  it('scales the alpha across the step ladder', () => {
    const half = raster();
    half.alpha[5] = 128;
    expect(levelAt(37, 37, mark, half, 8)).toBe(4);
  });

  it('returns 0 outside the mark rather than clamping to its edge', () => {
    // Left of the mark. Clamping would smear column 0 across everything to its left, which
    // is invisible for a transparent edge and a solid bar for an inked one.
    const solidEdge = raster();
    [0, 4, 8, 12].forEach(i => (solidEdge.alpha[i] = 255));
    expect(levelAt(-10, 50, mark, solidEdge, 8)).toBe(0);
  });

  it('treats the far edge as outside, not as the last cell', () => {
    // u === 1 exactly. Half-open on purpose, so a character sitting on the boundary does not
    // sample a row that a character one pixel further along would miss.
    expect(levelAt(100, 50, mark, raster(), 8)).toBe(0);
    expect(levelAt(50, 100, mark, raster(), 8)).toBe(0);
  });

  it('honours the mark offset when it does not fill the block', () => {
    const offset = { x: 100, y: 0, w: 100, h: 100 };
    // The block-centre is now outside the mark entirely.
    expect(levelAt(50, 50, offset, raster(), 8)).toBe(0);
    // ...and the mark's own centre has moved with it.
    expect(levelAt(150, 50, offset, raster(), 8)).toBe(8);
  });
});

describe('coverageAt', () => {
  const mark = { x: 0, y: 0, w: 100, h: 100 };

  /** 8x8, with a single fully-inked row at y=4 — a stroke one raster-row thick. */
  const stroke = (): Raster => {
    const alpha = new Uint8ClampedArray(64);
    for (let x = 0; x < 8; x++) alpha[4 * 8 + x] = 255;
    return { alpha, w: 8, h: 8 };
  };

  it('reads a cell sitting entirely on solid ink as full ink', () => {
    expect(coverageAt(50, 50, 50, 50, mark, raster(), 8)).toBe(8);
  });

  it('reads a cell sitting entirely on nothing as nothing', () => {
    expect(coverageAt(12.5, 12.5, 25, 25, mark, raster(), 8)).toBe(0);
  });

  it('reads a part-covered cell in proportion', () => {
    // The whole 4x4 field, a quarter of which is inked.
    expect(coverageAt(50, 50, 100, 100, mark, raster(), 8)).toBe(2);
  });

  /**
   * The regression this function exists for: an italic H's crossbar is about one row thick,
   * and point sampling either lands on it or loses it entirely. Here the cell's CENTRE falls
   * between the inked row and the next, so a centre sample reads nothing.
   */
  it('registers a stroke thinner than the cell, even when the centre misses it', () => {
    const r = stroke();
    // Cell spanning rows 3 and 4 of 8; its centre is on the boundary, in row 4's neighbour.
    const centreY = (3.5 / 8) * 100;
    expect(levelAt(50, centreY, mark, r, 8)).toBe(0);
    expect(coverageAt(50, centreY, 100, (2 / 8) * 100, mark, r, 8)).toBeGreaterThan(0);
  });

  it('counts area outside the mark as empty rather than ignoring it', () => {
    // A cell straddling the mark's left edge: half of it has no mark at all, so it comes back
    // at about half weight. This is what makes the mark's edge soft instead of stepped.
    const solid: Raster = { alpha: new Uint8ClampedArray(16).fill(255), w: 4, h: 4 };
    expect(coverageAt(0, 50, 100, 50, mark, solid, 8)).toBe(4);
  });

  it('never divides by zero on a cell narrower than one raster pixel', () => {
    expect(Number.isFinite(coverageAt(50, 50, 0.0001, 0.0001, mark, raster(), 8))).toBe(true);
  });
});
