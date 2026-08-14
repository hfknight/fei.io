import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import styled, { createGlobalStyle } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { labEntriesByDate } from '../data/labEntries';
import { usePageTitle } from '../hooks/usePageTitle';
import type { LabKind } from '../types';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

const KIND_LABEL: Record<LabKind, string> = {
  learning: 'Learning',
  'case-study': 'Case study',
  experiment: 'Experiment',
  gallery: 'Gallery',
};

const IMG_SRC = '/lab-hand@2x.webp';

/* Ten letters stretched to the column width, the way /readme stretches its six. Anton is
   already condensed, so this lands tighter than the readme mark (~42px per letter against
   its ~50) — which is the cost of the full-width band, and the reason "lab" could not have
   it: three letters across the same span read as a caricature rather than a wordmark. */
const WORDMARK = 'laboratory';

/**
 * One picture, one scale, shared by every layer that shows a piece of it — the plate, the
 * colour band, and the wordmark's letterforms.
 *
 * Sized to ONE SHARED WIDTH (--img-w, see Page) rather than `cover`. Each layer has a
 * different box (the letters sit in a 420×112 strip, the plate fills the column), and
 * `cover` would solve a different scale for each, so the letters would show the picture at
 * one magnification and the plate at another — which is exactly what stops a cut-out
 * reading as cut FROM the image. An explicit shared size makes the whole composition one
 * photograph that several windows look through; each window then only has to subtract its
 * own offset (--img-x carries the shared horizontal crop).
 */
/* The band's edge softness, shared by its plate and wordmark halves — one window, one
   feather. 24px, eased: a short linear ramp reads as a hard line against the picture's
   detail, and a linear one at any width shows mach bands where the ramp meets the flats,
   so the stops approximate smoothstep. */
const bandFeather = `
  -webkit-mask-image: linear-gradient(180deg,
    transparent 0, rgba(0, 0, 0, 0.15) 7px, rgba(0, 0, 0, 0.5) 12px, rgba(0, 0, 0, 0.85) 17px, #000 24px,
    #000 calc(100% - 24px), rgba(0, 0, 0, 0.85) calc(100% - 17px), rgba(0, 0, 0, 0.5) calc(100% - 12px),
    rgba(0, 0, 0, 0.15) calc(100% - 7px), transparent 100%);
  mask-image: linear-gradient(180deg,
    transparent 0, rgba(0, 0, 0, 0.15) 7px, rgba(0, 0, 0, 0.5) 12px, rgba(0, 0, 0, 0.85) 17px, #000 24px,
    #000 calc(100% - 24px), rgba(0, 0, 0, 0.85) calc(100% - 17px), rgba(0, 0, 0, 0.5) calc(100% - 12px),
    rgba(0, 0, 0, 0.15) calc(100% - 7px), transparent 100%);
`;

const sharpImage = `
  background-image: url('${IMG_SRC}');
  background-size: var(--img-w) auto;
  background-repeat: no-repeat;
`;

