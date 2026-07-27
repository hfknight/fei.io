import { Fragment, useEffect, useRef, useState } from 'react';
import styled, { createGlobalStyle, css, keyframes } from 'styled-components';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown } from 'lucide-react';
import PageTransition from '../components/PageTransition';
/* Plain import = the file URL (svgr components need ?react); the ascii sampler rasterises it.
   The feather, because it IS the site's mark — the loader and the home lockup both draw this
   exact geometry. Only its alpha is used; the file's orange fills are discarded (see
   AsciiPortrait), so the mark arrives in the page's own ink. */
import featherUrl from '../assets/fei-feather.svg';

/* ── The band, and what it costs the frame ─────────────────────────────────────────────────
   The end of the scroll shows two things stacked: the fitted ascii portrait in a band under
   the header, and the projects frame below it. Only one of them can be the free variable.

   It used to be the band: the frame was a fixed 16:10, so it grew with the viewport WIDTH
   (frame width is the content track, which is 100vw minus the rail and two insets) and the
   band got whatever height was left over. That runs out — at 1920x1080 the frame alone is
   977px of a 1080px viewport, leaving the band 23px, and the mark was scaled down to the
   0.08 floor, which is to say it disappeared on exactly the screens with the most room.

   Now it is the frame. The mark is fixed at MARK_W px wide, the band is that block plus its
   air, and the frame takes the rest of the viewport — at whatever ratio that arithmetic
   gives. The frame is a REMAINDER, not a shape.

   Width is the dial rather than height because the feather is tall and narrow: its block
   runs ~2.5x as tall as it is wide, so width is both the smaller number and the one that
   says whether the mark reads at a glance. The ink lands a few percent inside the block. */
const MARK_W = 100;

/* Mirrors of layout the fit effect cannot read from CSS: the header clearance the band must
   stay below, and the breathing room kept above and below the block inside it. */
const BAND_TOP = 80;
const FIT_PAD = 24;

/* The band's ceiling, as a share of the viewport. The fixed mark is sized for the screens
   that were losing it; on a short one the same block would leave the frame a letterbox slot,
   so past this point the MARK gives way instead of the frame. */
const BAND_MAX_VH = 0.36;

/* The two ends of the leading ramp (see --lh on Page). Named because the fit effect has to set
   --lh ITSELF when it measures the fitted block, not just --lh-t: --lh is substituted where it
   is declared, on Page, so an --lh-t forced further down the tree arrives too late to change
   it and the block measures a full reading leading too tall. */
const LH_REST = 1.6;
const LH_TIGHT = 1.18;

/* The declared --band-h, standing in for the first frames before the fit effect measures the
   real one — see --band-h on Page for why it has to be close. MARK_W times the fitted block's
   height-to-width proportion, plus its air. The 2.5 is an EYEBALL of that proportion, not a
   derivation: the real one is font-driven (718/290 = 2.48 at the reading sizes as of writing)
   and moves with the type, which is exactly why the effect measures it. Two pixels out today. */
const BAND_H_FALLBACK = Math.round(MARK_W * 2.5 + 2 * FIT_PAD);

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
  /* The portrait column's width and Content's inline padding, declared once: the projects
     box breaks OUT of the content column to full viewport width by subtracting exactly
     these two, so a literal in either place would silently misalign the bleed. */
  --rail: 340px;
  --content-pad: 2rem;
  /* The strip of the first screen the section cue (label + chevron) occupies. The prose
     stage takes the rest, so cue + stage = one exact viewport. */
  --cue-h: 3.25rem;
  /* Gap between panels in the row. */
  --panel-gap: 4px;

  /* The frame's inline insets, and they are NOT symmetric on purpose.

     Right lands the frame's edge on the nav links' right edge: Header's bar padding
     (theme.space[3]) plus the nav list's own 0.25rem TRACK_PAD, which together are where the
     last link's box actually ends. Both are Header's numbers; the 0.25rem is duplicated here
     because TRACK_PAD is a module-local const in Header.tsx, not an exported token — if that
     inset changes, this has to follow.

     Left is deliberately much wider, to open air between the frame and the portrait column.
     (It used to double as the frame's height dial — while the ratio was fixed, the only way to
     bring the height down was to take width away. The frame takes its height from the viewport
     now, so this inset only does the one job.) */
  --frame-right: calc(${p => p.theme.space[3]} + 0.25rem);
  --frame-left: 6rem;

  /* The strip the finished ascii portrait sits in, measured and written by LogoReveal's fit
     effect — the frame below takes what it leaves (see RowFrame). This declared value only
     covers the frames before that effect first runs, so it is kept CLOSE rather than round:
     the frame's height, and therefore the document's scroll range and --p's denominator, are
     derived from it, and a wrong value would resize the page under the reader on load. */
  --band-h: ${BAND_H_FALLBACK}px;
  /* The prose→ascii morph, staged as FOUR overlapping beats rather than one crossfade. A
     single dissolve read as a jolt for a structural reason: the readme is four ragged blocks
     of proportional type, the portrait is one flush grid of monospace with the mark already
     formed in it — nothing about the two shapes rhymes, so no amount of fade time hides the
     substitution. Each beat below removes one of those differences BEFORE the swap, so what
     finally crossfades is two things that already look alike:

       1. --collapse-t  the paragraph gaps close, so four blocks become one solid rectangle
       2. --swap        that rectangle crossfades to the grid — which at this point is a flat
                        field of UNIFORM ink, not a feather: a block of text handing over to a
                        block of text
       3. --emerge-t    only now does the mark surface, each cell's ink grading from the flat
                        field value out to its own coverage step
       4.               the whole unit keeps shrinking to its fitted end (see SwapUnit)

     Beat 3 is the one that matters most: the feather used to ARRIVE fully formed the instant
     the ascii faded up, which is what read as abrupt. Now it develops out of the field.
     The ramps deliberately OVERLAP — emerge starts before the crossfade has finished, so the
     mark is already surfacing as the grid lands. */
  --swap: 0.42;
  --swap-run: 0.12;
  --collapse-t: clamp(0, calc((var(--p, 0) - 0.05) / 0.25), 1);
  --lh-t: clamp(0, calc((var(--p, 0) - 0.05) / 0.30), 1);
  /* The measure narrowing. This is the beat that makes the mark legible at all: the raster
     can only have as many rows as the readme has LINES, and at its reading measure that is
     14 — far too coarse for a feather. Narrowing the column reflows the same words into ~30
     shorter lines, which doubles the vertical resolution AND pulls the block toward the
     mark's own tall-narrow proportion, so the feather ends up filling it instead of sitting
     in it. The text does reflow on each frame of this, which is why it is a short window and
     why the grid — the expensive DOM — does not exist yet while it runs. */
  --narrow-t: clamp(0, calc((var(--p, 0) - 0.04) / 0.28), 1);
  --emerge-t: clamp(0, calc((var(--p, 0) - 0.50) / 0.34), 1);
  /* The leading, shared by the prose and the grid so the two stay dimensionally locked (see
     AsciiPre). It tightens as the page zooms out — the block condenses toward the solid slab
     the mark is read out of, rather than staying at reading leading while everything else
     shrinks around it. */
  --lh: calc(${LH_REST} - ${LH_REST - LH_TIGHT} * var(--lh-t, 0));
  /* The DOCUMENT scrolls, and the portrait column is pinned with sticky (see ColumnGroup).
     It used to be the reverse — a fixed 100dvh page with a private scroll region inside
     Content — but a scroll container cannot let a child escape it horizontally
     (overflow-y: auto forces overflow-x to compute to auto, so hidden is the only way to
     suppress the scrollbar, and that clips), and the projects band has to bleed to the full
     viewport width, over this very column. Document scroll has no such conflict:
     html already carries overflow-x: hidden globally. */
  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: grid;
  grid-template-columns: var(--rail) 1fr;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr;
    /* The morph is desktop-only, but the scroll listener still writes --p here — so EVERY beat
       has to be pinned off explicitly or it leaks onto a phone, where the page is plain flow
       and nothing is transforming. Two of these were caught leaking in testing: the paragraph
       gaps closing, and the leading tightening as you scrolled a phone. */
    --collapse-t: 0;
    --lh-t: 0;
    --narrow-t: 0;
    --emerge-t: 1;
  }
