import { Fragment, useEffect, useRef, useState } from 'react';
import styled, { css, keyframes } from 'styled-components';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const Page = styled.div`
  position: relative;
  /* Slides the shared portrait horizontally for BOTH the column and the cut-out letters. */
  --portrait-x: -22vh;
  /* Wordmark geometry, declared once so Masthead and Portrait can't drift apart:
     head margin above the wordmark, its height, its dip into the image, and the
     paper margin around the picture. */
  --mast-top: 6.5rem;
  --word-h: 96px;
  --word-drop: 8px;
  --img-margin: 20px;
  /* Full-screen composition: the PAGE never scrolls — the portrait column is pinned,
     and overflowing copy scrolls inside Content alone. Mobile stacks the columns, so
     it reverts to normal document scroll below md. */
  height: 100dvh;
  overflow: hidden;
  background: ${p => p.theme.color.surface};
  display: grid;
  grid-template-columns: 340px 1fr;
  grid-template-rows: 100dvh;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    grid-template-rows: none;
    height: auto;
    min-height: 100dvh;
    overflow: visible;
  }
`;

const PORTRAIT_SRC = '/readme_protrait.webp';
/* One portrait shared by the column, the wordmark letters and the colour window. Each
   layer anchors the image to ITS OWN element and subtracts its own page offset from
   background-position, so all three sample one continuous picture — deliberately NOT
   background-attachment: fixed, which anchors to the viewport but silently re-anchors
   to the element whenever any ancestor carries a live transform (it cost a debugging
   session: entrance animations made the imagery sample the wrong region, then snap).
   Element-anchoring has no such mode switch, and it lets the whole composition
   translate and scale as one rigid sheet during the page entrance. */
const sharpImage = `
  background-image: url('${PORTRAIT_SRC}');
  /* Sized by HEIGHT, not cover. At cover the image is exactly viewport-wide, leaving no
     horizontal slack — the column could only ever show the picture's left edge. Height-
     sizing keeps the portrait taller than it is wide, so --portrait-x can slide the
     silhouette into the narrow column. In vh so the offset scales with the image. */
  background-size: auto 100vh;
  background-repeat: no-repeat;
`;

/* readme as CUT-OUT type, poster-style: a div filled with the shared fixed portrait,
   clipped by an SVG <text> (in the JSX below) instead of CSS background-clip. SVG buys
   what CSS type can't: the stencil's x/fontSize/textLength are derived at runtime from
   the word's measured INK bounds (advance-based textLength alone leaves side-bearing
   gaps), so the painted pixels span exactly the image width; scale(1,2) stretches it
   into the tall condensed poster form. Its baseline lands at this div's bottom edge =
   the image's cut top edge, so the picture reads as continuing up through the letters.
   Desktop-only. */
const Masthead = styled.div`
  position: absolute;
  /* Dropped by --word-drop so the letter bottoms dip into the image: Anton's final-e tail
     ends above the baseline, and without the overlap that curl leaves a sliver of paper
     between it and the image edge. */
  top: calc(var(--mast-top) + var(--word-drop));

  /* Below the image's top edge the fill stops painting: the column there wears the frost,
     so sharp letter fills would stamp visibly onto the blurry picture. Masked out, the
     dipped letter bottoms are windows onto the frosted image beneath — identical to its
     surroundings, so the letters merge into the image with no seam. */
  -webkit-mask-image: linear-gradient(
    to bottom,
    #000 calc(100% - var(--word-drop)),
    transparent calc(100% - var(--word-drop))
  );
  mask-image: linear-gradient(
    to bottom,
    #000 calc(100% - var(--word-drop)),
    transparent calc(100% - var(--word-drop))
  );

  /* The letters wear the column's frost — the same recipe Portrait wears (backdrop blur +
     125deg gradient, grain on its own layer below), so wordmark and picture read as one
     sheet of glass. Both pseudos are clipped to the letterforms with the element. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    backdrop-filter: blur(var(--frost-blur)) saturate(172%) brightness(1.04);
    -webkit-backdrop-filter: blur(var(--frost-blur)) saturate(172%) brightness(1.04);
    background: linear-gradient(125deg, rgba(255, 255, 255, 0.18), rgba(30, 31, 36, 0.26) 50%, rgba(8, 9, 12, 0.46));
    -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0.4) 100%);
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0.4) 100%);
  }
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--frost-noise);
    mix-blend-mode: soft-light;
    opacity: 0.4;
    pointer-events: none;
  }
  /* Desaturates the letters to match the b&w column. A dedicated full-opacity child (the
     clip-path clips children too) rather than joining a pseudo: the ::before's graduated
     mask would fade the grayscale with the frost, and the grain's 0.4 opacity would
     dilute it. */
  .bw {
    position: absolute;
    inset: 0;
    backdrop-filter: grayscale(1);
    -webkit-backdrop-filter: grayscale(1);
  }
  left: var(--img-margin);
  width: calc(340px - 2 * var(--img-margin));
  height: var(--word-h);
  z-index: 5;
  pointer-events: none;

  ${sharpImage}
  /* The element's page offset, subtracted so the letters continue the column's picture. */
  background-position: calc(var(--portrait-x) - var(--img-margin))
    calc(-1 * (var(--mast-top) + var(--word-drop)));
  clip-path: url(#readme-clip);

  @media (max-width: 1220px) {
    display: none;
  }
`;

/* Narrow left panel: the portrait, veiled by the landing's frosted-glass skin.
   Sticky so the image holds the eye while the copy scrolls past it. */
