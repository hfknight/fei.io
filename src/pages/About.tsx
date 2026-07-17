import { useEffect, useState } from 'react';
import styled from 'styled-components';
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
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: grid;
  grid-template-columns: 340px 1fr;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
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

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 3.5rem 1.75rem 4rem;
  }
`;

const Column = styled.div`
  max-width: 620px;
  width: 100%;
`;

const Graf = styled(motion.p)`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  line-height: 1.6;
  color: ${p => p.theme.color.ink};
  margin: 0 0 2.5rem;
  font-weight: 200;

  &:last-child {
    margin-bottom: 0;
  }
`;

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const About: React.FC = () => {
  const reduced = useReducedMotion();
  const [content, setContent] = useState<string[]>([]);
  /* Stencil geometry for the wordmark, derived from Anton's measured ink bounds (canvas
     measureText actualBoundingBox*). textLength normalises the ADVANCE width, which keeps
     the glyphs' side bearings — visible as edge gaps. Solving against ink instead makes
     the painted pixels span exactly the 300px image width, and sizes the tallest ink (the
     d ascender) to fill the 48px pre-scale box. Defaults approximate Anton until it loads. */
  const [stencil, setStencil] = useState({ x: 0, fontSize: 76, textLength: 300 });

  useEffect(() => {
    fetch('/data/portfolio.json')
      .then(r => r.json())
      .then(data => setContent(data.about?.content ?? []));
  }, []);

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
            {content.map((para, i) => (
              <Graf
                key={i}
                initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)' }}
                animate={{ clipPath: 'inset(0 0% 0 0)' }}
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
