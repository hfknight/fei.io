import { describe, expect, it } from 'vitest';
import {
  ASCII_RAMPS,
  asciiMarks,
  dotsMarks,
  halftoneMarks,
  latticeMarks,
  lumaGrid,
  seededRand,
  stretchContrast,
  type Grid,
} from './ditherCore';

describe('lumaGrid', () => {
  it('computes exact Rec.601 luminance for a known 2x2 fixture', () => {
    // Pixels: red, green, blue, white.
    const data = new Uint8ClampedArray([
      255, 0, 0, 255, // red
      0, 255, 0, 255, // green
      0, 0, 255, 255, // blue
      255, 255, 255, 255, // white
    ]);
    const luma = lumaGrid(data, 2, 2);
    expect(luma[0]).toBeCloseTo(0.299, 5);
    expect(luma[1]).toBeCloseTo(0.587, 5);
    expect(luma[2]).toBeCloseTo(0.114, 5);
    expect(luma[3]).toBeCloseTo(1, 5);
  });

  it('reads all-black as 0 and all-white as 1', () => {
    const black = new Uint8ClampedArray([0, 0, 0, 255, 0, 0, 0, 255]);
    const white = new Uint8ClampedArray([255, 255, 255, 255, 255, 255, 255, 255]);
    expect(Array.from(lumaGrid(black, 2, 1))).toEqual([0, 0]);
    expect(Array.from(lumaGrid(white, 2, 1))).toEqual([1, 1]);
  });
});

describe('stretchContrast', () => {
  it('is identity at contrast 0', () => {
    const luma = new Float32Array([0, 0.3, 0.5, 0.75, 1]);
    expect(Array.from(stretchContrast(luma, 0))).toEqual(Array.from(luma));
  });

  it('pushes values either side of 0.5 apart symmetrically at high contrast', () => {
    const [lo, hi] = Array.from(stretchContrast(new Float32Array([0.4, 0.6]), 1));
    expect(0.5 - lo).toBeCloseTo(hi - 0.5, 6);
    expect(lo).toBeLessThan(0.4);
    expect(hi).toBeGreaterThan(0.6);
  });

  it('pulls values toward mid-grey at negative contrast', () => {
    const [lo, hi] = Array.from(stretchContrast(new Float32Array([0.2, 0.8]), -0.5));
    expect(lo).toBeGreaterThan(0.2);
    expect(hi).toBeLessThan(0.8);
  });

  it('clamps results to [0, 1]', () => {
    const luma = new Float32Array([0, 1]);
    const out = stretchContrast(luma, 5);
    expect(out[0]).toBe(0);
    expect(out[1]).toBe(1);
  });

  it('returns a new array rather than mutating the input', () => {
    const luma = new Float32Array([0.2, 0.8]);
    const copy = Float32Array.from(luma);
    stretchContrast(luma, 1);
    expect(Array.from(luma)).toEqual(Array.from(copy));
  });
});

/** A uniform grid, every cell the same luma. */
const flatGrid = (cols: number, rows: number, luma: number): Grid => ({
  cols,
  rows,
  luma: new Float32Array(cols * rows).fill(luma),
});