const Portrait = styled.aside`
  position: sticky;
  top: 0;
  height: 100dvh;
  overflow: hidden;
  /* The column is desaturated wholesale (image, frost and grain alike); the Peek window
     is a sibling, so it escapes the filter and stays in colour. */
  filter: grayscale(1);

  /* The picture lives on its own layer so the entrance can zoom IT alone — the frame,
     cut and margins hold still while the image settles to scale 1 (a zoom of the whole
     column read as nothing during the big rise). z-index 0 keeps it under the frost
     pseudos: as a real child it would otherwise paint above ::before, and the frost's
     backdrop-filter would have nothing beneath it to blur. */
  .img {
    position: absolute;
    inset: 0;
    z-index: 0;
    ${sharpImage}
    /* No offset to subtract: the layer's box starts at the page origin. */
    background-position: var(--portrait-x) 0;
  }

  /* Cut the image rather than covering it with paper rectangles. The cut-away area is then
     genuinely the page background — paper grain and all — so it matches by construction.
     Top edge = the README baseline (the wordmark box's bottom), so the letters sit directly
     on the image; the other three sides give the poster's paper margin around the picture. */
  clip-path: inset(calc(var(--mast-top) + var(--word-h)) var(--img-margin) var(--img-margin) var(--img-margin));

  /* The dark "Liquid glass" frost from landingEngine's frostR — same blur and 125deg
     gradient. Graduated toward the text seam (like the landing's mask) so it reads as
     glass, not a flat panel. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    backdrop-filter: blur(var(--frost-blur)) saturate(172%) brightness(1.04);
    -webkit-backdrop-filter: blur(var(--frost-blur)) saturate(172%) brightness(1.04);
    background: linear-gradient(125deg, rgba(255, 255, 255, 0.18), rgba(30, 31, 36, 0.26) 50%, rgba(8, 9, 12, 0.46));
    -webkit-mask-image: linear-gradient(90deg, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0.4) 100%);
    mask-image: linear-gradient(90deg, rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 0.4) 100%);
  }

  /* Grain on its own layer, soft-light over the frost, so its strength is one dial.
     Lighter than the raw --frost-noise tile, which read grainier than the landing. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 2;
    background: var(--frost-noise);
    mix-blend-mode: soft-light;
    opacity: 0.4;
    pointer-events: none;
  }

  @media (max-width: 1220px) {
    clip-path: none;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    position: relative;
    height: 42vh;

    /* No cut-out letters to line up with here, so the column goes back to a plain
       cover crop. */
    .img {
      background-size: cover;
      background-position: center 28%;
    }
  }
`;

/* A small colour window in the b&w column: a sibling of Portrait (so it escapes the
   grayscale filter) carrying the same fixed image — no frost, the sharp original picture
   in colour behind a thin light outline. Position/size are the dials. Desktop-only, like
   the rest of the composition. */
const Peek = styled(motion.div)`
  position: absolute;
  /* Aimed at the image's most vivid band (the orange glow) — the photo is motion-blurred
     nearly everywhere, so parked on a dark patch the colour reveal reads as a smear.
     Declared as vars because the background compensation below must subtract them. */
  --peek-x: 34px;
  --peek-y: 294px;
  left: var(--peek-x);
  top: var(--peek-y);
  width: 180px;
  height: 40px;
  z-index: 4;
  pointer-events: none;
  outline: 1px solid rgba(255, 255, 255, 0.75);
  ${sharpImage}
  /* The element's page offset, subtracted so the window continues the column's picture. */
  background-position: calc(var(--portrait-x) - var(--peek-x)) calc(-1 * var(--peek-y));

  @media (max-width: 1220px) {
    display: none;
  }
`;

/* The entrance object: column and wordmark slide in from the left as ONE piece.
   Safe to transform because every background inside is element-anchored — each layer
   carries its slice of the picture. The image zoom is NOT here: it lives on Portrait's
   .img layer, so only the picture grows inside its static frame. */
const ColumnGroup = styled(motion.div)`
  position: relative;
`;

const Content = styled.div`
  /* Bottom pad = the portrait's --img-margin, so the content column ends level with the
     poster's bottom edge. No footer clearance needed — it is hidden on this route (Layout). */
  padding: 7rem 2rem var(--img-margin);
  display: flex;
  justify-content: center;
  /* flex-start, NOT the default stretch: stretch pins this single child to the content-box
     height, and once the projects row makes the content taller than that, it overflows the
     fixed height — past the bottom padding and under the Footer. flex-start lets the track
     take its natural height so the pad is honoured. */
  align-items: flex-start;
  /* The page's only scroll region (the grid row is a fixed 100dvh, so the constrained
     height makes overflow-y real). min-width: 0 lets the grid track shrink instead of
     forcing a horizontal page overflow. */
  overflow-y: auto;
  min-width: 0;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 3.5rem 1.75rem 4rem;
    overflow-y: visible;
  }
`;

/* The scroll region's inner track. The prose keeps its 680px measure inside this;
   the projects row spans the whole thing, which is the point — an accordion at reading
   width has no room to open. Capped so the row doesn't sprawl on a very wide display. */
const Track = styled.div`
  width: 100%;
  max-width: 1100px;
`;

const Column = styled.div`
  max-width: 680px;
  width: 100%;
  /* Centred within Track, so the prose sits exactly where it did when Column was the
     scroll region's only child. */
  margin: 0 auto;
`;

const Graf = styled(motion.p)`
  font-family: ${p => p.theme.font.body};
  /* Reading scale for a 680px measure: tops at 1.3rem (~63 chars/line, the classic
     measure), floors at 18px on small viewports. The old clamp(1.25rem, 2.5vw, 1.5rem)
     hit 24px on desktop and read as display type; a flat 1rem (the lab's utilitarian
     empty-state size) read as UI copy. This sits between, still long-form. */
  font-size: clamp(1.125rem, 1.6vw, 1.3rem);
  line-height: 1.6;
  color: ${p => p.theme.color.ink};
  /* Exactly one line (1.6em = the 1.6 line-height), so the paragraph gap sits on the
     text's own baseline rhythm. */
  margin: 0 0 1.6em;
  /* 300, not 200: ExtraLight strokes go hairline under antialiased smoothing on the
     light paper — contrast passes but the strokes don't render. Light keeps the air. */
  font-weight: 300;
  text-wrap: pretty;

  &:last-child {
    margin-bottom: 0;
  }

  /* The Intuitive hover: everything that isn't the Intuitive clause recedes, and the
     clause explains itself by being the one thing left. Requires every text run to be
     an element (see PARAGRAPHS) — text nodes can't be dimmed. */
  > span {
    transition: opacity 0.4s ease;
  }

  &:has([data-clause='intuitive'] strong:hover) > span:not([data-clause='intuitive']) {
    opacity: 0.3;
  }

  @media (prefers-reduced-motion: reduce) {
    > span {
      transition: none;
    }
  }
`;