`;

/* #root carries `overflow-x: hidden` globally (index.css), which makes it a scroll container —
   and therefore the nearest scrolling ancestor of everything on the page. A position: sticky
   element resolves against that ancestor, #root never scrolls (it has no fixed height), so
   every sticky inside it is silently inert: it simply scrolls away with the document. This
   page pins two things that way (the portrait column and the prose stage), so the clip has to
   be lifted, and it is lifted only while this route is mounted. Nothing is lost: html carries
   the same overflow-x: hidden in GlobalStyles, so the horizontal clip that keeps the projects
   band's 100vw bleed from producing a scrollbar is still in force one level up. */
const UnclipRoot = createGlobalStyle`
  #root {
    overflow-x: visible;
    max-width: none;
  }

  /* TWO STATES, no resting place between them: the readme at the top, and the projects frame
     fully up. A scroll down — however small the gesture — carries you all the way to the
     frame; a scroll up carries you back. Mandatory snapping on the document, with exactly two
     snap points declared (Content's start, ProjectsSection's end), so there is nothing to land
     on in between.

     The morph is not skipped by this: the browser animates the snap, scroll events fire the
     whole way, and --p follows them — so one flick plays the entire zoom-out, merge and reveal
     rather than requiring the user to meter it out by hand.

     Snapping is declared on html because the DOCUMENT is the scroll container here (see Page).
     It is scoped to this route by createGlobalStyle's mount, like the clip lift above. */
  html {
    scroll-snap-type: y mandatory;
  }

  /* Off wherever the two-state model does not hold: mobile stacks the page into ordinary flow
     with far more than two screens of content, and under reduced motion the morph is disabled
     and the stage is unpinned, so snapping would only skip past the readme. */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    html {
      scroll-snap-type: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-snap-type: none;
    }
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
  /* ColumnGroup owns the pin now (see there); this is just the frame inside it. */
  position: relative;
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
  /* The pin. The WHOLE composition sticks as one — portrait, wordmark and Peek together —
     because Masthead and Peek are absolutely positioned against this box at fixed offsets;
     pinning only the portrait (as it was, before the page itself stopped scrolling) would
     let the wordmark slide off it. align-self: start is required: a stretched grid item is
     as tall as the row, and a sticky element with no slack in its containing block never
     moves. A transform on a sticky element is harmless — unlike position: fixed, sticky's
     reference is the scroll container, not the transformed ancestor. */
  position: sticky;
  top: 0;
  height: 100dvh;
  align-self: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    position: relative;
    height: auto;
  }
`;

const Content = styled.div`
  /* No vertical padding: Stage is sized to an exact viewport minus the cue strip, so any
     top pad would push the first screen past 100dvh and put the box's stop off by that much.
     The stage centres the prose instead, which is what the pad used to buy. */
  padding: 0 var(--content-pad);
  /* Lets the grid track shrink rather than forcing a horizontal page overflow. No overflow
     of its own: this must NOT be a scroll container, or it would clip the projects band's
     bleed (see Page). */
  min-width: 0;
  /* The top snap point (see UnclipRoot). Declared here rather than on Stage, which is sticky:
     a sticky element's snap area travels with it as it sticks, so the browser keeps
     re-resolving the target and the scroll fights itself. Content does not move. */
  scroll-snap-align: start;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    --content-pad: 1.75rem;
    padding: 3.5rem var(--content-pad) 4rem;
  }
