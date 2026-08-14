/**
 * Turning a block of text into a picture: the shared half.
 *
 * Two callers — `/readme`'s LogoReveal and `/lab/text-into-picture`'s demo — do the same
 * three things. Split a block into one span per character, raster a mark down to an alpha
 * field, then ask each character how dark it should be. The first and last of those are
 * here; the staging around them (when it runs, what it looks like, which CSS vars drive it)
 * belongs to each caller and stays there.
 *
 * The mapping is deliberately pure — rects in, integer out, no DOM — because it is the part
 * that can be wrong in ways you cannot see. A character sampled half a cell off still looks
 * like a picture; it just looks like a slightly worse one.
 */

/**
 * The ink ladder, shared by both callers so they cannot drift apart.
 *
 * Index 0 is the field around the mark — present, but only just. Nine steps because the
 * reveal is coarse (one sample per character), and gradation has to do the work the
 * resolution cannot.
 */
export const ASCII_LEVELS = [7, 15, 25, 36, 48, 61, 75, 88, 100];

/**
 * Where every character starts, before the mark surfaces. One flat value across the whole
 * block, so it arrives as an undifferentiated field of type and the mark has somewhere to
 * emerge from.
 */
export const ASCII_FLAT = 62;

/** A mark rastered to alpha, ready to sample. */
export interface Raster {
  /** One byte per pixel, row-major. Alpha only — colour is discarded on purpose. */
  alpha: Uint8ClampedArray;
  w: number;
  h: number;
}

/** Where the mark sits inside the block, in the block's own coordinates. */
export interface MarkBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Fit the mark inside the block, contained and centred — the whole mark, whichever way round
 * it is.
 *
 * This used to be height-bound, which is the same thing for any mark taller in proportion
 * than the block (the feather is 140x390 against a block near 290x718, so it still resolves
 * to exactly the height-bound answer). It is NOT the same thing for a wide mark: a square
 * photograph fitted by height comes out more than twice the block's width, and everything
 * outside it is simply cropped away — you get the middle two fifths of a cat.
 */
export const fitMark = (blockW: number, blockH: number, aspect: number): MarkBox => {
  const w = Math.min(blockW, blockH * aspect);
  const h = w / aspect;
  return { x: (blockW - w) / 2, y: (blockH - h) / 2, w, h };
};

/**
 * How dark one character should be: 0 for the field around the mark, `steps` for its
 * densest ink.
 *
 * `cx`/`cy` are the character's centre in the block's coordinates — its own centre, not its
 * cell's, because there are no cells. That is the whole reason this reads as a picture at
 * ~30 lines: the sampling grid is as irregular as the text is, so it never beats against a
 * regular one.
 *
 * Anything outside the mark's box returns 0 rather than clamping to an edge pixel, which
 * would smear the mark's outermost row across the rest of the block.
 */
export const levelAt = (
  cx: number,
  cy: number,
  mark: MarkBox,
  raster: Raster,
  steps: number,
): number => {
  const u = (cx - mark.x) / mark.w;
  const v = (cy - mark.y) / mark.h;
  if (u < 0 || u >= 1 || v < 0 || v >= 1) return 0;
  const sx = Math.min(raster.w - 1, Math.floor(u * raster.w));
  const sy = Math.min(raster.h - 1, Math.floor(v * raster.h));
  return Math.round((raster.alpha[sy * raster.w + sx] / 255) * steps);
};

/**
 * How dark one character should be, measured over the whole CELL it occupies rather than at
 * the single point in its middle.
 *
 * Point sampling is fine for a mark whose smallest feature is bigger than a line of type. It
 * is not fine for line art. The crossbar of an italic capital H, at the ten-or-so rows a word
 * gets here, is about ONE row thick — so whether it appears at all comes down to whether a
 * row of sample points happens to land inside it. It did not, and the H rendered as two
 * disconnected stems.
 *
 * Averaging over the cell removes the coin toss. A stroke crossing a cell always contributes
 * something proportional to how much of the cell it covers, so a thin line comes out as a row
 * of mid-tone characters instead of appearing or vanishing.
 *
 * `cellW`/`cellH` should TILE — the character's advance width and the line pitch, not its ink
 * box — or thin strokes can still fall down the cracks between cells.
 *
 * Area outside the mark counts as empty rather than being skipped, which is what makes the
 * mark's own edge come out soft instead of stepped.
 */
