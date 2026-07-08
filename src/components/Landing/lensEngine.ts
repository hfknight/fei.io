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

  // minimal per-lens setup: fixed rest position, sized world clone, refraction wired.
  // No drag/spring here — Task 2 layers those onto this same DOM. Port of source
  // 547-579, minus the pointer handlers and the spring/wobble tick.
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
  };

  // inject the refraction filters + wire both lenses at their rest positions — port of
  // source 415-421, minus initBridge() (Task 3's merge machinery, out of scope here).
  const svg = ctx.q('[data-lens-filter-host]');
  if (svg) svg.innerHTML = buildLensFilter();
  lastPropsKey = lensPropsKey();
  ctx.qa('[data-lens]').forEach((lens, i) => setupLens(lens, i));
  applyLensProps();

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
