import { JOJO, OLLIE, TRACKING_SPEED, SCOPE_INSET_Y, type ClipCfg } from './landingConfig';

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

  const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

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
    // frost (source 973-974) + hint (977) deferred to Task 3
    if (!active) active = true;
  };
  const onLeave: EventListener = () => {
    active = false;
    side = null;
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

  // main tick — easing + seek portion only (source 1052-1060)
  loop(() => {
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
