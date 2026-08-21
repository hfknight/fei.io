import {
  JOJO, OLLIE, TRACKING_SPEED, SCOPE_INSET_Y, CLIP_FPS,
  FROST_BLUR, FROST_STYLE, SEAM_SHEEN, LOGO_GLOW,
  type ClipCfg,
} from './landingConfig';
import { createLenses, type LensCtx } from './lensEngine';

export interface EngineOpts {
  reducedMotion: boolean;
  canHover: boolean;   // matchMedia('(hover: hover) and (pointer: fine)').matches
  playIntro: boolean;  // false when hasShownLoading → skip loader, jump to steady state
  onRevealed?: () => void; // fired once the hero is revealed (latches hasShownLoading)
}
export interface LandingEngine { destroy(): void; }

// `interactive` (fine-hover pointer + motion allowed) gates the head-track/frost; when
// off, the split hero renders at its resting pose with no listeners, scrub, or effects.
export function createLandingEngine(root: HTMLElement, opts: EngineOpts): LandingEngine {
  const interactive = !opts.reducedMotion && opts.canHover;
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
  // cancellable setTimeout — every timer used by the reveal choreography (Task 4)
  // goes through this so a mid-load teardown can't fire DOM mutations after unmount.
  const later = (fn: () => void, ms: number) => {
    const id = window.setTimeout(fn, ms);
    cleanups.push(() => clearTimeout(id));
  };
  const addCleanup = (fn: () => void) => cleanups.push(fn);
  const getVideos = () => qa<HTMLVideoElement>('[data-jojo],[data-ollie]');

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

  // Phase 2 Task 1: static liquid-glass refraction lenses. <Lenses/> (and therefore
  // [data-lens]) only mounts when `interactive` (see index.tsx), so the non-interactive
  // path must never construct createLenses — no filter host, no world clones, no paint.
  const lensCtx: LensCtx = { root, q, qa, on, loop, later, addCleanup, opts, getVideos };
  const lenses = interactive ? createLenses(lensCtx) : null;

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

  // Frost skin — ported from source 1066-1092. FROST_BLUR/FROST_STYLE are static config
  // (not live-tweakable props here), so this runs once at setup instead of every tick.
  const applyFrost = (blur: number, style: typeof FROST_STYLE) => {
    // monochrome grain (real frosted glass has micro-texture), declared once in tokens.ts
    // because the chrome's nav track wears the same skin.
    const NOISE = 'var(--frost-noise)';
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

  // ---- Task 4: loading overlay (real byte-progress fill + reveal choreography) ----
  const loader = q('[data-loader]');
  const fillRect = q('[data-fill-rect]');
  const prog: Record<'j' | 'o', number> = { j: 0, o: 0 };
  const done: Record<'j' | 'o', boolean> = { j: false, o: false };
  let dispProg = 0;
  // mutable flag Task 3 hardcoded to `true` (no loader existed yet); finishLoader below
  // is the sole writer. The main tick's seam/hairline glow (further down) reads it.
  let loaderDone = false;
  let finished = false;
  const loaderStart = performance.now();

  // dark ink of the logo rises bottom→top with progress p (0..1) (source 798-804)
  const setLoaderFill = (p: number) => {
    if (!fillRect) return;
    const H = 390;
    fillRect.setAttribute('y', (H * (1 - p)).toFixed(1));
    fillRect.setAttribute('height', (H * p).toFixed(1));
  };

  // spring the center lockup's four corner brackets in — the loading brackets have
  // already opened to this exact position, so this is a seamless handoff (source 501-506)
  const bounceBrackets = () => {
    qa('[data-brk-frame]').forEach((f) => { f.style.opacity = '1'; });
  };

  // everything loaded: fill to full, flip the logo, split the brackets open,
  // materialize the hero lockup, dissolve, then split the lens intro out to rest
  // (source 806-861)
  const finishLoader = () => {
    if (finished) return;
    finished = true;
    loaderDone = true;
    setLoaderFill(1);
    const box = q('[data-brk-box]');
    const flip = q('[data-flip]');
    const lock = q('[data-load-lockup]');
    const fades = qa('[data-lk-fade]');
    // measure the lockup's own box so the brackets frame it exactly like the landing hero's
    const lr = lock ? lock.getBoundingClientRect() : { width: 460, height: 200 };
    // 1) the logo flips in place (same element, no fade) to reveal its final, uncut
    //    form, while the brackets split to frame the full lockup
    later(() => {
      if (flip) flip.style.transform = 'rotateY(180deg)';
      if (box) { box.style.width = `${Math.round(lr.width)}px`; box.style.height = `${Math.round(lr.height)}px`; }
    }, 100);
    // 2) text slides in AND the curtains part from the center — together, revealing the videos
    later(() => {
      fades.forEach((el, i) => {
        later(() => { el.style.opacity = '1'; el.style.transform = 'none'; }, i * 45);
      });
      const cl = q('[data-curtain="l"]');
      const cr = q('[data-curtain="r"]');
      const fx = q('[data-loader-fx]');
      if (fx) fx.style.opacity = '0';
      if (cl) cl.style.transform = 'translateX(-100%)';
      if (cr) cr.style.transform = 'translateX(100%)';
    }, 300);
    // corner brackets: springs in after the reveal
    later(() => { bounceBrackets(); }, 700);
    // 3) once the lockup has read over the live video, fade it out
    later(() => {
      if (lock) { lock.style.transition = 'opacity .3s ease'; lock.style.opacity = '0'; }
      if (box) { box.style.transition = 'opacity .3s ease'; box.style.opacity = '0'; }
    }, 720);
    later(() => { if (loader) loader.style.display = 'none'; }, 1020);
    // 4) pet captions slide in, snappy + staggered, once the videos are exposed
    later(() => {
      (['j', 'o'] as const).forEach((key, i) => {
        const els = qa(`[data-pet-cap="${key}"]`);
        later(() => {
          els.forEach((el) => { el.style.opacity = '1'; el.style.transform = 'none'; });
        }, i * 70);
      });
    }, 680);
    // 5) the lens intro: a single lens fades in at center, then splits into the two
    //    lenses that travel out to their rest positions (connected blob renders en
    //    route) — port of source 858-860.
    later(() => { lenses?.playIntro(); }, 820);
    // the intro has committed to revealing — latch hasShownLoading so SPA re-nav skips
    // it. Runs on the real (second) StrictMode mount only: the first mount is torn down
    // before the clips finish downloading, so finishLoader never fires there.
    opts.onRevealed?.();
  };

  // Static-path reveal for the !playIntro branch: no loader is mounted, so jump the
  // captions + bracket-frame straight to the end-state finishLoader produces (minus the
  // choreography). The videos' own .9s opacity fade-in is the quiet reveal.
  const revealStatic = () => {
    if (loaderDone) return;
    loaderDone = true;
    bounceBrackets();
    (['j', 'o'] as const).forEach((key) => {
      qa(`[data-pet-cap="${key}"]`).forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    });
    opts.onRevealed?.();
  };

  // eased catch-up of dispProg toward real (byte) progress or a time-based creep
  // fallback (keeps the fill moving even without a Content-Length); finishes once
  // both clips are done and the fill has visually reached 1 (source 908-920).
  // Only the full-intro path runs the loader-fill choreography; the !playIntro path
  // waits for the clips and reveals immediately (revealStatic).
  if (opts.playIntro) {
    loop(() => {
      if (loaderDone) return;
      const real = (prog.j + prog.o) / 2;
      const t = (performance.now() - loaderStart) / 1000;
      const creep = 1 - Math.exp(-t / 6);
      const allDone = done.j && done.o;
      const target = allDone ? 1 : Math.max(real, Math.min(creep, 0.9));
      dispProg += (target - dispProg) * 0.08;
      if (allDone && dispProg > 0.995) dispProg = 1;
      setLoaderFill(dispProg);
      if (allDone && dispProg >= 0.999) { finishLoader(); return; }
    });
  } else if (!interactive) {
    // Stills stand in for the videos on this path (SplitStage's `stills` prop, set by
    // index.tsx from this same `!interactive`), so no [data-jojo]/[data-ollie] elements
    // exist for loadClip below to report `done` on — the loop below would wait forever.
    // Reveal immediately instead; the invariant this leans on is that videos exist iff
    // `interactive` is true.
    revealStatic();
  } else {
    loop(() => {
      if (loaderDone) return;
      if (done.j && done.o) revealStatic();
    });
  }

  // Blob load — deliberately the SAME seek path production uses, streamed via
  // res.body.getReader() so prog[key] tracks real downloaded bytes (source 924-952).
  // Guard the .then with `destroyed`, register the URL for revoke, and swallow the
  // abort rejection. Only the interactive path needs this: it's what makes the
  // zero-decode seek-scrubbing reliable. The non-interactive path never seeks, so it
  // streams straight into the <video> element instead of buffering the whole clip
  // into a Blob first — cheaper on mobile data.
  const loadClip = (vid: HTMLVideoElement | null, c: ClipCfg, clearSeekMark: () => void, key: 'j' | 'o') => {
    if (!vid) return;
    const src = vid.dataset.src;
    if (!src) return;

    if (!interactive) {
      vid.src = src;
      on(vid, 'canplay', () => {
        if (destroyed) return;
        vid.currentTime = c.T0 + c.dur * c.rest;
        vid.style.opacity = '1';
        done[key] = true;
      }, { once: true });
      vid.load();
      return;
    }

    fetch(src, { signal: abort.signal })
      .then((res) => {
        const total = Number(res.headers.get('content-length')) || 0;
        const body = res.body;
        if (!body || !total) return res.blob();
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        const pump = (): Promise<Blob> => reader.read().then((r) => {
          // TS 5.9's generic Uint8Array<ArrayBufferLike> doesn't structurally satisfy
          // BlobPart's ArrayBufferView<ArrayBuffer> — chunks are plain bytes either way.
          if (r.done) return new Blob(chunks as BlobPart[], { type: 'video/mp4' });
          chunks.push(r.value);
          received += r.value.length;
          prog[key] = received / total;
          return pump();
        });
        return pump();
      })
      .then((blob) => {
        if (destroyed) return;
        const url = URL.createObjectURL(blob);
        objectUrls.push(url);
        vid.src = url;
        prog[key] = 1;
        on(vid, 'loadeddata', () => {
          const settle = () => {
            if (destroyed) return;
            vid.pause();
            vid.currentTime = c.T0 + c.dur * c.rest;
            vid.style.opacity = '1';
            done[key] = true;
          };
          // play→settle forces the first frame to decode so seeks land reliably
          const p = vid.play();
          if (p && typeof p.then === 'function') p.then(settle).catch(settle);
          else settle();
        }, { once: true });
        vid.load();
      })
      .catch((e) => {
        if (e.name === 'AbortError') return;
        prog[key] = 1;
        done[key] = true;
      });
    on(vid, 'seeked', () => { clearSeekMark(); });
  };
  loadClip(vj, cfg.j, () => { seekJ = false; }, 'j');
  loadClip(vo, cfg.o, () => { seekO = false; }, 'o');

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
      // Ollie tracks (mirrored). Weighted 0.15/0.85 rather than Jojo's 0.42/0.58:
      // clip-4's motion is almost pure pitch (head up at the window start, lowest at its
      // end), so the vertical axis carries the gaze and the horizontal term is only a
      // mild bias toward the seam. Heavier x-terms failed in both directions: clip-3's
      // 0.42 pushed a top-of-screen cursor a third into the window (head dropping with
      // the cursor high), and 0.25 kept the far-right bottom from ever reaching the nod's
      // true bottom.
      tgtO = clamp01(0.15 * (1 - xnR) + 0.85 * yn);
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
  // reduced-motion OR no fine-hover pointer → static path: no scrub, no frost. Skip the
  // pointer listeners and the whole effect/easing tick; the clips stay parked at their
  // rest frame (settled in loadClip) and the seam keeps its static-hairline base style.
  if (interactive) {
    // pointermove, not mousemove: the lens drag calls preventDefault() on pointerdown
    // (it suppresses text selection and the native drag image), and that also kills the
    // compatibility mouse events for the rest of the interaction — the pets froze the
    // moment a lens was grabbed. The pointer stream is unaffected by that, and
    // PointerEvent extends MouseEvent, so onMove reads clientX/clientY unchanged.
    on(window, 'pointermove', onMove);
    on(window, 'mouseleave', onLeave);
  }

  // Guarded seek (source 988-993). Returns the updated seek-flag for this video;
  // the flag is cleared by the 'seeked' listener when the browser finishes the seek.
  // Two departures from the source's raw `t > 0.012` guard, both because scrubbing 24fps
  // footage through arbitrary timestamps strobes: the target is quantized to a source frame
  // boundary, and a seek fires only when that changes the *displayed* frame (half-frame
  // threshold). Sub-frame seeks repaint the video without changing its content — cost, no
  // pixels — and mid-frame timestamps made the guard fire on moves too small to see.
  const seekTo = (vid: HTMLVideoElement | null, c: ClipCfg, cur: number, marked: boolean): boolean => {
    const t = Math.round((c.T0 + c.dur * cur) * CLIP_FPS) / CLIP_FPS;
    if (vid && vid.readyState >= 2 && !marked && Math.abs(vid.currentTime - t) > 0.5 / CLIP_FPS) {
      vid.currentTime = t;
      return true;
    }
    return marked;
  };

  // main tick — effects + easing/seek. Registered only on the interactive path.
  if (interactive) loop(() => {
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
    // lens-world canvas paint (source 1041-1050).
    lenses?.paintWorlds();

    const spd = TRACKING_SPEED;
    const slow = Math.min(spd, 0.10);
    // active pet catches up quickly; the resting pet eases back gently
    const jEase = (active && side === 'L') ? spd : slow;
    const oEase = (active && side === 'R') ? spd : slow;
    // The ease HOLDS inside a ~50ms-of-footage dead zone rather than chasing or snapping:
    // the exponential never lands on tgt, and both trailing it and snapping to it forward
    // cursor micro-jitter into the clip time — when the rest pose sits near a 24fps frame
    // boundary, ±3px of hand jitter toggles the displayed frame, a constant flicker on the
    // half being tracked. Holding freezes the video between real moves; the zone is under
    // ~4px of cursor travel, so a deliberate move always escapes it. (A per-tick frame cap
    // was tried against the in-motion shimmer and reverted: stepping this motion-blurred
    // 24fps footage strobes at any speed, so the cap only added tracking lag.)
    const advance = (cur: number, tgt: number, ease: number): number =>
      Math.abs(tgt - cur) < 0.008 ? cur : cur + (tgt - cur) * ease;
    curJ = advance(curJ, tgtJ, jEase);
    curO = advance(curO, tgtO, oEase);
    seekJ = seekTo(vj, cfg.j, curJ, seekJ);
    seekO = seekTo(vo, cfg.o, curO, seekO);
  });

  return {
    destroy() { destroyed = true; cleanups.splice(0).forEach((fn) => fn()); },
  };
}