/*
 * The three principles. Each hover DEMONSTRATES the principle it names: the trigger is
 * the principle word (the visibly marked element), the effect covers its whole clause.
 * All three are decorative emphasis — spans, not links — so nothing joins the tab order.
 * Reduced motion collapses each to a static colour state, per the house rule.
 */

/* The marked word: only weight marks it at rest (500 against the body's 300) — an
   underline read as decoration spent too early; the accent and the portrait's colours
   are saved for the hover moments. */
const Term = styled.strong`
  font-weight: 500;
`;

/* Intuitive — "explain itself on first touch": no ornament at all. Hovering the word
   dims everything else in the paragraph (see Graf), and the clause is simply the one
   thing left standing — instant comprehension, zero decoration. */
const IntuitiveClause = styled.span``;

/* Aesthetic — the sentence about beauty becomes the page's one beautiful moment: the
   text turns gradient and a hot band travels through it while hovered. The band is the
   portrait's own glow — #f04d22/#f15b24 sampled from the image's vivid strip (the same
   band Peek frames) — so the colour reads as the page's, not an import. */
const shimmer = keyframes`
  from { background-position: 120% 0; }
  to { background-position: -120% 0; }
`;

const AestheticClause = styled.span`
  &:has(${Term}:hover) {
    background-image: linear-gradient(
      90deg,
      ${p => p.theme.color.ink} 0%,
      ${p => p.theme.color.ink} 28%,
      #f04d22 44%,
      #f15b24 56%,
      ${p => p.theme.color.ink} 72%,
      ${p => p.theme.color.ink} 100%
    );
    background-size: 220% 100%;
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
    animation: ${shimmer} 1.4s linear infinite;
  }

  /* No shimmer, no clipped gradient: the hover reduces to a static tint in the same
     sampled orange. */
  @media (prefers-reduced-motion: reduce) {
    &:has(${Term}:hover) {
      background-image: none;
      -webkit-background-clip: initial;
      background-clip: initial;
      -webkit-text-fill-color: currentColor;
      animation: none;
      color: #f04d22;
    }
  }
`;

/* Well-architected — hovering the word throws the clause into scrambled glyphs that
   resolve left to right: assembly, chaos settling into structure. JS-driven (below);
   this span only reserves the visual. */
const ArchitectedClause = styled.span``;

/* Scramble machinery. Letters randomise from a mixed pool — letters, digits and
   structural glyphs — and lock in left to right over DUR; spaces and punctuation never
   scramble, so the clause keeps its shape and the em-dash anchors the eye. Each hover
   cancels and restarts rather than guarding on "already running": a busy-flag deadlocks
   permanently if the tab is hidden mid-run (rAF freezes with the flag up and no frame
   ever clears it). */
const SCRAMBLE_POOL = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/\\{}[]<>=+*';
const SCRAMBLE_DUR = 900;

const useScramble = (text: string): { display: string; start: () => void } => {
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(text);
  const raf = useRef(0);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);
  const start = () => {
    if (reduced) return;
    cancelAnimationFrame(raf.current);
    const t0 = performance.now();
    const tick = (now: number) => {
      const p = (now - t0) / SCRAMBLE_DUR;
      if (p >= 1) {
        setDisplay(text);
        raf.current = 0;
        return;
      }
      const resolved = Math.floor(p * text.length);
      setDisplay(
        text
          .split('')
          .map((ch, i) =>
            i < resolved || !/[a-zA-Z]/.test(ch)
              ? ch
              : SCRAMBLE_POOL[Math.floor(Math.random() * SCRAMBLE_POOL.length)],
          )
          .join(''),
      );
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };
  return { display, start };
};

const ARCHITECTED_REST =
  ' — the foundation should outlast every feature built on top of it.';

const Architected: React.FC = () => {
  const { display, start } = useScramble(ARCHITECTED_REST);
  return (
    <ArchitectedClause data-clause>
      <Term onMouseEnter={start}>Well-architected</Term>
      {display}
    </ArchitectedClause>
  );
};

/* "top 10" — a rank isn't a starting point, it's an arrival. Hovering rolls an odometer:
   the number climbs down from 99 and locks on 10, digits streaming vertically past a
   one-line window. Deliberately unlike the other three treatments — the scramble resolves
   HORIZONTALLY into random-then-fixed glyphs; this is a MONOTONIC count moving on the Y
   axis, meaningful at every frame. Numbers are two digits throughout (10–99) so the window
   never reflows the sentence.

   Baseline safety: an overflow-clipped inline-block reports its bottom edge as the baseline,
   which would drop "top 10 firms" off the line. So the in-flow, never-clipped Ghost owns the
   size and baseline; the rolling column is absolutely positioned (out of flow), and its clip
   can't touch the wrapper's baseline. The roll ends on 10 exactly over the Ghost, so the
   hand-back is seamless. Reduced motion never rolls — the Ghost's static 10 is all there is. */
const RANK_START = 99;
const RANK_END = 10;
const RANK_DUR = 800;
const easeOutExpo = (t: number): number => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
const RANK_ROLL = Array.from(
  { length: RANK_START - RANK_END + 1 },
  (_, i) => RANK_END + i,
);

