import { useEffect, useMemo, useRef, useState } from 'react';
import styled, { createGlobalStyle } from 'styled-components';
import { Link } from 'react-router-dom';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import PageTransition from '../../../components/PageTransition';
import { usePageTitle } from '../../../hooks/usePageTitle';
import {
  CLIP_FPS,
  JOJO,
  JOJO_WEIGHTS,
  OLLIE,
  OLLIE_WEIGHTS,
  REST_SPEED,
  TRACKING_SPEED,
  advance,
  frameCount,
  mapToFraction,
  needsSeek,
  normalizeInPane,
  quantize,
  scrollFraction,
  type Clip,
  type Weights,
} from './cursorTrack';

hljs.registerLanguage('javascript', javascript);

/* ------------------------------------------------------------------ */
/* Input mode                                                          */
/* ------------------------------------------------------------------ */

/**
 * Exactly one engine mounts. `cursor` and `scroll` are two different writers of
 * the same `video.currentTime`, so running both would have them fight; `static`
 * never seeks at all, which is why it can also skip the blob buffer below.
 */
type Mode = 'cursor' | 'scroll' | 'static';

const readMode = (): Mode => {
  if (typeof window === 'undefined' || !window.matchMedia) return 'static';
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'static';
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches ? 'cursor' : 'scroll';
};

const useMode = (): Mode => {
  const [mode, setMode] = useState<Mode>(readMode);
  useEffect(() => {
    const queries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(hover: hover) and (pointer: fine)'),
    ];
    const sync = () => setMode(readMode());
    queries.forEach((q) => q.addEventListener('change', sync));
    return () => queries.forEach((q) => q.removeEventListener('change', sync));
  }, []);
  return mode;
};

/* ------------------------------------------------------------------ */
/* Clip loading                                                        */
/* ------------------------------------------------------------------ */

/**
 * Buffering the whole clip into a Blob before seeking is load-bearing, not
 * incidental: it is what makes zero-decode seek-scrubbing reliable. `cursor` is the
 * only mode that needs it — `static` never seeks, and `scroll`'s seeks are driven by
 * scroll position, which arrives gradually as the visitor scrolls rather than in
 * mouse-jitter bursts, so a streamed src's normal buffering keeps up. Both stream
 * straight into the element instead — cheaper on mobile data, where `scroll` always
 * runs. `armed` defers the download until the pane is worth paying for.
 */
function useClip(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  clip: Clip,
  mode: Mode,
  armed: boolean,
) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !armed) return;
    let dead = false;
    const abort = new AbortController();
    let objectUrl = '';

    const settleAt = (): void => {
      if (dead) return;
      vid.pause();
      vid.currentTime = clip.T0 + clip.dur * clip.rest;
      vid.style.opacity = '1';
      setReady(true);
    };

    if (mode === 'static' || mode === 'scroll') {
      vid.src = clip.src;
      vid.addEventListener('canplay', settleAt, { once: true });
      vid.load();
      return () => {
        dead = true;
        vid.removeEventListener('canplay', settleAt);
      };
    }

    fetch(clip.src, { signal: abort.signal })
      .then((res) => {
        const total = Number(res.headers.get('content-length')) || 0;
        const body = res.body;
        if (!body || !total) return res.blob();
        const reader = body.getReader();
        const chunks: Uint8Array[] = [];
        let received = 0;
        const pump = (): Promise<Blob> =>
          reader.read().then((r) => {
            if (r.done) return new Blob(chunks as BlobPart[], { type: 'video/mp4' });
            chunks.push(r.value);
            received += r.value.length;
            if (!dead) setProgress(received / total);
            return pump();
          });
        return pump();
      })
      .then((blob) => {
        if (dead) return;
        objectUrl = URL.createObjectURL(blob);
        vid.src = objectUrl;
        setProgress(1);
        vid.addEventListener(
          'loadeddata',
          () => {
            // play→settle forces the first frame to decode so seeks land reliably
            const p = vid.play();
            if (p && typeof p.then === 'function') p.then(settleAt).catch(settleAt);
            else settleAt();
          },
          { once: true },
        );
      })
      .catch((e: Error) => {
        if (e.name === 'AbortError' || dead) return;
        // A failed fetch should still show the pet, just without reliable scrub.
        vid.src = clip.src;
        vid.addEventListener('canplay', settleAt, { once: true });
        vid.load();
      });

    return () => {
      dead = true;
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [videoRef, clip, mode, armed]);

  return { progress, ready };
}

/* ------------------------------------------------------------------ */
/* Pane                                                                */
/* ------------------------------------------------------------------ */