`;

/* The first screen: the readme prose, held for exactly one viewport minus the cue strip.
   Sticky, so it stays put while the projects box rolls up beneath it under plain native
   scroll — there is no pinning script, and the box's "stop" is simply the scroll end. */
const Stage = styled.div`
  position: sticky;
  top: 0;
  /* A FULL viewport, so the prose centres on the viewport's centre line. It used to be
     100dvh − --cue-h, which centred it on the stage instead and left it sitting half a cue
     strip (26px) high. The cue still shows at rest without taking height from here: the
     projects section is pulled back up over this box's last --cue-h instead (see there). */
  height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    position: static;
    height: auto;
    display: block;
  }

  /* The static equivalent, and it has to be this rather than "the same layout without the
     tween": --p is never written under reduced motion, so the prose would stay full size in
     the middle of the stage and the rising box would simply cover it — a worse outcome than
     no effect at all. Dropping the pin puts the whole page back in plain flow, prose above
     box, nothing overlapping and nothing moving. */
  @media (prefers-reduced-motion: reduce) {
    position: static;
    height: auto;
    display: block;
    padding: 5rem 0;
  }
`;

/* How much the reading measure gives up on the way down (see --narrow-t on Page). 640 − 350
   leaves ~290px, about 29 characters a line, which reflows the readme into ~30 lines. */
const MEASURE_NARROW = 350;

/* Where the paragraphs stop being paragraphs and become one continuous flow (see Graf).
   Deliberately INSIDE the narrowing window (--narrow-t, 0.04 → 0.32): merging reflows the
   text, and during narrowing the text is reflowing on every frame anyway, so the one extra
   reflow is indistinguishable from the ones already happening. Merge before or after that
   window and it reads as a jump. */
const MERGE_AT = 0.15;

/* The moving object of the prose→ascii swap: Column (the readme) and AsciiPortrait ride in
   here together, so the rise-and-shrink is ONE trajectory and the crossfade happens between
   two things travelling as one — not a moving thing and a parked one.

   The trajectory ends FITTED, not centred: at p=1 the unit's centre has travelled to the
   middle of the free band above the risen frame (BAND_TOP down to the cue's final top), and
   its scale has come down far enough that the ascii portrait's full height sits inside that
   band. Both end values depend on real layout (viewport height, the frame's 16:10 height),
   so they are measured and written as --fit-dy / --fit-scale by AsciiPortrait's fit effect
   rather than derived in CSS — calc() cannot divide a length by a length to make a scale.
   The var() fallbacks only cover the beat before that effect first runs.

   Scale and translate are LINEAR in --p on purpose: scroll position is the easing. */
const SwapUnit = styled.div`
  position: relative;
  width: 100%;
  transform: translateY(calc(var(--p, 0) * var(--fit-dy, -18vh)))
    scale(calc(1 + var(--p, 0) * (var(--fit-scale, 0.4) - 1)));
  will-change: transform;

  /* Mobile stacks the page in plain flow — but the scroll listener still writes --p there,
     so the transform must be explicitly off, exactly like Column's. */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    transform: none;
  }
`;

const Column = styled.div`
  /* Centred in the stage. This reverses an earlier call — the column used to be flush-left so
     the prose, the section label and the projects row shared one left rail — but the prose is
     now the whole first screen, and centred is what a lone screen of type wants.

     640px, chosen against the copy rather than as a round number. The greeting sets to 611px on
     one line at Graf's 20.8px, and it has to stay unbroken — but 620 left only 9px of slack,
     thin enough that a font fallback or a nudge to the size clamp would wrap it. 640 gives 29px
     (~5%), enough to absorb metric differences, and lands at ~65 characters a line — the middle
     of the 45–75 measure, where 680 sat at ~69. The narrowest SAFE width rather than the
     narrowest possible one. Check the greeting if the face, weight or clamp ever moves. */
  max-width: calc(640px - ${MEASURE_NARROW}px * var(--narrow-t, 0));
  width: 100%;
  /* Belt and braces with the stage's justify-content: the stage drops to display: block in
     the reduced-motion and mobile fallbacks, where only the auto margins centre this. */
  margin-inline: auto;
  /* So AmplifyGroup can drop its nowrap once the measure is too narrow to hold the phrase —
     a viewport media query cannot see this, because it is the COLUMN that is shrinking. */
  container-type: inline-size;
  /* The zoom-out, front half of the prose→ascii swap (see --swap on Page). --p is the 0→1
     scroll progress written on Page by the scroll listener in About.

     There is deliberately NO transform of its own. An extra shrink used to live here, and it
     was the bug behind the double-image: it made the prose smaller than the grid replacing it,
     so the two boxes were different sizes mid-fade and the eye saw two things at once instead
     of one. Both sides now ride SwapUnit's single scale and nothing else, so they are the same
     size at every frame of the crossfade.

     opacity only — nothing here reflows, and no framer layout projection is involved. */
  /* Ramp CENTRED on --swap (half a run each side), overlapping the ascii's mirror ramp — the
     two must cross at 50/50, not meet at zero: ramps that ABUT at the swap point leave a beat
     where both sides are invisible and the screen blinks empty mid-gesture. */
  opacity: clamp(0, calc((var(--swap) + var(--swap-run) / 2 - var(--p, 0)) / var(--swap-run)), 1);
  will-change: opacity;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: none;
    opacity: 1;
  }
