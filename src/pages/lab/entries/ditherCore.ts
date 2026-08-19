/**
 * The dither lab entry's math: luminance, contrast, and the four effects' per-cell marks.
 *
 * Every function here is pure — typed arrays and plain data in, plain data out, no DOM, no
 * canvas. That is deliberate: this is the part of the entry that can be wrong in ways a
 * glance at the canvas won't catch (an off-by-one in the halftone rotation still "looks like
 * dots", it just looks like slightly wrong dots). The canvas edge that decodes images, probes
 * pixels, and paints marks lives alongside this module and stays thin and untested, per the
 * repo's `asciiSample.ts` convention.
 *
 * Marks are returned in unit-cell space — one grid cell is 1×1 — so the canvas edge is the
 * only place that knows the actual pixel size of a cell.
 */

export type EffectId = 'halftone' | 'dots' | 'ascii' | 'lattice';

export interface Duotone {
  ink: string;
  paper: string;
}

export interface HalftoneParams {
  cellSize: number;
  angle: number;
  contrast: number;
  invert: boolean;
}

export interface DotsParams {
  cellSize: number;
  fillCutoff: number;
  contrast: number;
}

export interface AsciiParams {
  cellSize: number;
  contrast: number;
  charset: string;
}

export interface LatticeParams {
  density: number;
  threshold: number;
  jitter: number;
}

/** A downscaled luminance field: one value per grid cell, row-major. */
export interface Grid {
  cols: number;
  rows: number;
  luma: Float32Array;
}

/**
 * Rec.601 luminance per pixel of an already-downscaled probe. The probe canvas is downscaled
 * elsewhere to exactly `width`×`height` — one probe pixel per grid cell — so this is the whole
 * of `Grid.luma` once reshaped.
 */
export const lumaGrid = (data: Uint8ClampedArray, width: number, height: number): Float32Array => {
  const count = width * height;
  const out = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const o = i * 4;
    out[i] = (data[o] * 0.299 + data[o + 1] * 0.587 + data[o + 2] * 0.114) / 255;
  }
  return out;
};

/**
 * Push values away from (contrast > 0) or toward (contrast < 0) mid-grey, symmetrically.
 * Contrast 0 is identity. Returns a new array — `luma` is never mutated.
 */
export const stretchContrast = (luma: Float32Array, contrast: number): Float32Array => {
  const out = new Float32Array(luma.length);
  for (let i = 0; i < luma.length; i++) {
    const v = (luma[i] - 0.5) * (1 + contrast) + 0.5;
    out[i] = Math.min(1, Math.max(0, v));
  }
  return out;
};

const HALFTONE_R_MAX = 0.5;
const HALFTONE_MIN_R = 0.05 * HALFTONE_R_MAX;

/**
 * Circle marks on a rotated sampling grid, radius from sqrt of cell luminance so perceived
 * tone stays linear in dot area. The sampling grid is over-scanned past the frame's diagonal
 * before rotating, so a rotated grid still lands marks in all four corners; points that land
 * outside the frame after rotation are simply skipped.
 */
export const halftoneMarks = (
  grid: Grid,
  params: HalftoneParams,
): { x: number; y: number; r: number }[] => {
  const { cols, rows, luma } = grid;
  // Pivot on a cell center (not the geometric corner-grid center), so integer sampling
  // offsets land on cell centers at angle 0 regardless of cols/rows parity.
  const cx = Math.floor(cols / 2) + 0.5;
  const cy = Math.floor(rows / 2) + 0.5;
  const rad = (params.angle * Math.PI) / 180;
  const cosA = Math.cos(rad);
  const sinA = Math.sin(rad);
  const overscan = Math.ceil(Math.sqrt(cols * cols + rows * rows) / 2) + 2;

  const marks: { x: number; y: number; r: number }[] = [];
  for (let j = -overscan; j <= overscan; j++) {
    for (let i = -overscan; i <= overscan; i++) {
      const x = cx + i * cosA - j * sinA;
      const y = cy + i * sinA + j * cosA;
      if (x < 0 || x >= cols || y < 0 || y >= rows) continue;
      const col = Math.min(cols - 1, Math.max(0, Math.floor(x)));
      const row = Math.min(rows - 1, Math.max(0, Math.floor(y)));
      const l = luma[row * cols + col];
      const r = HALFTONE_R_MAX * Math.sqrt(params.invert ? l : 1 - l);
      if (r < HALFTONE_MIN_R) continue;
      marks.push({ x, y, r });
    }
  }
  return marks;
};