interface PaneProps {
  clip: Clip;
  weights: Weights;
  mode: Mode;
  armed: boolean;
  variant: 'light' | 'dark';
  mirrored?: boolean;
  objectPosition: string;
  /**
   * Portrait crops far harder than the flank layout — the window narrows to ~26%
   * of the source — so a landscape framing that works wide can miss the animal
   * entirely. Ollie sits in source x 0–37.5% (centre 18.8%) while the portrait
   * window at his desktop 36% lands on 26.6–52.6%: almost pure backdrop. Defaults
   * to `objectPosition` where the wide framing already survives the crop.
   */
  objectPositionPortrait?: string;
  name: string;
  axisLabel: string;
  paneRef: React.RefObject<HTMLElement | null>;
  /**
   * Which side of the pane the copy sits on — the side the pet is NOT on. Both
   * clips are shot with the animal well off-centre, and at full width there is no
   * crop to hide it: the pane is 1.53:1 against 16:9 source, so `cover` leaves
   * ~200px of horizontal slack and none vertically. Across the whole scrub range
   * Jojo stays inside the left ~35% and Ollie the right ~40%, so the far side is
   * reliably empty and needs no plate behind the text.
   */
  side: 'left' | 'right';
  /**
   * Which end of the PORTRAIT frame the copy takes; the HUD takes the other. The
   * flank layout is free of this, but portrait has no spare room: measured in the
   * visible portrait crop, Ollie's white fur sits at y 22–44%, which is precisely
   * where top-anchored copy and its scrim land — and a scrim dark enough to carry
   * white text over white fur erases him. Anchoring his copy to the bottom leaves
   * that band clean. Jojo needs none of this: his is a mid-tone cat under a LIGHT
   * scrim, which lifts him rather than blacking him out.
   */
  portraitAnchor?: 'top' | 'bottom';
  lede: React.ReactNode;
  note?: React.ReactNode;
}

const fmt = (n: number, places = 2) => n.toFixed(places);

