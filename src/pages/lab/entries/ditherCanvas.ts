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
  BlendId,
  Duotone,
  DotsParams,
  EffectId,
  Grid,
  HalftoneParams,
  LatticeParams,
} from './ditherCore';
import {
  asciiMarks,
  BLEND_OPS,
  dotsMarks,
  duotoneRoles,
  halftoneMarks,
  hexLuminance,
  latticeMarks,
  lumaGrid,
  seededRand,
  sourceMarkGain,
  stretchContrast,
} from './ditherCore';
import { staticVars } from '../../../styles/tokens';

export interface RenderSpec {
  effect: EffectId;
  halftone: HalftoneParams;
  dots: DotsParams;
  ascii: AsciiParams;
  lattice: LatticeParams;
  duotone: Duotone;
  /** Marks take the sampled pixel's colour instead of the ink; the ground keeps its duotone
   *  colour (paper, or ink for lattice — see the ground swap in `renderEffect`). */
  sourceColor: boolean;
  /** The photograph itself grounds the frame, and the marks composite over it, instead of the
   *  duotone filling a flat ground. */
  photoUnder: boolean;
  /** How the marks blend into that photograph; only meaningful with `photoUnder`. */
  blend: BlendId;
  /** The marks' layer opacity, 0-1; only meaningful with `photoUnder`. */
  layerOpacity: number;
  jitterSeed: number;
}

/**
 * Whether the marks need their own layer before they reach the frame.
 *
 * They do as soon as they blend or fade as a *whole* rather than one at a time: lattice sets a
 * per-edge alpha and the beads carry alpha inside their gradients, so a layer-wide opacity
 * cannot just be folded into `globalAlpha` at the paint step. With the photograph absent, or
 * present under marks that neither blend nor fade, the marks go straight onto the frame and no
 * second canvas is allocated.
 */
export const needsLayer = (spec: RenderSpec): boolean =>
  spec.photoUnder && (spec.blend !== 'normal' || spec.layerOpacity < 1);

/**
 * The grid's column cap, for preview and export alike.
 *
 * It is a ceiling on cell *count*, so it doubles as the cost ceiling — but it also silently
 * overrides the cell-size slider: a cell size fine enough to ask for more columns than this
 * just gets this many, and every setting below that threshold renders identically. At 120 that
 * swallowed everything under a 17px cell on a 2048px-wide photo, the default 8 included, so the
 * slider's first third did nothing at all.
 *
 * 256 puts the threshold at an 8px cell for that photo. Measured on this canvas (977px wide,
 * ~40k cells): halftone ~28ms a render, dots ~24ms, ascii ~39ms — past a frame, which is why a
 * drag renders at `PREVIEW_DRAG_MAX_COLS` and refines once it stops.
 */
export const PREVIEW_MAX_COLS = 256;

/**
 * The column cap while a control is actively being dragged — the old ceiling, which measured
 * 9-17ms a render. The fine grid lands ~200ms after the drag stops, so the picture a visitor
 * settles on is always the full-detail one; only the frames they are scrubbing past are coarse.
 */
export const PREVIEW_DRAG_MAX_COLS = 120;

/**
 * The export pixel-area ceiling. iOS Safari silently blanks a canvas past ~16.7M pixels, and
 * current iPhones shoot 24-48MP — well over that line — so exports above this area scale down
 * proportionally (aspect preserved) before drawing.
 */
export const EXPORT_MAX_PIXELS = 16_000_000;

type Source = (CanvasImageSource & { width: number; height: number }) | ImageBitmap;

/**
 * Line and node weight as a fraction of one mesh cell, so lattice strokes scale with export
 * resolution the same way the marks themselves do.
 *
 * The reference app's own ratios are 0.05 and 0.08 — but they are tuned against its canvas,
 * which is over twice the width of ours when a portrait is fitted to the viewport height. Taken
 * literally they put the stroke at 0.38px and the node at 0.6px here, and the mesh collapses
 * into a field of specks. These sit between the two, and the floors below are what actually
 * hold the line: at their scale a strut lands near 0.95px and a node near 1.5px, so that is
 * what a small canvas has to keep.
 */
const LATTICE_LINE_WIDTH_RATIO = 0.07;
const LATTICE_NODE_RADIUS_RATIO = 0.1;
const LATTICE_LINE_WIDTH_MIN = 0.85;
const LATTICE_NODE_RADIUS_MIN = 1.3;
/* Nodes are the mesh's light: they take their colour lifted, where struts take theirs plain.
 * Also the reference app's constant. */
