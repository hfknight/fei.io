/**
 * The dither lab entry's canvas edge: probes a source image down to a grid, hands the pixels
 * to `ditherCore`'s pure math, and paints the returned marks.
 *
 * Not pure, and not tested — it is a canvas call, per the repo's `asciiSample.ts` convention.
 * jsdom has no 2d context, so the logic worth testing (luminance, contrast, the four effects'
 * mark geometry) lives in `ditherCore.ts` and is exercised there; this module is guarded to
 * fail quietly instead.
 *
 * One renderer, two callers: the preview canvas (capped grid, re-invoked on every slider
 * drag) and the export canvas (full source resolution, same grid). Cost scales with cell
 * count, not pixel count, which is what keeps the preview interactive — see KTD1 in the
 * dither lab entry plan.
 */

import type {
  AsciiParams,
  Duotone,
  DotsParams,
  EffectId,
  Grid,
  HalftoneParams,
  LatticeParams,
} from './ditherCore';
import {
  asciiMarks,
  dotsMarks,
  halftoneMarks,
  latticeMarks,
  lumaGrid,
  seededRand,
  stretchContrast,
} from './ditherCore';

export interface RenderSpec {
  effect: EffectId;
  halftone: HalftoneParams;
  dots: DotsParams;
  ascii: AsciiParams;
  lattice: LatticeParams;
  duotone: Duotone;
  jitterSeed: number;
}

/** The preview grid's column cap. Cost scales with cell count, so this is what keeps slider
 *  drags interactive on a full-resolution photo. */
export const PREVIEW_MAX_COLS = 120;

/**
 * The export pixel-area ceiling. iOS Safari silently blanks a canvas past ~16.7M pixels, and
 * current iPhones shoot 24-48MP — well over that line — so exports above this area scale down
 * proportionally (aspect preserved) before drawing.
 */
export const EXPORT_MAX_PIXELS = 16_000_000;

type Source = (CanvasImageSource & { width: number; height: number }) | ImageBitmap;

/** Lattice has no per-effect cell-size control; density scales node spacing off this base. */
const LATTICE_BASE_CELL = 8;

/** Line/node weight as a fraction of one cell, so lattice strokes scale with export resolution
 *  the same way the marks themselves do. */
const LATTICE_LINE_WIDTH_RATIO = 0.2;
const LATTICE_NODE_RADIUS_RATIO = 0.16;

const cellPxFor = (spec: RenderSpec): number => {
  switch (spec.effect) {
    case 'halftone':
      return spec.halftone.cellSize;
    case 'dots':
      return spec.dots.cellSize;
    case 'ascii':
      return spec.ascii.cellSize;
    case 'lattice':
      return LATTICE_BASE_CELL;
  }
};

/**
 * The probe's raw luminance grid, cached per source at the (cols, rows) it was last computed
 * for. A slider that doesn't change the grid shape (contrast, duotone, angle, jitter) re-reads
 * this cache instead of re-drawing and re-reading the probe canvas — the one part of the
 * pipeline whose cost is real DOM work rather than array math.
 */
const probeCache = new WeakMap<Source, { cols: number; rows: number; luma: Float32Array }>();

const getLumaGrid = (source: Source, cols: number, rows: number): Float32Array => {
  const cached = probeCache.get(source);
  if (cached && cached.cols === cols && cached.rows === rows) return cached.luma;

  const probe = document.createElement('canvas');
  probe.width = cols;
  probe.height = rows;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return new Float32Array(cols * rows);

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);
  const luma = lumaGrid(data, cols, rows);
  probeCache.set(source, { cols, rows, luma });
  return luma;
};

const paintCircles = (
  ctx: CanvasRenderingContext2D,
  marks: { x: number; y: number; r: number }[],
  cell: number,
): void => {
  if (marks.length === 0) return;
  ctx.beginPath();
  for (const m of marks) {
    const pr = m.r * cell;
    if (pr <= 0) continue;
    const px = m.x * cell;
    const py = m.y * cell;
    ctx.moveTo(px + pr, py);
    ctx.arc(px, py, pr, 0, Math.PI * 2);
  }
  ctx.fill();
};

