import { Fragment, useEffect, useRef, useState } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
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
  padding: 7rem 2rem 5rem;
  display: flex;
  justify-content: center;
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

const Column = styled.div`
  max-width: 680px;
  width: 100%;
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
   light text), and sliding to the next term slides the box across — one box, three homes,
   via a shared framer layoutId (the tab-indicator "magic move"). They're the closing triad,
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

const Amplify: React.FC = () => {
  const reduced = useReducedMotion();
  const [active, setActive] = useState<number | null>(null);
  return (
    <span onMouseLeave={() => setActive(null)}>
      {AMPLIFY.map((word, i) => (
        <Fragment key={word}>
          {i > 0 && (i === AMPLIFY.length - 1 ? ', and ' : ', ')}
          <AmplifyTerm $active={active === i} onMouseEnter={() => setActive(i)}>
            {active === i && (
              <AmplifyBox
                aria-hidden
                layoutId={reduced ? undefined : 'amplify-box'}
                transition={{ duration: 0.32, ease: ease }}
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
    platforms, including work for Am Law 100 <RankClimb /> firms. Clean code, solid
    architecture, delivered on time.
  </>,
  <>
    AI made the mechanical parts of coding faster than ever. I lean into that. More
    time for architecture, system design, and the decisions that actually move a product
    forward. Today I'm building products on top of AI: RAG with reranking, multi-model
    orchestration with routing and fallback, structured generation in production. What
    sets the direction? <Amplify />. AI amplifies those. It doesn't replace them.
  </>,
];

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
        </Content>
      </Page>
    </PageTransition>
  );
};

export default About;