export const coverageAt = (
  cx: number,
  cy: number,
  cellW: number,
  cellH: number,
  mark: MarkBox,
  raster: Raster,
  steps: number,
): number => {
  // The cell, in raster pixels.
  const px = ((cx - cellW / 2 - mark.x) / mark.w) * raster.w;
  const py = ((cy - cellH / 2 - mark.y) / mark.h) * raster.h;
  const pw = (cellW / mark.w) * raster.w;
  const ph = (cellH / mark.h) * raster.h;

  const x0 = Math.floor(px);
  const y0 = Math.floor(py);
  const x1 = Math.max(x0 + 1, Math.ceil(px + pw));
  const y1 = Math.max(y0 + 1, Math.ceil(py + ph));

  let sum = 0;
  for (let y = y0; y < y1; y++) {
    if (y < 0 || y >= raster.h) continue;
    const row = y * raster.w;
    for (let x = x0; x < x1; x++) {
      if (x < 0 || x >= raster.w) continue;
      sum += raster.alpha[row + x];
    }
  }
  // Divided by the FULL cell, including whatever fell outside the mark.
  return Math.round((sum / ((x1 - x0) * (y1 - y0) * 255)) * steps);
};

/**
 * Draw an image at `height` and keep only its alpha.
 *
 * Not pure, and not tested — it is a canvas call.
 *
 * `height` is a real choice, not a quality setting, because sampling is per-character and
 * point-wise: whatever is in the raster at that one pixel is what the character gets. For a
 * solid silhouette, raster generously — it costs one canvas at mount and a tight raster only
 * puts stair-steps into the edges. A mark carrying detail FINER than the text can resolve
 * would need the opposite, rastering down near the character grid so the browser's own
 * downscale averages it first; point-sampling a sharp dither at thirty rows gives noise, not
 * a coarse picture of it. Nothing shipped needs that, because nothing shipped is a
 * photograph — see the entry for why not.
 *
 * Alpha only: colour is discarded. Which is the same statement as "this wants silhouettes".
 *
 * Returns null when the 2d context is unavailable, which callers should treat as "no reveal"
 * rather than as an error worth reporting: there is nothing a reader can do about it and the
 * writing underneath is still the page.
 */
export const rasterise = (img: HTMLImageElement, height: number): Raster | null => {
  const w = Math.max(1, Math.round(height * (img.naturalWidth / img.naturalHeight)));
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, w, height);
  const rgba = ctx.getImageData(0, 0, w, height).data;
  const alpha = new Uint8ClampedArray(w * height);
  for (let i = 0; i < alpha.length; i++) alpha[i] = rgba[i * 4 + 3];
  return { alpha, w, h: height };
};

/**
 * Explode every text node under `root` into one span per character.
 *
 * Spaces and newlines stay bare text. That is not tidiness — a span around a space is a
 * different wrapping opportunity from a space, so wrapping them would move the line breaks,
 * and the line breaks are the thing being preserved.
 *
 * Only ever called on a copy. Doing this to the live page would put a span between every
 * character of every hover target on the page.
 */
export const splitIntoChars = (root: HTMLElement): HTMLSpanElement[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  const spans: HTMLSpanElement[] = [];
  for (const node of texts) {
    const frag = document.createDocumentFragment();
    for (const ch of node.data) {
      if (ch === ' ' || ch === '\n') {
        frag.appendChild(document.createTextNode(ch));
        continue;
      }
      const span = document.createElement('span');
      span.textContent = ch;
      frag.appendChild(span);
      spans.push(span);
    }
    node.parentNode?.replaceChild(frag, node);
  }
  return spans;
};