/* The marker for the stat, deliberately NOT the principles' upright weight-500: the mono
   chrome/label face. A credential is data, not a principle, so it's marked by FACE rather
   than weight and never reads as a fourth principle. Staying inside the system — mono is one
   of the three defined faces — so no new font is introduced. Mono is inherently tabular,
   which also guarantees the odometer's digits keep an even width as they roll. Trimmed a hair
   because JetBrains Mono sets larger on the body than Inter at the same px. */
const RankTerm = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.9em;
  /* Mono's fixed space glyph is ~2x an Inter space, so "top 10" gapped wider than the
     surrounding words. word-spacing pulls only that one space back to the body's width. */
  word-spacing: -0.29em;
`;

const RankWrap = styled.span`
  position: relative;
  display: inline-block;
  vertical-align: baseline;
  /* Every value is two digits, but tabular figures guarantee the width can't twitch. */
  font-variant-numeric: tabular-nums;
`;

/* The resting number: in flow, never clipped, so it fixes the wrapper's box and baseline.
   Hidden (not removed) while the column rolls, so layout holds. */
const Ghost = styled.span<{ $rolling: boolean }>`
  visibility: ${p => (p.$rolling ? 'hidden' : 'visible')};
`;

/* The moving digits, clipped to a single line. Absolute so the clip never reaches the
   wrapper's baseline. */
const RankWindow = styled.span`
  position: absolute;
  inset: 0;
  overflow: hidden;
`;

const RankColumn = styled.span`
  position: absolute;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  /* One value per line; each line is exactly the window's height, so precisely one shows. */
  will-change: transform;
`;

const RankClimb: React.FC = () => {
  const reduced = useReducedMotion();
  const [rolling, setRolling] = useState(false);
  const [offset, setOffset] = useState(0);
  const raf = useRef(0);
  const wrapRef = useRef<HTMLSpanElement>(null);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const start = (): void => {
    if (reduced || !wrapRef.current) return;
    cancelAnimationFrame(raf.current);
    const span = (RANK_START - RANK_END) * wrapRef.current.clientHeight;
    setRolling(true);
    const t0 = performance.now();
    const tick = (now: number): void => {
      const p = Math.min(1, (now - t0) / RANK_DUR);
      /* offset −span → 0: column starts shifted up to show 99, settles on 10. */
      setOffset(-span * (1 - easeOutExpo(p)));
      if (p >= 1) {
        setRolling(false);
        raf.current = 0;
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  return (
    <RankTerm onMouseEnter={start}>
      top{' '}
      <RankWrap ref={wrapRef}>
        <Ghost $rolling={rolling}>{RANK_END}</Ghost>
        {rolling && (
          <RankWindow aria-hidden>
            <RankColumn style={{ transform: `translateY(${offset}px)` }}>
              {RANK_ROLL.map(n => (
                <span key={n}>{n}</span>
              ))}
            </RankColumn>
          </RankWindow>
        )}
      </RankWrap>
    </RankTerm>
  );
};

/* "Taste, product instinct, and domain expertise" — the three human faculties AI amplifies.
   A single dark highlight box lives among them: hovering a term spotlights it (dark fill,
   light text), the box wiping in from the term's left edge like a highlighter stroke, and
   sliding to the next term slides the box across — one box, three homes, via a shared
   framer layoutId (the tab-indicator "magic move"). They're the closing triad,
   so at rest they carry the page's concept-word mark (weight 500), like the principles, which
   also teaches the hover. Reduced motion drops the slide: without the layoutId each box just
   appears on its own term, no travel — the static state the house rule asks for. */
const AMPLIFY = ['Taste', 'product instinct', 'domain expertise'];

const AmplifyTerm = styled.span<{ $active: boolean }>`
  position: relative;
  /* inline-block so the highlight can wrap the whole term and the term never splits across
     a line mid-box; isolate so the box's negative z-index stays behind the text, not the page. */
  display: inline-block;
  isolation: isolate;
  font-weight: 500;
  color: ${p => (p.$active ? p.theme.color.surface : p.theme.color.ink)};
  transition: color 0.25s ease;

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const AmplifyBox = styled(motion.span)`
  position: absolute;
  inset: -0.05em -0.24em;
  z-index: -1;
  background: ${p => p.theme.color.ink};
  border-radius: ${p => p.theme.radius.pill};
`;

/* The wipe is a clip, NOT a scaleX — it has to be. framer's layout projection owns
   `transform-origin` and rewrites it inline on every frame of a layoutId element (to half
   the box's width, its centre), so a CSS `transform-origin: left` loses and the box
   inflates from its middle instead of unrolling from its left edge. Clipping sits outside
   the transform machinery entirely, is left-anchored by construction, and leaves the
   travel projection untouched. Percentages so framer can interpolate the two shapes. */
const WIPE_CLOSED = 'inset(0% 100% 0% 0%)';
const WIPE_OPEN = 'inset(0% 0% 0% 0%)';

/* Snappier than the 0.32s travel: the wipe is a single short gesture, and matching the
   slide's duration made it read as a slow reveal instead of a stroke. */
const WIPE_S = 0.2;
const SLIDE_S = 0.32;

const Amplify: React.FC = () => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  /* Whether the box is arriving from nothing or travelling from a sibling. Only the
     first case wipes: during a layoutId move framer is already animating the box across,
     and replaying scaleX on the incoming copy fights that travel — the box crawls out of
     its own left edge mid-flight. Travel keeps `initial={false}`, so the slide is the
     only motion. */
  const [fresh, setFresh] = useState(true);

  const enter = (i: number) => {
    setFresh(active === null);
    setActive(i);
  };

  return (
    <span onMouseLeave={() => setActive(null)}>
      {AMPLIFY.map((word, i) => (
        <Fragment key={word}>
          {i > 0 && (i === AMPLIFY.length - 1 ? ', and ' : ', ')}
          <AmplifyTerm $active={active === i} onMouseEnter={() => enter(i)}>
            {active === i && (
              <AmplifyBox
                aria-hidden
                layoutId={reduced ? undefined : 'amplify-box'}
                initial={fresh && !reduced ? { clipPath: WIPE_CLOSED } : false}
                animate={{ clipPath: WIPE_OPEN }}
                transition={{
                  layout: { duration: SLIDE_S, ease },
                  clipPath: { duration: WIPE_S, ease },
                }}
              />
            )}
            {word}
          </AmplifyTerm>
        </Fragment>
      ))}
    </span>
  );
};

