import {
  JOJO, OLLIE, TRACKING_SPEED, SCOPE_INSET_Y,
  FROST_BLUR, FROST_STYLE, SEAM_SHEEN, LOGO_GLOW,
  type ClipCfg,
} from './landingConfig';

export interface EngineOpts {
  reducedMotion: boolean;
  canHover: boolean;   // matchMedia('(hover: hover) and (pointer: fine)').matches
  playIntro: boolean;  // false when hasShownLoading → skip loader, jump to steady state
}
export interface LandingEngine { destroy(): void; }

// `_opts` is the shared EngineOpts arg wired by later tasks (Task 5: reducedMotion /
// canHover / playIntro gating); intentionally unused in the Task 1 head-track spike.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function createLandingEngine(root: HTMLElement, _opts: EngineOpts): LandingEngine {
  // ---- teardown registry (fixes the source's leak) ----
  // App runs under <StrictMode>, so dev double-mounts and calls destroy() between
  // mounts — teardown must abort in-flight work and be idempotent.
  let destroyed = false;
  const cleanups: Array<() => void> = [];
  const abort = new AbortController();                    // cancels in-flight clip fetches
  cleanups.push(() => abort.abort());
  const objectUrls: string[] = [];                        // revoked on destroy
  cleanups.push(() => objectUrls.forEach(URL.revokeObjectURL));
  const q = <T extends HTMLElement = HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const qa = <T extends HTMLElement = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel));
  const on = <T extends EventTarget>(t: T, type: string, fn: EventListener, o?: AddEventListenerOptions) => {
    t.addEventListener(type, fn, o);
    cleanups.push(() => t.removeEventListener(type, fn, o));
  };
  // self-rescheduling rAF loop that stops cleanly on destroy
  const loop = (step: (now: number) => void) => {
    let id = 0, alive = true;
    const frame = (now: number) => { if (!alive) return; step(now); id = requestAnimationFrame(frame); };
    id = requestAnimationFrame(frame);
    cleanups.push(() => { alive = false; cancelAnimationFrame(id); });
  };

  // ---- Task 1: head-track (video load, onMove/onLeave, main tick's seek portion) ----
  const cfg = { j: { ...JOJO }, o: { ...OLLIE } };

  // per-pet gaze state (source names: curJ/tgtJ/curO/tgtO, seekJ/seekO). cur & tgt are
  // FRACTIONS in [0,1] resting at `rest`; seekTo maps fraction→time via T0 + dur*cur.
  let curJ = cfg.j.rest, tgtJ = cfg.j.rest;
  let curO = cfg.o.rest, tgtO = cfg.o.rest;
  let active = false;
  let side: 'L' | 'R' | null = null;
  let seekJ = false, seekO = false;

  const vj = q<HTMLVideoElement>('[data-jojo]');
  const vo = q<HTMLVideoElement>('[data-ollie]');

  // Task 3: frost / seam / hairline / logo hooks.
  const frostL = q('[data-frost-l]');
  const frostR = q('[data-frost-r]');
  const seam = q('[data-seam]');
  const hairs = qa('[data-hair]');
  const logos = qa('[data-logo]');

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  // Frost skin — ported from source 1066-1092. FROST_BLUR/FROST_STYLE are static config
  // (not live-tweakable props here), so this runs once at setup instead of every tick.
  const applyFrost = (blur: number, style: typeof FROST_STYLE) => {
    // monochrome grain (real frosted glass has micro-texture)
    const NOISE = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.42'/%3E%3C/svg%3E\")";
    // graduated blur: full frost at the outer edge, easing toward the seam
    const lMask = 'linear-gradient(90deg, rgba(0,0,0,1) 30%, rgba(0,0,0,.4) 100%)';
    const rMask = 'linear-gradient(90deg, rgba(0,0,0,.4) 0%, rgba(0,0,0,1) 70%)';
    const set = (el: HTMLElement | null, bf: string, bg: string, blend: string, mask: string) => {
      if (!el) return;
      el.style.backdropFilter = bf;
      (el.style as CSSStyleDeclaration & { webkitBackdropFilter: string }).webkitBackdropFilter = bf;
      el.style.background = bg; el.style.backgroundBlendMode = blend;
      el.style.maskImage = mask; el.style.webkitMaskImage = mask;
    };
    if (style === 'Liquid glass') {
      set(frostL, `blur(${blur}px) saturate(172%) brightness(1.05)`,
        NOISE + ', linear-gradient(125deg, rgba(255,255,255,.34), rgba(228,229,231,.22) 50%, rgba(203,206,212,.34))',
        'soft-light, normal', lMask);
      set(frostR, `blur(${blur}px) saturate(172%) brightness(1.04)`,
        NOISE + ', linear-gradient(125deg, rgba(255,255,255,.18), rgba(30,31,36,.26) 50%, rgba(8,9,12,.46))',
        'soft-light, normal', rMask);
    } else if (style === 'Dim only') {
      set(frostL, 'none', 'rgba(214,216,219,.52)', 'normal', 'none');
      set(frostR, 'none', 'rgba(12,13,16,.56)', 'normal', 'none');
    } else { // Frosted
      set(frostL, `blur(${blur}px) saturate(110%)`, 'rgba(228,229,231,.32)', 'normal', lMask);
      set(frostR, `blur(${blur}px) saturate(110%)`, 'rgba(28,29,33,.36)', 'normal', rMask);
    }
  };
  applyFrost(FROST_BLUR, FROST_STYLE);

  // Blob load — deliberately the SAME seek path production uses (Task 4 only adds
  // byte-progress on top), so this spike gate tests the real thing. Guard the .then
  // with `destroyed`, register the URL for revoke, and swallow the abort rejection.
  const loadClip = (vid: HTMLVideoElement | null, c: ClipCfg, clearSeekMark: () => void) => {
    if (!vid) return;
    const src = vid.dataset.src;
    if (!src) return;
    fetch(src, { signal: abort.signal })
      .then((res) => res.blob())
      .then((blob) => {
        if (destroyed) return;
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        vid.src = url;
        on(vid, 'loadeddata', () => {
          const settle = () => {
            vid.pause();
            vid.currentTime = c.T0 + c.dur * c.rest;
            vid.style.opacity = '1';
          };
          // play→settle forces the first frame to decode so seeks land reliably
          const p = vid.play();
          if (p && typeof p.then === 'function') p.then(settle).catch(settle);
          else settle();
        }, { once: true });
        vid.load();
      })
      .catch((e) => { if (e.name !== 'AbortError') throw e; });
    on(vid, 'seeked', () => { clearSeekMark(); });
  };
  loadClip(vj, cfg.j, () => { seekJ = false; });
  loadClip(vo, cfg.o, () => { seekO = false; });

  // ONLY the pet whose half the cursor is in moves; the other holds its last pose.
  const onMove: EventListener = (e) => {
    const me = e as MouseEvent;
    const W = window.innerWidth, H = window.innerHeight, half = W / 2;
    const iy = SCOPE_INSET_Y / 100;
    const yn = clamp01((me.clientY / H - iy) / (1 - 2 * iy));
    if (me.clientX < half) {
      side = 'L';
      const xnL = clamp01(me.clientX / half);
      tgtJ = clamp01(0.42 * xnL + 0.58 * yn);        // Jojo tracks
    } else {
      side = 'R';
      const xnR = clamp01((me.clientX - half) / half);
      tgtO = clamp01(0.42 * (1 - xnR) + 0.58 * yn);  // Ollie tracks (mirrored)
    }
    // frost the half the cursor is NOT on (source 972-974). ([data-hint] at source
    // 975-977 is null-guarded and has no counterpart in our markup — skipped.)
    if (frostL) frostL.style.opacity = side === 'R' ? '1' : '0';
    if (frostR) frostR.style.opacity = side === 'L' ? '1' : '0';
    if (!active) active = true;
  };
  const onLeave: EventListener = () => {
    active = false;
    side = null;
    // clear frost on leave (source 982-983, adjacent to the onMove toggle above) —
    // frost is the one effect toggled imperatively rather than read every tick, so
    // nothing else clears it once the cursor leaves the window.
    if (frostL) frostL.style.opacity = '0';
    if (frostR) frostR.style.opacity = '0';
  };
  on(window, 'mousemove', onMove);
  on(window, 'mouseleave', onLeave);

  // Guarded seek (source 988-993). Returns the updated seek-flag for this video;
  // the flag is cleared by the 'seeked' listener when the browser finishes the seek.
  const seekTo = (vid: HTMLVideoElement | null, c: ClipCfg, cur: number, marked: boolean): boolean => {
    const t = c.T0 + c.dur * cur;
    if (vid && vid.readyState >= 2 && !marked && Math.abs(vid.currentTime - t) > 0.012) {
      vid.currentTime = t;
      return true;
    }
    return marked;
  };

  // No loader yet (Task 4 wires the real flag); steady soft-glow base state is correct
  // until then.
  const loaderDone = true;

  // main tick
  loop(() => {
    // seam edge-sheen: lit while a side is frosted (driven every frame so the toggle
    // is live) (source 999-1014)
    if (seam) {
      const lit = active && !!side && SEAM_SHEEN;      // cursor on a side → bright
      const base = loaderDone && SEAM_SHEEN && !lit;   // loading finished → steady soft glow
      seam.style.transition = 'box-shadow .6s ease, background .6s ease, width .3s ease';
      seam.style.width = lit ? '2px' : (base ? '1.5px' : '1px');
      seam.style.boxShadow = lit
        ? '0 0 26px 2px rgba(255,255,255,.85), 0 0 7px 1px rgba(255,255,255,.95)'
        : (base ? '0 0 14px 1px rgba(255,255,255,.42), 0 0 4px 0 rgba(255,255,255,.55)' : 'none');
      seam.style.background = lit
        ? 'rgba(255,255,255,.95)'
        : (base
          ? 'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 30%,rgba(255,255,255,.55) 70%,rgba(255,255,255,0) 100%)'
          : 'linear-gradient(180deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.28) 30%,rgba(255,255,255,.28) 70%,rgba(255,255,255,0) 100%)');
    }
    // hairlines mirror the seam's edge-sheen (horizontal fade + glow when a side is
    // lit) (source 1015-1030)
    if (hairs.length) {
      const hlit = active && !!side;
      hairs.forEach((h, i) => {
        // left brackets (i 0,2) sit on the light half → dark ink; right brackets → white
        const isLeft = i === 0 || i === 2;
        if (isLeft) {
          h.style.borderColor = hlit ? 'rgba(70,72,78,.72)' : 'rgba(70,72,78,.52)';
          h.style.filter = hlit ? 'drop-shadow(0 0 4px rgba(70,72,78,.32))' : 'none';
        } else {
          h.style.borderColor = hlit ? 'rgba(255,255,255,.92)' : 'rgba(255,255,255,.55)';
          h.style.filter = hlit ? 'drop-shadow(0 0 4px rgba(255,255,255,.6))' : 'none';
        }
      });
    }
    // logo glyph glows white like the seam when a side is lit (source 1031-1040)
    if (logos.length) {
      const llit = active && !!side && LOGO_GLOW;
      const glow = llit
        ? 'drop-shadow(0 0 5px rgba(255,255,255,.5)) drop-shadow(0 0 2px rgba(255,255,255,.6))'
        : 'drop-shadow(0 0 0 rgba(255,255,255,0)) drop-shadow(0 0 0 rgba(255,255,255,0))';
      logos.forEach((l) => { l.style.filter = glow; });
    }
    // lens-world canvas paint (source 1041-1050) skipped — Phase 2, not in scope.

    const spd = TRACKING_SPEED;
    const slow = Math.min(spd, 0.10);
    // active pet catches up quickly; the resting pet eases back gently
    const jEase = (active && side === 'L') ? spd : slow;
    const oEase = (active && side === 'R') ? spd : slow;
    curJ += (tgtJ - curJ) * jEase;
    curO += (tgtO - curO) * oEase;
    seekJ = seekTo(vj, cfg.j, curJ, seekJ);
    seekO = seekTo(vo, cfg.o, curO, seekO);
  });

  return {
    destroy() { destroyed = true; cleanups.splice(0).forEach((fn) => fn()); },
  };
}