const Lab: React.FC = () => {
  /* Deliberately topic-free — the shelf keeps gaining pieces, and a title that
     enumerates subjects goes stale with every new entry. */
  usePageTitle('Lab — interactive experiments and case studies · Fei Hu');

  const reduced = useReducedMotion();
  const entries = labEntriesByDate();
  const railRef = useRef<HTMLDivElement>(null);
  const [band, setBand] = useState<{ top: number; h: number } | null>(null);

  /**
   * Anton's ink bounds for the wordmark, solved exactly as /readme does: `textLength`
   * normalises the ADVANCE width, which keeps the glyphs' side bearings and shows as edge
   * gaps, so the fit is solved against the INK instead. The painted pixels then span the
   * masthead's full width — flush left and right by construction — and the tallest ink
   * fills the 48px pre-scale box.
   *
   * The target width is measured from the element rather than hardcoded (as /readme's 300
   * is), so the mark refits itself if --rail ever moves again.
   */
  const mastRef = useRef<HTMLDivElement>(null);
  const [stencil, setStencil] = useState({ x: 0, fontSize: 76, textLength: 420 });
  useEffect(() => {
    let cancelled = false;
    // jsdom implements neither the font-loading API nor canvas 2d; the stencil simply keeps
    // its Anton-approximating defaults there, which is all a render test can observe anyway.
    if (!document.fonts?.load) return;
    document.fonts.load('100px Anton').then(() => {
      const ctx = document.createElement('canvas').getContext('2d');
      const box = mastRef.current?.clientWidth;
      if (cancelled || !ctx || !box) return;
      ctx.font = '100px Anton';
      const m = ctx.measureText(WORDMARK);
      const inkLeft = -m.actualBoundingBoxLeft;
      const inkRight = m.actualBoundingBoxRight;
      const fontSize = 100 * (48 / m.actualBoundingBoxAscent);
      const s = fontSize / 100;
      const k = box / ((inkRight - inkLeft) * s);
      setStencil({ x: -inkLeft * s * k, fontSize, textLength: m.width * s * k });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * The band is measured in VIEWPORT space and converted to the rail's own box, so it stays
   * correct whether or not the rail has begun to stick and wherever the page is scrolled.
   * Entry box in, band box out — the two line up on screen like a ruler.
   */
  const lightBand = useCallback((el: HTMLElement) => {
    const rail = railRef.current;
    if (!rail) return;
    const r = el.getBoundingClientRect();
    const rr = rail.getBoundingClientRect();
    setBand({ top: r.top - rr.top, h: r.height });
  }, []);

  return (
    <PageTransition>
      <UnclipRoot />
      <Page>
        <Content>
          {entries.length === 0 && <Status>No entries yet.</Status>}

          <List onMouseLeave={() => setBand(null)}>
            {entries.map((entry, i) => (
              <Item
                key={entry.slug}
                initial={reduced ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(6px)' }}
                animate={reduced ? { opacity: 1 } : { opacity: 1, y: 0, filter: 'blur(0px)' }}
                transition={{ duration: reduced ? 0.4 : 0.9, delay: 0.15 + i * 0.08, ease }}
                onMouseEnter={(e) => lightBand(e.currentTarget)}
              >
                <EntryLink to={`/lab/${entry.slug}`}>
                  <Meta>{`${entry.date.slice(0, 4)} · ${KIND_LABEL[entry.kind]}`}</Meta>
                  <EntryTitle>{entry.title}</EntryTitle>
                </EntryLink>
              </Item>
            ))}
          </List>
        </Content>

        <Rail ref={railRef}>
          {/* This route's page-load transition, picking up where the curtain lands:
              PageTransition drops /lab's curtain from the top (its CurtainY), and this
              column rises from the bottom to answer it — one gesture falling and returning,
              while the list beside it staggers in.

              The slide sits on an inner box, not on Rail itself. Parked a rail-height
              down it is real page overflow — a scrollbar flash, and on a longer list a
              stretch of blank page below the fold — so something has to clip it; Rail is
              that something, and Rail therefore has to stay put while the box inside it
              moves. (It also has to stay untransformed for lightBand, which measures the
              band against Rail's live rect.)

              The band's geometry is declared HERE rather than on the plate, because two
              layers now read it — the plate and the wordmark. Rail-space coordinates, the
              space lightBand measures in, and both layers subtract their own offset. */}
          <Slide
            initial={reduced ? { opacity: 0 } : { y: '100%' }}
            animate={reduced ? { opacity: 1 } : { y: 0 }}
            transition={{ duration: reduced ? 0.4 : 1.05, ease }}
            style={
              {
                '--band-top': `${band?.top ?? 0}px`,
                '--band-h': `${band?.h ?? 0}px`,
                '--band-o': band === null ? 0 : 1,
              } as React.CSSProperties
            }
          >
            <Plate>
              <div className="img" />
              <div className="band">
                <div className="band-img" />
              </div>
            </Plate>

            <Masthead ref={mastRef} aria-hidden>
              <span className="cut" />
              {/* The same window, through the letters. Declared after .cut so it paints
                  over it; both are clipped by the one stencil below. */}
              <div className="band">
                <div className="band-img" />
              </div>
              {/* userSpaceOnUse = the Masthead div's own pixel grid: y=48 doubled by
                  scale(1,2) puts the baseline at 96, the div's bottom edge. x/fontSize/
                  textLength come from the ink measurement above, so the word's painted pixels
                  span exactly the column width. Anton has one weight (400). */}
              <svg width="0" height="0" focusable="false">
                <defs>
                  <clipPath id="lab-clip" clipPathUnits="userSpaceOnUse">
                    <text
                      x={stencil.x}
                      y="48"
                      transform="scale(1,2)"
                      textLength={stencil.textLength}
                      lengthAdjust="spacingAndGlyphs"
                      fontFamily="Anton"
                      fontSize={stencil.fontSize}
                    >
                      {WORDMARK}
                    </text>
                  </clipPath>
                </defs>
              </svg>
            </Masthead>
          </Slide>
          <MobileTitle aria-hidden>{WORDMARK}</MobileTitle>
        </Rail>
      </Page>
    </PageTransition>
  );
};

export default Lab;

/* ------------------------------------------------------------------ */
/* Layout                                                              */
/* ------------------------------------------------------------------ */

/**
 * #root carries `overflow-x: hidden` globally (index.css), and a non-visible overflow on
 * one axis computes the other to `auto` — so #root is a scroll container and therefore the
 * nearest scrolling ancestor of everything on the page. It never scrolls (no fixed height),
 * so a position: sticky inside it is silently inert and scrolls away with the document.
 * The rail below is sticky, so the clip is lifted while this route is mounted, exactly as
 * /readme does for its own pinned columns. Nothing is lost: html carries the same
 * overflow-x: hidden in GlobalStyles, one level up.
 */
const UnclipRoot = createGlobalStyle`
  #root {
    overflow-x: visible;
    max-width: none;
  }

  /* Below md the picture goes full-bleed at the top of the page and the fixed nav lands on
     it. This route is light-surface, so the chrome ink is DARK — over a dark photograph the
     four links measured 1.10-1.30:1. The ink is not the thing to change (the backdrop is a
     photograph, and no single ink passes over all of it), so the nav gets a ground, the
     same dark glass the cursor-tracked-video entry uses, with its ink pinned white.

     Desktop needs none of this: the plate's clip-path starts the picture below the
     wordmark, around 200px down, so the nav there sits on plain paper. */
  @media (max-width: 768px) {
    [data-nav-track] {
      background: rgba(12, 13, 16, 0.58);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      backdrop-filter: blur(10px) saturate(140%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: ${p => p.theme.radius.pill};
      /* The plate is a dark ground sitting inside a light-surface page, so the mark has to
         be the DARK-surface variant — the light one is a rust that measured 3.18:1 here.
         Re-declared for this subtree rather than hardcoded at the call site below, so the
         rule reads as "this box is on dark" rather than as a magic colour. */
      --color-mark: oklch(0.70 0.19 35);
    }

    [data-nav-track] a {
      color: #fff;
      opacity: 0.85;
    }

    [data-nav-track] a[aria-current='page'] {
      opacity: 1;
      color: var(--color-mark);
    }
  }
`;

const Page = styled.div`
  /* Wider than /readme's 340 rail. The source is 0.558 aspect — genuinely tall — so a
     narrow column crops most of its width away and 460 lets the miniature survive. */
  --rail: 460px;
  --img-margin: 20px;
  --mast-top: 6.5rem;
  --word-h: 96px;
  --word-drop: 8px;
  /* Room below the baseline for the y's tail. /readme never needed this — "readme" has no
     descender (its ink drops 0.44px, the final-e tail its comment mentions) — but
     "laboratory" hangs 13.6px under, and the baseline IS the box's bottom edge, so without
     the extra span the tail is simply not painted. Only the box grows: the baseline, the
     letter size and the image's cut all stay where they were. */
  --word-desc: 16px;
  /* Nothing hovered. The band's own top/height are meaningless until lightBand writes
     them, so this is the switch that keeps the window shut in the meantime. */
  --band-o: 0;
  /* Where the PHOTOGRAPH begins — the top of the wordmark, not the top of the screen. The
     letters therefore carry the picture's first rows and the plate continues from where
     they end, so the two are one field rather than type sitting on an image. */
  --pic-top: calc(var(--mast-top) + var(--word-drop));
  /* The one drawn size every layer samples (see sharpImage). Rail width at minimum — but
     like /readme's poster, the photograph must always reach the bottom margin, so on
     viewports tall enough that a rail-wide image falls short, the drawn width grows to
     whatever makes the picture span --pic-top → bottom margin. 941/1672 is the source's
     pixel aspect (width per height) — re-derive it if the asset changes. */
  --img-w: max(var(--rail), calc((100dvh - var(--pic-top) - var(--img-margin)) * 941 / 1672));
  /* When the image is drawn wider than the rail, centre the horizontal crop — the hand
     sits mid-frame (the mobile cover crop centres too). Never positive by construction. */
  --img-x: calc((var(--rail) - var(--img-w)) / 2);

  min-height: 100dvh;
  background: ${p => p.theme.color.surface};
  display: grid;
  /* The mirror of /readme: there the rail leads and the prose follows, here the list
     leads and the picture closes. */
  grid-template-columns: 1fr var(--rail);

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    grid-template-columns: 1fr;
  }
`;

const Content = styled.div`
  min-width: 0;
  padding: 7rem 2rem 5rem;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    padding: 3rem 1.75rem 4rem;
  }
`;

/* Uncapped: the list fills the track. Entry titles are short enough that the measure
   argument a cap exists to win does not really apply to them. */
const Column = styled.div`
  width: 100%;
`;

/* The box that arrives. Rail stays put and clips; this slides up inside it. */
const Slide = styled(motion.div)`
  position: absolute;
  inset: 0;
`;

const Rail = styled.div`
  position: sticky;
  top: 0;
  height: 100dvh;
  align-self: start;
  /* Above the page-wide paper grain (body::after, z 1): the photograph carries its own
     frost noise and the paper texture on top of it read as dirt. Only where the rail
     PAINTS escapes — the clip-path's cut-away margins stay transparent, so the paper
     (and its grain) still shows through them. Under the Header's 10. */
  z-index: 2;
  /* Holds the entrance slide inside the column instead of letting it lengthen the page.
     Safe on the sticky element itself: an element's own overflow has no bearing on where
     it sticks, only on what it shows. */
  overflow: hidden;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    position: relative;
    height: 42vh;
    /* The picture introduces the page on a phone, where the grid is a single column. */
    order: -1;
  }
`;

/**
 * The picture and its glass. Only `.img` is desaturated — a filter on this box would take
 * the colour band down with it, since a child cannot escape an ancestor's filter (which is
 * why /readme's Peek is a sibling of Portrait rather than a child).
 *
 * Layer order: .img (0) → frost (1) → grain (2) → .band (3). The band rides above the
 * glass — its window shows the untreated original — but stays inside the cut, so the paper
 * margin still holds.
 */
/* Mobile's stand-in for the cut-out wordmark, same as /readme's: the Masthead stencil is
   desktop staging and never renders below md, which left the page untitled on a phone.
   Plain Anton in the picture's bottom-left corner, no stencil, no effects. Literal white:
   it sits on the photograph, which does not follow the page surface. */
const MobileTitle = styled.div`
  display: none;

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    display: block;
    position: absolute;
    left: ${p => p.theme.space[3]};
    bottom: ${p => p.theme.space[3]};
    /* Above the plate's band/grain stack (z 0-3). */
    z-index: 4;
    font-family: 'Anton', sans-serif;
    font-size: 2.1rem;
    line-height: 1;
    color: rgba(255, 255, 255, 0.92);
    pointer-events: none;
  }
`;

const Plate = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  /* Full height: --img-w guarantees the photograph itself reaches the bottom margin at any
     viewport height (it used to be width-sized, and this box was capped at the picture's
     foot so tall screens didn't show bare paper inside the plate). */
  height: 100%;
  overflow: hidden;

  /* Cut the image rather than covering it with paper rectangles, so the cut-away area is
     genuinely the page background — grain and all. Top edge = the wordmark's baseline, so
     the letters sit directly on the picture. */
  clip-path: inset(calc(var(--mast-top) + var(--word-h)) var(--img-margin) var(--img-margin)
    var(--img-margin));

  .img {
    position: absolute;
    inset: 0;
    z-index: 0;
    ${sharpImage}
    /* The picture's own origin, so the plate continues the rows the letters started. */
    background-position: var(--img-x) var(--pic-top);
    filter: grayscale(1);
  }

  /* The colour reveal, plate half. A window on the picture at the hovered entry's own
     height, sliding between them rather than blinking — one instrument, not two lamps. The
     wordmark carries the matching half (see Masthead): the plate's picture only exists
     below the clip at --mast-top + --word-h, so an entry sitting level with the letters —
     the first one does — would otherwise light a sliver of plate and leave the word it
     lines up with grey. One window, two layers to cross. ABOVE the frost and
     the grain (z 1 and 2), not under them: the window shows the ORIGINAL pixels — sharp,
     colour, unglazed — the way /readme's Peek escapes its column's treatment entirely. The
     feathered mask below is edge softness on the window, not blur on the picture. */
  .band {
    position: absolute;
    left: 0;
    right: 0;
    top: var(--band-top);
    height: var(--band-h);
    z-index: 3;
    overflow: hidden;
    opacity: var(--band-o);
    transition:
      top 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.35s ease;
    /* Feathered top and bottom. A hard edge on a band that slides strobes against the
       picture's own detail; a ramp reads as light falling across it. The mask is fixed
       relative to the band's own box, so it travels with it for free. */
    ${bandFeather}
  }

  /* Counteracts the band's own offset so the picture inside it continues the one behind —
     the window moves, the photograph does not. */
  .band-img {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(-1 * var(--band-top));
    height: 100dvh;
    ${sharpImage}
    background-position: var(--img-x) var(--pic-top);
    transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  /* The liquid-glass frost — even LEFT-TO-RIGHT (the horizontal graduation /readme uses
     read here as "more blur on the right", and there is no text seam to ease toward), but
     masked off VERTICALLY through the wordmark's reach. The letters are sharp grayscale
     picture, so the strip they dip into must be the same sharp picture or their bottoms
     read as shapes laid over a soft field; the glass fades in just below the deepest
     descender and is at full strength ~90px later. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    z-index: 1;
    /* 5px, not the token's 11. The graduated horizontal mask this replaced ran the glass
       from full strength down to 40%, so most of the plate was never seeing 11 — dropping
       it and keeping 11 put the WHOLE picture under the densest setting and turned the
       miniature to mush. Started at 7 (about what the old average resolved to), eased to 5
       so more of the picture survives the glass. */
    backdrop-filter: blur(5px) saturate(172%) brightness(1.04);
    -webkit-backdrop-filter: blur(5px) saturate(172%) brightness(1.04);
    background: linear-gradient(235deg, rgba(255, 255, 255, 0.18), rgba(30, 31, 36, 0.26) 50%, rgba(8, 9, 12, 0.46));
    -webkit-mask-image: linear-gradient(
      180deg,
      transparent 0,
      transparent calc(var(--pic-top) + var(--word-h) + var(--word-desc)),
      rgba(0, 0, 0, 1) calc(var(--pic-top) + var(--word-h) + var(--word-desc) + 90px)
    );
    mask-image: linear-gradient(
      180deg,
      transparent 0,
      transparent calc(var(--pic-top) + var(--word-h) + var(--word-desc)),
      rgba(0, 0, 0, 1) calc(var(--pic-top) + var(--word-h) + var(--word-desc) + 90px)
    );
  }

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

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    .img {
      background-size: cover;
      background-position: center 28%;
    }
    .band {
      display: none;
    }
    /* Much lighter here. On the desktop column the glass separates a picture from the
       prose beside it; on a phone the picture IS the page's opening and nothing sits over
       it but the nav, which carries its own plate. At desktop strength the hero read as
       mush — cover already downscales the source hard before any blur lands on it.
       The vertical mask goes too: it exists to clear the wordmark's dip zone, and there is
       no wordmark below md. */
    &::before {
      backdrop-filter: blur(2px) saturate(150%) brightness(1.02);
      -webkit-backdrop-filter: blur(2px) saturate(150%) brightness(1.02);
      -webkit-mask-image: none;
      mask-image: none;
    }
  }

  /* No cursor, so the band can never be triggered — the picture ships in colour rather
     than sitting permanently grey behind a mechanic that cannot fire. */
  @media (hover: none) {
    .img {
      filter: none;
    }
    .band {
      display: none;
    }
  }

  /* The reveal stays; only its travel goes. */
  @media (prefers-reduced-motion: reduce) {
    .band,
    .band-img {
      transition: none;
    }
  }
`;

/* lab as CUT-OUT type: a box filled with the same picture, clipped to the letterforms, so
   the word is a window onto the image rather than ink laid over it. */
const Masthead = styled.div`
  position: absolute;
  top: calc(var(--mast-top) + var(--word-drop));
  left: var(--img-margin);
  right: var(--img-margin);
  /* The baseline stays at --word-h; the extra is descender headroom (see --word-desc). */
  height: calc(var(--word-h) + var(--word-desc));
  z-index: 3;
  pointer-events: none;

  .cut {
    position: absolute;
    inset: 0;
    ${sharpImage}
    /* Only this box's own offset is subtracted (plus the shared --img-x crop). Its top IS
       --pic-top, so vertically the letters start at the photograph's first row;
       horizontally they sit --img-margin in from the column, so the picture slides back by
       the same amount. */
    background-position: calc(var(--img-x) - var(--img-margin)) 0;
    /* Grayscale ONLY — no blur. The letters are the photograph at its sharpest; the plate
       below eases into the frost instead (see the frost's mask), so where the letter
       bottoms dip into the picture, sharp meets sharp and the word grows out of the image
       rather than sitting on a soft field.
       (Note to the next editor: no backticks in this file's styled templates — they
       terminate the literal. This comment cost one build to learn.) */
    filter: grayscale(1);
    -webkit-clip-path: url(#lab-clip);
    clip-path: url(#lab-clip);
  }

  /* The colour reveal, wordmark half — the plate's .band recipe with one substitution:
     Masthead's top is --pic-top, not 0, so the band's rail-space position is offset by
     that much. Everything else (the height, the shared feather, the travel) is the same
     window, which is the point — it must not look like a second effect starting where
     the first stops. */
  .band {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(var(--band-top) - var(--pic-top));
    height: var(--band-h);
    overflow: hidden;
    opacity: var(--band-o);
    transition:
      top 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      height 0.5s cubic-bezier(0.16, 1, 0.3, 1),
      opacity 0.35s ease;
    ${bandFeather}
  }

  /* Pulled back up by the band's own offset, so this box lands exactly on Masthead's —
     which is what makes url(#lab-clip) cut the same letters here as it does on .cut. The
     stencil is userSpaceOnUse, i.e. read in the referencing element's own pixel grid, so
     coinciding boxes are not a nicety but the whole mechanism. No grayscale: this is the
     untreated original showing through, exactly as the plate's window is. */
  .band-img {
    position: absolute;
    left: 0;
    right: 0;
    top: calc(-1 * (var(--band-top) - var(--pic-top)));
    height: calc(var(--word-h) + var(--word-desc));
    ${sharpImage}
    background-position: calc(var(--img-x) - var(--img-margin)) 0;
    -webkit-clip-path: url(#lab-clip);
    clip-path: url(#lab-clip);
    transition: top 0.5s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @media (max-width: ${p => p.theme.breakpoints.md}) {
    display: none;
  }

  /* Matches the plate: no cursor, no band, and the letters ship in colour rather than
     sitting grey behind a mechanic that cannot fire. */
  @media (hover: none) {
    .cut {
      filter: none;
    }
    .band {
      display: none;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .band,
    .band-img {
      transition: none;
    }
  }
`;

/* ------------------------------------------------------------------ */
/* List                                                                */
/* ------------------------------------------------------------------ */

const Status = styled.p`
  font-family: ${p => p.theme.font.body};
  font-weight: 200;
  color: ${p => p.theme.color.inkMuted};
`;

const List = styled(Column).attrs({ as: 'ul' })`
  list-style: none;
  margin: 0;
  padding: 0;
`;

const Item = styled(motion.li)`
  & + & {
    border-top: 1px solid ${p => p.theme.color.border};
  }
`;

const EntryLink = styled(Link)`
  display: block;
  text-decoration: none;
  padding: 1.9rem 0;

  /* The picture's own streak orange rather than the shared mark — sampled from the
     plate's glitch verticals (they average #f06030–#f08060, oklch hue ~40), then pulled
     down to the deepest lightness that still reads vivid: 3.6:1 on the paper surface,
     clear of the 3:1 large-text floor at this title size. Local to this list — the mark
     token stays the /readme tone. */
  &:hover h2 {
    color: oklch(0.58 0.2 40);
  }
`;

const Meta = styled.span`
  display: block;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.6rem;
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: ${p => p.theme.color.inkMuted};
  margin-bottom: 0.7rem;
`;

/* Larger than the old centred list: with the picture beside them these two carry the page. */
const EntryTitle = styled.h2`
  font-family: ${p => p.theme.font.body};
  font-size: clamp(1.6rem, 2.6vw, 2.3rem);
  font-weight: 300;
  line-height: 1.18;
  color: ${p => p.theme.color.ink};
  margin: 0;
  transition: color 0.3s ease;
`;