const LATTICE_NODE_GAIN = 1.5;

/**
 * Lattice reads `density` as the mesh's column count and sizes the probe grid to it directly
 * (the reference app's shape: a 14-100 column node grid, coarse and bold), rather than
 * skipping cells of a fine probe — so `latticeMarks` always receives step 1 below.
 */
const cellPxFor = (spec: RenderSpec, sourceW: number): number => {
  switch (spec.effect) {
    case 'halftone':
      return spec.halftone.cellSize;
    case 'dots':
      return spec.dots.cellSize;
    case 'ascii':
      return spec.ascii.cellSize;
    case 'lattice':
      return sourceW / Math.max(2, spec.lattice.density);
  }
};

/**
 * The probe's raw luminance grid, cached per source at the (cols, rows) it was last computed
 * for. A slider that doesn't change the grid shape (contrast, duotone, angle, jitter) re-reads
 * this cache instead of re-drawing and re-reading the probe canvas — the one part of the
 * pipeline whose cost is real DOM work rather than array math.
 */
interface Probe {
  cols: number;
  rows: number;
  luma: Float32Array;
  /** The probe's raw RGBA, kept so source-colour marks can look their cell's pixel back up. */
  rgb: Uint8ClampedArray;
}

const probeCache = new WeakMap<Source, Probe>();

const getProbe = (source: Source, cols: number, rows: number): Probe => {
  const cached = probeCache.get(source);
  if (cached && cached.cols === cols && cached.rows === rows) return cached;

  const empty: Probe = { cols, rows, luma: new Float32Array(cols * rows), rgb: new Uint8ClampedArray(cols * rows * 4) };
  const probe = document.createElement('canvas');
  probe.width = cols;
  probe.height = rows;
  const ctx = probe.getContext('2d', { willReadFrequently: true });
  if (!ctx) return empty;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, cols, rows);
  const { data } = ctx.getImageData(0, 0, cols, rows);
  const entry: Probe = { cols, rows, luma: lumaGrid(data, cols, rows), rgb: data };
  probeCache.set(source, entry);
  return entry;
};

/**
 * The marks' own canvas, kept module-scoped and reused: a preview re-renders on every slider
 * tick, and allocating a viewport-sized canvas per tick is churn the drag can feel. Setting
 * `width` clears the bitmap, so a same-size reuse clears explicitly instead.
 */
let layerCanvas: HTMLCanvasElement | null = null;

const getLayerCtx = (width: number, height: number): CanvasRenderingContext2D | null => {
  layerCanvas ??= document.createElement('canvas');
  const ctx = layerCanvas.getContext('2d');
  if (!ctx) return null;
  if (layerCanvas.width !== width || layerCanvas.height !== height) {
    layerCanvas.width = width;
    layerCanvas.height = height;
  } else {
    ctx.clearRect(0, 0, width, height);
  }
  return ctx;
};

/** A per-cell CSS colour lookup in unit-cell space, clamped so jittered marks stay in range. */
type ColorAt = (x: number, y: number) => string;
/** The same lookup as raw channels, for painters that shade the colour (the dots beads). */
type RgbAt = (x: number, y: number) => [number, number, number];

/**
 * `groundLuma` is what the mark will sit on, and it decides which way `sourceMarkGain` pushes
 * the sampled colour. `null` means the photograph is the ground, so each cell's own luminance
 * stands in — the thing behind the mark there is the pixel it came from.
 */
const rgbAtFor = (probe: Probe, groundLuma: number | null | undefined): RgbAt => {
  const { cols, rows, rgb, luma } = probe;
  return (x, y) => {
    const col = Math.min(cols - 1, Math.max(0, Math.floor(x)));
    const row = Math.min(rows - 1, Math.max(0, Math.floor(y)));
    const i = row * cols + col;
    const o = i * 4;
    const gain = sourceMarkGain(luma[i], groundLuma ?? luma[i]);
    return [
      Math.min(255, Math.max(0, rgb[o] * gain)),
      Math.min(255, Math.max(0, rgb[o + 1] * gain)),
      Math.min(255, Math.max(0, rgb[o + 2] * gain)),
    ];
  };
};

const colorAtFor = (probe: Probe, groundLuma: number | null | undefined): ColorAt => {
  const at = rgbAtFor(probe, groundLuma);
  return (x, y) => {
    const [r, g, b] = at(x, y);
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  };
};

