import type { EngineOpts } from './landingEngine';
import { LENS } from './landingConfig';

// Root-scoped handle the engine hands to the lens layer — mirrors the query/listener/
// teardown primitives landingEngine.ts already owns (q/qa/on/loop/later/addCleanup) so
// createLenses never touches `document`/rAF/listeners directly and rides the engine's
// single teardown registry (destroy() must remove everything this module creates,
// including under React 19 StrictMode's dev double-mount).
export interface LensCtx {
  root: HTMLElement;
  q: <T extends HTMLElement = HTMLElement>(sel: string) => T | null;
  qa: <T extends HTMLElement = HTMLElement>(sel: string) => T[];
  on: (t: EventTarget, type: string, fn: (e: Event) => void, o?: AddEventListenerOptions) => void;
  loop: (step: (now: number) => void) => void;
  later: (fn: () => void, ms: number) => void;
  addCleanup: (fn: () => void) => void;
  opts: EngineOpts;
  getVideos: () => HTMLVideoElement[];
}

type SurfaceProfile = typeof LENS.surfaceProfile;

// bezel surface profiles — port of source 285-296.
const SURF: Record<SurfaceProfile, (x: number) => number> = {
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
function snellDisp1d(surf: (x: number) => number, refr: number, thick: number, bezW: number) {
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

// generateLensMap is a pure function of the (static, module-level) LENS constants, so
// the 256x256 canvas only needs to be rasterized once per page load — port of source
// 276-336.
let cachedLensMapUrl: string | undefined;

function generateLensMap(): string {
  if (cachedLensMapUrl) return cachedLensMapUrl;
  const profile = LENS.surfaceProfile;
  const refr = LENS.refractiveIndex;
  const thick = LENS.glassThickness;
  const bezW = LENS.bezelWidth;
  const magnify = LENS.magnify;
  const surf = SURF[profile] || SURF['Convex circle'];

  const { disp1d, samples } = snellDisp1d(surf, refr, thick, bezW);
  const W = 256;
  const R = W / 2 - 1;
  const bezelPx = Math.max(2, Math.min((bezW / 110) * R, R));
  const c = document.createElement('canvas');
  c.width = W;
  c.height = W;
  const c2d = c.getContext('2d')!;
  const img = c2d.createImageData(W, W);
  const d = img.data;
  const cx = W / 2;
  const cy = W / 2;
  for (let y = 0; y < W; y++) {
    for (let x = 0; x < W; x++) {
      const px = x + 0.5 - cx;
      const py = y + 0.5 - cy;
      const dist = Math.sqrt(px * px + py * py) || 0.0001;
      const rn = dist / R;
      const edgeDist = R - dist;
      let rC = 128;
      let gC = 128;
      if (rn <= 1) {
        const nx = px / dist;
        const ny = py / dist;
        let dispPx = rn * magnify * 60;
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
        rC = Math.max(0, Math.min(255, Math.round(128 - nx * m * 127)));
        gC = Math.max(0, Math.min(255, Math.round(128 - ny * m * 127)));
      }
      const i = (y * W + x) * 4;
      d[i] = rC; d[i + 1] = gC; d[i + 2] = 0; d[i + 3] = 255;
    }
  }
  c2d.putImageData(img, 0, 0);
  cachedLensMapUrl = c.toDataURL();
  return cachedLensMapUrl;
}

// key of the props that feed buildLensFilter — port of source 368-370. Task 1 never
// changes LENS at runtime, so this always matches; it exists so applyLensProps' rebuild
// guard is real infrastructure for whenever a later task makes LENS tunable live.
function lensPropsKey(): string {
  return JSON.stringify([
    LENS.surfaceProfile,
    LENS.refractiveIndex,
    LENS.glassThickness,
    LENS.bezelWidth,
    LENS.magnify,
    LENS.chromaticAberration,
    LENS.chromaticStrength,
  ]);
}

// chromatic aberration = R/G/B displaced by slightly different amounts, via channel
// isolation + screen recombine — port of source 374-402. One filter instance per lens
// (Chromium only renders an feImage-bearing filter for a single referencing element),
// plus a bridge filter reserved for Task 3's merge.
function buildLensFilter(): string {
  const url = generateLensMap();
  const S = 64;
  const chrom = LENS.chromaticAberration;
  const d = S * LENS.chromaticStrength * 0.4;
  const makeFilter = (id: string, mapId?: string, mapUrl?: string): string => {
    let html =
      `<filter id="${id}" color-interpolation-filters="sRGB" x="0%" y="0%" width="100%" height="100%">` +
      `<feGaussianBlur in="SourceGraphic" stdDeviation="0.3" result="soft"></feGaussianBlur>` +
      `<feImage ${mapId ? `id="${mapId}" ` : ''}href="${mapUrl || url}" x="0" y="0" width="100%" height="100%" preserveAspectRatio="none" result="map"></feImage>`;
    if (chrom && d > 0.05) {
      html +=
        `<feColorMatrix in="soft" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cR"></feColorMatrix>` +
        `<feColorMatrix in="soft" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="cG"></feColorMatrix>` +
        `<feColorMatrix in="soft" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="cB"></feColorMatrix>` +
        `<feDisplacementMap in="cR" in2="map" scale="${S - d}" xChannelSelector="R" yChannelSelector="G" result="dR"></feDisplacementMap>` +
        `<feDisplacementMap in="cG" in2="map" scale="${S}" xChannelSelector="R" yChannelSelector="G" result="dG"></feDisplacementMap>` +
        `<feDisplacementMap in="cB" in2="map" scale="${S + d}" xChannelSelector="R" yChannelSelector="G" result="dB"></feDisplacementMap>` +
        `<feBlend in="dR" in2="dG" mode="screen" result="dRG"></feBlend>` +
        `<feBlend in="dRG" in2="dB" mode="screen"></feBlend>`;
    } else {
      html += `<feDisplacementMap in="soft" in2="map" scale="${S}" xChannelSelector="R" yChannelSelector="G"></feDisplacementMap>`;
    }
    return html + '</filter>';
  };
  return (
    makeFilter('lensRefract1') +
    makeFilter('lensRefract2') +
    makeFilter(
      'lensRefractBridge',
      'bridgeMap',
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+P+/HgAFhAJ/wlseKgAAAABJRU5ErkJggg==',
    )
  );
}

// R/G displacement for one point given its inward edge-distance + outward normal, in the
// same normalized convention the disc map uses (so magnitudes match everywhere) — port of
// source 203-221 (`_encodeDisp`). generateLensMap (above) inlines this same math for the
// single-disc case (matching the source's own duplication between the two); this copy is
// what generateBlobMap (below) shares across the whole merged blob.
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

// per-frame smooth-union (metaball) displacement map spanning both discs + the neck, so
// the refraction field is one continuous surface across the bridge. Supersampled 2x to
// match the disc map's density (keeps displacement magnitude identical) — port of source
// 226-274, including its canvas.toDataURL() at the end: the perf gate (measured after
// this port, not baked in ahead of time) decides whether that becomes createImageBitmap.
function generateBlobMap(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  bx0: number, by0: number, bw: number, bh: number,
): string {
  const magnify = LENS.magnify;
  const bezW = LENS.bezelWidth;
  const surf = SURF[LENS.surfaceProfile] || SURF['Convex circle'];
  const { disp1d, samples } = snellDisp1d(surf, LENS.refractiveIndex, LENS.glassThickness, bezW);

  let ss = 2;
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

  const c = document.createElement('canvas');
  c.width = cw;
  c.height = ch;
  const c2d = c.getContext('2d')!;
  const img = c2d.createImageData(cw, ch);
  const data = img.data;
  for (let y = 0; y < ch; y++) {
    for (let x = 0; x < cw; x++) {
      const px = x + 0.5, py = y + 0.5;
      const d0 = sdf(px, py);
      let rC = 128, gC = 128, a = 0;
      if (d0 <= 0) {
        a = 255;
        const gx = sdf(px + 1, py) - sdf(px - 1, py);
        const gy = sdf(px, py + 1) - sdf(px, py - 1);
        const gl = Math.sqrt(gx * gx + gy * gy) || 0.0001;
        const nx = gx / gl, ny = gy / gl;   // outward normal
        const edgeDist = -d0;               // inward from blob edge
        const rn = 1 - edgeDist / Ravg;     // center-like deep inside, rim-like at edge
        const enc = encodeDisp(edgeDist, rn, nx, ny, Ravg, bezelPx, disp1d, samples, magnify);
        rC = enc[0]; gC = enc[1];
      }
      const i = (y * cw + x) * 4;
      data[i] = rC; data[i + 1] = gC; data[i + 2] = 0; data[i + 3] = a;
    }
  }
  c2d.putImageData(img, 0, 0);
  return c.toDataURL();
}

// smooth-union connector between two discs (the same merge shape generateBlobMap bends the
// refraction field to) — its outline reads as one liquid blob while the discs overlap
// enough to bridge. Returns null (source: '') when they're too far apart, too close
// (concentric), or one fully swallows the other — port of source 641-687.
function metaballPath(
  x1: number, y1: number, r1: number,
  x2: number, y2: number, r2: number,
  wob = 0,
): { fill: string; outline: string } | null {
  const d = Math.hypot(x2 - x1, y2 - y1);
  const maxDist = r1 + r2 + Math.min(r1, r2) * 0.35;
  if (d < 1 || d > maxDist || d <= Math.abs(r1 - r2)) return null;
  let u1 = 0, u2 = 0;
  if (d < r1 + r2) {
    u1 = Math.acos(Math.max(-1, Math.min(1, (r1 * r1 + d * d - r2 * r2) / (2 * r1 * d))));
    u2 = Math.acos(Math.max(-1, Math.min(1, (r2 * r2 + d * d - r1 * r1) / (2 * r2 * d))));
  }
  const ab = Math.atan2(y2 - y1, x2 - x1);
  const v = 0.5, handleLenRate = 2.4;
  const spread = Math.acos(Math.max(-1, Math.min(1, (r1 - r2) / d)));
  const a1 = ab + u1 + (spread - u1) * v;
  const a2 = ab - u1 - (spread - u1) * v;
  const a3 = ab + Math.PI - u2 - (Math.PI - u2 - spread) * v;
  const a4 = ab - Math.PI + u2 + (Math.PI - u2 - spread) * v;
  const pt = (x: number, y: number, r: number, a: number): [number, number] => [x + r * Math.cos(a), y + r * Math.sin(a)];
  const p1 = pt(x1, y1, r1, a1), p2 = pt(x1, y1, r1, a2), p3 = pt(x2, y2, r2, a3), p4 = pt(x2, y2, r2, a4);
  const total = r1 + r2;
  const d2 = Math.min(v * handleLenRate, Math.hypot(p3[0] - p1[0], p3[1] - p1[1]) / total) * Math.min(1, (d * 2) / total);
  // wobble sways the two neck curves in opposite phase -> the waist jiggles like liquid
  const hr1 = r1 * d2, hr2 = r2 * d2;
  const wTop = 1 + wob, wBot = 1 - wob;
  const H = Math.PI / 2;
  const h = (p: [number, number], a: number, r: number): string =>
    `${(p[0] + r * Math.cos(a)).toFixed(1)},${(p[1] + r * Math.sin(a)).toFixed(1)}`;
  const P = (p: [number, number]): string => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  // far-side arc of a circle, sampled from aStart to aEnd the way that passes through aVia
  const TAU = Math.PI * 2;
  const norm = (x: number): number => ((x % TAU) + TAU) % TAU;
  const arc = (cx: number, cy: number, r: number, aStart: number, aEnd: number, aVia: number, N: number): string => {
    const inc = norm(aEnd - aStart), viaInc = norm(aVia - aStart);
    let dir: number, tot: number;
    if (viaInc <= inc) { dir = 1; tot = inc; } else { dir = -1; tot = TAU - inc; }
    let out = '';
    for (let k = 1; k <= N; k++) {
      const an = aStart + dir * tot * (k / N);
      out += `L${(cx + r * Math.cos(an)).toFixed(1)},${(cy + r * Math.sin(an)).toFixed(1)}`;
    }
    return out;
  };
  // p1 -curve-> p3 -arc(far of c2)-> p4 -curve-> p2 -arc(far of c1)-> p1
  const c1 = `C${h(p1, a1 - H, hr1 * wTop)} ${h(p3, a3 + H, hr2 * wTop)} ${P(p3)}`;
  const c2 = `C${h(p4, a4 - H, hr2 * wBot)} ${h(p2, a2 + H, hr1 * wBot)} ${P(p2)}`;
  const outline = `M${P(p1)}${c1}${arc(x2, y2, r2, a3, a4, ab, 20)}${c2}${arc(x1, y1, r1, a2, a1, ab + Math.PI, 20)}Z`;
  return { fill: outline, outline };
}

// translate every coordinate pair in an SVG path string by (dx,dy) — used to shift the
// metaball outline from root-relative into the blob layer's own local coordinate space for
// clip-path — port of source 790-795.
function shiftPath(pathStr: string, dx: number, dy: number): string {
  return pathStr.replace(/(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/g, (_m, xs: string, ys: string) =>
    `${(parseFloat(xs) + dx).toFixed(1)},${(parseFloat(ys) + dy).toFixed(1)}`);
}

// find a pet's description block by its heading name ("Jojo"/"Ollie") — port of source
// 424-433, scoped to ctx.root (never `document`) since the lens layer only ever needs
// to see this hero's own DOM.
function captionRect(ctx: LensCtx, name: string): DOMRect | null {
  const divs = ctx.qa('div');
  for (const el of divs) {
    const h = el.querySelector<HTMLElement>(':scope > div');
    if (h && h.textContent?.trim() === name && el.querySelector('p')) {
      return el.getBoundingClientRect();
    }
  }
  return null;
}

// each lens rests relative to its pet's description block — port of source 435-445.
function lensDefaultPos(ctx: LensCtx, idx: number): { x: number; y: number } {
  if (idx === 0) {
    const j = captionRect(ctx, 'Jojo');
    if (j) return { x: Math.round(j.left - 90), y: Math.round(j.top - 21) };
    return { x: 56, y: 210 };
  }
  const o = captionRect(ctx, 'Ollie');
  if (o) return { x: Math.round(o.left + 150), y: Math.round(o.top - 102) };
  return { x: window.innerWidth - 220, y: Math.max(40, window.innerHeight - 380) };
}

// per-lens deformation hooks + rest-position/sync stash, exposed as plain DOM
// properties (not a side table) so Task 4's intro (playLensIntro) can drive an
// already-live lens without a second lookup — port of source 572-573, 608-610.
type LensEl = HTMLElement & {
  _restPos?: { x: number; y: number };
  _sync?: () => void;
  _clickBounce?: () => void;
  _wobbleKick?: (amt?: number) => void;
  _pushMotion?: (vx: number, vy: number) => void;
};

export function createLenses(ctx: LensCtx): { playIntro(): void; paintWorlds(): void } {
  // live video -> lens-world canvas pairs, painted every frame by paintWorlds(). Scoped
  // to this createLenses() call so a StrictMode destroy+remount starts a fresh array
  // rather than accumulating pairs from a torn-down instance.
  const lensVidPairs: Array<[HTMLVideoElement, HTMLCanvasElement]> = [];
  let lastPropsKey: string | undefined;

  // clone the hero and mirror its live videos as canvases — port of source 509-545.
  // Canvases (not cloned <video> elements) because a cloned video can't keep pace with
  // the scrub-driven original (seek storm); paintWorlds() blits the real frame instead.
  const buildLensWorld = (): HTMLElement => {
    const root = ctx.root;
    const world = root.cloneNode(true) as HTMLElement;
    world.querySelectorAll('[data-lens]').forEach((n) => n.remove());
    world.querySelectorAll('[data-lens-bridge]').forEach((n) => n.remove());
    // the lens punches through the inactive-side frost: never frost inside a lens world
    world.querySelectorAll('[data-frost-l],[data-frost-r]').forEach((n) => n.remove());
    // the loading overlay is fixed & transient — never bake it into a lens clone
    world.querySelectorAll('[data-loader]').forEach((n) => n.remove());
    // the filter host clones too (it's a root-level sibling, not inside [data-lens]) —
    // strip it so its cloned <filter id="lensRefract*"> defs can't end up earlier in
    // document order than the live host and silently shadow it on a future rebuild
    world.querySelectorAll('[data-lens-filter-host]').forEach((n) => n.remove());
    world.setAttribute('data-lens-world', '');
    // additive overrides — keep the root's inline layout styles (flex split!) intact
    world.setAttribute('style', root.getAttribute('style') || '');
    world.style.position = 'absolute';
    world.style.left = '0';
    world.style.top = '0';
    world.style.width = `${root.offsetWidth}px`;
    world.style.height = `${root.offsetHeight}px`;
    world.style.margin = '0';
    world.style.pointerEvents = 'none';
    world.style.transformOrigin = '0 0';

    const ov = ctx.getVideos();
    const cv = world.querySelectorAll('video');
    for (let i = 0; i < cv.length; i++) {
      const o = ov[i];
      const cl = cv[i];
      if (!o || !cl) continue;
      const cnv = document.createElement('canvas');
      cnv.width = o.videoWidth || 1280;
      cnv.height = o.videoHeight || 720;
      cnv.setAttribute('style', cl.getAttribute('style') || '');
      cnv.style.opacity = '1';
      cl.parentNode?.replaceChild(cnv, cl);
      lensVidPairs.push([o, cnv]);
    }

    ctx.on(window, 'resize', () => {
      world.style.width = `${root.offsetWidth}px`;
      world.style.height = `${root.offsetHeight}px`;
    });
    return world;
  };

  // sizes + positions every [data-lens] and (re)builds the filter host only when the
  // computed props key actually changed — port of source 338-366.
  const applyLensProps = (): void => {
    const size = LENS.lensSize;
    const M = LENS.magnifyScale;
    ctx.qa('[data-lens]').forEach((lens, i) => {
      const s = i === 0 ? Math.round(size * 1.45) : size;
      lens.style.width = `${s}px`;
      lens.style.height = `${s}px`;
      const world = lens.querySelector<HTMLElement>('[data-lens-world]');
      if (world) {
        const r = lens.offsetWidth / 2;
        world.style.transformOrigin = `${lens.offsetLeft + r}px ${lens.offsetTop + r}px`;
        world.style.transform = `translate(${-lens.offsetLeft}px,${-lens.offsetTop}px) scale(${M})`;
      }
    });
    const key = lensPropsKey();
    if (key !== lastPropsKey) {
      lastPropsKey = key;
      const svg = ctx.q('[data-lens-filter-host]');
      if (svg) {
        svg.innerHTML = buildLensFilter();
        // force Chromium to re-resolve the rebuilt filter defs on every lens
        ctx.qa('[data-lens-fx]').forEach((fx, i) => {
          const v = `url(#lensRefract${i + 1})`;
          fx.style.filter = 'none';
          requestAnimationFrame(() => { fx.style.filter = v; });
        });
      }
    }
  };

  // full per-lens setup: fixed rest position, sized world clone, refraction wired,
  // liquid-spring deformation, and pointer drag. Port of source 547-638, minus the
  // stacked-at-center/opacity-0/transition placement (source 574-578) — that's the
  // split-from-center intro's starting state (Task 4); this task keeps Task 1's
  // immediate rest placement so there's something to drag before the intro exists.
  const setupLens = (lens: HTMLElement, idx: number): void => {
    const fx = lens.querySelector<HTMLElement>('[data-lens-fx]');
    if (!fx) return;
    fx.style.filter = `url(#lensRefract${idx + 1})`;

    const world = buildLensWorld();
    fx.appendChild(world);
    ctx.addCleanup(() => world.remove());

    const sync = () => {
      const M = LENS.magnifyScale;
      const r = lens.offsetWidth / 2;
      const ox = lens.offsetLeft + r;
      const oy = lens.offsetTop + r;
      world.style.transformOrigin = `${ox}px ${oy}px`;
      world.style.transform = `translate(${-lens.offsetLeft}px,${-lens.offsetTop}px) scale(${M})`;
    };

    const size = idx === 0 ? Math.round(LENS.lensSize * 1.45) : LENS.lensSize;
    lens.style.width = `${size}px`;
    lens.style.height = `${size}px`;
    const pos = lensDefaultPos(ctx, idx);
    lens.style.left = `${pos.x}px`;
    lens.style.top = `${pos.y}px`;
    sync();
    lens.style.opacity = '1';

    // stash rest position + sync so the intro's fly-out (Task 4) can read them back
    // off the live element — port of source 572-573.
    const el = lens as LensEl;
    el._restPos = pos;
    el._sync = sync;

    // spring-driven liquid deformation: stretch along motion, damped bounce on
    // settle — port of source 582-607, minus `_lensIntroMoving` (Task 4's intro
    // fly-out isn't wired yet, so only an active drag drives the stretch/wobble).
    let drag: { dx: number; dy: number } | null = null;
    let lastX = 0, lastY = 0, velX = 0, velY = 0;
    let amt = 0, vAmt = 0, ang = 0;
    let wobE = 0, wobP = 0;   // decaying jelly-wobble oscillator
    ctx.loop(() => {
      const speed = Math.hypot(velX, velY);
      const maxS = LENS.liquidStretch;
      const liquidActive = !!drag && LENS.liquidEnabled;
      const target = liquidActive ? Math.min(maxS, speed * 0.012) : 0;
      vAmt += (target - amt) * 0.30;   // stiffness (higher -> snappier)
      vAmt *= 0.78;                    // damping (higher retain -> more overshoot/bounce)
      amt += vAmt;
      velX *= 0.80; velY *= 0.80;
      // jelly wobble: oscillation kicked by click + drag speed, decays to still
      if (liquidActive) wobE = Math.min(0.10, wobE + speed * 0.0018);
      wobP += 0.5;
      wobE *= 0.925;                   // slower decay -> a few more bounces before settling
      const wob = Math.sin(wobP) * wobE;
      if (Math.abs(amt) > 0.0008 || Math.abs(wob) > 0.0008 || drag) {
        const deg = (ang * 180) / Math.PI;
        // directional stretch * oscillating jelly squash (x up while y down, then flip)
        lens.style.transform =
          `rotate(${deg}deg) scale(${(1 + amt) * (1 + wob)},${(1 - amt * 0.65) * (1 - wob)}) rotate(${-deg}deg)`;
      } else if (lens.style.transform) {
        lens.style.transform = '';
      }
    });
    el._clickBounce = () => { wobE = Math.min(0.16, wobE + 0.12); };   // pop on click/press
    el._wobbleKick = (bump?: number) => { wobE = Math.min(0.34, wobE + (bump || 0.12)); };   // parametrized kick (e.g. arrival bounce)
    el._pushMotion = (vx: number, vy: number) => {   // feed travel velocity (intro split)
      velX = vx; velY = vy;
      if (Math.hypot(vx, vy) > 1.5) ang = Math.atan2(vy, vx);
    };

    // pointer drag — port of source 612-637.
    const onDown = (e: Event): void => {
      const pe = e as PointerEvent;
      drag = { dx: pe.clientX - lens.offsetLeft, dy: pe.clientY - lens.offsetTop };
      el._clickBounce?.();   // pop on click/press
      lastX = pe.clientX; lastY = pe.clientY;
      lens.style.cursor = 'grabbing';
      lens.setPointerCapture?.(pe.pointerId);
      pe.preventDefault();
      pe.stopPropagation();
    };
    const onMove = (e: Event): void => {
      if (!drag) return;
      const pe = e as PointerEvent;
      velX = pe.clientX - lastX; velY = pe.clientY - lastY;
      lastX = pe.clientX; lastY = pe.clientY;
      if (Math.hypot(velX, velY) > 1.5) ang = Math.atan2(velY, velX);
      lens.style.left = `${pe.clientX - drag.dx}px`;
      lens.style.top = `${pe.clientY - drag.dy}px`;
      sync();
    };
    const onUp = (): void => {
      if (!drag) return;
      drag = null;
      lens.style.cursor = 'grab';
    };
    ctx.on(lens, 'pointerdown', onDown);
    ctx.on(window, 'pointermove', onMove);
    ctx.on(window, 'pointerup', onUp);
  };

  // bridge the two lenses into a single connected metaball blob while they overlap: a
  // third buildLensWorld clone clipped to the metaball outline and refracted through the
  // shared lensRefractBridge filter, plus a unified rim traced along that same outline.
  // Snaps back to the two discs the instant metaballPath reports no overlap. Port of
  // source 689-789, minus the `_lensReady` gate — that flag exists to hide the blob before
  // Task 4's stacked-center intro runs; Task 4 isn't ported yet, so there's no pre-intro
  // state to hide it from (lenses are already visible at rest, same deviation Task 1 made).
  const initBridge = (a: HTMLElement, b: HTMLElement): void => {
    const root = ctx.root;

    // refracting blob layer: a full-hero world clone, clipped to the metaball shape and
    // bent by the continuous smooth-union displacement map -> refraction flows across the neck
    const blob = document.createElement('div');
    blob.setAttribute('data-lens-bridge', '');
    blob.style.cssText =
      `position:absolute;left:0;top:0;width:${root.offsetWidth}px;height:${root.offsetHeight}px;` +
      `z-index:11;pointer-events:none;display:none;filter:drop-shadow(0 15px 30px rgba(0,0,0,.10))`;
    const blobFx = document.createElement('div');
    blobFx.setAttribute('data-lens-bridge', '');
    blobFx.style.cssText = 'position:absolute;inset:0;filter:url(#lensRefractBridge)';
    const blobWorld = buildLensWorld();
    blobFx.appendChild(blobWorld);
    blob.appendChild(blobFx);
    root.appendChild(blob);
    ctx.addCleanup(() => blob.remove());

    // unified glass rim + specular along the blob outline
    const osvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    osvg.setAttribute('data-lens-bridge', '');
    osvg.style.cssText =
      `position:absolute;left:0;top:0;width:${root.offsetWidth}px;height:${root.offsetHeight}px;` +
      `z-index:12;pointer-events:none;overflow:visible;display:none`;
    const rimSoft = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rimSoft.setAttribute('fill', 'none');
    rimSoft.setAttribute('stroke', 'rgba(255,255,255,.10)');
    rimSoft.setAttribute('stroke-width', '2.5');
    const rimHair = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    rimHair.setAttribute('fill', 'none');
    rimHair.setAttribute('stroke', 'rgba(255,255,255,.16)');
    rimHair.setAttribute('stroke-width', '1');
    osvg.appendChild(rimSoft);
    osvg.appendChild(rimHair);
    root.appendChild(osvg);
    ctx.addCleanup(() => osvg.remove());

    let bmap: HTMLElement | null = null;   // <feImage id="bridgeMap">, resolved lazily
    // geometry the blob map was last regenerated for — generateBlobMap's output depends
    // only on (cx1,cy1,r1,cx2,cy2,r2), not on wob, so a held merge (lenses static) can
    // keep reusing the same encoded map instead of re-running the SDF raster + toDataURL()
    // every frame. null forces a regen on the next merged frame; reset on separation so
    // the next merge always starts fresh.
    let lastBlobGeom: [number, number, number, number, number, number] | null = null;
    const setDiscFx = (vis: boolean): void => {
      ctx.qa('[data-lens]').forEach((lens) => {
        const fx = lens.querySelector<HTMLElement>('[data-lens-fx]');
        const rim = lens.querySelector<HTMLElement>('[data-lens-rim]');
        if (fx) fx.style.visibility = vis ? 'visible' : 'hidden';
        if (rim) rim.style.opacity = vis ? '1' : '0';
      });
    };

    let wobEnergy = 0, wobPhase = 0, wasMerged = false;
    let pcx: number | null = null, pcy: number | null = null;
    ctx.loop(() => {
      const r1 = a.offsetWidth / 2, r2 = b.offsetWidth / 2;
      const cx1 = a.offsetLeft + r1, cy1 = a.offsetTop + r1;
      const cx2 = b.offsetLeft + r2, cy2 = b.offsetTop + r2;
      // wobble energy: kicked by relative motion of the two lenses + on first connect
      const mx = (cx1 + cx2) / 2, my = (cy1 + cy2) / 2;
      if (pcx !== null && pcy !== null) wobEnergy = Math.min(1, wobEnergy + Math.hypot(mx - pcx, my - pcy) * 0.03);
      pcx = mx; pcy = my;
      wobEnergy *= 0.90;   // decay to rest (faster = calmer)
      wobPhase += 0.34;    // oscillation speed
      const wob = Math.sin(wobPhase) * wobEnergy * 0.26;
      const d = metaballPath(cx1, cy1, r1, cx2, cy2, r2, wob);
      if (d) {
        // union bounding box (+ padding for displaced samples & rim)
        const pad = Math.max(r1, r2) * 0.5 + 24;
        const bx0 = Math.min(cx1 - r1, cx2 - r2) - pad;
        const by0 = Math.min(cy1 - r1, cy2 - r2) - pad;
        const bw = Math.max(cx1 + r1, cx2 + r2) + pad - bx0;
        const bh = Math.max(cy1 + r1, cy2 + r2) + pad - by0;

        if (!bmap) bmap = ctx.q('#bridgeMap');
        if (bmap) {
          const geomChanged = !lastBlobGeom ||
            Math.abs(cx1 - lastBlobGeom[0]) > 0.5 ||
            Math.abs(cy1 - lastBlobGeom[1]) > 0.5 ||
            Math.abs(r1 - lastBlobGeom[2]) > 0.5 ||
            Math.abs(cx2 - lastBlobGeom[3]) > 0.5 ||
            Math.abs(cy2 - lastBlobGeom[4]) > 0.5 ||
            Math.abs(r2 - lastBlobGeom[5]) > 0.5;
          if (geomChanged) {
            bmap.setAttribute('href', generateBlobMap(cx1, cy1, r1, cx2, cy2, r2, bx0, by0, bw, bh));
            lastBlobGeom = [cx1, cy1, r1, cx2, cy2, r2];
          }
        }

        // position the refraction layer to the bbox; align its world clone under it
        blob.style.left = `${bx0}px`;
        blob.style.top = `${by0}px`;
        blob.style.width = `${bw}px`;
        blob.style.height = `${bh}px`;
        const M = LENS.magnifyScale;
        blobWorld.style.transformOrigin = `${mx}px ${my}px`;
        blobWorld.style.transform = `translate(${-bx0}px,${-by0}px) scale(${M})`;
        // clip-path is in the layer's local coords -> shift the metaball path by -bbox origin
        const localFill = shiftPath(d.fill, -bx0, -by0);
        blob.style.clipPath = `path('${localFill}')`;
        (blob.style as CSSStyleDeclaration & { webkitClipPath: string }).webkitClipPath = `path('${localFill}')`;
        blob.style.display = 'block';

        rimSoft.setAttribute('d', d.outline);
        rimHair.setAttribute('d', d.outline);
        osvg.style.display = 'block';
        setDiscFx(false);   // hide the two circular refractions; the blob covers both
        if (!wasMerged) { wobEnergy = Math.min(1, wobEnergy + 0.3); wasMerged = true; }   // pop on connect
      } else {
        wasMerged = false;
        lastBlobGeom = null;   // force a fresh regen on the next merge
        blob.style.display = 'none';
        osvg.style.display = 'none';
        setDiscFx(true);
      }
    });
  };

  // inject the refraction filters + wire both lenses at their rest positions, then bridge
  // them into a single connected metaball once both are live — port of source 415-421.
  const svg = ctx.q('[data-lens-filter-host]');
  if (svg) svg.innerHTML = buildLensFilter();
  lastPropsKey = lensPropsKey();
  const lensEls = ctx.qa('[data-lens]');
  lensEls.forEach((lens, i) => setupLens(lens, i));
  applyLensProps();
  if (lensEls.length >= 2) initBridge(lensEls[0], lensEls[1]);

  return {
    // real intro (stacked-center split + fly-out) lands in Task 4; the lenses already
    // sit at rest, so there's nothing to animate yet.
    playIntro() {},

    // paint the live video frames into the lens-world canvases — port of source 1041-1050.
    paintWorlds() {
      for (const [video, canvas] of lensVidPairs) {
        if (video.readyState >= 2) {
          if (canvas.width !== video.videoWidth && video.videoWidth) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
          }
          try {
            canvas.getContext('2d')?.drawImage(video, 0, 0, canvas.width, canvas.height);
          } catch {
            // transient decode error mid-seek — skip this frame, matches source's empty catch
          }
        }
      }
    },
  };
}