/*
 * The copy lives here, not in portfolio.json: the principles need inline markup, and a
 * marker syntax in JSON plus a parser is more machinery than three paragraphs of prose
 * justify. The entrance animates clip-path on each <p>, which is safe over these spans
 * because every treatment is hover-driven — static at rest, nothing fires mid-wipe.
 */
const PARAGRAPHS: React.ReactNode[] = [
  /* Every run of text is wrapped in a span so the Intuitive focus-dim (on Graf) has an
     element to fade — a bare text node can't be selected, let alone transitioned. */
  <>
    <span data-plain>
      Howdy! I'm Fei Hu. Full-stack engineer with a designer's touch. My bar is clear.
    </span>{' '}
    <IntuitiveClause data-clause="intuitive">
      <Term>Intuitive</Term> — software should explain itself on first touch.
    </IntuitiveClause>{' '}
    <AestheticClause data-clause>
      <Term>Aesthetic</Term> — it should feel considered, not just functional.
    </AestheticClause>{' '}
    <Architected />
  </>,
  <>
    I've spent over a decade building brand-defining websites and complex SaaS
    platforms, including work for Am Law 100 <RankClimb /> firms. Clean code, built to last, delivered on time.
  </>,
  <>
    AI made the mechanical parts of coding faster than ever, which buys me more time for defining the right problem, architecture, and the tradeoffs that shape a product. Today I'm building products on top of AI, in production. What sets the direction? <Amplify />. AI amplifies those. It doesn't replace them.
  </>,
];

/*
 * Selected side projects — three panels that share the row's width and trade it on hover:
 * the hovered panel takes roughly twice a resting share while its neighbours give theirs
 * up, and its scrim lifts so the panel reads as stepping forward. One flex row, animated
 * on flex-grow; no measurement, no layout projection.
 *
 * Hover-only by design: nothing here is clickable, so nothing joins the tab order, which
 * matches every other treatment on this page. The links will live in the prose instead.
 *
 * `image` is optional and there is no imagery yet, so the panels currently render as deep
 * ink with a raking gradient — the same material as the portrait column, which keeps the
 * section in the page's palette rather than parking three grey placeholder boxes on it.
 * Dropping a path in lights the photograph up with no other change.
 */
interface Project {
  name: string;
  blurb: string;
  year: string;
  kind: string;
  image?: string;
  /* The longer copy for the detail view. Falls back to `blurb` when absent, so a project
     can ship with one line and gain a paragraph later. */
  detail?: string;
}

/* TODO: placeholder content — swap in the real three. */
const PROJECTS: Project[] = [
  {
    name: 'Project One',
    blurb: 'A one-line description of what it is and why it exists.',
    year: '2026',
    kind: 'Side project',
  },
  {
    name: 'Project Two',
    blurb: 'A one-line description of what it is and why it exists.',
    year: '2025',
    kind: 'Experiment',
  },
  {
    name: 'Project Three',
    blurb: 'A one-line description of what it is and why it exists.',
    year: '2025',
    kind: 'Tool',
  },
];

const PANEL_S = '0.55s';
/* Shared by Panel and by PanelSlot, which has to match it — see PanelSlot. */
const PANEL_PAD = '1.5rem';

const ProjectsSection = styled(motion.section)`
  margin-top: 4.5rem;
`;

/* The section label follows the site's chrome idiom (Header, Footer, the writing back
   link) rather than introducing a display heading — the cut-out wordmark is the only
   large type this page gets, and a second heading would compete with it. */
const SectionLabel = styled.h2`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  font-weight: 400;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin: 0 0 1.25rem;
`;

/* The row's box, and the detail view's — the expansion fills exactly the area the panels
   occupied rather than the viewport, so it reads as the section opening rather than a
   modal taking the screen. Height comes from a 16:10 ratio on the section's own width, which
   makes each of the three panels a tall portrait column at any track width. */
const RowFrame = styled.div`
  position: relative;
  aspect-ratio: 16 / 10;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    aspect-ratio: auto;
  }
`;

const PanelRow = styled.div`
  display: flex;
  gap: 4px;
  height: 100%;

  /* The accordion. Both rules are one class + one pseudo-class, so the second wins on
     the hovered panel and the first still applies to its siblings. */
  &:hover > * {
    flex-grow: 0.8;
  }
  & > *:hover {
    flex-grow: 2;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    flex-direction: column;
    height: auto;

    /* No accordion when the panels are stacked — trading height on hover on a touch
       device is motion with nothing to reveal. */
    &:hover > *,
    & > *:hover {
      flex-grow: 1;
    }
  }

  /* Static state per the house rule: the panels keep their equal shares and only the
     scrim responds. */
  @media (prefers-reduced-motion: reduce) {
    &:hover > *,
    & > *:hover {
      flex-grow: 1;
    }
  }
`;

/* The panel fill, shared by the resting panel and the expanded hero so the two are the
   same material and the magic-move has nothing to cross-fade. */
const panelSkin = css<{ $image?: string }>`
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.25)),
    ${p => p.theme.color.ink};
  ${p =>
    p.$image &&
    css`
      background-image: url('${p.$image}');
      background-size: cover;
      background-position: center;
    `}
`;

/* A button, not a div: clicking opens the detail view, so it has to be reachable and
   operable from the keyboard. The panel carries no button chrome — the styles below
   reset it — but it keeps the semantics. */