`;

const Graf = styled(motion.p)`
  font-family: ${p => p.theme.font.body};
  /* Reading scale for a 680px measure: tops at 1.3rem (~63 chars/line, the classic
     measure), floors at 18px on small viewports. The old clamp(1.25rem, 2.5vw, 1.5rem)
     hit 24px on desktop and read as display type; a flat 1rem (the lab's utilitarian
     empty-state size) read as UI copy. This sits between, still long-form. */
  font-size: clamp(1.125rem, 1.6vw, 1.3rem);
  /* Shared with the grid, and tightening on scroll — see --lh on Page. */
  line-height: var(--lh, 1.6);
  color: ${p => p.theme.color.ink};
  /* Deliberately OFF the baseline rhythm. This was 1.6em — exactly one line-height, so a
     paragraph gap read as one full blank line — which spaced four paragraphs on a single screen
     further apart than they wanted.

     What matters is the WHITE, not the margin: at 20.8px inside a 33.28px line-height, lines
     already carry ~12.5px of visible space between them. 1rem put paragraphs at ~28px of white
     — only 2.3x the line gap, which read as one dense block with the breaks barely landing.
     1.5rem gives ~36px, a clear 3x, while still sitting well under the old 1.6em's ~46px.

     The gap CLOSES on scroll (--collapse-t, beat 1 of the morph on Page): by the time the
     crossfade starts the four paragraphs have become one solid rectangle, which is the shape
     the ascii grid is. This is a visual collapse, not a DOM one — genuinely re-parenting the
     runs into a single <p> mid-scroll would reflow the whole column and tear out the hover
     machinery (the dim, the shimmer, the odometer, the travelling box) that lives on these
     elements. Closing the gaps alone still leaves each paragraph starting a new line, though —
     see the merge below, which finishes the job. */
  margin: 0 0 calc(1.5rem * (1 - var(--collapse-t, 0)));
  /* 300, not 200: ExtraLight strokes go hairline under antialiased smoothing on the
     light paper — contrast passes but the strokes don't render. Light keeps the air. */
  font-weight: 300;
  text-wrap: pretty;

  &:last-child {
    margin-bottom: 0;
  }

  /* THE MERGE. Closing the gaps made the paragraphs adjacent, but they were still four blocks,
     so each one kept starting its own line and left a short line above it — the ragged notches
     that show up as gaps in the mark. Going inline drops them into one continuous flow, which
     is what the reveal wants: a solid slab of words.

     A discrete switch, not a tween — display cannot interpolate — driven by a data attribute
     the scroll listener toggles at MERGE_AT rather than by a --var, for the same reason. It is
     placed inside the narrowing window so its reflow hides among the ones already running.

     The ::after restores the space between the runs; without it the last word of one paragraph
     welds to the first word of the next. */
  [data-merged] & {
    display: inline;
    /* The entrance wipe has to GO here, not just finish. framer leaves its clip-path on the
       element as an inline style, and clip-path on a multi-line INLINE box resolves against a
       reference box that is no longer the run's own — the paragraphs render clipped to their
       opening fragment and most of the readme vanishes. !important because it is overriding
       an inline style. Safe: by MERGE_AT the entrance is long finished, and the wipe has
       nothing left to do during the morph. */
    clip-path: none !important;

    /* Break words. At the narrowed measure a run of long words leaves a ragged right edge, and
       every notch of that whitespace is a hole in the mark — the reveal wants a solid slab, not
       a paragraph. break-all rather than overflow-wrap: anywhere, which only breaks to avoid
       overflow and still prefers spaces, so the raggedness survives it. Legitimate here and
       nowhere else on the page: by this point the copy is being read as an image, not as
       language. text-wrap goes back to auto because pretty spends its effort balancing the
       last lines of a paragraph, which is exactly the raggedness being removed. */
    word-break: break-all;
    text-wrap: auto;
  }

  /* break-all cannot get inside an inline-BLOCK: those are atomic, so RankWrap's odometer and
     each AmplifyTerm stay whole and push a short line wherever they fall — three notches in the
     mark, in the middle of the block. Flattening them to inline lets the break run through.
     Marked with an attribute rather than referenced by component, because both are declared
     below Graf and a styled-components interpolation cannot reach forward. Safe in this state:
     what inline-block buys them is the travelling highlight box and the rolling digit window,
     and neither can be hovered once the readme has become texture. */
  [data-merged] & [data-atomic] {
    display: inline;
  }
  [data-merged] &::after {
    content: ' ';
  }

  /* Never on mobile: the page is plain flow there and the readme stays four paragraphs, but
     the scroll listener still writes the attribute. */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    [data-merged] & {
      display: block;
      word-break: normal;
      text-wrap: pretty;
    }
    [data-merged] &::after {
      content: none;
    }
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
      {/* data-atomic: an inline-block the merged reveal has to flatten — see Graf. */}
      <RankWrap ref={wrapRef} data-atomic>
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

/* The triad is one phrase, so it is kept on one line: a break between "and" and "domain
   expertise" reads as a stumble, and it also splits the travelling highlight's runway across
   two lines, where the box's slide from one term to the next has to jump a row.

   Only above md. The run sets to ~447px; the stacked mobile column is ~319px, and there nowrap
   would push the phrase off the side of the page instead of wrapping it — a much worse failure
   than the one it prevents. */
