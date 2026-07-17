import { LENS } from './landingConfig';

// Pure lens-refraction math shared by the main thread (lensEngine's disc map) and the
// blob-map worker (blobMapWorker). DOM-free by construction — everything here must run
// inside a Web Worker.

type SurfaceProfile = typeof LENS.surfaceProfile;

// bezel surface profiles — port of source 285-296.
export const SURF: Record<SurfaceProfile, (x: number) => number> = {
  'Convex circle': (x) => Math.sqrt(1 - Math.pow(1 - x, 2)),
  'Convex squircle': (x) => Math.pow(1 - Math.pow(1 - x, 4), 0.25),
  Concave: (x) => 1 - Math.sqrt(1 - Math.pow(1 - x, 2)),
  Lip: (x) => {
    const convex = Math.pow(Math.max(0, 1 - Math.pow(1 - x * 2, 4)), 0.25);
    const concave = 1 - Math.sqrt(1 - Math.pow(1 - x, 2)) + 0.1;
    const s = 6 * Math.pow(x, 5) - 15 * Math.pow(x, 4) + 10 * Math.pow(x, 3);
    return convex * (1 - s) + concave * s;
  },
};

// Snell-law 1D displacement profile (bezel ring only) — port of source 183-201.
export function snellDisp1d(surf: (x: number) => number, refr: number, thick: number, bezW: number) {
  const samples = 128;
  const eta = 1 / refr;
  const disp1d: number[] = new Array(samples);
  for (let s = 0; s < samples; s++) {
    const xx = s / samples;
    const yy = surf(xx);
    const dx = xx < 1 ? 0.0001 : -0.0001;
    const deriv = (surf(xx + dx) - yy) / dx;
    const mg = Math.sqrt(deriv * deriv + 1);
    const nX = -deriv / mg;
    const nY = -1 / mg;
    const dot = nY;
    const k = 1 - eta * eta * (1 - dot * dot);
    if (k < 0) { disp1d[s] = 0; continue; }
    const ks = Math.sqrt(k);
    const rx = -(eta * dot + ks) * nX;
    const ry = eta - (eta * dot + ks) * nY;
    const remaining = yy * bezW + thick;
    disp1d[s] = Math.abs(ry) < 0.001 ? 0 : rx * (remaining / ry);
  }
  return { disp1d, samples };
}

// R/G displacement for one point given its inward edge-distance + outward normal, in the
// same normalized convention the disc map uses (so magnitudes match everywhere) — port of
// source 203-221 (`_encodeDisp`). lensEngine's generateLensMap inlines this same math for
// the single-disc case (matching the source's own duplication between the two); this copy
// is what rasterBlobMap (below) shares across the whole merged blob.
function encodeDisp(
  edgeDist: number,
  rn: number,
  nx: number,
  ny: number,
  R: number,
  bezelPx: number,
  disp1d: number[],
  samples: number,
  magnify: number,
): [number, number] {
  let dispPx = Math.max(0, Math.min(1, rn)) * magnify * 60;
  if (edgeDist >= 0 && edgeDist <= bezelPx) {
    const t = edgeDist / bezelPx;
    const idx = Math.min(samples - 1, Math.floor(t * samples));
    let raw = disp1d[idx] * 0.5 * (R / 110);
    const env = bezelPx * 0.85 * (1 - t);
    if (raw > env) raw = env;
    if (raw < -env) raw = -env;
    dispPx += raw;
  }
  let m = dispPx / 64;
  if (m > 1) m = 1;
  if (m < -1) m = -1;
  return [
    Math.max(0, Math.min(255, Math.round(128 - nx * m * 127))),
    Math.max(0, Math.min(255, Math.round(128 - ny * m * 127))),
  ];
}