const paintAscii = (
  ctx: CanvasRenderingContext2D,
  marks: { col: number; row: number; char: string }[],
  cell: number,
): void => {
  if (marks.length === 0) return;
  ctx.font = `${cell}px 'JetBrains Mono', monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of marks) {
    ctx.fillText(m.char, (m.col + 0.5) * cell, (m.row + 0.5) * cell);
  }
};

const paintLattice = (
  ctx: CanvasRenderingContext2D,
  marks: { nodes: { x: number; y: number; luma: number }[]; edges: [number, number][] },
  cell: number,
): void => {
  const { nodes, edges } = marks;
  if (edges.length > 0) {
    ctx.lineWidth = Math.max(1, cell * LATTICE_LINE_WIDTH_RATIO);
    ctx.beginPath();
    for (const [a, b] of edges) {
      const na = nodes[a];
      const nb = nodes[b];
      ctx.moveTo(na.x * cell, na.y * cell);
      ctx.lineTo(nb.x * cell, nb.y * cell);
    }
    ctx.stroke();
  }
  if (nodes.length > 0) {
    const r = Math.max(1, cell * LATTICE_NODE_RADIUS_RATIO);
    ctx.beginPath();
    for (const n of nodes) {
      const px = n.x * cell;
      const py = n.y * cell;
      ctx.moveTo(px + r, py);
      ctx.arc(px, py, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
};

/**
 * Render one effect into `target` at `target`'s own pixel size, sampling `source` down to a
 * grid capped at `maxCols` columns. The same function serves the live preview (small target,
 * `PREVIEW_MAX_COLS`) and the full-resolution export (large target, same cap) — only the
 * target's size changes, so cells come out bigger on export rather than more numerous.
 *
 * Silently no-ops if `target` has no 2d context (jsdom has none).
 */
export const renderEffect = (target: HTMLCanvasElement, source: Source, spec: RenderSpec, maxCols: number): void => {
  const ctx = target.getContext('2d');
  if (!ctx) return;

  const sourceW = source.width;
  const sourceH = source.height;
  if (sourceW <= 0 || sourceH <= 0) return;

  const cellPx = cellPxFor(spec);
  const cols = Math.max(1, Math.min(maxCols, Math.ceil(sourceW / cellPx)));
  const rows = Math.max(1, Math.round(cols * (sourceH / sourceW)));

  const rawLuma = getLumaGrid(source, cols, rows);
  const luma =
    spec.effect === 'halftone'
      ? stretchContrast(rawLuma, spec.halftone.contrast)
      : spec.effect === 'dots'
        ? stretchContrast(rawLuma, spec.dots.contrast)
        : spec.effect === 'ascii'
          ? stretchContrast(rawLuma, spec.ascii.contrast)
          : rawLuma; // lattice has no contrast param
  const grid: Grid = { cols, rows, luma };

  // Cells come out square as long as the caller sizes `target` to the grid's aspect ratio —
  // this is the only cell-size math the paint step needs.
  const cell = target.width / cols;

  ctx.fillStyle = spec.duotone.paper;
  ctx.fillRect(0, 0, target.width, target.height);
  ctx.fillStyle = spec.duotone.ink;
  ctx.strokeStyle = spec.duotone.ink;

  switch (spec.effect) {
    case 'halftone':
      paintCircles(ctx, halftoneMarks(grid, spec.halftone), cell);
      break;
    case 'dots':
      paintCircles(ctx, dotsMarks(grid, spec.dots), cell);
      break;
    case 'ascii':
      paintAscii(ctx, asciiMarks(grid, spec.ascii), cell);
      break;
    case 'lattice':
      paintLattice(ctx, latticeMarks(grid, spec.lattice, seededRand(spec.jitterSeed)), cell);
      break;
  }
};

/**
 * Render the current effect at `source`'s full resolution and hand back a PNG blob.
 *
 * The grid keeps the same column cap as the preview (`PREVIEW_MAX_COLS`), so the export is the
 * same look at bigger cells, not a different, denser render. The canvas itself is clamped to
 * `EXPORT_MAX_PIXELS`, scaled down proportionally when the source exceeds it — see that
 * constant's doc comment for why.
 *
 * Resolves `null` on a null `toBlob` result, which the caller surfaces as a failure; there is
 * nothing more this module can do about it.
 */
export const renderExport = (
  source: Source,
  spec: RenderSpec,
): Promise<{ blob: Blob; width: number; height: number } | null> => {
  const sourceW = source.width;
  const sourceH = source.height;
  const area = sourceW * sourceH;
  const scale = area > EXPORT_MAX_PIXELS ? Math.sqrt(EXPORT_MAX_PIXELS / area) : 1;
  const width = Math.max(1, Math.round(sourceW * scale));
  const height = Math.max(1, Math.round(sourceH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  renderEffect(canvas, source, spec, PREVIEW_MAX_COLS);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ? { blob, width, height } : null), 'image/png');
  });
};