/** Flat marks on an axis-aligned grid, radius grown by brightness; a fill cutoff culls dim cells. */
export const dotsMarks = (
  grid: Grid,
  params: DotsParams,
): { x: number; y: number; r: number }[] => {
  const { cols, rows, luma } = grid;
  const marks: { x: number; y: number; r: number }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const l = luma[row * cols + col];
      if (l < params.fillCutoff) continue;
      marks.push({ x: col + 0.5, y: row + 0.5, r: 0.425 * (0.5 + l * 0.7) });
    }
  }
  return marks;
};

/** Density-ordered glyph ramps, light-first: index 0 is the lightest mark, the last is densest. */
export const ASCII_RAMPS = {
  classic: ' .,;:+=*%S#@',
  blocky: ' ░▒▓█',
  thin: ' ·∙∘○◌◍',
};

/**
 * Per-cell luminance indexed into a density-ordered glyph ramp: dark cells get the ramp's
 * last (densest) character, bright cells its first (lightest). Space characters produce no
 * mark. A 1-character ramp always indexes 0, rather than dividing by zero.
 */
export const asciiMarks = (
  grid: Grid,
  params: AsciiParams,
): { col: number; row: number; char: string }[] => {
  const { cols, rows, luma } = grid;
  // Code points, not UTF-16 units — a custom ramp pasted full of emoji must not split
  // surrogate pairs into broken glyphs.
  const chars = Array.from(params.charset);
  const denom = chars.length - 1;
  const marks: { col: number; row: number; char: string }[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const l = luma[row * cols + col];
      const idx = denom === 0 ? 0 : Math.round((1 - l) * denom);
      const char = chars[idx];
      if (char === ' ') continue;
      marks.push({ col, row, char });
    }
  }
  return marks;
};

/**
 * A node grid with a luminance cull, jittered surviving positions, and edges connecting
 * horizontally/vertically adjacent survivors. `rand` is injected so callers (and tests) can
 * make the scatter deterministic — see `seededRand`.
 */
export const latticeMarks = (
  grid: Grid,
  params: LatticeParams,
  rand: () => number,
): { nodes: { x: number; y: number; luma: number }[]; edges: [number, number][] } => {
  const step = Math.max(1, Math.round(params.density));
  const colIdxs: number[] = [];
  for (let c = 0; c < grid.cols; c += step) colIdxs.push(c);
  const rowIdxs: number[] = [];
  for (let r = 0; r < grid.rows; r += step) rowIdxs.push(r);

  const nodes: { x: number; y: number; luma: number }[] = [];
  // Indexed [rowIdx][colIdx] -> index into `nodes`, or undefined if that cell was culled.
  const nodeIndexAt: (number | undefined)[][] = rowIdxs.map(() => []);

  for (let ri = 0; ri < rowIdxs.length; ri++) {
    for (let ci = 0; ci < colIdxs.length; ci++) {
      const c = colIdxs[ci];
      const r = rowIdxs[ri];
      const l = grid.luma[r * grid.cols + c];
      if (l < params.threshold) continue;
      const x = c + 0.5 + (rand() - 0.5) * params.jitter;
      const y = r + 0.5 + (rand() - 0.5) * params.jitter;
      nodeIndexAt[ri][ci] = nodes.length;
      nodes.push({ x, y, luma: l });
    }
  }

  const edges: [number, number][] = [];
  for (let ri = 0; ri < rowIdxs.length; ri++) {
    for (let ci = 0; ci < colIdxs.length; ci++) {
      const idx = nodeIndexAt[ri][ci];
      if (idx === undefined) continue;
      const right = ci + 1 < colIdxs.length ? nodeIndexAt[ri][ci + 1] : undefined;
      if (right !== undefined) edges.push([idx, right]);
      const down = ri + 1 < rowIdxs.length ? nodeIndexAt[ri + 1][ci] : undefined;
      if (down !== undefined) edges.push([idx, down]);
    }
  }

  return { nodes, edges };
};

/**
 * A small deterministic PRNG (mulberry32), so preview and export renders can reproduce the
 * same lattice jitter from the same seed.
 */
export const seededRand = (seed: number): (() => number) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};