// smooth-union (metaball) displacement raster spanning both discs + the neck, so the
// refraction field is one continuous surface across the bridge — port of source 226-274,
// minus the canvas: the caller owns pixels-to-image, because this must run where there
// is no DOM.
//
// Resolution strategy (replaces the source's uniform 2x supersample): the raster is 1x,
// with a 2x2 subpixel supersample ONLY inside the rim band (bezel ring + a 2px skirt
// around the alpha edge). The rim is the sole place aliasing shows — hard edge steps
// turn into rainbow spray under the chromatic-aberration filter — while the interior
// gradient varies slowly and interpolates cleanly when feImage stretches the map. A 1x
// map is a quarter of the pixels of the old 2x one, which is what makes every
// downstream step (PNG encode in the worker, decode + filter re-evaluation per href
// swap on the compositor path) cheap enough for a 60fps+ merged drag.
export function rasterBlobMap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  bx0: number, by0: number, bw: number, bh: number,
): { cw: number; ch: number; data: Uint8ClampedArray<ArrayBuffer> } {
  const magnify = LENS.magnify;
  const bezW = LENS.bezelWidth;
  const surf = SURF[LENS.surfaceProfile] || SURF['Convex circle'];
  const { disp1d, samples } = snellDisp1d(surf, LENS.refractiveIndex, LENS.glassThickness, bezW);

  let ss = 1;
  const maxDim = 1100;
  if (Math.max(bw, bh) * ss > maxDim) ss = maxDim / Math.max(bw, bh);
  const cw = Math.max(4, Math.round(bw * ss));
  const ch = Math.max(4, Math.round(bh * ss));
  // everything below is in canvas px (screen px * ss)
  const X1 = (x1 - bx0) * ss, Y1 = (y1 - by0) * ss, R1 = r1 * ss;
  const X2 = (x2 - bx0) * ss, Y2 = (y2 - by0) * ss, R2 = r2 * ss;
  const Ravg = (R1 + R2) / 2;
  const bezelPx = Math.max(2, Math.min((bezW / 110) * Ravg, Ravg));
  const kBlend = Math.min(R1, R2) * 0.9;

  const sdf = (px: number, py: number): number => {
    const d1 = Math.sqrt((px - X1) * (px - X1) + (py - Y1) * (py - Y1)) - R1;
    const d2 = Math.sqrt((px - X2) * (px - X2) + (py - Y2) * (py - Y2)) - R2;
    const hh = Math.max(0, Math.min(1, 0.5 + 0.5 * (d2 - d1) / kBlend));
    return d2 + (d1 - d2) * hh - kBlend * hh * (1 - hh);
  };

  // displacement encode at one point, given its (precomputed) signed distance
  const dispAt = (px: number, py: number, d0: number): [number, number] => {
    const gx = sdf(px + 1, py) - sdf(px - 1, py);
    const gy = sdf(px, py + 1) - sdf(px, py - 1);
    const gl = Math.sqrt(gx * gx + gy * gy) || 0.0001;
    const nx = gx / gl, ny = gy / gl;   // outward normal
    const edgeDist = -d0;               // inward from blob edge
    const rn = 1 - edgeDist / Ravg;     // center-like deep inside, rim-like at edge
    return encodeDisp(edgeDist, rn, nx, ny, Ravg, bezelPx, disp1d, samples, magnify);
  };

  const SUB = [-0.25, 0.25];
  const data = new Uint8ClampedArray(cw * ch * 4);
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d0 = sdf(px, py);
      let rC = 128, gC = 128, a = 0;
      if (d0 <= -(bezelPx + 2)) {
        // deep interior: displacement varies slowly, one sample is enough
        a = 255;
        const enc = dispAt(px, py, d0);
        rC = enc[0]; gC = enc[1];
      } else if (d0 <= 2) {
        // rim band: 2x2 box average, the AA the old 2x map got from feImage downsampling
        let ar = 0, ag = 0, aa = 0;
        for (const sy of SUB) {
          for (const sx of SUB) {
            const sd = sdf(px + sx, py + sy);
            if (sd <= 0) {
              const enc = dispAt(px + sx, py + sy, sd);
              ar += enc[0]; ag += enc[1]; aa += 255;
            } else {
              ar += 128; ag += 128;
            }
          }
        }
        rC = ar / 4; gC = ag / 4; a = aa / 4;
      }
      const i = (y * cw + x) * 4;
      data[i] = rC; data[i + 1] = gC; data[i + 2] = 0; data[i + 3] = a;
    }
  }
  return { cw, ch, data };
}