const rgbString = ([r, g, b]: [number, number, number]): string =>
  `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;

const scaleRgb = ([r, g, b]: [number, number, number], k: number): [number, number, number] => [
  Math.min(255, r * k),
  Math.min(255, g * k),
  Math.min(255, b * k),
];

/** `duotone` values come from `<input type="color">`, which always yields #rrggbb. */
const hexToRgb = (hex: string): [number, number, number] => {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

const paintCircles = (
  ctx: CanvasRenderingContext2D,
  marks: { x: number; y: number; r: number }[],
  cell: number,
  colorAt?: ColorAt,
): void => {
  if (marks.length === 0) return;
  if (colorAt) {
    // Per-mark fills cannot batch into one path; source colour trades that batching away.
    for (const m of marks) {
      const pr = m.r * cell;
      if (pr <= 0) continue;
      ctx.fillStyle = colorAt(m.x, m.y);
      ctx.beginPath();
      ctx.arc(m.x * cell, m.y * cell, pr, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }
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

/**
 * A bead below this radius (in device pixels) is painted flat instead of shaded. Three stops
 * inside a two-pixel circle land on the same pixel anyway, so the gradient is invisible there —
 * and building one per mark is the single most expensive thing this module does, which is what
 * decides how fine a grid the preview can carry. See `PREVIEW_MAX_COLS`.
 */
const BEAD_SHADING_MIN_R = 2.5;

/**
 * Dots paint as lit beads on the dark ground, per the reference app: each dot is a small
 * radial gradient — a highlight pushed toward the upper-left, the base colour through the
 * middle, a darker rim — so the field reads as glass spheres catching light rather than flat
 * confetti. Gradients cannot batch into one path; the bead look trades that away.
 */
const paintBeads = (
  ctx: CanvasRenderingContext2D,
  marks: { x: number; y: number; r: number }[],
  cell: number,
  mark: string,
  rgbAt?: RgbAt,
): void => {
  const base = hexToRgb(mark);
  for (const m of marks) {
    const pr = m.r * cell;
    if (pr < 0.5) continue;
    const [r, g, b] = rgbAt ? rgbAt(m.x, m.y) : base;
    const px = m.x * cell;
    const py = m.y * cell;
    if (pr < BEAD_SHADING_MIN_R) {
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      continue;
    }
    const grad = ctx.createRadialGradient(px - pr * 0.3, py - pr * 0.3, pr * 0.05, px, py, pr);
    grad.addColorStop(0, `rgba(${Math.min(255, r + 80)},${Math.min(255, g + 80)},${Math.min(255, b + 80)},1)`);
    grad.addColorStop(0.5, `rgba(${r},${g},${b},1)`);
    grad.addColorStop(1, `rgba(${Math.max(0, r - 60)},${Math.max(0, g - 60)},${Math.max(0, b - 60)},0.8)`);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(px, py, pr, 0, Math.PI * 2);
    ctx.fill();
  }
};

const paintAscii = (
  ctx: CanvasRenderingContext2D,
  marks: { col: number; row: number; char: string }[],
  cell: number,
  colorAt?: ColorAt,
): void => {
  if (marks.length === 0) return;
  // A canvas cannot read a CSS custom property, so the mono stack comes straight from
  // tokens.ts — the same single source the page's font gate loads against.
  /* 500, not the default 400: the reference app sets its glyphs at 600, and at a cell of a
     few pixels the extra stroke weight is most of what separates a character from a smudge.
     500 is the top of the weight range this project loads for JetBrains Mono. */
  ctx.font = `500 ${cell}px ${staticVars['--font-mono']}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const m of marks) {
    if (colorAt) ctx.fillStyle = colorAt(m.col + 0.5, m.row + 0.5);
    ctx.fillText(m.char, (m.col + 0.5) * cell, (m.row + 0.5) * cell);
  }
};

/**
 * Lattice paints the image *as* the mesh, per the reference app: every strut's opacity is its
 * midpoint luminance scaled by how stretched it is, and every node's opacity and radius grow
 * with its cell's brightness — nodes are the light (their colour lifted, per the reference
 * app), struts the webbing between — so bright regions render a dense, glowing web and shadows thin
 * to nothing, and the photograph stays readable through the wireframe. Per-mark alpha rules
 * out path batching; the mesh is coarse (≤72 columns), so the mark count stays small.
 */