const AmplifyGroup = styled.span`
  white-space: normal;

  /* Held on one line only while the measure can actually hold the ~447px phrase. A CONTAINER
     query, not a viewport one: the column narrows on scroll (--narrow-t), and a nowrap run
     wider than its own column does not wrap — it overhangs the block, which would break the
     very rectangle the crossfade depends on. */
  @container (min-width: 560px) {
    white-space: nowrap;
  }
`;

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
    <AmplifyGroup onMouseLeave={() => setActive(null)}>
      {AMPLIFY.map((word, i) => (
        <Fragment key={word}>
          {i > 0 && (i === AMPLIFY.length - 1 ? ', and ' : ', ')}
          {/* data-atomic: an inline-block the merged reveal has to flatten — see Graf. */}
          <AmplifyTerm data-atomic $active={active === i} onMouseEnter={() => enter(i)}>
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
    </AmplifyGroup>
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
    <span data-plain>Howdy! I'm Fei Hu. Full-stack engineer with a designer's touch.</span>
  </>,
  <>
    <span data-plain>My bar is clear.</span>{' '}
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
 * The logo reveal — back half of the morph (see --swap on Page). Once the zoom-out has
 * crushed the readme below legibility, the SAME WORDS take on the mark: each character is
 * tinted by the feather pixel behind it, so the text stops being read as language and starts
 * being read as picture.
 *
 * It is a CLONE OF THE README, not a generated grid, and that is the whole trick. Two earlier
 * versions built a monospace grid and tried to make it line up with the prose — first by
 * guessing its size, then by measuring the prose and matching the rectangle exactly. Both
 * double-imaged, because matching the BOX is not enough: the prose is proportional Inter with
 * word spaces and ragged line ends, a grid is solid monospace, and two blocks of the same
 * words at different rhythms read as two blocks. Cloning removes the problem instead of
 * managing it — same face, same metrics, same word spacing, same line breaks, same ragged
 * edges, because it is the same DOM. The crossfade has nothing left to give away.
 *
 * cloneNode also means the clone can be mangled freely: every text node is exploded into
 * one span per character (spaces stay bare text, so the wrapping opportunities — and
 * therefore the line breaks — are untouched), which would be far too invasive to do to the
 * live prose, where the hover machinery lives.
 *
 * Sampling is per character rather than per cell: each span's own centre is mapped into the
 * feather's contained rect and its alpha becomes the character's ink step. So the mark's
 * resolution is the readme's own line count and character spacing — which is why the measure
 * narrows first (--narrow-t), buying ~30 lines instead of 14.
 *
 * MONOCHROME, dark on the page's own paper: only the mark's ALPHA is sampled — the SVG's
 * orange fills are discarded. (An inverted treatment — light mark on a dark panel — was tried
 * and dropped: the panel read as a foreign card dropped onto the paper.)
 */
/* Ink ladder. Index 0 is the field around the mark, present but only just. Nine steps because
   the reveal is coarse — one sample per character — and the gradation does the work the
   resolution cannot. */
const ASCII_LEVELS = [7, 15, 25, 36, 48, 61, 75, 88, 100];
/* Where every character starts, before the mark surfaces: one flat value across the whole
   block, so the clone arrives as an undifferentiated field of type and the feather has
   somewhere to emerge FROM. */
const ASCII_FLAT = 62;
/* Resolution of the offscreen feather the characters are sampled against. Generous — it costs
   one canvas at mount, and it is sampled at arbitrary sub-character positions. */
const LOGO_RASTER_H = 660;

const RevealLayer = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  /* The mirror of Column's ramp, centred on --swap like it, so the two cross at 50/50 rather
     than both passing through zero (see Column). */
  opacity: clamp(0, calc((var(--p, 0) - (var(--swap) - var(--swap-run) / 2)) / var(--swap-run)), 1);
  will-change: opacity;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }

  /* The clone carries the readme's own styled-components classes — which is what makes it lay
     out identically, but also means it inherits Column's FADE-OUT ramp. Left alone the clone
     dies exactly as this layer brings it in, and the reveal never appears at all. Its opacity
     has to be pinned so the ramp above is the only one in play. */
  > * {
    opacity: 1 !important;
  }

  /* Everything flattens to the flat ink (the per-character rules below then lift the mark out
     of it). !important because no descendant may keep its own colour — AmplifyTerm sets one,
     and it would otherwise survive as a dark bar across the reveal. */
  * {
    color: color-mix(in srgb, ${p => p.theme.color.ink} ${ASCII_FLAT}%, transparent) !important;
  }

  ${ASCII_LEVELS.map((mix, i) => {
    const d = mix - ASCII_FLAT;
    return css`
      span[data-l='${i}'] {
        color: color-mix(
          in srgb,
          ${p => p.theme.color.ink}
            calc(${ASCII_FLAT}% ${d < 0 ? '-' : '+'} ${Math.abs(d)}% * var(--emerge-t, 1)),
          transparent
        ) !important;
      }
    `;
  })}
`;

/* Explode every text node into one span per character. Spaces are left as bare text: they are
   the line-break opportunities, and wrapping them would not change the breaks but would double
   the node count for nothing. Returns the spans in document order. */
const splitIntoChars = (root: HTMLElement): HTMLSpanElement[] => {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const texts: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) texts.push(n as Text);

  const spans: HTMLSpanElement[] = [];
  for (const node of texts) {
    const frag = document.createDocumentFragment();
    for (const ch of node.data) {
      if (ch === ' ' || ch === '\n') {
        frag.appendChild(document.createTextNode(ch));
        continue;
      }
      const span = document.createElement('span');
      span.textContent = ch;
      frag.appendChild(span);
      spans.push(span);
    }
    node.parentNode?.replaceChild(frag, node);
  }
  return spans;
};

const LogoReveal: React.FC<{
  pageRef: React.RefObject<HTMLDivElement | null>;
  /* The readme itself — this is cloned, and its end-of-morph layout is what gets sampled. */
  columnRef: React.RefObject<HTMLDivElement | null>;
}> = ({ pageRef, columnRef }) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const source = columnRef.current;
    if (!host || !source) return;
    let cancelled = false;

    const img = new Image();
    img.src = featherUrl;
    img.onload = () => {
      if (cancelled || !host.isConnected) return;

      /* The clone: an exact copy, so the line breaks match by construction. Inline styles are
         stripped because framer leaves the paragraph entrance's clip-path on them, and a clone
         frozen mid-wipe would reveal a clipped block. */
      const clone = source.cloneNode(true) as HTMLElement;
      clone.removeAttribute('style');
      clone.querySelectorAll<HTMLElement>('[style]').forEach(el => el.removeAttribute('style'));
      clone.setAttribute('aria-hidden', 'true');
      const chars = splitIntoChars(clone);
      host.replaceChildren(clone);

      /* Sample in the state the block will be in when the reveal RUNS — narrowed, tight, gaps
         closed — not the one it is in at mount. Forced on the clone, read back, then removed;
         one synchronous layout, at mount, and the only one. */
      const forced: [string, string][] = [
        ['--collapse-t', '1'],
        ['--lh-t', '1'],
        ['--narrow-t', '1'],
      ];
      forced.forEach(([k, v]) => clone.style.setProperty(k, v));
      /* The merge is an attribute, not a var, and it changes the line breaks — so it has to be
         part of the forced state or every character would be sampled at the wrong position. */
      clone.setAttribute('data-merged', '');

      const box = clone.getBoundingClientRect();
      /* Read every rect before writing anything back: reads after writes would force a layout
         per character instead of one for the batch. */
      const rects = chars.map(c => c.getBoundingClientRect());
      forced.forEach(([k]) => clone.style.removeProperty(k));
      clone.removeAttribute('data-merged');

      /* The feather, contained in the block and centred — it is much taller than the block is,
         so the fit is height-bound. */
      const rasterW = Math.max(1, Math.round(LOGO_RASTER_H * (img.naturalWidth / img.naturalHeight)));
      const canvas = document.createElement('canvas');
      canvas.width = rasterW;
      canvas.height = LOGO_RASTER_H;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, rasterW, LOGO_RASTER_H);
      const px = ctx.getImageData(0, 0, rasterW, LOGO_RASTER_H).data;

      const markW = box.height * (img.naturalWidth / img.naturalHeight);
      const markX = box.left + (box.width - markW) / 2;
      const top = ASCII_LEVELS.length - 1;

      chars.forEach((span, i) => {
        const r = rects[i];
        /* Character centre, in the mark's own normalised space. */
        const u = (r.left + r.width / 2 - markX) / markW;
        const v = (r.top + r.height / 2 - box.top) / box.height;
        let level = 0;
        if (u >= 0 && u < 1 && v >= 0 && v < 1) {
          const sx = Math.min(rasterW - 1, Math.floor(u * rasterW));
          const sy = Math.min(LOGO_RASTER_H - 1, Math.floor(v * LOGO_RASTER_H));
          level = Math.round((px[(sy * rasterW + sx) * 4 + 3] / 255) * top);
        }
        span.setAttribute('data-l', String(level));
      });

      if (!cancelled) setBuilt(true);
    };

    return () => {
      cancelled = true;
    };
  }, [columnRef]);

  /* The fit: measures what the CSS trajectory cannot derive (see SwapUnit) and writes it to
     Page as --fit-scale / --fit-dy / --band-h. The scale comes from MARK_W, so it no longer
     depends on the section's height — the dependency runs the other way now, and it is the
     frame that reads --band-h back (see MARK_W and RowFrame).

     The block is measured in the state it ENDS in — narrowed, tight, merged — not the reading
     state it is in at rest, using the same forced read the sampler above does. That matters:
     narrowing reflows 14 wide lines into ~30 short ones, so the resting block is 640x538 and
     the fitted one 290x718. The old code scaled against the resting height and the fitted
     block therefore came out a third taller than the band it was fitted to. The height cannot
     be a constant either way — it is font-driven, and it moves with the type. */
  useEffect(() => {
    if (!built) return;
    const page = pageRef.current;
    const host = hostRef.current;
    const block = host?.firstElementChild as HTMLElement | null;
    if (!page || !block) return;
    const apply = () => {
      const forced: [string, string][] = [
        ['--collapse-t', '1'],
        ['--narrow-t', '1'],
        /* --lh, not --lh-t — see LH_TIGHT. */
        ['--lh', String(LH_TIGHT)],
      ];
      forced.forEach(([k, v]) => block.style.setProperty(k, v));
      block.setAttribute('data-merged', '');
      const w = Math.max(1, block.offsetWidth);
      const h = Math.max(1, block.offsetHeight);
      forced.forEach(([k]) => block.style.removeProperty(k));
      block.removeAttribute('data-merged');

      const vh = window.innerHeight;
      /* Width sets the scale; the viewport cap is the backstop on short screens (BAND_MAX_VH). */
      const fit = Math.min(1, MARK_W / w, (vh * BAND_MAX_VH - 2 * FIT_PAD) / h);
      const band = Math.round(h * fit + 2 * FIT_PAD);
      page.style.setProperty('--fit-scale', String(fit));
      page.style.setProperty('--band-h', `${band}px`);
      /* The unit rests centred on the viewport (Stage is a full 100dvh flex centre), so its
         travel is the band's centre minus that line. */
      page.style.setProperty('--fit-dy', `${BAND_TOP + band / 2 - vh / 2}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [built, pageRef]);

  return <RevealLayer ref={hostRef} aria-hidden />;
};

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
/* The section label's follow. Long on purpose — it is a lag, not a tween, and its job is to
   still be moving once the roll's own scroll has stopped. See LabelInner. */