const Panel = styled(motion.button)<{ $image?: string }>`
  appearance: none;
  border: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;

  position: relative;
  flex: 1 1 0;
  /* Without this a flex item floors at its content's intrinsic width and the panels
     refuse to compress, so the hovered one has nothing to take. */
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: ${PANEL_PAD};
  border-radius: 2px;
  transition: flex-grow ${PANEL_S} cubic-bezier(0.16, 1, 0.3, 1);

  /* Deep ink with a raking gradient, echoing the portrait column's frost. A photograph,
     when there is one, sits underneath and the scrim below grades it. */
  ${panelSkin}

  &:focus-visible {
    outline: 2px solid ${p => p.theme.accent.base};
    outline-offset: 3px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 200px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* The scrim, on its own layer so it can fade independently of the panel's own
     background — hovering lifts it and the panel steps forward. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 20%, rgba(8, 9, 12, 0.72));
    opacity: 1;
    transition: opacity ${PANEL_S} ease;
  }

  &:hover::before {
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }

  > * {
    position: relative;
  }
`;

/* The short accent rule above each eyebrow, as in the reference. It extends on hover —
   the same left-anchored reveal the rest of the page runs on. */
const PanelRule = styled.span`
  width: 24px;
  height: 2px;
  background: ${p => p.theme.accent.base};
  margin-bottom: 0.85rem;
  /* scaleX, not width: a width transition relayouts the panel on every frame, and this
     one runs while the accordion is already animating flex-grow on three panels at once.
     A plain element with no framer projection over it, so transform-origin holds — the
     rule grows rightward from its left end. 24px x 2.3333 = the 56px extended length. */
  transform-origin: left center;
  transition: transform ${PANEL_S} cubic-bezier(0.16, 1, 0.3, 1);

  ${Panel}:hover & {
    transform: scaleX(2.3333);
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

const PanelEyebrow = styled.span`
  /* Block so its margin-bottom pushes the name down in the detail caption, where it is a
     flow child rather than a flex item (in the resting panel the flex column blockifies it
     anyway, so this is a no-op there). */
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.58rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  /* Fixed light ink: this sits on the deep panel, not on the page's paper. */
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 0.5rem;
`;

const PanelName = styled.h3`
  font-family: ${p => p.theme.font.display};
  font-size: clamp(1.1rem, 1.5vw, 1.35rem);
  font-weight: 600;
  line-height: 1.2;
  color: #fff;
  margin: 0 0 0.5rem;
`;

const PanelBlurb = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 300;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.66);
  margin: 0;
  text-wrap: pretty;
`;

/* The gap the expanded panel leaves in the row. Holds the slot open so the prose below
   doesn't jump while the hero is away. */
const PanelSlot = styled.div`
  flex: 1 1 0;
  min-width: 0;
  /* Must match Panel's padding exactly. With flex-basis: 0 the padding sits OUTSIDE the
     distributed free space, so a padded button ends up 48px (1.5rem x 2) wider than an
     unpadded stand-in — the row stops being equal thirds, and the bands, whose geometry
     is a plain 100%/3, then leave a sliver of the neighbouring panel showing. */
  padding: ${PANEL_PAD};
`;

/*
 * The detail view. Clicking a panel wipes the row away under paper-coloured bands that
 * slide in from the left in sequence, and the clicked panel travels out of the row and
 * grows into the hero — a framer layoutId shared with the resting panel, the same
 * magic-move the amplify box runs on.
 *
 * Portalled to <body>, which is not optional: ProjectsSection animates clip-path and
 * settles at inset(0%), and a clip-path on ANY ancestor clips position:fixed descendants
 * — the overlay would be trapped inside the section's box. The portal also escapes
 * PageTransition's wrapper. React context crosses a portal, so framer still matches the
 * layoutId across it.
 */
/* Columns in the row — the band geometry is derived from it, so one number governs both.
   One fewer band than this actually renders: the survivor's column is spared. */
const BANDS = PROJECTS.length;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  display: flex;
  flex-direction: column;
`;

const Band = styled(motion.div)`
  position: absolute;
  top: 0;
  bottom: 0;
  /* The +1px closes the sub-pixel seams that show between three thirds of an odd width. */
  width: calc(100% / ${BANDS} + 1px);
  background: ${p => p.theme.color.surface};
`;

/* The expanded panel — the survivor grown to the whole frame. Deliberately childless while
   it animates: a layoutId that grows a 278x631 panel to an 841x631 frame is a large,
   non-uniform scale (≈0.33 in x, ≈1 in y), and framer drives that with a transform, so any
   text INSIDE the hero would be squashed horizontally for the length of the move. The
   caption is a sibling instead (see DetailCaption), and rides no transform. The dark box
   itself scales cleanly — a gradient has no proportions to distort. */
const Hero = styled(motion.div)<{ $image?: string }>`
  position: absolute;
  inset: 0;
  overflow: hidden;
  ${panelSkin}

  /* The reading scrim, so the caption stays legible once a real photograph sits here. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 35%, rgba(8, 9, 12, 0.74));
  }
`;

/* The detail copy, a SIBLING of the hero rather than a child — see Hero for why. Pinned to
   the frame's lower-left and faded in only once the hero has finished expanding, so it never
   rides the distorting scale. */
const DetailCaption = styled(motion.div)`
  position: absolute;
  z-index: 1;
  left: ${PANEL_PAD};
  right: ${PANEL_PAD};
  bottom: ${PANEL_PAD};
  max-width: 620px;
`;

const DetailName = styled.h3`
  font-family: ${p => p.theme.font.display};
  font-size: clamp(1.6rem, 3vw, 2.4rem);
  font-weight: 600;
  line-height: 1.15;
  color: #fff;
  margin: 0 0 0.75rem;
`;

const DetailText = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 300;
  font-size: clamp(1rem, 1.4vw, 1.15rem);
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.72);
  margin: 0;
  text-wrap: pretty;