const ScrubPane: React.FC<PaneProps> = ({
  clip,
  weights,
  mode,
  armed,
  variant,
  mirrored,
  objectPosition,
  objectPositionPortrait,
  name,
  axisLabel,
  paneRef,
  side,
  portraitAnchor = 'top',
  lede,
  note,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  // The HUD is written imperatively. It changes every frame, and re-rendering
  // React 60×/s beside a video seek is churn for no gain — the same reason the
  // landing's engine mutates the DOM directly.
  const termsRef = useRef<HTMLSpanElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);
  const easeRef = useRef<HTMLSpanElement>(null);
  const frameRef = useRef<HTMLSpanElement>(null);

  const { progress, ready } = useClip(videoRef, clip, mode, armed);
  const total = useMemo(() => frameCount(clip, CLIP_FPS), [clip]);

  useEffect(() => {
    if (!ready || mode === 'static') return;
    const pane = paneRef.current;
    const vid = videoRef.current;
    if (!pane || !vid) return;

    let cur = clip.rest;
    let tgt = clip.rest;
    let seeking = false;
    let onSide = false;
    let xn = 0;
    let yn = 0;
    let alive = true;

    const onSeeked = () => {
      seeking = false;
    };
    vid.addEventListener('seeked', onSeeked);

    const onMove = (e: MouseEvent) => {
      const r = pane.getBoundingClientRect();
      // Section-relative, not viewport-relative: a stacked full-height section is
      // only sometimes the viewport, so the pane's own box is the frame of reference.
      onSide = e.clientY >= r.top && e.clientY <= r.bottom;
      if (!onSide) return;
      const n = normalizeInPane(e.clientX, e.clientY, r);
      xn = n.xn;
      yn = n.yn;
      tgt = mapToFraction(xn, yn, weights);
    };
    const onLeave = () => {
      onSide = false;
    };

    if (mode === 'cursor') {
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseleave', onLeave);
    }

    const frame = () => {
      if (!alive) return;
      if (mode === 'scroll') {
        const r = pane.getBoundingClientRect();
        // Scroll is already smooth and 1:1 — no easing, and no dead zone to fight,
        // since a scroll position does not tremble the way a hand does.
        cur = scrollFraction(r, window.innerHeight);
        tgt = cur;
      } else {
        cur = advance(cur, tgt, onSide ? TRACKING_SPEED : REST_SPEED);
      }

      const { time, frame: idx } = quantize(cur, clip, CLIP_FPS);
      if (vid.readyState >= 2 && !seeking && needsSeek(vid.currentTime, time, CLIP_FPS)) {
        vid.currentTime = time;
        seeking = true;
      }

      if (termsRef.current) {
        termsRef.current.textContent =
          mode === 'scroll'
            ? `scroll ${fmt(cur)}`
            : `${weights.x}·${fmt(weights.invertX ? 1 - xn : xn)} + ${weights.y}·${fmt(yn)}`;
      }
      // tgt/cur are the ease readout, and there is no ease in scroll mode — those
      // two rows are not rendered there, so their refs are simply null.
      if (valueRef.current) valueRef.current.textContent = fmt(tgt);
      if (easeRef.current) easeRef.current.textContent = fmt(cur, 3);
      if (frameRef.current) frameRef.current.textContent = `${idx} / ${total}`;

      requestAnimationFrame(frame);
    };
    const id = requestAnimationFrame(frame);

    return () => {
      alive = false;
      cancelAnimationFrame(id);
      vid.removeEventListener('seeked', onSeeked);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseleave', onLeave);
    };
  }, [ready, mode, clip, weights, paneRef, total]);

  const sign = weights.invertX ? '(1−x)' : 'x';

  return (
    <Pane ref={paneRef as React.RefObject<HTMLDivElement>} $variant={variant}>
      <Sticky>
        <Vid
          ref={videoRef}
          muted
          playsInline
          preload="none"
          $objPos={objectPosition}
          $objPosPortrait={objectPositionPortrait ?? objectPosition}
          style={{ transform: mirrored ? 'scaleX(-1)' : undefined }}
        />
        <Vignette $variant={variant} />
        <LedeScrim $side={side} $variant={variant} $anchor={portraitAnchor} />

        <Lede $side={side} $variant={variant} $anchor={portraitAnchor}>
          {note}
          {lede}
        </Lede>

        {!ready && (
          <Loading>
            buffering {Math.round(progress * 100)}% — the whole clip, so every seek is instant
          </Loading>
        )}

        <Hud $anchor={portraitAnchor} $side={side} aria-hidden="true">
          <HudName>{name}</HudName>
          <HudAxis>{axisLabel}</HudAxis>
          <HudRule />
          {mode === 'static' && <HudRow>motion reduced — parked at the rest frame</HudRow>}

          {/* Scroll mode has no cursor and so no weighted blend to show — printing
              the formula there would describe a calculation that is not running. */}
          {mode === 'scroll' && (
            <>
              <HudRow>
                t = <span ref={termsRef}>—</span>
              </HudRow>
              <HudRow>
                frame <Num ref={frameRef}>—</Num>
              </HudRow>
            </>
          )}

          {mode === 'cursor' && (
            <>
              <HudRow>
                t = {weights.x}·{sign} + {weights.y}·y
              </HudRow>
              <HudRow>
                &nbsp;&nbsp;= <span ref={termsRef}>—</span>
              </HudRow>
              <HudRow>
                tgt <Num ref={valueRef}>—</Num> → cur <Num ref={easeRef}>—</Num>
              </HudRow>
              <HudRow>
                frame <Num ref={frameRef}>—</Num>
              </HudRow>
            </>
          )}
        </Hud>
      </Sticky>
    </Pane>
  );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

const SEEK_CODE = `// Round to a real frame, then only jump if the picture would actually change.
// Asking for a time between two frames costs work and shows nothing new.
export function quantize(fraction, clip, fps) {
  const time = Math.round((clip.T0 + clip.dur * clamp01(fraction)) * fps) / fps;
  return { time, frame: Math.round((time - clip.T0) * fps) };
}

export function needsSeek(currentTime, targetTime, fps) {
  return Math.abs(currentTime - targetTime) > 0.5 / fps;
}`;

const WEIGHTS_CODE = `// Jojo turns his head both ways, so sideways gets real weight.
export const JOJO_WEIGHTS  = { x: 0.42, y: 0.58, invertX: false };

// Ollie only nods, so sideways is barely used — two attempts at a
// stronger setting failed, in opposite directions.
export const OLLIE_WEIGHTS = { x: 0.15, y: 0.85, invertX: true };

export function mapToFraction(xn, yn, w) {
  const xt = w.invertX ? 1 - xn : xn;
  return clamp01(w.x * xt + w.y * yn);
}`;

const Code: React.FC<{ code: string }> = ({ code }) => (
  <Pre>
    {/* hljs escapes its input and the source is a static literal — safe to inject. */}
    <code
      className="hljs"
      dangerouslySetInnerHTML={{ __html: hljs.highlight(code, { language: 'javascript' }).value }}
    />
  </Pre>
);

const CursorTrackedVideo: React.FC = () => {
  usePageTitle('Scrub video with the cursor — mouse-driven video playback in React · Fei Hu');

  const mode = useMode();
  const jojoRef = useRef<HTMLElement>(null);
  const ollieRef = useRef<HTMLElement>(null);
  // Arm immediately where there is no observer to wait on, rather than arming
  // from inside the effect — the initializer keeps it to a single render.
  const [ollieArmed, setOllieArmed] = useState(() => typeof IntersectionObserver === 'undefined');

  // Jojo downloads on mount; Ollie waits until he is roughly one viewport out.
  // 3.2MB is a lot to spend on a pane the visitor may never scroll to, and a full
  // viewport of travel is nearly always enough to finish the buffer in time.
  useEffect(() => {
    const el = ollieRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setOllieArmed(true);
          io.disconnect();
        }
      },
      { rootMargin: '100% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <PageTransition>
      <SnapStyle />

      <ScrubPane
        paneRef={jojoRef}
        clip={JOJO}
        weights={JOJO_WEIGHTS}
        mode={mode}
        armed
        variant="light"
        objectPosition="14% 66%"
        name="Jojo"
        axisLabel="2-axis gaze"
        side="right"
        note={
          mode === 'cursor' ? null : (
            <Note>
              {mode === 'scroll'
                ? 'No cursor on a phone, so scrolling moves the video instead.'
                : 'Reduced motion is on, so the video stays still.'}
            </Note>
          )
        }
        lede={
          <>
            {/* Same breadcrumb shape as the other lab entry: the trail names where you are
                and only the parent is a link. It replaces a fixed "← lab" pill — the global
                nav already carries a persistent Lab link, so this can be context rather
                than an escape hatch. */}
            <Kicker>
              fei.hu / <Crumb to="/lab">lab</Crumb> / cursor-tracked video
            </Kicker>
            <LedeTitle>Scrubbing video with the cursor</LedeTitle>
            <LedeP>
              Move your cursor. Jojo follows it.
            </LedeP>
            <LedeP>
              This is a plain <Mono>&lt;video&gt;</Mono> element — no WebGL, no image
              sequence. Where your cursor sits decides which frame to show. About sixty lines
              of code, most of it fixing problems that only appear once it runs.
            </LedeP>
          </>
        }
      />

      <ScrubPane
        paneRef={ollieRef}
        clip={OLLIE}
        weights={OLLIE_WEIGHTS}
        mode={mode}
        armed={ollieArmed}
        variant="dark"
        mirrored
        objectPosition="36% 70%"
        objectPositionPortrait="12% 70%"
        name="Ollie"
        axisLabel="1-axis pitch"
        side="left"
        portraitAnchor="bottom"
        lede={
          <>
            <LedeH2>Ollie only nods</LedeH2>
            <LedeP>
              Move side to side here and almost nothing happens. Move up and down and he
              follows.
            </LedeP>
            <LedeP>
              That is not a bug — it is the video. Jojo was filmed turning his head both ways.
              Ollie just nods, so there is no sideways movement in the frames to show. The
              code can only reveal what the camera caught.
            </LedeP>
          </>
        }
      />

      <Article>
        <Column>
          {/* A section label, not a second breadcrumb — the trail is already at the top of
              the page, and running it twice is noise rather than orientation. */}
          <Kicker>notes</Kicker>

          <H2>Why it downloads the whole video first</H2>
          <P>
            Jumping to a random point in a video that is still streaming is unreliable. The
            browser may not have that part yet, so the frame arrives late or flashes the wrong
            one on the way. Jumping around constantly needs every frame ready at once, so each
            clip downloads completely before it starts responding. That is what the counter on
            each pane is showing — a real 4MB and 3.2MB, said out loud rather than hidden
            behind a spinner.
          </P>
          <P>
            The clips are also saved so that every frame stands on its own. Video normally
            stores only what changed between frames, which makes jumping to an arbitrary point
            slow — the player has to build the picture up from the last complete frame.
            Storing each one whole costs file size and buys instant jumps.
          </P>

          <Code code={SEEK_CODE} />

          <H2>Could an image sequence do this instead?</H2>
          <P>
            It is the usual alternative — export the frames as stills and swap the picture as
            the cursor moves. Apple product pages have done it for years. It is also the
            obvious reply to a 4MB download, so it is worth checking rather than assuming.
          </P>
          <P>
            I measured it on this exact footage. Re-encoded as WebP at quality 75, Jojo&apos;s
            frames average about 20KB each, so the 140 the page uses come to roughly{' '}
            <strong>2.7MB</strong> — actually <em>less</em> than the ~3.6MB the video spends on
            the same range. JPEG is the worse end of it, around 37KB a frame, or 5MB. So file
            size does not settle the argument, which is not what I expected going in.
          </P>
          <P>
            Two other things settle it. One is 140 requests instead of one. The bigger one is
            memory: a decoded 1280×720 frame is about 3.7MB of raw pixels, so holding all 140
            ready at once would be over 500MB. No browser will do that, which means decoding
            on demand — and that is exactly the late-frame problem the download was meant to
            avoid. A sprite sheet fixes the request count by putting every frame in one image,
            but 140 frames this size is about 129 million pixels in a single file, well past
            what browsers will decode.
          </P>
          <P>
            So the video does not win here by being smaller. It wins because keeping a lot of
            frames ready to show is precisely what a video decoder is already for. At small
            sizes the trade flips — for a 60-frame loop a couple of hundred pixels wide, a
            sprite sheet is simpler and more predictable than anything on this page.
          </P>

          <H2>Why the numbers freeze when you hold still</H2>
          <P>
            Hold the cursor perfectly still and watch the readout. <Mono>cur</Mono> catches up
            to <Mono>tgt</Mono>, gets close, then stops dead instead of creeping the last
            little bit. That stop is the least obvious thing on this page, and it is there
            because hands shake.
          </P>
          <P>
            The catch-up works by closing a fraction of the remaining gap each frame, so it
            gets nearer and nearer without ever quite arriving. Left alone it keeps drifting by
            tiny amounts — and if it happens to settle near the line between two frames, a few
            pixels of shake is enough to flip the picture back and forth. The result is a
            constant flicker on whichever pet you are looking at. So below a certain distance
            it simply stops moving: small enough that any real gesture escapes it at once,
            large enough that a still hand gives a still picture.
          </P>
          <P>
            Limiting how far it could move per frame was tried against the same problem and
            undone. The footage is slightly motion-blurred, so stepping through it looks jumpy
            at any speed — the limit only added lag without fixing the shimmer.
          </P>

          <H2>Why not just turn Ollie&apos;s sideways response up</H2>
          <P>
            Because it does not make him more responsive, it makes him <em>wrong</em> — it
            pushes his head down when the cursor goes up, since the only movement in those
            frames is the nod. Two attempts at a stronger setting failed in opposite
            directions before settling on the light touch that is there now.
          </P>

          <Code code={WEIGHTS_CODE} />

          <H2>On a phone</H2>
          <P>
            There is no cursor, so scrolling drives it instead. Each pane becomes a tall
            section with the video pinned to the screen, and how far you have scrolled past it
            picks the frame. Same code, different number going in. And if you have reduced
            motion turned on, nothing moves at all — the videos just sit on their opening
            frame.
          </P>

          <EndLink to="/lab">← lab</EndLink>
        </Column>
      </Article>
    </PageTransition>
  );
};

export default CursorTrackedVideo;

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

/**
 * Snap lives on the document scroller, not a nested one — nested scrollers break
 * scroll restoration and make the fixed back-link's frame of reference ambiguous.
 * `proximity` rather than `mandatory`: a mandatory container with a child taller
 * than the viewport traps the article below.
 */
const SnapStyle = createGlobalStyle`
  /* #root carries \`overflow-x: hidden\` globally (index.css), and a non-visible
     overflow on one axis computes the other to \`auto\` — so #root is a scroll
     container and therefore the nearest scrolling ancestor of everything on the
     page. #root never scrolls (no fixed height), so any position: sticky inside it
     is silently inert and scrolls away with the document, which is exactly what the
     touch layout's pinned video did. Lift the clip while this route is mounted, the
     same way /readme does for its two pinned columns. Nothing is lost: html carries
     the same overflow-x: hidden in GlobalStyles, one level up. */
  #root {
    overflow-x: visible;
    max-width: none;
  }

  @media (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference) {
    html { scroll-snap-type: y proximity; }
  }

  /* The nav floats over footage here, and the route's surface says "dark" — so the chrome
     ink is white while the first pane is a LIGHT video. Measured against live frames the
     four links ran 1.91–2.62:1, all under AA. The ink is not the thing to change: the
     backdrop is a photograph that moves, and no single ink passes over every frame of it.
     So the nav gets a ground, the same dark glass the HUD wears, and its ink is pinned
     white on top of it. That holds over Jojo's light plate, Ollie's mid-grey and the
     near-black article alike, without any scroll machinery to go wrong at a boundary. */
  [data-nav-track] {
    /* Deeper than the HUD's 0.42. That alpha left the INACTIVE links at 4.06:1 — they
       carry 0.72 opacity, which the current link does not, so they are the constraint.
       0.58 also leaves headroom for a brighter frame drifting under the nav as the clip
       scrubs, which a value tuned to one frame would not. */
    background: rgba(12, 13, 16, 0.58);
    -webkit-backdrop-filter: blur(10px) saturate(140%);
    backdrop-filter: blur(10px) saturate(140%);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: ${p => p.theme.radius.pill};
  }

  [data-nav-track] a {
    color: #fff;
    /* Lifted from the global 0.72; the plate is a darker ground than the nav was built
       against, and the dimmed rest state is what fails AA on it. */
    opacity: 0.85;
  }

  [data-nav-track] a[aria-current='page'] {
    opacity: 1;
  }

  /* Light pages wear a paper grain (GlobalStyles' body::after, fixed, overlay at 0.65).
     It is there to give flat paper texture — and this route resolves to light only so the
     pre-mount ground and the route curtain match the opening pane, not because it is paper.
     There is no flat paper on it: two full-bleed photographs, which carry their own grain,
     and a dark article. Left on, it lays a second grain over the footage. */
  body::after {
    display: none;
  }
`;

/* No `overflow: hidden` here, deliberately: an ancestor with a non-visible
   overflow becomes the sticky child's scroll context, and this one has no
   scrollable overflow of its own — so the pinned video would simply scroll away
   on touch. `Sticky` clips the video instead, which is all the clipping needed. */
const Pane = styled.section<{ $variant: 'light' | 'dark' }>`
  position: relative;
  width: 100%;
  background: ${p =>
    p.$variant === 'light'
      ? 'linear-gradient(120deg,#e9eaeb 0%,#d4d6d8 100%)'
      : 'linear-gradient(120deg,#54565b 0%,#33343a 100%)'};

  /* Touch: a tall section for the sticky video to travel through — one viewport
     of scroll is too thin a range to spread six seconds of footage across. */
  height: 260dvh;

  @media (hover: hover) and (pointer: fine) {
    height: 100dvh;
    scroll-snap-align: start;
  }

  @media (prefers-reduced-motion: reduce) {
    height: 100dvh;
  }
`;

const Sticky = styled.div`
  position: sticky;
  top: 0;
  height: 100dvh;
  width: 100%;
  overflow: hidden;
`;

const Vid = styled.video<{ $objPos: string; $objPosPortrait: string }>`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transition: opacity 0.9s ease;
  object-position: ${p => p.$objPosPortrait};

  @media (hover: hover) and (pointer: fine) {
    object-position: ${p => p.$objPos};
  }
`;

const Vignette = styled.div<{ $variant: 'light' | 'dark' }>`
  position: absolute;
  inset: 0;
  pointer-events: none;
  box-shadow: ${p =>
    p.$variant === 'light'
      ? 'inset 0 0 200px rgba(70,72,76,.14)'
      : 'inset 0 0 220px rgba(15,16,19,.34)'};
`;

/**
 * All pane chrome wears one dark glass plate, regardless of which pet it sits on.
 * Tinting it per pane was tried and failed in the obvious way: `object-fit: cover`
 * means the video fills the pane, so overlay UI lands on whatever the footage
 * happens to put there — dark ink on the light pane was illegible the moment it
 * crossed Jojo's fur. A plate of its own is the only treatment that holds over
 * arbitrary frames.
 */
const plate = `
  background: rgba(12, 13, 16, 0.42);
  backdrop-filter: blur(10px) saturate(140%);
  -webkit-backdrop-filter: blur(10px) saturate(140%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
`;

/**
 * A graduated wash under the copy, densest at the outer edge and clear by the time
 * it reaches the pet. It is here for contrast, not decoration, and it is not
 * optional: measured against the live frames the lede ran 4.39:1 on Jojo and
 * 2.36:1 on Ollie, both under AA. Ollie's backdrop is a mid-grey around
 * (153,143,134) where even pure white tops out near 3.1:1 — no choice of ink can
 * pass there, so the ground itself has to move. Same device the landing uses on
 * each half of its split.
 */
const LedeScrim = styled.div<{
  $side: 'left' | 'right';
  $variant: 'light' | 'dark';
  $anchor: 'top' | 'bottom';
}>`
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  /* Portrait stacks the copy above the pet, so the wash runs top-down and only has
     to outlast the copy — Jojo's lede bottoms out near 51% of the viewport, Ollie's
     near 38%, so the two fades end in different places.

     Ollie's portrait crop is re-aimed at the dog himself, so the copy there sits
     over WHITE FUR rather than the mid-grey backdrop — and fur is the harder
     ground: white text needs roughly 0.57 alpha to clear AA over it, against 0.25
     over the backdrop. Hence 0.8 held to 40%, then clear by 58% so the lower half
     of the frame shows him untouched. */
  background: ${p =>
    p.$variant === 'light'
      ? `linear-gradient(${p.$anchor === 'top' ? '180deg' : '0deg'}, rgba(238,239,240,.9) 0%, rgba(238,239,240,.78) 45%, rgba(238,239,240,0) 68%)`
      : `linear-gradient(${p.$anchor === 'top' ? '180deg' : '0deg'}, rgba(12,13,16,.86) 0%, rgba(12,13,16,.78) 34%, rgba(12,13,16,0) 52%)`};

  @media (hover: hover) and (pointer: fine) {
    background: linear-gradient(
      ${p => (p.$side === 'right' ? '270deg' : '90deg')},
      ${p => (p.$variant === 'light' ? 'rgba(238,239,240,.92)' : 'rgba(12,13,16,.84)')} 0%,
      ${p => (p.$variant === 'light' ? 'rgba(238,239,240,.62)' : 'rgba(12,13,16,.5)')} 38%,
      ${p => (p.$variant === 'light' ? 'rgba(238,239,240,0)' : 'rgba(12,13,16,0)')} 70%
    );
  }
`;

/**
 * Copy sitting in the pane's empty side. Portrait puts the negative space at the
 * TOP rather than beside the pet, so the mobile-first rule pins it there and the
 * fine-pointer query moves it to the flank. It lives inside `Sticky` so it stays
 * pinned with the video through the touch layout's tall scroll range.
 */
const Lede = styled.div<{
  $side: 'left' | 'right';
  $variant: 'light' | 'dark';
  $anchor: 'top' | 'bottom';
}>`
  position: absolute;
  z-index: 2;
  ${p => (p.$anchor === 'top' ? 'top: 4.5rem;' : 'bottom: 2.5rem;')}
  left: 1.5rem;
  right: 1.5rem;
  color: ${p => (p.$variant === 'light' ? 'rgba(22,24,28,.94)' : 'rgba(255,255,255,.95)')};

  @media (hover: hover) and (pointer: fine) {
    top: 50%;
    bottom: auto;
    transform: translateY(-50%);
    width: min(38%, 27rem);
    ${p => (p.$side === 'right' ? 'left: auto; right: 5vw;' : 'left: 5vw; right: auto;')}
  }
`;

const Note = styled.p`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  line-height: 1.7;
  letter-spacing: 0.06em;
  margin: 0 0 1.1rem;
  padding-left: 0.7rem;
  border-left: 2px solid currentColor;
  opacity: 0.62;
`;

/* Portrait has to fit the whole lede above the animal, so the mobile sizes are the
   base and the fine-pointer query scales them back up for the flank layout. */
const LedeTitle = styled.h1`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.35rem, 5.6vw, 1.85rem);
  font-weight: 300;
  line-height: 1.14;
  margin: 0 0 1rem;
  color: inherit;

  @media (hover: hover) and (pointer: fine) {
    font-size: clamp(1.7rem, 3.4vw, 2.5rem);
    line-height: 1.12;
    margin-bottom: 1.35rem;
  }
`;

const LedeH2 = styled.h2`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.2rem, 5vw, 1.6rem);
  font-weight: 300;
  line-height: 1.16;
  margin: 0 0 1rem;
  color: inherit;

  @media (hover: hover) and (pointer: fine) {
    font-size: clamp(1.4rem, 2.8vw, 2rem);
    margin-bottom: 1.35rem;
  }
`;

const LedeP = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 0.85rem;
  line-height: 1.6;
  margin: 0 0 0.75rem;
  color: inherit;
  /* No opacity step here — the hierarchy comes from size and weight. Dimming body
     copy is what put both panes under AA in the first place. */

  @media (hover: hover) and (pointer: fine) {
    font-size: 0.92rem;
    line-height: 1.7;
    margin-bottom: 0.95rem;
  }
`;

const Loading = styled.div`
  ${plate}
  position: absolute;
  left: 50%;
  bottom: 2.5rem;
  transform: translateX(-50%);
  padding: 0.5rem 0.85rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  white-space: nowrap;
  color: rgba(255, 255, 255, 0.72);
`;

const Hud = styled.div<{ $anchor: 'top' | 'bottom'; $side: 'left' | 'right' }>`
  ${plate}
  position: absolute;
  z-index: 2;
  left: 2rem;
  /* Portrait: the HUD takes whichever end the copy did not (see portraitAnchor). */
  ${p => (p.$anchor === 'top' ? 'bottom: 2rem;' : 'top: 4.5rem;')}
  padding: 0.85rem 1.05rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.66rem;
  line-height: 1.75;
  letter-spacing: 0.04em;
  pointer-events: none;
  color: rgba(255, 255, 255, 0.86);

  @media (max-width: ${p => p.theme.breakpoints.sm}) {
    left: 1.25rem;
    ${p => (p.$anchor === 'top' ? 'bottom: 1.25rem;' : 'top: 4.5rem;')}
    font-size: 0.6rem;
  }

  /* On the flank layout the HUD joins the copy on the pet-free side, so all the
     chrome sits together and the animal's half stays clean. */
  @media (hover: hover) and (pointer: fine) {
    top: auto;
    bottom: 2rem;
    ${p => (p.$side === 'right' ? 'left: auto; right: 2rem;' : 'left: 2rem; right: auto;')}
  }
`;

const HudName = styled.div`
  font-size: 0.62rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.75;
`;

const HudAxis = styled.div`
  font-size: 0.62rem;
  letter-spacing: 0.24em;
  text-transform: uppercase;
  opacity: 0.55;
`;

const HudRule = styled.div`
  width: 8.5rem;
  height: 1px;
  margin: 0.55rem 0;
  background: currentColor;
  opacity: 0.22;
`;

const HudRow = styled.div`
  white-space: pre;
  font-variant-numeric: tabular-nums;
`;

const Num = styled.span`
  font-variant-numeric: tabular-nums;
`;

/* The linked segment of a breadcrumb — inherits the trail's ink so only the hover
   distinguishes it, matching the other lab entry's Crumb. */
const Crumb = styled(Link)`
  color: inherit;
  text-decoration: none;
  transition: color 0.25s ease, opacity 0.25s ease;

  &:hover {
    opacity: 1;
    text-decoration: underline;
    text-underline-offset: 3px;
  }

  &:focus {
    outline: none;
  }
  &:focus-visible {
    outline: 2px solid color-mix(in srgb, var(--accent) 50%, transparent);
    outline-offset: 3px;
    border-radius: 3px;
  }
`;

/* The article's closing way out. The breadcrumb up top is context; this is the exit
   you want after 900 words, without scrolling back past two full-screen panes. */
const EndLink = styled(Link)`
  display: inline-block;
  margin-top: 3.5rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  text-decoration: none;
  color: rgba(255, 255, 255, 0.72);
  transition: color 0.3s ease;

  &:hover {
    color: rgba(255, 255, 255, 0.96);
  }
`;

const Article = styled.section`
  background: var(--n-11);
  display: flex;
  justify-content: center;
  padding: 6rem 2rem 7rem;
`;

const Column = styled.div`
  max-width: 680px;
  width: 100%;
  /* The ink Kicker and Mono inherit from on this side. */
  color: rgba(255, 255, 255, 0.72);
`;

/* Kicker and Mono are used on BOTH the light pane and the dark article, so they
   take their colour from the ink they sit in rather than hardcoding white —
   which is what made them near-invisible over Jojo's light plate. Column and Lede
   each set a `color`, so `inherit` resolves correctly in both places. */
const Kicker = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: inherit;
  opacity: 0.58;
  margin-bottom: 1.5rem;
`;

const H2 = styled.h2`
  font-family: ${p => p.theme.font.body};
  font-size: 1.05rem;
  font-weight: 400;
  letter-spacing: 0.01em;
  color: rgba(255, 255, 255, 0.9);
  margin: 3rem 0 1rem;
`;

const P = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  font-size: 0.98rem;
  line-height: 1.75;
  color: rgba(255, 255, 255, 0.7);
  margin: 0 0 1.15rem;

  /* Against 200-weight body copy, the UA's bold is a shout. 400 plus a lift in
     ink is enough to mark a figure worth stopping on. */
  strong {
    font-weight: 400;
    color: rgba(255, 255, 255, 0.92);
  }

  em {
    font-style: italic;
    color: rgba(255, 255, 255, 0.88);
  }
`;

const Mono = styled.code`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.82em;
  color: inherit;
  background: color-mix(in srgb, currentColor 11%, transparent);
  border-radius: 3px;
  padding: 0.1em 0.35em;
`;

const Pre = styled.pre`
  margin: 1.75rem 0;
  padding: 1.1rem 1.25rem;
  overflow-x: auto;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.32);
  border: 1px solid rgba(255, 255, 255, 0.08);

  code {
    font-family: ${p => p.theme.font.mono};
    font-size: 0.74rem;
    line-height: 1.7;
    color: rgba(255, 255, 255, 0.78);
    background: none;
  }
`;