const LABEL_S = '1.1s';
/* Shared by Panel and by PanelSlot, which has to match it — see PanelSlot. */
const PANEL_PAD = '1.5rem';

/* The rolling unit: cue strip + box, in NORMAL FLOW. It is not pinned, transformed or
   scripted — the sticky Stage above it is exactly one viewport minus the cue, so this unit's
   height IS the page's scroll range, and when you reach the bottom of Content the box's
   bottom edge is sitting on the viewport's. That is the whole "stops when it hits its bottom".
   (Flow, deliberately, not position: fixed + a scripted translateY. A fixed element silently
   re-anchors to any ancestor carrying a transform or filter — the same trap the sharpImage
   comment above records — and a scroll-driven transform on this subtree would hand framer's
   layoutId projection the wrong reference frame when a panel expands into the Hero.)

   Width: inside the content track, NOT the full viewport — it has to clear the portrait column,
   and the frame's left edge is where the readme's own margin is. (This used to be load-bearing
   for a second reason, that a 16:10 frame at 100vw was ~875px tall on a 900px screen; the frame
   takes its height from the viewport now, so only the alignment reason is left.) Content's own
   inline padding is cancelled first so the frame can set its own insets (see --frame-left /
   --frame-right on Page) rather than inherit the column's symmetric one.

   The BOTTOM inset stays --img-margin, the portrait's own poster border, so the frame's bottom
   edge lands level with the picture's. There is no TOP inset: that edge is the band's leading
   edge as it rolls up, and paper above it would read as a gap opening under the cue rather than
   as a border. */
const ProjectsSection = styled.section`
  position: relative;
  /* Pulled back over the stage's last --cue-h. The stage is a full viewport so the prose can
     centre on the viewport's centre line; this negative margin is what still leaves the cue
     strip showing at rest, and it keeps the scroll range at exactly the frame + its bottom
     border — shortening the stage instead would have cost the prose its centring. */
  margin-top: calc(-1 * var(--cue-h));
  margin-inline: calc(-1 * var(--content-pad));
  padding: 0 var(--frame-right) var(--img-margin) var(--frame-left);
  /* The bottom snap point (see UnclipRoot): align this box's END with the scrollport's, which
     is the position the flow already settles at — the frame's bottom on the viewport's. So the
     snap target and the natural scroll end are the same place, and the two-state model costs
     the layout nothing. */
  scroll-snap-align: end;

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    /* Stacked, so there is no portrait to clear and no nav column to align to: the frame goes
       back to an even poster border on both sides. */
    --frame-left: var(--img-margin);
    --frame-right: var(--img-margin);
    margin: 4.5rem calc(-1 * var(--content-pad)) 0;
  }
`;