describe('halftoneMarks', () => {
  const params = (overrides: Partial<Parameters<typeof halftoneMarks>[1]> = {}) => ({
    cellSize: 12,
    angle: 0,
    contrast: 0,
    invert: false,
    ...overrides,
  });

  it('skips a white cell (invert off): radius is ~0', () => {
    const marks = halftoneMarks(flatGrid(4, 4, 1), params());
    expect(marks).toEqual([]);
  });

  it('gives a black cell the max radius', () => {
    const marks = halftoneMarks(flatGrid(4, 4, 0), params());
    expect(marks.length).toBeGreaterThan(0);
    for (const m of marks) expect(m.r).toBeCloseTo(0.575, 6);
  });

  it('follows sqrt: luma 0.75 gives half the radius of luma 0', () => {
    const blackMarks = halftoneMarks(flatGrid(4, 4, 0), params());
    const dimMarks = halftoneMarks(flatGrid(4, 4, 0.75), params());
    expect(dimMarks.length).toBeGreaterThan(0);
    expect(dimMarks[0].r).toBeCloseTo(blackMarks[0].r / 2, 5);
  });

  it('skips exactly at the 5%-of-cell-radius floor, not just at r ≈ 0', () => {
    // r = 0.575*sqrt(1-l); l = 0.999 gives r ≈ 0.0182 (below the 0.0288 floor, skipped);
    // l = 0.99 gives r ≈ 0.05 (above it, kept).
    expect(halftoneMarks(flatGrid(2, 2, 0.999), params())).toEqual([]);
    expect(halftoneMarks(flatGrid(2, 2, 0.99), params()).length).toBeGreaterThan(0);
  });

  it('invert swaps the mapping: white now gets the max radius, black gets skipped', () => {
    const whiteInverted = halftoneMarks(flatGrid(4, 4, 1), params({ invert: true }));
    expect(whiteInverted.length).toBeGreaterThan(0);
    for (const m of whiteInverted) expect(m.r).toBeCloseTo(0.575, 6);

    const blackInverted = halftoneMarks(flatGrid(4, 4, 0), params({ invert: true }));
    expect(blackInverted).toEqual([]);
  });

  it('covers all four corners of the frame at angle 0', () => {
    const grid = flatGrid(8, 8, 0);
    const marks = halftoneMarks(grid, params({ angle: 0 }));
    const xs = marks.map(m => m.x);
    const ys = marks.map(m => m.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(1);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(7);
    expect(Math.min(...ys)).toBeLessThanOrEqual(1);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(7);
  });

  it('covers all four corners of the frame at angle 45 (over-scan works)', () => {
    const grid = flatGrid(8, 8, 0);
    const marks = halftoneMarks(grid, params({ angle: 45 }));
    const xs = marks.map(m => m.x);
    const ys = marks.map(m => m.y);
    expect(Math.min(...xs)).toBeLessThanOrEqual(1);
    expect(Math.max(...xs)).toBeGreaterThanOrEqual(7);
    expect(Math.min(...ys)).toBeLessThanOrEqual(1);
    expect(Math.max(...ys)).toBeGreaterThanOrEqual(7);
  });

  it('covers all four corners within one cell on a non-square, odd-sided grid at 30°', () => {
    const cols = 9;
    const rows = 5;
    const grid = flatGrid(cols, rows, 0);
    const marks = halftoneMarks(grid, params({ angle: 30 }));
    const corners: [number, number][] = [
      [0, 0],
      [cols, 0],
      [0, rows],
      [cols, rows],
    ];
    for (const [cx, cy] of corners) {
      const nearest = Math.min(
        ...marks.map(m => Math.hypot(m.x - cx, m.y - cy)),
      );
      // Within one cell diagonal: sample spacing is 1 unit, and points must land strictly
      // inside the frame, so the nearest survivor to a corner can be up to a cell away.
      expect(nearest).toBeLessThanOrEqual(Math.SQRT2);
    }
  });

  it('at angle 0, lands exactly on cell centers — the same grid dotsMarks samples', () => {
    const cols = 8;
    const rows = 8;
    const grid = flatGrid(cols, rows, 0);
    const halftone = halftoneMarks(grid, params({ angle: 0 }));
    const dots = dotsMarks(grid, { cellSize: 12, fillCutoff: 0, contrast: 0 });
    const toKey = (p: { x: number; y: number }) => `${p.x},${p.y}`;
    const halftoneKeys = new Set(halftone.map(toKey));
    const dotsKeys = new Set(dots.map(toKey));
    // Every cell center is sampled; the extras are the outside ring whose ink reaches back in.
    for (const key of dotsKeys) expect(halftoneKeys).toContain(key);
    for (const m of halftone) {
      const inside = m.x > 0 && m.x < cols && m.y > 0 && m.y < rows;
      if (!inside) expect(dotsKeys).not.toContain(toKey(m));
    }
  });

  it('keeps the ring of points just outside the frame, and nothing past their ink', () => {
    const cols = 8;
    const rows = 8;
    const marks = halftoneMarks(flatGrid(cols, rows, 0), params({ angle: 45 }));
    const outside = marks.filter(m => m.x < 0 || m.y < 0 || m.x >= cols || m.y >= rows);
    expect(outside.length).toBeGreaterThan(0);
    // A point further out than the max radius could paint nothing inside, so none is kept.
    for (const m of marks) {
      expect(m.x).toBeGreaterThanOrEqual(-0.575);
      expect(m.y).toBeGreaterThanOrEqual(-0.575);
      expect(m.x).toBeLessThan(cols + 0.575);
      expect(m.y).toBeLessThan(rows + 0.575);
    }
  });

  it('inks a black frame right up to all four borders, not just the interior', () => {
    // The regression this guards: culling on the centre alone left the outermost dots
    // unmerged, so a solid shadow frayed into separate circles along the edge. On this
    // lattice a straight line runs 81-100% covered depending on where it falls between
    // rows — a border that drops to ~45% is the fringe, not the phase.
    const cols = 10;
    const rows = 10;
    const marks = halftoneMarks(flatGrid(cols, rows, 0), params({ angle: 45 }));
    const covered = (x: number, y: number) =>
      marks.some(m => Math.hypot(m.x - x, m.y - y) <= m.r);

    const SAMPLES = 200;
    const edges: [string, (t: number) => [number, number]][] = [
      ['top', t => [t * cols, 0]],
      ['bottom', t => [t * cols, rows]],
      ['left', t => [0, t * rows]],
      ['right', t => [cols, t * rows]],
    ];
    for (const [name, at] of edges) {
      let hits = 0;
      for (let i = 0; i < SAMPLES; i++) if (covered(...at(i / (SAMPLES - 1)))) hits++;
      expect(`${name}:${hits / SAMPLES >= 0.75}`).toBe(`${name}:true`);
    }
  });
});

describe('dotsMarks', () => {
  const params = (overrides: Partial<Parameters<typeof dotsMarks>[1]> = {}) => ({
    cellSize: 12,
    fillCutoff: 0.1,
    contrast: 0,
    ...overrides,
  });

  it('produces no mark for a cell below the fill cutoff', () => {
    const marks = dotsMarks(flatGrid(2, 1, 0.05), params({ fillCutoff: 0.1 }));
    expect(marks).toEqual([]);
  });

  it('keeps a cell at or above the fill cutoff', () => {
    const marks = dotsMarks(flatGrid(2, 1, 0.1), params({ fillCutoff: 0.1 }));
    expect(marks.length).toBe(2);
  });

  it('grows radius monotonically with brightness', () => {
    const dim = dotsMarks(flatGrid(1, 1, 0.2), params({ fillCutoff: 0 }))[0];
    const mid = dotsMarks(flatGrid(1, 1, 0.5), params({ fillCutoff: 0 }))[0];
    const bright = dotsMarks(flatGrid(1, 1, 0.9), params({ fillCutoff: 0 }))[0];
    expect(dim.r).toBeLessThan(mid.r);
    expect(mid.r).toBeLessThan(bright.r);
  });
});

describe('ASCII_RAMPS', () => {
  it('exposes classic, blocky, and thin ramps starting with a space', () => {
    expect(ASCII_RAMPS.classic[0]).toBe(' ');
    expect(ASCII_RAMPS.blocky[0]).toBe(' ');
    expect(ASCII_RAMPS.thin[0]).toBe(' ');
    expect(ASCII_RAMPS.classic.length).toBeGreaterThan(1);
  });
});

describe('asciiMarks', () => {
  const params = (charset: string, contrast = 0) => ({ cellSize: 12, contrast, charset });

  it('maps luma 0 to the ramp\'s densest (last) glyph', () => {
    const charset = 'ab#';
    const marks = asciiMarks(flatGrid(1, 1, 0), params(charset));
    expect(marks).toEqual([{ col: 0, row: 0, char: '#' }]);
  });

  it('maps luma 1 to the ramp\'s lightest (first) glyph, skipped when it is a space', () => {
    const charset = ' ab#';
    const marks = asciiMarks(flatGrid(1, 1, 1), params(charset));
    expect(marks).toEqual([]);
  });

  it('maps luma 1 to the first glyph when the ramp does not start with a space', () => {
    const charset = 'ab#';
    const marks = asciiMarks(flatGrid(1, 1, 1), params(charset));
    expect(marks).toEqual([{ col: 0, row: 0, char: 'a' }]);
  });

  it('skips any cell whose indexed glyph is a space, not just the endpoints', () => {
    const charset = 'a b';
    // Midpoint luma should index the middle character, the space.
    const marks = asciiMarks(flatGrid(1, 1, 0.5), params(charset));
    expect(marks).toEqual([]);
  });

  it('does not divide by zero on a 1-character custom ramp', () => {
    const charset = '@';
    expect(() => asciiMarks(flatGrid(2, 2, 0.37), params(charset))).not.toThrow();
    const marks = asciiMarks(flatGrid(2, 2, 0.37), params(charset));
    expect(marks.every(m => m.char === '@')).toBe(true);
  });
});

describe('seededRand', () => {
  it('is reproducible: two generators from the same seed produce the same stream', () => {
    const a = seededRand(42);
    const b = seededRand(42);
    const streamA = Array.from({ length: 10 }, () => a());
    const streamB = Array.from({ length: 10 }, () => b());
    expect(streamA).toEqual(streamB);
  });

  it('different seeds produce different streams', () => {
    const a = seededRand(1);
    const b = seededRand(2);
    const streamA = Array.from({ length: 5 }, () => a());
    const streamB = Array.from({ length: 5 }, () => b());
    expect(streamA).not.toEqual(streamB);
  });

  it('produces values in [0, 1)', () => {
    const rand = seededRand(7);
    for (let i = 0; i < 50; i++) {
      const v = rand();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('latticeMarks', () => {
  const zeroRand = () => 0.5; // (rand() - 0.5) * jitter === 0, so this also proves jitter math

  it('culls nodes below threshold, and their edges with them', () => {
    // 2x1 grid: left cell dark (culled), right cell bright (kept).
    const grid: Grid = { cols: 2, rows: 1, luma: new Float32Array([0, 1]) };
    const { nodes, edges } = latticeMarks(
      grid,
      { density: 1, threshold: 0.5, jitter: 0 },
      zeroRand,
    );
    expect(nodes.length).toBe(1);
    expect(nodes[0].luma).toBe(1);
    expect(edges).toEqual([]);
  });

  it('leaves nodes on exact grid centers when jitter is 0', () => {
    const grid = flatGrid(2, 2, 1);
    const { nodes } = latticeMarks(grid, { density: 1, threshold: 0, jitter: 0 }, zeroRand);
    const positions = nodes.map(n => [n.x, n.y]).sort();
    expect(positions).toEqual([
      [0.5, 0.5],
      [0.5, 1.5],
      [1.5, 0.5],
      [1.5, 1.5],
    ]);
  });

  it('connects only cardinal neighbors at zero jitter — diagonals sit past the base reach', () => {
    const grid = flatGrid(2, 2, 1);
    const { nodes, edges } = latticeMarks(grid, { density: 1, threshold: 0, jitter: 0 }, zeroRand);
    // A 2x2 fully-surviving grid has exactly 4 cardinal edges; the 2 diagonals (length √2)
    // exceed the zero-jitter reach of 1.25 and are culled.
    expect(edges.length).toBe(4);
    for (const { a, b, luma, fade } of edges) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThan(nodes.length);
      expect(b).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThan(nodes.length);
      expect(luma).toBe(1);
      expect(fade).toBeGreaterThan(0);
      expect(fade).toBeLessThanOrEqual(1);
    }
  });

  it('lets diagonal struts in once jitter extends the reach', () => {
    const grid = flatGrid(2, 2, 1);
    // zeroRand keeps nodes on centers, so jitter only widens the reach: 1.25 + 1*1.35 = 2.6,
    // which admits the two √2-long diagonals on top of the 4 cardinals.
    const { edges } = latticeMarks(grid, { density: 1, threshold: 0, jitter: 1 }, zeroRand);
    expect(edges.length).toBe(6);
  });

  it('samples each edge luminance at the strut midpoint', () => {
    // 2x1 grid, both cells surviving: the midpoint of the strut between (0.5) and (1.5)
    // lands at x=1.0, which floors into the right cell — the edge carries that cell's luma.
    const grid: Grid = { cols: 2, rows: 1, luma: new Float32Array([1, 0.6]) };
    const { edges } = latticeMarks(grid, { density: 1, threshold: 0.5, jitter: 0 }, zeroRand);
    expect(edges.length).toBe(1);
    expect(edges[0].luma).toBeCloseTo(0.6);
  });

  it('never lets an edge reference a culled node index', () => {
    // Checkerboard: alternating culled/surviving cells.
    const grid: Grid = {
      cols: 3,
      rows: 3,
      luma: new Float32Array([1, 0, 1, 0, 1, 0, 1, 0, 1]),
    };
    const { nodes, edges } = latticeMarks(grid, { density: 1, threshold: 0.5, jitter: 0 }, zeroRand);
    expect(nodes.length).toBe(5); // the five "1" cells
    for (const { a, b } of edges) {
      expect(a).toBeLessThan(nodes.length);
      expect(b).toBeLessThan(nodes.length);
    }
    // Surviving checkerboard cells are only diagonal neighbors, which the zero-jitter reach
    // culls, so there are no edges.
    expect(edges).toEqual([]);
  });

  it('jitters surviving node positions using the injected rand, reproducibly for a given seed', () => {
    const grid = flatGrid(1, 1, 1);
    const rand1 = seededRand(99);
    const rand2 = seededRand(99);
    const a = latticeMarks(grid, { density: 1, threshold: 0, jitter: 1 }, rand1);
    const b = latticeMarks(grid, { density: 1, threshold: 0, jitter: 1 }, rand2);
    expect(a.nodes).toEqual(b.nodes);
    // With jitter 1 the node should (almost certainly) move off the exact center.
    expect(a.nodes[0].x === 0.5 && a.nodes[0].y === 0.5).toBe(false);
  });

  // `density` is spacing in grid cells between sampled nodes (not defined by the plan; this
  // module's own choice). NOTE the direction: a HIGHER density value samples FEWER, more
  // widely-spaced nodes. A "Node density" UI control needs to account for that inversion.
  it('treats density as node spacing: density 2 samples a quarter as many nodes as density 1', () => {
    const grid = flatGrid(4, 4, 1);
    const sparse = latticeMarks(grid, { density: 2, threshold: 0, jitter: 0 }, zeroRand);
    const dense = latticeMarks(grid, { density: 1, threshold: 0, jitter: 0 }, zeroRand);
    expect(dense.nodes.length).toBe(16);
    expect(sparse.nodes.length).toBe(4);
  });
});

describe('asciiMarks charset code points', () => {
  it('does not split surrogate pairs in an emoji ramp', () => {
    const grid = { cols: 1, rows: 1, luma: new Float32Array([0]) };
    const marks = asciiMarks(grid, { cellSize: 8, contrast: 0, charset: '🐈🐕' });
    expect(marks).toHaveLength(1);
    expect(marks[0].char).toBe('🐕');
  });
});
