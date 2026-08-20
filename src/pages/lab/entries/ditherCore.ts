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

export type BlendId = 'normal' | 'overlay' | 'screen' | 'multiply' | 'dodge';

/**
 * How the marks blend into the photograph beneath them, in the canvas's own vocabulary.
 * Typed as `GlobalCompositeOperation` on purpose: canvas silently ignores an unknown operation
 * and falls back to `source-over`, so a typo here would be invisible at runtime — this way it
 * is a compile error instead.
 */
export const BLEND_OPS: Record<BlendId, GlobalCompositeOperation> = {
  normal: 'source-over',
  overlay: 'overlay',
  screen: 'screen',
  multiply: 'multiply',
  dodge: 'color-dodge',
};

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

/* Rec.601 again — the same coefficients `lumaGrid` weighs pixels with, here weighing one
 * `#rrggbb` from the duotone pickers. */
const hexLuma = (hex: string): number => {
  const n = parseInt(hex.slice(1), 16);
  return (((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114) / 255;
};

/**
 * Which of the duotone's two colours grounds the frame, and which one the marks take.
 *
 * Halftone and ascii grow their marks with *darkness*, so they keep the print convention —
 * ink on paper, whichever colours those are. A screen palette's bright ink over its dark
 * paper is the intended glow there, not an accident to correct.
 *
 * Dots and lattice grow their marks with *brightness*, so they read as the photograph only
 * when the marks are the lighter of the two colours. Choosing by luminance rather than by slot
 * is what makes that hold for a screen palette, where the dark colour sits in `paper` and the
 * bright one in `ink`: swapping the roles by name alone hands those a bright ground and dark
 * marks, and the picture comes out a negative.
 */
export const duotoneRoles = (
  effect: EffectId,
  duotone: Duotone,
): { ground: string; mark: string } => {
  if (effect === 'halftone' || effect === 'ascii') {
    return { ground: duotone.paper, mark: duotone.ink };
  }
  return hexLuma(duotone.ink) <= hexLuma(duotone.paper)
    ? { ground: duotone.ink, mark: duotone.paper }
    : { ground: duotone.paper, mark: duotone.ink };
};

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

/* 15% past the half-cell on purpose: shadow dots swell into their neighbours and dark
 * regions merge into solid ink instead of staying a polka-dot field — the classic print
 * overshoot (the reference app ships the same 1.15). */
const HALFTONE_R_MAX = 0.575;
const HALFTONE_MIN_R = 0.05 * HALFTONE_R_MAX;

/**
 * Circle marks on a rotated sampling grid, radius from sqrt of cell luminance so perceived
 * tone stays linear in dot area. The sampling grid is over-scanned past the frame's diagonal
 * before rotating, so a rotated grid still lands marks in all four corners.
 *
 * A point is kept when its *ink* can reach the frame, not merely its centre: a dot's radius
 * runs `HALFTONE_R_MAX` past the point it is centred on, so the ring of dots just outside the
 * frame still paints inside it — and that ring is what merges with the innermost one to hold a
 * shadow solid all the way to the border. Culling on the centre alone unravels the merge and
 * leaves a beaded fringe of bare paper up to a half-cell deep along every edge (visible on a
 * rotated grid, where the outermost survivors can sit a full cell short of the border).
 * Luminance for a point outside the frame clamps to the nearest cell, and the canvas clips
 * whatever ink lands past the edge.
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
      if (
        x < -HALFTONE_R_MAX ||
        x >= cols + HALFTONE_R_MAX ||
        y < -HALFTONE_R_MAX ||
        y >= rows + HALFTONE_R_MAX
      )
        continue;
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
  /* The reference app's two most distinctive ramps, carried over as it writes them: its
   * "cinematic" set (its ASCII-Symbols look) and its digits (ASCII-Numeric). The digits climb
   * by numeral rather than by ink, which is the point — the picture reads as a readout. */
  symbols: ' .:○◇✦×∆Σ',
  numeric: ' 0123456789',
};

/**
 * How far to push a source-coloured mark off the ground it sits on, as a multiplier on its
 * sampled colour. A mark that takes its pixel's own colour is invisible against that pixel —
 * same colour, same place — so it has to move, and the only direction available is away from
 * whatever is behind it.
 *
 * On a dark ground it brightens, up to 2.5x in the shadows: the reference app's exact curve.
 * On a light ground that curve is backwards — brightening a mark on cream paper hides it — so
 * there it darkens instead, hardest where the sampled colour is brightest. Same idea in both
 * directions: the dimmer the contrast between mark and ground, the further the mark moves.
 *
 * `groundLuma` is the luminance of what lies under the mark: the duotone's ground on a flat
 * fill, or the cell's own luminance when the photograph is the ground, since there the thing
 * behind the mark *is* the pixel it was sampled from.
 */
export const sourceMarkGain = (luma: number, groundLuma: number): number =>
  groundLuma < 0.5 ? 1 + (1 - luma) * 1.5 : 1 - luma * 0.45;

/** Rec.601 luminance of a `#rrggbb`, for deciding which way `sourceMarkGain` should push. */
export const hexLuminance = (hex: string): number => hexLuma(hex);

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

/* Cardinal + both diagonal neighbour directions, each pair visited once. Whether a diagonal
 * strut actually appears is decided by reach, not by this list: an unjittered diagonal is
 * √2 cells long, past the base reach, so diagonals only join the mesh as jitter extends it —
 * the reference app behaves the same way. */
const LATTICE_NEIGHBORS: [number, number][] = [
  [1, 0],
  [0, 1],
  [1, 1],
  [-1, 1],
];

/* Edge midpoints are culled at a softer threshold than nodes (the reference app ships the
 * same 0.75 ratio), so struts survive slightly into shadow before their endpoints do. */
const LATTICE_EDGE_LUMA_RATIO = 0.75;

/**
 * A node grid with a luminance cull, jittered surviving positions, and luminance-weighted
 * edges: every neighbouring pair (cardinal and diagonal) within reach becomes an edge carrying
 * the luminance sampled at its midpoint and a `fade` (1 at zero length, 0 at full reach), so
 * the paint step can let the mesh itself carry the image — bright regions render dense and
 * bright, shadows thin out and dim. Reach starts just past one cell (diagonals excluded) and
 * grows with jitter. `rand` is injected so callers (and tests) can make the scatter
 * deterministic — see `seededRand`.
 */
export const latticeMarks = (
  grid: Grid,
  params: LatticeParams,
  rand: () => number,
): {
  nodes: { x: number; y: number; luma: number }[];
  edges: { a: number; b: number; luma: number; fade: number }[];
} => {
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

  // Base reach sits a quarter past one cell so an unjittered cardinal strut keeps a visible
  // fade (the reference app's exact 1.0 base zeroes it out and the mesh vanishes at zero
  // scatter); jitter then extends it, letting diagonals (√2) and stretched struts in.
  const reach = step * (1.25 + params.jitter * 1.35);
  const edgeCutoff = params.threshold * LATTICE_EDGE_LUMA_RATIO;

  const edges: { a: number; b: number; luma: number; fade: number }[] = [];
  for (let ri = 0; ri < rowIdxs.length; ri++) {
    for (let ci = 0; ci < colIdxs.length; ci++) {
      const idx = nodeIndexAt[ri][ci];
      if (idx === undefined) continue;
      for (const [dc, dr] of LATTICE_NEIGHBORS) {
        const rj = ri + dr;
        const cj = ci + dc;
        if (rj >= rowIdxs.length || cj < 0 || cj >= colIdxs.length) continue;
        const jdx = nodeIndexAt[rj][cj];
        if (jdx === undefined) continue;
        const na = nodes[idx];
        const nb = nodes[jdx];
        const dist = Math.hypot(nb.x - na.x, nb.y - na.y);
        if (dist > reach) continue;
        const mc = Math.min(grid.cols - 1, Math.max(0, Math.floor((na.x + nb.x) / 2)));
        const mr = Math.min(grid.rows - 1, Math.max(0, Math.floor((na.y + nb.y) / 2)));
        const l = grid.luma[mr * grid.cols + mc];
        if (l < edgeCutoff) continue;
        edges.push({ a: idx, b: jdx, luma: l, fade: 1 - dist / reach });
      }
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