/* The section label follows the site's chrome idiom (Header, Footer, the writing back
   link) rather than introducing a display heading — the cut-out wordmark is the only
   large type this page gets, and a second heading would compete with it.

   It sits in the cue strip: the one thing showing below the prose at rest, so the first
   screen says there is a section here without the box itself peeking. It rides up with the
   box rather than staying behind on the stage, so the section is still titled once it lands.

   It is also the one part of the section the mat does NOT run under (see RowFrame's ::before,
   which starts at the frame's top edge): the label stays on paper, so the light box reads as
   the thing the label is titling rather than as a band the label is sitting inside. */
const SectionLabel = styled.h2`
  position: relative;
  height: var(--cue-h);
  font-family: ${p => p.theme.font.mono};
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: ${p => p.theme.color.ink};
  margin: 0;

  /* The label's travel: 0 = centred over the content column, 1 = flush with the frame's left
     edge. Driven off --p like the chevron's fade, so it is scroll POSITION rather than a
     triggered tween — it runs forward as the box rolls up and unwinds on the way back, with no
     observer, no state and nothing to fall out of sync with the roll.

     The window is the WHOLE roll, less a short dead zone at the start so the chevron's fade
     (--p * 5, gone by 0.2) reads as its own beat first. It deliberately does not settle early:
     the wheel handler commits every gesture to a single smooth-scroll across the entire range,
     so --p sweeps 0→1 in a few hundred ms, and any window narrower than the full range shrinks
     the travel to something the eye never catches. The lag on LabelInner is the other half of
     that — see there. */
  --label-t: clamp(0, calc((var(--p, 0) - 0.1) / 0.9), 1);

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    /* No separate content column to centre over here — the label starts at the left margin
       and has nowhere to travel to. */
    --label-t: 1;
    height: auto;
    margin-bottom: 1.25rem;
  }

  /* --p is never written under reduced motion, so the ramp above would pin the label at its
     resting centre. There is no roll-up to be mid-way through here either — the page is plain
     flow — so it takes the LANDED position directly. */
  @media (prefers-reduced-motion: reduce) {
    --label-t: 1;
  }
`;

/* Out of flow so the label can slide without the cue strip reflowing around it, and because
   centre→left is not something `justify-content` can interpolate.

   `left` and the pull-back are scaled by the SAME (1 - t), which makes the inner's left edge
   land at 0.5 * (1 - t) * (labelWidth - ownWidth) — i.e. exactly linear between centred and
   flush, with no measurement. The target is the section's CONTENT box, so the label ends up
   aligned with the frame's left edge (the panels'), not with the section's outer edge. */
const LabelInner = styled.span`
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(50% * (1 - var(--label-t)));
  transform: translateX(calc(-50% * (1 - var(--label-t))));
  display: flex;
  align-items: center;
  white-space: nowrap;

  /* The label TRAILS --p rather than tracking it. The roll is one committed smooth-scroll of a
     few hundred ms (see the wheel handler in About), which is far too short for a move this
     small to register — so each --p tick restarts this transition toward the new target, the
     label follows about a fifth of a second behind, and when the scroll stops it keeps gliding
     the remaining distance into place. The travel outlives the gesture that caused it, which is
     the only way it gets enough time on screen to be seen.

     Both properties carry the SAME duration and curve: they are two halves of one position
     (see the interpolation note above) and would diverge mid-flight on different timings.
     left is a layout property, but this element is out of flow and childless, so the only box
     it dirties is its own. */
  transition:
    left ${LABEL_S} ${p => p.theme.ease.expo},
    transform ${LABEL_S} ${p => p.theme.ease.expo};

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    /* Back into flow, which is what gives the label its height once --cue-h is off. */
    position: static;
    transform: none;
  }

  /* Nothing to ease: --label-t is pinned to its landed value on both of these. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The scroll affordance beside the label: at rest the cue strip is the only thing under the
   prose, and the chevron says the box is further down. Faded straight from --p — by the time
   you are a fraction into the roll the box is visibly moving and the hint has done its job —
   so no observer and no state. The inner bob draws the eye without a loud colour. */
const ScrollHint = styled.span`
  display: inline-flex;
  margin-left: 0.7rem;
  color: ${p => p.theme.color.inkMuted};
  pointer-events: none;
  opacity: clamp(0, calc(1 - var(--p, 0) * 5), 1);

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    display: none;
  }
`;

const Bob = styled(motion.span)`
  display: inline-flex;
`;

/* The row's box, and the detail view's — the expansion fills exactly the area the panels
   occupied rather than the viewport, so it reads as the section opening rather than a
   modal taking the screen. */
const RowFrame = styled(motion.div)`
  position: relative;
  /* The remainder of the viewport once the ascii band has taken its fixed share: one screen,
     less the band above it (its header clearance plus its measured height) and the cue strip
     and poster border below. So the frame's height is set by the SCREEN, not by its own width,
     and the shape it lands on is whatever is left — see MARK_W for why that trade was made.

     Height rather than aspect-ratio even though this box is what a clicked panel expands into
     (Hero is inset: 0 here, so the expanded state IS this rectangle): the detail view wants
     the largest rectangle the page can spare, and that is this one. */
  height: calc(100dvh - ${BAND_TOP}px - var(--band-h) - var(--cue-h) - var(--img-margin));

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: auto;
  }

  /* The band never appears here — the morph is off, so the page is plain flow, prose above
     box, and there is no fitted portrait to leave room for. With nothing to remain FROM, the
     frame goes back to being a shape. */
  @media (prefers-reduced-motion: reduce) {
    height: auto;
    aspect-ratio: 16 / 10;
  }

  @media (prefers-reduced-motion: reduce) and (max-width: ${({ theme }) => theme.breakpoints.md}) {
    aspect-ratio: auto;
  }

  /* The mat: a light fill for the whole section EXCEPT the label's cue strip. Anchored to the
     frame and pushed back out over the section's own insets, rather than painted on the section
     with a --cue-h offset — that offset is only correct while the label is exactly one cue tall,
     which it is not on mobile. Negative insets track --frame-left / --frame-right / --img-margin
     wherever they are redefined, so the breakpoint needs no second rule.

     Not z-index: -1, which would escape whatever stacking context framer's layout projection
     hands the frame mid-flight. It sits first in tree order and the panels are positioned, so
     they already paint over it and only the 4px gaps and the border show through. */
  &::before {
    content: '';
    position: absolute;
    inset: 0 calc(-1 * var(--frame-right)) calc(-1 * var(--img-margin))
      calc(-1 * var(--frame-left));
    background: var(--n-1);
  }