const paintLattice = (
  ctx: CanvasRenderingContext2D,
  marks: {
    nodes: { x: number; y: number; luma: number }[];
    edges: { a: number; b: number; luma: number; fade: number }[];
  },
  cell: number,
  mark: string,
  edgeAlpha: number,
  rgbAt?: RgbAt,
): void => {
  const { nodes, edges } = marks;
  ctx.lineWidth = Math.max(LATTICE_LINE_WIDTH_MIN, cell * LATTICE_LINE_WIDTH_RATIO);
  for (const e of edges) {
    const na = nodes[e.a];
    const nb = nodes[e.b];
    ctx.globalAlpha = Math.min(1, e.fade * e.luma * edgeAlpha);
    ctx.strokeStyle = rgbAt ? rgbString(rgbAt((na.x + nb.x) / 2, (na.y + nb.y) / 2)) : mark;
    ctx.beginPath();
    ctx.moveTo(na.x * cell, na.y * cell);
    ctx.lineTo(nb.x * cell, nb.y * cell);
    ctx.stroke();
  }
  const r = Math.max(LATTICE_NODE_RADIUS_MIN, cell * LATTICE_NODE_RADIUS_RATIO);
  for (const n of nodes) {
    ctx.globalAlpha = Math.min(1, n.luma * 1.6);
    ctx.fillStyle = rgbAt ? rgbString(scaleRgb(rgbAt(n.x, n.y), LATTICE_NODE_GAIN)) : mark;
    ctx.beginPath();
    ctx.arc(n.x * cell, n.y * cell, Math.max(0.8, r * (0.5 + n.luma * 0.8)), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
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

  const cellPx = cellPxFor(spec, sourceW);
  const cols = Math.max(1, Math.min(maxCols, Math.ceil(sourceW / cellPx)));
  const rows = Math.max(1, Math.round(cols * (sourceH / sourceW)));

  const probe = getProbe(source, cols, rows);
  const rawLuma = probe.luma;
  // Halftone and ascii ink on paper; dots and lattice ground the frame in whichever of the two
  // colours is darker and mark in the lighter — see `duotoneRoles` for why the polarity has to
  // follow luminance rather than the slot a colour sits in.
  const { ground, mark } = duotoneRoles(spec.effect, spec.duotone);
  /* Which way source-coloured marks have to move to be seen. `null` hands the decision to each
     cell, because with the photograph as the ground there is no single colour behind them. */
  const groundLuma = spec.photoUnder ? null : hexLuminance(ground);
  const colorAt = spec.sourceColor ? colorAtFor(probe, groundLuma) : undefined;
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

  if (spec.photoUnder) {
    // The photograph is the ground, so the marks read as a layer over it rather than as the
    // whole picture — the reference app's default, where the effect canvas is transparent and
    // stacked over the image element.
    ctx.drawImage(source, 0, 0, target.width, target.height);
  } else {
    ctx.fillStyle = ground;
    ctx.fillRect(0, 0, target.width, target.height);
  }

  const layerCtx = needsLayer(spec) ? getLayerCtx(target.width, target.height) : null;
  const paint = layerCtx ?? ctx;
  paint.fillStyle = mark;
  paint.strokeStyle = mark;

  switch (spec.effect) {
    case 'halftone':
      paintCircles(paint, halftoneMarks(grid, spec.halftone), cell, colorAt);
      break;
    case 'dots':
      paintBeads(
        paint,
        dotsMarks(grid, spec.dots),
        cell,
        mark,
        spec.sourceColor ? rgbAtFor(probe, groundLuma) : undefined,
      );
      break;
    case 'ascii':
      paintAscii(paint, asciiMarks(grid, spec.ascii), cell, colorAt);
      break;
    case 'lattice':
      paintLattice(
        paint,
        latticeMarks(grid, { ...spec.lattice, density: 1 }, seededRand(spec.jitterSeed)),
        cell,
        mark,
        /* The reference app's 0.65 is measured against struts lying over a photograph, where
           the image itself carries them. Over a flat ink ground there is nothing underneath to
           help, and at 0.65 the mesh sinks into the field — so that number holds only where its
           assumption does. */
        spec.photoUnder ? 0.65 : 0.95,
        spec.sourceColor ? rgbAtFor(probe, groundLuma) : undefined,
      );
      break;
  }

  if (layerCtx) {
    ctx.globalAlpha = spec.layerOpacity;
    ctx.globalCompositeOperation = BLEND_OPS[spec.blend];
    ctx.drawImage(layerCtx.canvas, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
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
 * A blended layer halves that ceiling: the render then holds two canvases of the same size at
 * once, and the limit it guards against is the memory behind them, not the count.
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
  const ceiling = needsLayer(spec) ? EXPORT_MAX_PIXELS / 2 : EXPORT_MAX_PIXELS;
  const scale = area > ceiling ? Math.sqrt(ceiling / area) : 1;
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