`;

const CloseButton = styled(motion.button)`
  position: absolute;
  top: 1.25rem;
  right: 1.25rem;
  z-index: 3;
  appearance: none;
  border: 0;
  background: none;
  cursor: pointer;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.62rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  /* Sits on the hero, not on paper, so it takes the panel's light ink — the page's muted
     ink would be invisible against the deep fill. */
  color: rgba(255, 255, 255, 0.72);

  &:hover {
    color: #fff;
  }

  &:focus-visible {
    outline: 2px solid ${p => p.theme.accent.base};
    outline-offset: 4px;
  }
`;

const Detail: React.FC<{
  project: Project;
  index: number;
  reduced: boolean;
  onClose: () => void;
}> = ({ project, index, reduced, onClose }) => {
  const closeRef = useRef<HTMLButtonElement>(null);

  /* Not a modal, and deliberately not described as one: the detail fills the section's own
     box, so the rest of the page stays visible and usable behind nothing. aria-modal and a
     focus trap would both be claims the layout doesn't back up. It is a disclosure — the
     panels carry aria-expanded, Escape closes, and focus is moved in and handed back. */
  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* The losing columns wipe RADIATING OUTWARD from the one that was clicked: the two bands
     nearest the survivor go first and each sweeps AWAY from it, so the closing reads as
     emanating from the selection rather than marching left-to-right.
       - order  — distance from the survivor (an adjacent column is 0, the next is 1), so the
                  stagger fans out from the centre. Clicking the middle makes both bands
                  order 0 → they close symmetrically, at once.
       - fromRight — a band LEFT of the survivor enters from its right (the survivor's side)
                  and pushes left; a band on the right does the mirror. Its own entry offset
                  is also where it retreats to on close. */
  const bands = Array.from({ length: BANDS }, (_, i) => i)
    .filter(i => i !== index)
    .map(i => ({ i, order: Math.abs(i - index) - 1, fromRight: i < index }));
  const maxOrder = Math.max(0, ...bands.map(b => b.order));

  /* The click is a three-beat sequence, not one blended motion — the earlier version ran
     all three at once, so the growing hero swallowed the bands before they finished and the
     wipe never read. Now: (1) the bands sweep the losers, (2) the survivor expands, (3) the
     caption fades in. The beats OVERLAP slightly rather than abut, so it reads as one
     connected gesture. */
  const BAND_DUR = 0.42;
  const BAND_STAGGER = 0.08;
  const bandIn = (order: number) => ({ duration: BAND_DUR, ease, delay: order * BAND_STAGGER });
  const bandOut = (order: number) => ({
    duration: 0.34,
    ease,
    delay: (maxOrder - order) * 0.05,
  });

  /* When the last band's tween ends — derived, because maxOrder differs by which panel was
     clicked (0 for the middle, 1 for an edge), so a fixed hero delay would give an uneven
     gap. Measuring from WIPE_END keeps the timing identical for every panel. */
  const WIPE_END = maxOrder * BAND_STAGGER + BAND_DUR;
  /* The expansion LEADS the wipe's end by this much — it begins a touch before the last band
     fully settles, overlapping the two beats. Safe despite the earlier "hero hides the wipe"
     problem: the survivor grows from its OWN column outward and only reaches the outer band
     columns late in its travel, by which point those bands have long landed. */
  const EXPAND_LEAD = 0.12;
  const EXPAND_DELAY = Math.max(0, WIPE_END - EXPAND_LEAD);
  const heroIn = { duration: 0.55, ease, delay: EXPAND_DELAY };
  /* After the hero has essentially finished growing. */
  const captionIn = { duration: 0.35, ease, delay: EXPAND_DELAY + 0.5 };

  return (
    <Overlay role="group" aria-label={`${project.name} — details`}>
      {/* Only the LOSERS are wiped. The clicked panel has left the row and its slot is an
          empty PanelSlot, so that third of the frame already shows bare page paper — a band
          there would sweep across the very column that is supposed to survive. Each band
          covers the column it replaces, radiating out from the survivor (see `bands`). */}
      {bands.map(({ i, order, fromRight }) => {
        const off = fromRight ? '100%' : '-100%';
        return (
          <Band
            key={i}
            aria-hidden
            style={{ left: `calc(${i} * 100% / ${BANDS})` }}
            initial={reduced ? false : { x: off }}
            animate={{ x: 0, transition: bandIn(order) }}
            exit={reduced ? undefined : { x: off, transition: bandOut(order) }}
          />
        );
      })}

      <Hero
        $image={project.image}
        /* Same id as the resting panel, which is unmounted for this index while the detail
           is open — one element in flight, so framer moves it rather than cross-fading two.
           The delay in heroIn is what holds it at panel size until the bands have swept. */
        layoutId={reduced ? undefined : `project-panel-${index}`}
        transition={reduced ? { duration: 0 } : heroIn}
      />

      <DetailCaption
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: reduced ? { duration: 0 } : captionIn }}
        exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
      >
        <PanelEyebrow>
          {project.kind} / {project.year}
        </PanelEyebrow>
        <DetailName>{project.name}</DetailName>
        <DetailText>{project.detail ?? project.blurb}</DetailText>
      </DetailCaption>

      <CloseButton
        ref={closeRef}
        onClick={onClose}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1, transition: reduced ? { duration: 0 } : captionIn }}
        exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
      >
        Close
      </CloseButton>
    </Overlay>
  );
};

const Projects: React.FC<{ reduced: boolean }> = ({ reduced }) => {
  const [open, setOpen] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  /* Focus went into the overlay on open, so it has to come back to the panel that sent it
     there — otherwise closing drops it on <body> and the keyboard loses its place.
     Deferred to an effect, NOT called alongside setOpen: at that moment the panel for this
     index is still unmounted and its ref callback has already written null, so a synchronous
     focus() lands on nothing. The effect runs after the commit that puts the panel back. */
  const restoreTo = useRef<number | null>(null);

  const close = () => {
    restoreTo.current = open;
    setOpen(null);
  };

  useEffect(() => {
    if (open !== null || restoreTo.current === null) return;
    triggers.current[restoreTo.current]?.focus();
    restoreTo.current = null;
  }, [open]);

  return (
    <ProjectsSection
      /* Picks up the paragraphs' entrance so the section belongs to the page rather than
         arriving as a separate block. Delayed past the last Graf. */
      initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)' }}
      animate={{ clipPath: 'inset(0 0% 0 0)' }}
      transition={{ duration: 1.1, delay: 0.2 + PARAGRAPHS.length * 0.18, ease }}
    >
      <SectionLabel>Selected side projects</SectionLabel>
      <RowFrame>
      <PanelRow>
        {PROJECTS.map((p, i) =>
          /* The open panel leaves the row entirely rather than hiding: its layoutId has to
             belong to exactly one mounted element, or framer cross-fades a pair instead of
             flying one. PanelSlot holds its share of the row so nothing reflows. */
          open === i ? (
            <PanelSlot key={p.name} aria-hidden />
          ) : (
            <Panel
              key={p.name}
              ref={(el: HTMLButtonElement | null) => {
                triggers.current[i] = el;
              }}
              $image={p.image}
              layoutId={reduced ? undefined : `project-panel-${i}`}
              transition={{ duration: 0.6, ease }}
              onClick={() => setOpen(i)}
              aria-expanded={false}
            >
              <PanelRule aria-hidden />
              <PanelEyebrow>
                {p.kind} / {p.year}
              </PanelEyebrow>
              <PanelName>{p.name}</PanelName>
              <PanelBlurb>{p.blurb}</PanelBlurb>
            </Panel>
          ),
        )}
      </PanelRow>

        <AnimatePresence>
          {open !== null && (
            <Detail
              key="detail"
              project={PROJECTS[open]}
              index={open}
              reduced={reduced}
              onClose={close}
            />
          )}
        </AnimatePresence>
      </RowFrame>
    </ProjectsSection>
  );
};

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const About: React.FC = () => {
  const reduced = useReducedMotion();
  /* Stencil geometry for the wordmark, derived from Anton's measured ink bounds (canvas
     measureText actualBoundingBox*). textLength normalises the ADVANCE width, which keeps
     the glyphs' side bearings — visible as edge gaps. Solving against ink instead makes
     the painted pixels span exactly the 300px image width, and sizes the tallest ink (the
     d ascender) to fill the 48px pre-scale box. Defaults approximate Anton until it loads. */
  const [stencil, setStencil] = useState({ x: 0, fontSize: 76, textLength: 300 });

  useEffect(() => {
    let cancelled = false;
    document.fonts.load('100px Anton').then(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      if (cancelled || !ctx) return;
      ctx.font = '100px Anton';
      const m = ctx.measureText('readme');
      const inkLeft = -m.actualBoundingBoxLeft;
      const inkRight = m.actualBoundingBoxRight;
      const fontSize = 100 * (48 / m.actualBoundingBoxAscent);
      const s = fontSize / 100;
      const k = 300 / ((inkRight - inkLeft) * s);
      setStencil({ x: -inkLeft * s * k, fontSize, textLength: m.width * s * k });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <PageTransition>
      <Page>
        <ColumnGroup
          initial={reduced ? false : { x: '-100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 0.85, ease, delay: 0.05 }}
        >
        <Portrait>
          {/* Rides the frame's slide, then settles from larger DOWN to its original size —
              oversized it always covers the frame, so no paper gaps show mid-zoom. */}
          <motion.div
            className="img"
            initial={reduced ? false : { scale: 1.12 }}
            animate={{ scale: 1 }}
            transition={{ duration: 1.2, ease, delay: 0.35 }}
          />
        </Portrait>
        {/* Opens once frame and image have landed. Width grows from the left edge, and the
            background is anchored to that edge, so the window wipes across a still picture. */}
        <Peek
          aria-hidden
          initial={reduced ? false : { width: 0, opacity: 0 }}
          animate={{ width: 180, opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.6, opacity: { duration: 0.1, delay: 0.6 } }}
        />
        <Masthead aria-hidden>
          <span className="bw" />
          {/* The letterform stencil. userSpaceOnUse = the Masthead div's own pixel grid:
              y=48 doubled by scale(1,2) puts the baseline at 96 (the div's bottom edge);
              x/fontSize/textLength come from the ink measurement above, so the word's
              painted pixels span exactly the image width. Anton has one weight (400). */}
          <svg width="0" height="0" focusable="false">
            <defs>
              <clipPath id="readme-clip" clipPathUnits="userSpaceOnUse">
                <text
                  x={stencil.x}
                  y="48"
                  transform="scale(1,2)"
                  textLength={stencil.textLength}
                  lengthAdjust="spacingAndGlyphs"
                  fontFamily="Anton"
                  fontSize={stencil.fontSize}
                >
                  readme
                </text>
              </clipPath>
            </defs>
          </svg>
        </Masthead>
        </ColumnGroup>
        <Content>
          <Track>
          <Column>
            {PARAGRAPHS.map((para, i) => (
              <Graf
                key={i}
                /* The wipe is driven by the RIGHT inset (100% → −0.4em); the other three sides
                   settle to −0.4em, expanding the clip PAST the border box so it never crops a
                   hover treatment that overhangs the paragraph edge — the Amplify box on a
                   first-word-on-line. Negative insets grow the clip rect outward. */
                initial={reduced ? false : { clipPath: 'inset(-0.4em 100% -0.4em -0.4em)' }}
                animate={{ clipPath: 'inset(-0.4em -0.4em -0.4em -0.4em)' }}
                transition={{ duration: 1.1, delay: 0.2 + i * 0.18, ease }}
              >
                {para}
              </Graf>
            ))}
          </Column>
          <Projects reduced={!!reduced} />
          </Track>
        </Content>
      </Page>
    </PageTransition>
  );
};

export default About;