`;

const PanelRow = styled.div`
  display: flex;
  gap: var(--panel-gap);
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
    /* flex-basis has to be released with the height: in a COLUMN flex container the basis is
       the main size, so the row's flex shorthand above zeroed these panels and the 200px never
       applied — they collapsed to a sliver of their own bottom-aligned text. */
    flex: 0 0 auto;
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
 * It renders inline, absolutely positioned against RowFrame — the detail is meant to fill
 * exactly the box, so it wants to be trapped there. (An older note here claimed it was
 * portalled to <body> to escape a clip-path on the section; there is no such clip-path and
 * no portal.)
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

const Projects: React.FC<{
  reduced: boolean;
}> = ({ reduced }) => {
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

  /* No reveal animation here any more: the roll-up IS the reveal. The section arrives by
     scrolling into frame under its own steam, and an opacity/lift tween on top of that would
     be a second entrance fighting the first. */
  return (
    <ProjectsSection>
      <SectionLabel>
        <LabelInner>
          Selected side projects
          <ScrollHint aria-hidden>
            <Bob
              animate={reduced ? undefined : { y: [0, 3, 0] }}
              transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
            >
              <ArrowDown size={13} strokeWidth={2} />
            </Bob>
          </ScrollHint>
        </LabelInner>
      </SectionLabel>
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
  const pageRef = useRef<HTMLDivElement>(null);
  /* The readme column, measured by AsciiPortrait to build a grid with its exact geometry. */
  const columnRef = useRef<HTMLDivElement>(null);

  /* The one scripted piece: 0→1 document scroll progress, written onto Page as --p, which the
     prose zoom and the chevron fade both read in CSS. A plain listener rather than framer's
     useScroll — this file already records that hook family reading its scroll root before the
     ref is attached and then silently never firing, and driving a custom property matches the
     imperative idiom the landing runs on. Nothing here reads back from the DOM per frame, so
     there is no layout thrash to rAF around.

     Left at 0 under reduced motion: the box still rolls up on plain scroll (that is the
     browser's own scrolling, not an animation), but the prose neither shrinks nor travels. */
  useEffect(() => {
    const page = pageRef.current;
    if (!page || reduced) return;
    const doc = document.documentElement;
    const onScroll = () => {
      const range = doc.scrollHeight - doc.clientHeight;
      const p = range > 0 ? doc.scrollTop / range : 0;
      page.style.setProperty('--p', String(p));
      /* The one beat that cannot be a custom property: merging the paragraphs is a display
         switch, and display does not interpolate (see Graf). */
      page.toggleAttribute('data-merged', p >= MERGE_AT);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [reduced]);

  /* Direction-driven travel between the page's two states. CSS snapping alone does not give
     what this needs: it resolves to the NEAREST snap point, so a gentle wheel tick moves ~200
     of the 625px range and springs straight back to the top — the section never opens unless
     you happen to flick hard. Here intent is read from the wheel's SIGN instead of from where
     the scroll landed, so any downward gesture commits to the frame and any upward one returns
     to the readme, however small.

     The snap CSS stays as the backstop for the paths this does not intercept — dragging the
     scrollbar, keyboard paging — so those settle on the same two positions.

     Gated on the computed snap value rather than on a duplicated media query: the CSS already
     decides where the two-state model applies (desktop, motion allowed), so reading it back
     keeps one source of truth. Cached, because a computed-style read fires a style recalc and
     wheel events arrive fast. */
  useEffect(() => {
    const root = document.documentElement;
    let enabled = getComputedStyle(root).scrollSnapType !== 'none';
    const refresh = () => {
      enabled = getComputedStyle(root).scrollSnapType !== 'none';
    };

    /* The destination of an in-flight glide, so a repeat wheel in the same direction does not
       restart it — but a REVERSAL still turns the page around mid-travel. */
    let heading: number | null = null;
    let clear = 0;

    const onWheel = (e: WheelEvent) => {
      if (!enabled || e.ctrlKey || e.deltaY === 0) return;
      const max = root.scrollHeight - root.clientHeight;
      const target = e.deltaY > 0 ? max : 0;
      /* Already parked there: let the event through, so an over-scroll at either end behaves
         natively rather than being silently swallowed. */
      if (Math.abs(root.scrollTop - target) < 1) return;
      e.preventDefault();
      if (heading === target) return;
      heading = target;
      window.scrollTo({ top: target, behavior: 'smooth' });
      window.clearTimeout(clear);
      clear = window.setTimeout(() => {
        heading = null;
      }, 700);
    };

    /* Not passive: the whole point is to replace the browser's own scroll with one glide. */
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', refresh);
      window.clearTimeout(clear);
    };
  }, []);

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
      <UnclipRoot />
      <Page ref={pageRef}>
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
          <Stage>
          <SwapUnit>
          <Column ref={columnRef}>
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
          {/* The swap's arrival side. Not mounted under reduced motion: --p is never written
              there, so it would be invisible dead weight — ~2700 characters of it. */}
          {!reduced && (
            <LogoReveal pageRef={pageRef} columnRef={columnRef} />
          )}
          </SwapUnit>
          </Stage>
          <Projects reduced={!!reduced} />
        </Content>
      </Page>
    </PageTransition>
  );
};

export default About;
