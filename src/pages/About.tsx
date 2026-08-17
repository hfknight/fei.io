import { Fragment, useEffect, useRef, useState } from 'react';
import styled, { createGlobalStyle, css, keyframes } from 'styled-components';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowUpRight, Bookmark } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import {
  ASCII_FLAT,
  ASCII_LEVELS,
  fitMark,
  levelAt,
  rasterise,
  splitIntoChars,
} from './lab/entries/asciiSample';
/* Plain import = the file URL (svgr components need ?react); the ascii sampler rasterises it.
   The feather, because it IS the site's mark — the loader and the home lockup both draw this
   exact geometry. Only its alpha is used; the file's orange fills are discarded (see
   AsciiPortrait), so the mark arrives in the page's own ink. */
import featherUrl from '../assets/fei-feather.svg';

/* ── The finished mark, and where it sits ──────────────────────────────────────────────────
   The end of the scroll shows the projects section filling the screen, with the fitted ascii
   portrait at the TOP of it — small, centred, and with the panels beginning below it rather
   than under it.

   So the two are STACKED again, and the band arithmetic is back with them — but reversed from
   the version that was deleted. It used to be the mark that was derived: the band was a share
   of the screen and the mark was fitted into whatever it came to. Here the MARK is the given —
   a fixed MARK_W wide, at a fixed MARK_TOP — and the band is the remainder: the fit effect
   publishes the block's measured height as --mark-h and --section-top is computed from it, so
   the frame starts under the mark by construction and no figure has to be kept in step by hand.

   Width is the dial rather than height because the feather is tall and narrow — its block runs
   ~2.5x as tall as it is wide, so width is both the smaller number and the one that says
   whether the mark reads at a glance. The ink lands a few percent inside the block. At 40 the
   block is ~100px tall and the raster is down to its ~30 rows against 40 columns; below this
   the feather stops resolving. */
const MARK_W = 40;

/* The mark's top edge, from the viewport's — and at p=1 the section's top is flush with the
   viewport's, so it doubles as the mark's inset within the section. Clear of the fixed header
   (1.5rem down, ~40px of chrome) with air under it, and no more: the point of the small mark is
   that it sits high. */
const MARK_TOP = 76;

/* The air between the mark's bottom edge and the cue strip below it. */
const MARK_GAP = 20;

/* The breathing room kept above and below the block, and the margin the fit keeps between it
   and the viewport's edge. */
const FIT_PAD = 24;

/* The mark's ceiling, as a share of the viewport height. It no longer protects the frame —
   nothing is stacked, so a taller mark takes nothing from anything. It protects the PANEL it
   is printed on: past this the block starts to read as the panel's content rather than as a
   mark resting over it, and on a short screen it would run past the panel's edges entirely. */
const BAND_MAX_VH = 0.28;

/* The two ends of the leading ramp (see --lh on Page). Named because the fit effect has to set
   --lh ITSELF when it measures the fitted block, not just --lh-t: --lh is substituted where it
   is declared, on Page, so an --lh-t forced further down the tree arrives too late to change
   it and the block measures a full reading leading too tall. */
const LH_REST = 1.6;
const LH_TIGHT = 1.18;


/* Where the page commits to the wide state, and how long the two properties that read it take
   to get there (see --rail-out on Page). The threshold is low because there is nothing to wait
   for: the wheel handler commits the entire scroll range on the first downward gesture, so --p
   is past this within a frame or two of the wheel and the rail starts leaving with the gesture
   rather than partway through it. The duration is matched to the snap glide's own, so the
   column is gone by about the time the page has finished travelling to the frame. */
const WIDEN_AT = 0.05;
const RAIL_S = '0.5s';

/* The prose→ascii crossfade's centre and width, as fractions of --p. They are emitted as
   --swap / --swap-run on Page, where the two opacity ramps read them, and they live HERE rather
   than only in the stylesheet because the scroll listener needs the same numbers: it flips
   data-swapped once the run has finished, which is the moment the prose is fully transparent and
   must stop taking pointer events (see Stage). Written twice, they would drift, and the symptom
   would be an invisible block of text swallowing clicks somewhere over the panels. */
const SWAP_AT = 0.42;
const SWAP_RUN = 0.12;
const SWAP_END = SWAP_AT + SWAP_RUN / 2;

/* The section's own arrival — the last two beats of the sequence, and the only ones that are
   NOT a scrub. The ruled ground slides in from the right and the panels rise behind it, and
   neither can ride --p: --p is spent by the time the glide lands, and these have to play after
   the mark has finished travelling. So they are a flip (data-arrived → --arrive), with their
   durations and the stagger below carried by ordinary transitions.

   Fired in the glide's TAIL rather than at 1. Two things set the number from opposite sides.

   Low enough to still overlap the scroll: at 1 the whole of beats 3 and 4 would play on a page
   that has already stopped, which reads as lag rather than as sequence. And it has to be under
   the p the page actually settles at, which is not reliably 1 — a snap can leave it at ~0.96,
   and a threshold above that would simply never fire and the section would never arrive.

   High enough that the section is THERE when the ground slides across it. This started at 0.88,
   where the section still had ~50px of its roll left; the ground was sliding in over a box that
   was itself still moving up, and what that read as was the ground arriving at less than a full
   screen tall. By here the roll is all but done and the ground slides across a settled screen. */
const ARRIVE_AT = 0.93;

/* And where it comes back OFF, which is nowhere near where it went on — this is a hysteresis,
   not a threshold, and the asymmetry is the whole point of it.

   Run off the same 0.93 the exit collides with the roll: the section rolls back DOWN under the
   returning prose while the ground slides RIGHT, and two perpendicular movements at once read as
   neither. What it actually looked like was the ground zooming away into the bottom-right corner.

   There is no fixing that by choosing a direction — any exit that runs during the roll crosses
   it. So the ground does not exit during the roll at all: it holds its place and rolls away with
   the section, which is the honest reverse of how it arrived, and only resets off-screen down
   here, once the section is far enough gone that the reset is below the fold.

   The same reasoning the rail already runs on, and the same order: the frame rolls down first,
   this resets behind it, the portrait comes back last (see WIDEN_AT, which sits just under). */
const ARRIVE_OFF = 0.12;

/* How long the return glide waits for the ground to get out of its way — the exact mirror of
   RAIL_LEAD, and it exists for the same reason: two things moving at once whose order the eye
   cannot read.

   Holding the exit back to the end of the roll (ARRIVE_OFF above) was not enough, because the
   roll is not the only thing the ground has to avoid. The frame's own left edge comes back at
   the same time — margin-inline-start unwinds the rail's 340px plus the inset difference when
   the portrait returns (see ProjectsSection) — so the ground was travelling right, narrowing
   from the left, and falling with the section, all inside the same half second. Collapsing
   toward the bottom-right corner is exactly what those three add up to.

   None of them can be reordered against each other; the ground can simply be got out first.
   Which also makes the page symmetric: the last thing in is the first thing out.

   The number is what the exit CHAIN comes to, not any one move in it: the panels drop from 0,
   the ground follows at GROUND_OUT_DELAY, and this is that delay plus most of the ground's own
   420. Most rather than all — the exit eases out, so the ground is ~97% travelled by here and
   only its tail is left when the roll takes over. Waiting for the last few pixels would buy
   nothing visible and cost a beat where a wheel produced nothing. */
const ARRIVE_LEAD = 420;

/* And what the chain costs when a panel is OPEN, which is a beat nobody else in it has to wait
   for. The detail is not part of the row — it is an overlay above the whole frame — so nothing
   in --arrive touches it, and left alone it simply rolled off the screen still open, in front of
   the panels that were dropping behind it.

   So the up gesture closes it, and the rest of the exit waits this long before it starts: the
   detail goes back into its panel, THEN the panels drop, then the ground, then the roll.

   Matched to the flight home rather than guessed at — see the Panel's own transition, shortened
   to 0.4 for exactly this reason. Measured on that curve the hero is within a few px of panel
   size by ~230ms, so this covers the whole of the move that reads and none of the tail that does
   not. The two numbers move together: lengthen the flight and this has to follow, or the panels
   start dropping behind a hero still visibly in the air.

   Closed rather than merely hidden: coming back down to a section still holding a detail open
   from before the trip is a stranger state than returning to the row. */
const DETAIL_LEAD = 240;
const GROUND_S = '0.62s';
/* The panels' rise. Held back past the ground's own travel so the two read in order rather
   than as one mass arriving, and staggered left to right. PANEL_RISE is short on purpose —
   the panels are already rising with the roll, and this is the accent on top of it, not the
   entrance itself. */
const PANEL_RISE = 44;
const PANEL_RISE_S = '0.66s';
const PANEL_RISE_DELAY = 0.24;
const PANEL_RISE_STAGGER = 0.085;

/* The way OUT, which is its own set of numbers rather than the entrance reversed — and it has
   its own ORDER too: the panels drop first and the ground follows them off. In, the ground is
   the stage and the panels arrive on it; out, the panels leave and the ground is what remains
   to be struck.

   Everything here is faster than its counterpart above, because the exit is not a beat anyone
   is meant to dwell on — it is a lead, and the roll is waiting behind it (see ARRIVE_LEAD).
   Played at entrance speed the whole chain runs the better part of a second before the page is
   allowed to move, which is a dead beat rather than a sequence.

   The stagger is dropped entirely for the same reason: in, it is the point; out, it is four
   more frames to wait through. */
const PANEL_FALL_S = '0.3s';
const GROUND_OUT_S = '0.42s';
const GROUND_OUT_DELAY = '0.18s';

/* How long the frame waits for the portrait to get out of its way. The two used to run together
   — one gesture, everything moving — and the order was unreadable because the thing arriving and
   the thing leaving crossed. The roll-up IS the document's own scroll, so the only way to put it
   second is to hold the glide back by this much.

   Shorter than RAIL_S on purpose. The exit eases out, so by here the column is ~90% gone and only
   its tail is left; waiting the full 0.5s would buy a few pixels of travel at the cost of a dead
   beat where a wheel produced nothing. Long enough to read as an order, short enough not to read
   as lag. */
const RAIL_LEAD = 260;

/* The page's standard ease-out-expo, up here rather than beside the component because the
   rail's variants are module-level too and would read it before it was assigned. */
const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/* The colour window's geometry, declared on Page rather than on Peek because ContactRail
   reads it too: the links hang off this box's right edge and share its floor, and a second
   copy of the numbers there is a second place for them to drift. Height and bottom inset are
   the dials; --peek-y is DERIVED from them, because the window is anchored to the bottom of
   the column but its background compensation needs a top offset (see Peek). */
/* In JS because framer animates the window open to it (see the JSX) and a keyframe cannot
   read a custom property. */
const PEEK_W = 44;

/* Where the page cuts over from desktop staging (Masthead, Peek, the portrait clip frame,
   the prose→ascii morph, scroll-snap, the wheel-driven two-state model) to the stacked quiet
   layout. Two ways in, and both are load-bearing: width, because below 1220 the composition's
   own pieces stop fitting (Masthead's original gate); and touch, because the two-state model
   is COMMITTED BY THE WHEEL HANDLER — a touch scroll never fires it, so a wide tablet
   (iPad Pro landscape is 1366) was left mid-morph with snap points it could strand between.
   Same capability gate SplitStage uses for the landing's stacked halves.

   The JS below mirrors the CSS list exactly — the `stacked` flag and the tile measurement in
   Panel's onClick must agree with the stylesheet about which of the two detail layouts is on
   screen, and a fractional viewport width can't fall in a gap between the two. */
const STACKED_MQ = '(max-width: 1220px), (hover: none), (pointer: coarse)';
const STACKED_MEDIA = `@media ${STACKED_MQ}`;
const isStackedViewport = () => window.matchMedia(STACKED_MQ).matches;

const PEEK_GEO = `
  --peek-x: 48px;
  --peek-w: ${PEEK_W}px;
  --peek-h: 216px;
  --peek-b: 92px;
  --peek-y: calc(100dvh - var(--peek-b) - var(--peek-h));
`;

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
  /* The colour window and the contact links share one box (see PEEK_GEO). */
  ${PEEK_GEO}
  /* The portrait column's width and Content's inline padding, declared once: the projects
     box cancels the pad to set its own insets, and cancels the RAIL too once the column has
     left (see --rail-out and ProjectsSection), so a literal in either place would silently
     misalign that edge. */
  --rail: 340px;
  --content-pad: 2rem;
  /* The rail's exit, 0 → 1: the portrait column slides out on the way down and the projects
     frame takes the width it leaves behind.

     A THRESHOLD, not a scrub, and that is the whole design of it. This page has exactly two
     states with no resting place between them (see UnclipRoot), and the wheel handler commits
     the entire range on any downward gesture — so there is no scroll position in between for a
     reader to hold. Driving the rail off --p would relayout the frame on every frame of a glide
     nobody can stop, to draw intermediate states nobody can see. The scroll listener toggles
     data-wide at WIDEN_AT and the two properties that read this carry their own transitions.

     Note what it does NOT touch: the grid TRACK stays --rail wide. Column's measure is a fixed
     640px narrowing to 290px (see there), independent of the track, so the readme's line count —
     and with it the ascii raster's row count, which is what makes the mark legible at all — is
     unaffected, and the prose's own centring never moves during the morph. The frame's height is
     a remainder of the viewport (see RowFrame), so widening it changes its RATIO and nothing
     else: the document's scroll range, and therefore --p's own denominator, hold. */
  --rail-out: 0;

  &[data-wide] {
    --rail-out: 1;
  }

  /* The section's arrival, 0 → 1: the ruled ground slides in from the right and the panels rise
     behind it (see ARRIVE_AT). A flip like --rail-out and for the same reason — there is no
     scroll position between the page's two states for a reader to hold a half-arrived section
     at — but note the fallbacks below run the OPPOSITE way round to the rail's.

     --rail-out's safe stranded value is 0 (the column stays); this one's is 1. A stranded 0
     leaves the panels at opacity 0, which is not a decoration going missing but the section's
     entire content. So both fallbacks pin it on the BARE selector, where an attribute already
     on the element can only agree with them. */
  --arrive: 0;

  &[data-arrived] {
    --arrive: 1;
  }

  /* The scroll listener returns early under reduced motion, so on a cold load data-wide is
     never written and this is dead. It is here for the WARM one: useReducedMotion can resolve
     after first paint, and a preference that flips mid-page tears down the listener without
     clearing the attribute it already set — leaving the column 340px off-screen on a layout
     that is now plain flow, with nothing having moved in to take its place. data-merged runs
     the same exposure and is left alone, because stranded it costs some inline paragraphs;
     stranded, this one costs the portrait. */
  @media (prefers-reduced-motion: reduce) {
    &[data-wide] {
      --rail-out: 0;
    }
    /* See --arrive above: on, and on the bare selector, so a preference that flips warm cannot
       strand the panels invisible. */
    --arrive: 1;
    /* No mark here — LogoReveal is not even mounted — so the band goes back to being plain
       clearance under the nav, which is what this was before the mark moved into it. */
    --section-top: 5rem;
  }

  /* The strip of the first screen the section cue (label + chevron) occupies. The prose
     stage takes the rest, so cue + stage = one exact viewport. */
  --cue-h: 3.25rem;

  /* The projects section's top inset — which is the MARK'S BAND (see MARK_W). It used to be a
     constant clearing the fixed header; the mark now lands in that space, so the inset is what
     puts the panels below it instead of under it: the mark's own top offset, plus the block's
     measured height, plus air.

     --mark-h is written by the fit effect, because the block's height is font-driven and cannot
     be derived in CSS. The fallback is MARK_W at the feather's ~2.5 ratio, so the band is about
     right for the frame or two before that effect first runs.

     Note it costs the first screen nothing: the section is pulled back up by exactly
     --section-top + --cue-h (see there), so growing this moves the frame down and leaves the cue
     strip where it was. */
  --section-top: calc(${MARK_TOP}px + var(--mark-h, ${Math.round(MARK_W * 2.5)}px) + ${MARK_GAP}px);
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
  --swap: ${SWAP_AT};
  --swap-run: ${SWAP_RUN};
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

  /* Below the stage cutover (STACKED_MQ) the morph is off, but the scroll listener still
     writes --p here — so EVERY beat has to be pinned off explicitly or it leaks onto the
     stacked layout, where the page is plain flow and nothing is transforming. Two of these
     were caught leaking in testing: the paragraph gaps closing, and the leading tightening
     as you scrolled. */
  ${STACKED_MEDIA} {
    grid-template-columns: 1fr;
    --collapse-t: 0;
    --lh-t: 0;
    --narrow-t: 0;
    --emerge-t: 1;
    /* There is no rail below the cutover — the grid is one column — so there is nothing to
       slide out and the frame already has the width. Pinned here rather than at each reader,
       because all three of them reach it only through var().

       On the ATTRIBUTE, not on the bare selector, and that is not decoration: a media query
       adds no specificity, so a plain --rail-out: 0 here loses to &[data-wide] above and the
       portrait column slides clean off. Third beat caught leaking this way. */
    &[data-wide] {
      --rail-out: 0;
    }
    /* No roll and no sequence here — the page is plain flow — so the section is simply there.
       Bare selector, like the reduced-motion pin above. */
    --arrive: 1;
    /* The reveal is display: none below the cutover, so there is no band to reserve. */
    --section-top: 5rem;
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

  /* Off wherever the two-state model does not hold: below the stage cutover the page stacks
     into ordinary flow with far more than two screens of content, and under reduced motion the
     morph is disabled and the stage is unpinned, so snapping would only skip past the readme. */
  ${STACKED_MEDIA} {
    html {
      scroll-snap-type: none;
    }
  }
  @media (prefers-reduced-motion: reduce) {
    html {
      scroll-snap-type: none;
    }
  }

  /* Below the cutover the portrait stacks full-bleed under the fixed nav, and the nav's page
     ink has no contrast over the photograph — the same problem /lab's index hit, solved
     the same way (see Lab.tsx): the track gets a self-contained dark glass plate with
     its ink pinned white and the dark-surface mark. */
  ${STACKED_MEDIA} {
    [data-nav-track] {
      background: rgba(12, 13, 16, 0.58);
      -webkit-backdrop-filter: blur(10px) saturate(140%);
      backdrop-filter: blur(10px) saturate(140%);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: ${({ theme }) => theme.radius.pill};
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

  ${STACKED_MEDIA} {
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

  ${STACKED_MEDIA} {
    clip-path: none;
  }

  ${STACKED_MEDIA} {
    height: 42vh;

    /* No cut-out letters to line up with here, so the column goes back to a plain
       cover crop. */
    .img {
      background-size: cover;
      background-position: center 28%;
    }
  }
`;

/* A tall colour window low in the b&w column: a sibling of Portrait (so it escapes the
   grayscale filter) carrying the same fixed image — no frost, the sharp original picture
   in colour behind a thin light outline. Desktop-only, like the rest of the composition. */
const Peek = styled(motion.div)`
  position: absolute;
  left: var(--peek-x);
  top: var(--peek-y);
  width: var(--peek-w);
  height: var(--peek-h);
  z-index: 4;
  pointer-events: none;
  outline: 1px solid rgba(255, 255, 255, 0.75);
  /* The same chromatic aberration the header's current link wears, red fringing one way and
     cyan the other — but a photograph has no text-shadow to split, so the split is a real
     channel misregistration (see the filter in the JSX below). It lands on the window and
     nothing else: the rest of the column is grayscale, so this is the only place on the page
     where an RGB split has channels to pull apart. The white outline is inside the filter's
     input, so the frame fringes too — which is where the effect is most legible, the picture
     being soft and dark through most of the window. */
  filter: url(#readme-aberration);

  /* An aberration is a lens artefact, i.e. decoration. It also cannot be read as movement —
     it is static — so this is a taste call rather than a safety one: the reduced-motion
     reader gets the clean window. */
  @media (prefers-reduced-motion: reduce) {
    filter: none;
  }
  ${sharpImage}
  /* The element's page offset, subtracted so the window continues the column's picture. */
  background-position: calc(var(--portrait-x) - var(--peek-x)) calc(-1 * var(--peek-y));

  ${STACKED_MEDIA} {
    display: none;
  }
`;

/* Where to reach me, set beside the colour window rather than anywhere in the prose: the
   column is the one part of this page that holds still, and the readme's last screen is the
   ascii mark, which is no place to put an address.

   BOTTOM-aligned with the window, not top: the stack grows upward from a shared floor, so
   adding or dropping a link moves the list's head and never its foot — the two objects stay
   locked to one line at the bottom of the column whatever the list holds.

   Unlike the rest of the composition this survives every width. The window, the wordmark and
   the cut are staging; an address is content, and a reader on a phone needs it more than a
   reader with the whole poster in front of them. */
const ContactRail = styled(motion.nav)`
  position: absolute;
  left: calc(var(--peek-x) + var(--peek-w) + 18px);
  bottom: var(--peek-b);
  z-index: 4;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.3rem;

  /* The column is 42vh of photo here, not a full-height poster, so the deep floor the desktop
     inset buys would push the stack up into the middle of the picture. Right corner, not
     left: the plain "readme" title (MobileTitle below) holds the picture's bottom-left.
     This also supersedes the "window it hangs off is gone" left-edge fallback the 1220 cutover
     used to carry on its own: both land at the same breakpoint now, and the corner placement
     wins. */
  ${STACKED_MEDIA} {
    left: auto;
    right: ${p => p.theme.space[3]};
    bottom: ${p => p.theme.space[3]};
    align-items: flex-end;
  }

  a {
    font-family: ${p => p.theme.font.mono};
    font-size: 0.68rem;
    font-weight: 400;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    text-decoration: none;
    /* Literal white, not an ink token: this sits on the column's dark frost, which does not
       follow the page's surface — the light page around it would resolve the token to near
       black and lose the links against the picture. */
    color: rgba(255, 255, 255, 0.72);
    transition: color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  }

  a:hover,
  a:focus-visible {
    color: rgba(255, 255, 255, 1);
  }
`;

/* Mobile's stand-in for the cut-out wordmark: the Masthead stencil is desktop staging and
   never renders here, which left the page untitled on a phone. Plain Anton — the wordmark's
   own face, no stencil, no effects — set in the picture's bottom-left corner, opposite the
   contact links. Literal white like the rail's links: it sits on the photograph, which does
   not follow the page surface. */
const MobileTitle = styled.div`
  display: none;

  ${STACKED_MEDIA} {
    display: block;
    position: absolute;
    left: ${p => p.theme.space[3]};
    bottom: ${p => p.theme.space[3]};
    z-index: 4;
    font-family: 'Anton', sans-serif;
    font-size: 2.1rem;
    line-height: 1;
    color: rgba(255, 255, 255, 0.92);
    pointer-events: none;
  }
`;

const CONTACT_LINKS = [
  { label: 'X', href: 'https://x.com/Parn_Fe' },
  { label: 'Email', href: 'mailto:fei.hu@fei.io' },
  { label: 'GitHub', href: 'https://github.com/hfknight' },
  { label: 'LinkedIn', href: 'https://www.linkedin.com/in/feihu/' },
];

/* The rail's entrance, staggered. The stack is vertical but each link arrives from the LEFT,
   along the same axis the whole column just travelled in on — so the three read as the tail of
   that one movement rather than as a separate drop-in crossing it. The parent paints nothing;
   it exists to hold the stagger, which is why `hidden` is empty. */
const railVariants = {
  hidden: {},
  shown: { transition: { delayChildren: 0.95, staggerChildren: 0.09 } },
};

const linkVariants = {
  hidden: { opacity: 0, x: -16 },
  shown: { opacity: 1, x: 0, transition: { duration: 0.5, ease } },
};

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

  /* The exit (see --rail-out on Page). The whole composition leaves as one piece, exactly as it
     arrived — picture, wordmark and Peek — because they are all anchored to this box.

     The translate PROPERTY, not transform: framer owns this element's transform for the
     entrance below (x: -100% → 0) and leaves an inline style on it afterwards, which a CSS
     transform could not win against. translate composes with transform independently, and both
     are translations here, so the order they compose in does not matter. */
  translate: calc(var(--rail-out, 0) * -100%) 0;
  transition: translate ${RAIL_S} cubic-bezier(0.16, 1, 0.3, 1);

  ${STACKED_MEDIA} {
    position: relative;
    height: auto;
  }

  /* --rail-out never leaves 0 under reduced motion — the listener that toggles data-wide
     returns early — so this only covers a change of preference on a page already scrolled. */
  @media (prefers-reduced-motion: reduce) {
    transition: none;
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

  ${STACKED_MEDIA} {
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

  /* Above the projects section, which is its next SIBLING. Both are positioned with an auto
     z-index, so document order decided it and the section won — which was invisible while the
     mark finished in a band the section never reached, and became a blank panel the moment the
     section grew to a full screen and the mark came to rest ON it.

     Safe against the roll it might look like it breaks: what this layer still has to show at
     that point is the mark alone. The prose underneath it is already gone — its fade and the
     mark's are two halves of one crossfade (see --swap), and the mark does not reach full
     opacity until the frame's top has passed it — so nothing is being held over the rising box
     except the thing that is meant to sit on it. */
  z-index: 1;

  /* The cost of that z-index, paid back. This box is a full viewport with no fill, so once it
     paints above the section it is an invisible sheet over the panels — measured, panels two
     and three hit the Stage itself and the fourth hit a Graf, and none of the three could be
     hovered or clicked. Nothing here needs to catch a pointer on its own account, so it does
     not: only the prose does, and it takes it back below. */
  pointer-events: none;

  ${STACKED_MEDIA} {
    position: static;
    height: auto;
    display: block;
    /* Plain flow, prose above box — nothing overlaps, so nothing needs lifting. */
    z-index: auto;
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

   The trajectory ends ON THE LAST PANEL, not centred on the page: at p=1 the unit's centre has
   travelled to that panel's centre on both axes, and its scale has come down far enough that
   the whole ascii portrait sits within it. The end values depend on real layout (the viewport,
   and the row's own geometry), so they are measured and written as --fit-dx / --fit-dy /
   --fit-scale by AsciiPortrait's fit effect rather than derived in CSS — calc() cannot divide a
   length by a length to make a scale. The var() fallbacks only cover the beat before that
   effect first runs.

   The sideways half is --fit-dx. Note it is a second, independent horizontal offset from the rail recentring
   on `translate` below — they compose, and they are separate because they answer to different
   things: the rail correction follows a STATE (the rail going, hence a transition) and this
   follows the SCROLL (hence --p, and no transition). Both are unscaled: translateX sits before
   scale() in this list, so it resolves in the parent's pixels rather than the shrunken block's.

   Scale and translate are LINEAR in --p on purpose: scroll position is the easing. */
const SwapUnit = styled.div`
  position: relative;
  width: 100%;
  transform: translate(
      calc(var(--p, 0) * var(--fit-dx, 0px)),
      calc(var(--p, 0) * var(--fit-dy, -18vh))
    )
    scale(calc(1 + var(--p, 0) * (var(--fit-scale, 0.4) - 1)));
  will-change: transform;

  /* The horizontal half of the trajectory, and it is a SEPARATE property from the one above on
     purpose. The unit is centred in the content track, so once the rail has gone the mark would
     finish half a rail right of the viewport's centre line, floating off-axis over a frame that
     is now symmetric — the one thing the wide state gets visibly wrong. Half the rail back to
     the left puts it on the viewport's centre, where the finished composition wants it.

     It rides the same flip as the rail (see --rail-out on Page), so it needs a transition — and
     the transform above must NOT have one, or the scrub would lag a frame behind the scroll and
     the crossfade would slip out of register. The translate property carries its own, and being
     the outermost of the two it is applied UNSCALED, which is what a recentring wants: a
     constant offset, not one that shrinks with the block.

     It does NOT finish before the mark emerges, and it does not need to. Measured against a real
     snap glide: --emerge-t opens around 155ms, by which point this is ~70% travelled, and the
     last ~34px are spent in the tail of the ease while the mark is surfacing. So what overlaps
     the emergence is a decelerating settle rather than a block still crossing the screen — the
     same overlap the four morph beats are built on (see --swap on Page), not a collision. */
  translate: calc(var(--rail-out, 0) * var(--rail) / -2) 0;
  transition: translate ${RAIL_S} cubic-bezier(0.16, 1, 0.3, 1);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* Below the stage cutover the page stacks in plain flow — but the scroll listener still
     writes --p there, so the transform must be explicitly off, exactly like Column's. */
  ${STACKED_MEDIA} {
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

  /* Taken back from the Stage, which gives up pointer events wholesale (see there). The prose
     is the one thing on that layer that needs them — the principles' terms are hover targets.
     Given up again once the crossfade is over: from there the prose is invisible, shrunk to a
     block the size of a panel and parked on top of one, and hover targets it no longer shows
     are just a hole in the section underneath. */
  pointer-events: auto;

  [data-swapped] & {
    pointer-events: none;
  }
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

  /* max-width stays a phone-scale rule: with --narrow-t pinned to 0 this already resolves to
     the 640px measure above (see MEASURE_NARROW's comment) — a centered editorial column,
     which is what the stacked band wants. Widening it here would give a ~120-char line at
     tablet widths. */
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    max-width: none;
  }

  /* opacity IS a morph pin — the scroll listener writes --p at every width, and this ramp
     reads it — so it has to be pinned to 1 wherever the morph is off, same cutover as Page. */
  ${STACKED_MEDIA} {
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

  /* Never below the stage cutover: the page is plain flow there and the readme stays four
     paragraphs, but the scroll listener still writes the attribute. */
  ${STACKED_MEDIA} {
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
/* The travel has to be exactly ONE tile, or the loop visibly snaps.

   The gradient repeats (background-repeat defaults to repeat), so the pattern's period is the
   background's own width. A percentage background-position resolves against
   (container - image), which at 200% is -1 container width — so 100% -> -100% moves the image
   by exactly 2 container widths, which IS its width, and the frame after the last is identical
   to the first. The earlier pairing did not divide: 220% wide travelling 120% -> -120% moved
   2.88 widths against a 2.2-wide tile, i.e. 1.31 tiles, leaving 0.68 of a tile to jump back
   every cycle.

   It also needs both ENDS of the gradient to be the same colour — they are, ink at 0% and at
   100% — or the seam shows as a hard edge even when the arithmetic is right. */
const shimmer = keyframes`
  from { background-position: 100% 0; }
  to { background-position: -100% 0; }
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
    background-size: 200% 100%;
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
  /* One term, so it breaks as one. The space below is a real space and the measure is free to
     wrap at it — which left "top" ending a line and the rolling number starting the next, an
     odometer with nothing to read it against. */
  white-space: nowrap;
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
    I've spent over a decade building brand-defining websites and business-critical SaaS
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

  ${STACKED_MEDIA} {
    display: none;
  }

  /* The clone carries the readme's own styled-components classes — which is what makes it lay
     out identically, but also means it inherits whatever those classes declare. Two of them have
     to be taken back, both !important because the clone's copy of the class and the rule here
     have the same specificity and only source order would decide it.

     opacity: it inherits Column's FADE-OUT ramp, so left alone the clone dies exactly as this
     layer brings it in and the reveal never appears at all.

     pointer-events: this layer gives them up, but Column claims them back (its principles are
     hover targets) — and the clone's copy claims them just the same, from on top of the real
     prose. The readme's hover treatments were simply unreachable: every pointer landed on the
     invisible copy. Nothing in here is ever interactive, so it gives them up for good. */
  > * {
    opacity: 1 !important;
    pointer-events: none !important;
  }

  /* The ink the whole reveal is mixed from — a single variable because the flat field and all
     nine levels below have to move together.

     The page's own ink, and it stays that: the mark lands in the band ABOVE the frame (see
     MARK_TOP), which is paper at every point of the sequence — the panels now start below it
     rather than under it. It was white for as long as the mark finished ON a panel, and it
     briefly had to change colour mid-sequence for as long as the mark landed on the frame
     before the panels rose into it. Both are gone with the overlap. */
  --ascii-ink: ${p => p.theme.color.ink};

  /* Everything flattens to the flat ink (the per-character rules below then lift the mark out
     of it). !important because no descendant may keep its own colour — AmplifyTerm sets one,
     and it would otherwise survive as a dark bar across the reveal. */
  * {
    color: color-mix(in srgb, var(--ascii-ink) ${ASCII_FLAT}%, transparent) !important;
  }

  ${ASCII_LEVELS.map((mix, i) => {
    const d = mix - ASCII_FLAT;
    return css`
      span[data-l='${i}'] {
        color: color-mix(
          in srgb,
          var(--ascii-ink)
            calc(${ASCII_FLAT}% ${d < 0 ? '-' : '+'} ${Math.abs(d)}% * var(--emerge-t, 1)),
          transparent
        ) !important;
      }
    `;
  })}
`;


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
         so the fit is height-bound. Both steps live in ./lab/entries/asciiSample, shared with
         the lab entry that takes this apart; rects go in relative to the block's own origin. */
      const raster = rasterise(img, LOGO_RASTER_H);
      if (!raster) return;
      const mark = fitMark(box.width, box.height, img.naturalWidth / img.naturalHeight);
      const top = ASCII_LEVELS.length - 1;

      chars.forEach((span, i) => {
        const r = rects[i];
        const level = levelAt(
          r.left + r.width / 2 - box.left,
          r.top + r.height / 2 - box.top,
          mark,
          raster,
          top,
        );
        span.setAttribute('data-l', String(level));
      });

      if (!cancelled) setBuilt(true);
    };

    return () => {
      cancelled = true;
    };
  }, [columnRef]);

  /* The fit: measures what the CSS trajectory cannot derive (see SwapUnit) and writes it to
     Page as --fit-scale / --fit-dx / --fit-dy. The scale comes from MARK_W, so it does not
     depend on the section's height — and nothing depends on it in return now that the mark
     overlays the section instead of sharing the screen with it (see MARK_W).

     The block is measured in the state it ENDS in — narrowed, tight, merged — not the reading
     state it is in at rest, using the same forced read the sampler above does. That matters:
     narrowing reflows 14 wide lines into ~30 short ones, so the resting block is 640x538 and
     the fitted one 290x718. The old code scaled against the resting height and the fitted
     block therefore came out a third taller than the space it was fitted to. The height cannot
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
      page.style.setProperty('--fit-scale', String(fit));
      /* The fitted block's height, published so the section can reserve a band for it (see
         --section-top on Page). This is the one figure CSS cannot get at: the block's height is
         font-driven and only the forced read above knows it. */
      const markH = h * fit;
      page.style.setProperty('--mark-h', `${markH}px`);

      /* Where the mark comes to rest: the TOP of the screen, on the viewport's centre line.

         Both figures are offsets applied to the block's CENTRE, which at rest is the viewport's
         centre (Stage is a full viewport and centres it), hence the -vh/2 and the zero.

         Horizontally there is nothing to measure. Zero is the viewport's centre line, and the
         block gets there by itself: SwapUnit's own recentring takes back half the rail when the
         column leaves (see there), which is exactly the difference between the content track's
         centre and the viewport's. The mark used to park over the LAST PANEL, which did need the
         row's geometry — none of that survives the move.

         Vertically it is a constant from the top (see MARK_TOP), which holds because at p=1 the
         section's top edge is flush with the viewport's. The frame follows the mark rather than
         the other way round, so nothing about the row is in this. */
      page.style.setProperty('--fit-dx', '0px');
      page.style.setProperty('--fit-dy', `${MARK_TOP + markH / 2 - vh / 2}px`);
    };
    apply();
    window.addEventListener('resize', apply);
    return () => window.removeEventListener('resize', apply);
  }, [built, pageRef]);

  return <RevealLayer ref={hostRef} aria-hidden />;
};

/*
 * Selected side projects — a row of panels that share its width and trade it on hover: the
 * hovered panel takes a larger share while its neighbours give theirs up, and its scrim lifts
 * so the panel reads as stepping forward. One flex row, animated on flex-grow; no
 * measurement, no layout projection.
 *
 * The count is not fixed anywhere — the row, the accordion and the wipe all derive from
 * PROJECTS.length. One figure does not follow automatically though: the accordion's emphasis
 * dilutes as panels are added, so adding one means re-checking the hovered grow. See PanelRow.
 *
 * Hover-only by design: nothing here is clickable, so nothing joins the tab order, which
 * matches every other treatment on this page. The links will live in the prose instead.
 *
 * Three states, and the panel's copy is what distinguishes them: at rest the accent rule,
 * the eyebrow and the NAME only; hovered (or focused) the blurb fades up under it; opened
 * the detail paragraph replaces both in the hero's caption. So the blurb is gated — see
 * PanelBlurb, which fades rather than unhides, to keep the reveal off the layout.
 *
 * Both image fields are optional. Without one a panel renders as deep ink with a raking
 * gradient — the same material as the portrait column, which keeps the section in the
 * page's palette rather than parking a grey placeholder box on it. Dropping a path in
 * lights the photograph up with no other change.
 */
interface Project {
  name: string;
  blurb: string;
  year: string;
  kind: string;
  /* The RESTING PANEL's picture, shown as a tilted plate (see PanelShot).

     Captured at a ratio of about 0.8 — a desktop-WIDTH window that is taller than it is wide —
     and that figure is the useful part of this comment. The front page is a full-height grid,
     so its window's proportions decide the shape of the picture, and the two ends of the range
     are both wrong. A normal 1.6 landscape leaves the panel showing nine tenths of a single
     card, because the panel is steeply portrait and cover has to fill it. Going all the way to
     the panel's own aspect (~0.43) fills it with the page entire, but stretches the grid until
     its cards are enormous and it stops reading as a desktop site. 0.8 keeps the three-column
     layout looking like itself while giving the crop nearly two cards to work with. */
  image?: string;
  /* The same front page, captured LANDSCAPE (~1.6), for the opened split's wide pane.

     Two captures of one page, and the reason is the two slots' proportions rather than anything
     about the page: the panel is steeply portrait and the pane is landscape, so the ratio that
     serves one crops badly in the other. The pane is roughly the shape a browser window is, so
     it takes the shot at roughly a browser's ratio and shows the front page more or less whole —
     which is the point of the opened view, where there is room to look at it properly. */
  imageWide?: string;
  /* The tall screenshot — a desktop capture run down a long interior page. Used ONLY in the
     opened split, as the narrow pane, where fitting a smaller width makes it run past the
     bottom and so show more of the site. Nothing falls back to anything here: the split plays
     its two panes against each other, so it wants imageWide and imageTall both or neither
     (see Detail).

     EVERY capture needs a browser with WEBGL, and one that has been DRIVEN. Two traps, both of
     which produce a screenshot that looks fine until you hold it next to the real site:

     1. The background is a WebGL canvas (canvas.lp-fluid — the green dot matrix behind the
        cards). Headless Chrome run the obvious way, with --disable-gpu, renders it empty and the
        capture comes back on flat black. Use --enable-unsafe-swiftshader and no --disable-gpu.
     2. The matrix is a FLUID, fed by pointer motion. With no pointer it decays to almost
        nothing, so `chrome --headless --screenshot` can never catch it however long it waits —
        the page has to be driven. Sweep the mouse across the viewport, then PARK IT OFF THE
        CARDS before shooting: leaving it over one holds that card in hover, which dims every
        other card's artwork. The hover releases in a few hundred ms; the fluid outlives it.

     Check for the green, and for all five cards being lit, before trusting a recapture.

     GEOMETRY, which is not guessable from the file and cost a wasted capture to rediscover:
     this is a DESKTOP capture DOWNSCALED, not a narrow viewport. Shoot the full page at 1400
     CSS wide at DPR 2, then resample the result to 900px wide. Shot at 450 instead — the width
     the finished file implies — the site serves its stacked mobile layout and the page comes
     out nearly five times longer. The 1400 is recoverable from the asset if it is ever lost
     again: the height that width produces, scaled to 900, is what the file already is. */
  imageTall?: string;
  /* The longer copy for the detail view. Falls back to `blurb` when absent, so a project
     can ship with one line and gain a paragraph later. */
  detail?: string;
  /* A walkthrough, shown in a phone frame where the split would otherwise be (see Detail).
     This is the THIRD thing the detail can show, after the two-shot split and the bare skin,
     and which one a project gets is decided by what it carries rather than by a mode flag.

     Two encodes, and the pair is the point: the webm is AV1, both smaller and higher fidelity
     than the mp4, but Safari only decodes AV1 where the hardware can. Declared first, so
     everything that can take it does and the rest fall through to H.264 — which is the only
     reason to ship the larger file at all. Both or neither; a lone mp4 would work but would
     serve twice the bytes to every browser that never needed it.

     `image` doubles as the poster, so it wants to be a frame of the same capture at the same
     size — otherwise the handover from poster to first frame is a visible jump. */
  videoWebm?: string;
  videoMp4?: string;
  /* A picture behind whatever the detail stages in its media column — for now the phone. The
     stage's default is one soft pool of light (see MediaStage); this replaces it where the
     project has a WORLD worth putting the object in rather than just empty room. It is scenery
     and gets treated as such: heavily damped, so it stays behind the device instead of becoming
     the thing you look at. */
  backdrop?: string;
  /* The project's id in the Obsidian community registry, where a plugin's install numbers are
     public. Carried as the ID rather than as a flag because it IS the key the endpoint looks up
     — one string, and the detail asks for the numbers only where there are numbers to ask for.
     See functions/api/plugin-stats. */
  pluginId?: string;
  /* An app tile in place of a capture — for a project whose face is a MARK rather than a
     screen. A plugin has no interface of its own worth photographing: what it puts on screen is
     a note inside someone else's application, so a capture would mostly be that application.
     The tile is what the thing looks like where you actually meet it, in a plugin directory.

     A key rather than a component, so this array stays data. See AppTile. */
  tile?: 'bookmark';
  /* Where the thing actually is, shown in the detail (see DetailLink). The label is DERIVED
     from this rather than carried beside it, so there is one string to keep true and no way for
     the two to disagree — and what a reader wants from a portfolio link is the destination, not
     a verb. For the two sites that makes it a near-repeat of the name above, which reads as
     confirmation rather than as redundancy; for the plugin the host is the more useful half,
     since it is what says the thing is listed rather than self-published. */
  url?: string;
  /* Set when `image` is a capture of a LIGHT interface. The panel's three layers — plate, veil,
     shim — were tuned against game key art and white UI type on a dark page, which is bright in
     places but dark overall. A near-white app screenshot is not: at full strength it turns its
     panel into a lit rectangle in a row of dark ones, and the name over it stops reading.

     Declared per project rather than fixed in the scrim because it is a fact about the SOURCE,
     not a preference — and a heavier scrim for everyone would flatten the captures that are
     already dark. See PanelShot for what it does. */
  lightCapture?: boolean;
}

/* TODO: two placeholders left — swap in the real second and third. */
const PROJECTS: Project[] = [
  {
    name: 'videogamers.fyi',
    blurb: 'Tells you what a game is right now, not what it was at launch.',
    detail:
      'This website answers one question: is this game worth it right now? Most game ' +
      'coverage is frozen at launch — here, player counts and patch data refresh every six ' +
      'hours, community sentiment daily, the verdict itself weekly. Nothing reaches a page ' +
      'unsourced: verdicts link out to the timestamped player reviews behind them, so any ' +
      'claim can be checked. It targets the questions that go stale fastest: is it dead, is ' +
      "it fixed, is it worth this price, is it the better pick over the one you're also " +
      'weighing. It runs end to end without an editor — I choose which games it covers, the ' +
      'pipeline does the rest.',
    year: '2026',
    kind: 'Automated gaming site',
    url: 'https://videogamers.fyi',
    image: '/warmind-home@2x.webp',
    imageWide: '/warmind-home-wide@2x.webp',
    imageTall: '/warmind-game@2x.webp',
  },
  {
    name: 'fanmatchday.com',
    blurb:
      'Plans your FIFA World Cup 2026 matchday, hotel to kickoff, in about thirty seconds.',
    detail:
      'A matchday planner for World Cup 2026. Tell it your hotel and your match, and it ' +
      'gives you a door-to-door plan: when to leave, which train, whether your backpack ' +
      "clears FIFA's bag rules, whether it'll be 100°F at kickoff. Eleven US host stadiums, " +
      "78 matches, English and Spanish, all running on Cloudflare's edge. Every plan is " +
      'written by an LLM against a per-stadium knowledge base I curated: 242 entries ' +
      'covering transit, parking, bag policy, weather, and food. Plans are generated and ' +
      'cached on a coarse key (stadium, match, origin area, language), then personalized at ' +
      'render time: your hotel goes into the cached prose, and a live strip fetches real ' +
      'driving and transit ETAs from your actual coordinates. One paid generation serves a ' +
      'whole neighborhood of hotels; every fan still sees times from their own doorstep.',
    year: '2026',
    kind: 'World Cup 2026 planner',
    url: 'https://fanmatchday.com',
    image: '/fanmatchday-home@2x.webp',
    lightCapture: true,
    videoWebm: '/fanmatchday-walk.webm',
    videoMp4: '/fanmatchday-walk.mp4',
    backdrop: '/fanmatchday-bg@2x.webp',
  },
  {
    name: 'X Bookmarks Sync',
    blurb: 'Saves your X bookmarks into Obsidian as real notes, with no API key.',
    detail:
      'Sync your X (Twitter) bookmarks directly into your Obsidian vault as clean, ' +
      'structured Markdown notes. No API key. No OAuth. Just your existing browser session. ' +
      'It runs in an embedded webview against the session you already have, and reads your ' +
      'bookmark list directly rather than scrolling the page, so a large library syncs ' +
      'quickly. Each run confirms it actually reached the end of the list; when it cannot, ' +
      'the next one re-scans in full rather than assuming. Sync incrementally, pick from a ' +
      'checklist, or pull the full body of a long-form X article into its note.',
    year: '2026',
    kind: 'Obsidian plugin',
    url: 'https://community.obsidian.md/plugins/x-bookmarks-sync',
    pluginId: 'x-bookmarks-sync',
    tile: 'bookmark',
    /* Not a capture — there is nothing to capture (see `tile`) — but the same field, because
       it does the same job in both places: the resting panel's picture, which the detail then
       opens onto. Carrying it here rather than as a second backdrop key is what makes the two
       states continuous: the panel is already showing this sky when it is clicked. */
    image: '/xbookmarksync-bg2@2x.webp',
  },
];

/* A project whose picture fills the whole opened frame rather than the picture column: a mark
   staged in a scene (see MediaStage's bleed wash). Derived rather than declared, because it is
   what the two keys TOGETHER mean — and read in both states, which is the point: the resting
   panel has to lay its picture out against the same box the detail will cover against, or the
   crop jumps at the hand-off. */
const bleeds = (p: Project) => !!(p.tile && p.image);

const PANEL_S = '0.55s';
/* Shared by Panel and by PanelSlot, which has to match it — see PanelSlot. */
const PANEL_PAD = '1.5rem';

/* How the opened frame divides: screenshots left, copy right. The pictures take the larger
   share — they are the evidence — and the copy a column narrow enough to read as a caption
   rather than a second body of text. SHOT_WIDE then splits the picture side.

   SHOT_WIDE is where the diagonal STARTS, not where it stays: it is the initial value of a
   figure the reader drags (see SplitHandle). A number rather than a CSS string because it is
   also the seed of that state and gets arithmetic done to it. */
const SPLIT_SHOTS = '63%';
const SHOT_WIDE = 68;
/* The slant on the boundary between the two panes, in px — see the drag machinery below. */
const SHOT_SLANT = 72;

/* The picture-side column, restated in the ROW's terms so a resting panel can size against it
   (PanelRow is an inline-size container). SPLIT_SHOTS is the same figure as a share of the
   opened frame; this is the number of pixels that comes to. */
const SHOT_COL = `calc(100cqw * ${parseFloat(SPLIT_SHOTS) / 100})`;

/* What a HOVERED panel widens to, and it is not a taste figure: it is the width of the wide
   shot's own pane in the opened detail, measured at the diagonal's NARROW end (the bottom, see
   EDGE_BOT). So hovering a windowed panel shows exactly the run of the screenshot that survives
   the split, and opening continues past it rather than re-cropping.

   The narrow end rather than the wide one on purpose: everything the hover reveals is then
   unambiguously the wide pane's, with none of the wedge the tall shot takes back lower down. */
const PANEL_HOVER_W = `calc(${SHOT_COL} * ${SHOT_WIDE / 100} - ${SHOT_SLANT}px)`;

/* The band kept clear at the bottom of a panel for its blurb, which is taken OUT of flow so
   that nothing above it can move (see PanelBlurb).

   Two lines of the blurb's own type — 0.85rem at a 1.5 leading. Sized against the RESTING
   width, not the hovered one, because that is the narrowest the blurb is ever actually read at:
   the accordion widens on hover, but a keyboard focus shows the copy with the panel still at its
   resting share. The longest blurb today sets to exactly two lines there. One that runs to three
   will be cropped by the panel's own overflow rather than pushing anything — keep them short, or
   raise this and re-check that the names still sit where the composition wants them. */
const BLURB_H = `${0.85 * 1.5 * 2}rem`;

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
  /* A whole screen, where it used to be the label plus whatever the frame's own height came
     to. The frame is no longer the REMAINDER of the viewport (see MARK_W) — the section takes
     the screen and the frame takes the section, so the arithmetic that used to subtract the
     ascii band above and the cue below has nothing left to subtract.

     Height only. NOT width: 100dvw — this box already bleeds past the content track on both
     sides with negative margins, and a viewport width on top of those overflows the document
     rather than filling it. 100dvw also counts the vertical scrollbar's width on desktop, so
     it is a horizontal scrollbar waiting to happen. The margins already reach the edges.

     A column, so the label keeps its place at the top and the frame absorbs everything left. */
  height: 100dvh;
  display: flex;
  flex-direction: column;

  /* The mat, and it is the whole screen now rather than the frame's own fill. It used to stop
     at the frame's edges so the section's insets stayed paper and the deliberately lopsided
     --frame-left / --frame-right (96 / 36 at 1440 — see Page) never read as an uneven border.
     That worry does not survive the move and does not need to: an uneven BORDER is visible, but
     there is no border here — the ruling runs edge to edge and is the ground the frame sits on.

     Graph paper rather than a flat fill: two hairline gradients crossed at --grid-cell. Static
     by design.

     A line has to fall exactly on the panels' edge — a grid this small looks accidental the
     moment it is cut mid-square against something straight — which is why the origin is
     SHIFTED to the frame's own top-left corner instead of tiling from this box's. The panels
     now start ON that corner (PanelRow gave up its mat), so the two agree at zero. The frame
     sits --frame-left across and --section-top + --cue-h down from here, and neither is a whole
     number of cells (96 and 132 against 10) — tiled from the section's corner the ruling would
     land a fraction of a cell off the panels on both axes. Anchored to the frame it continues outward
     across the rest of the screen. */
  --grid-cell: 10px;
  /* Ink at a low mix rather than a literal grey, so the ruling follows the surface and stays
     a tint of the page's own neutral instead of drifting to its own hue. 7% is the point at
     which it reads as texture at arm's length without resolving into stripes. */
  --grid-line: color-mix(in srgb, ${p => p.theme.color.ink} 7%, transparent);

  /* The ground's travel, timed here rather than at the ::before that spends it — a transition
     reads its timing from the state it is heading TO, so putting the two sets on the two states
     of this box is what makes the slide asymmetric. In: immediately, at reading speed, because
     it is the beat the panels arrive onto. Out: quicker, and held back until the panels have
     dropped, because it is the last thing left on screen and what it is waiting for is an empty
     stage (see GROUND_OUT_DELAY). Inherited by the pseudo-element like any custom property. */
  --ground-s: ${GROUND_S};
  --ground-delay: 0s;

  ${Page}:not([data-arrived]) & {
    --ground-s: ${GROUND_OUT_S};
    --ground-delay: ${GROUND_OUT_DELAY};
  }

  /* On a layer of its own rather than on the box, so it can FADE. The section's first 132px
     are on screen at rest — that is the cue strip showing under the prose — and painted
     directly on the box the ruling turned the bottom of the first screen into graph paper.
     The first screen is meant to be paper and nothing else, so the ground arrives with the
     section instead of waiting there inside it.

     A pseudo-element and not a background on the box because there is no way to fade a
     background-image alone; and ::before rather than ::after so tree order puts it under the
     label and the frame, both of which are positioned, without needing a z-index to say so. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-color: var(--n-0);
    background-image:
      linear-gradient(to right, var(--grid-line) 1px, transparent 1px),
      linear-gradient(to bottom, var(--grid-line) 1px, transparent 1px);
    background-size: var(--grid-cell) var(--grid-cell);
    background-position: var(--frame-left) calc(var(--section-top) + var(--cue-h));
    /* Beat 3: the ground SLIDES IN from the right once the mark has landed (see --arrive on
       Page). It used to fade in over the opening tenth of the roll, which made it part of the
       roll rather than an event of its own.

       The travel is its own width, so at rest it is parked entirely off the right edge — which
       is also why the ruling is not visible in the cue strip showing on the first screen, the
       job the old opacity ramp was doing. The overflow it makes on the way is caught by html's
       own overflow-x: hidden (see UnclipRoot); this box must not clip it itself, or it would
       clip the panels' hover growth with it.

       translate, not a transform: the section is the frame a clicked panel's layoutId flies
       inside, and a transform on this subtree — even an identity one at rest — would make it
       the containing block and hand framer the wrong reference frame. */
    translate: calc((1 - var(--arrive, 0)) * 100%) 0;
    transition: translate var(--ground-s) cubic-bezier(0.16, 1, 0.3, 1) var(--ground-delay);
  }

  /* --arrive is pinned on in both of these (see Page), so the ground is already in place and
     only the travel has to go: with no sequence to be part of, it is simply the mat. */
  @media (prefers-reduced-motion: reduce) {
    &::before {
      transition: none;
    }
  }
  /* Pulled back over the stage's last stretch. The stage is a full viewport so the prose can
     centre on the viewport's centre line; this negative margin is what still leaves the cue
     strip showing at rest — shortening the stage instead would have cost the prose its
     centring.

     It pulls back --section-top AS WELL AS --cue-h now. The label used to be the section's
     first pixel, so a cue-h of overlap put exactly the label on screen; with the nav clearance
     added above it, the same overlap showed 52px of blank padding and the cue disappeared from
     the first screen. Pulling both back lands the label in precisely the position it held
     before — the strip's bottom edge is the viewport's either way — and the extra padding now
     on screen above it is bare paper, indistinguishable from the page it sits on. */
  margin-top: calc(-1 * (var(--section-top) + var(--cue-h)));
  margin-inline-end: calc(-1 * var(--content-pad));
  /* The left edge, and it gives up TWO things at once when the rail leaves (see --rail-out on
     Page): the rail's own width, and the difference between the two insets — --frame-left's 6rem
     is there only to open air between the frame and the portrait column, so with no column to
     clear the frame falls back to --frame-right and wears an even border on both sides.

     Both folded onto the margin rather than split across margin and padding so that exactly ONE
     layout property is in the transition. It is the page's only animated layout, and it is a
     deliberate exception rather than an oversight: what reflows is this subtree alone — the
     label and a four-item flex row — and NOT the prose, whose measure is track-independent (see
     Column). The frame is also barely on screen while it runs; at rest only the cue strip shows.
     Nothing else here may follow it. */
  margin-inline-start: calc(
    -1 *
      (var(--content-pad) + var(--rail-out, 0) *
            (var(--rail) + var(--frame-left) - var(--frame-right)))
  );
  transition: margin-inline-start ${RAIL_S} cubic-bezier(0.16, 1, 0.3, 1);
  /* The top inset is new, and it is clearance rather than styling: the section now reaches the
     top of the screen, where the fixed header lives. Deep enough to seat the label under the
     nav rather than beside it. */
  padding: var(--section-top) var(--frame-right) var(--img-margin) var(--frame-left);

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
  /* The bottom snap point (see UnclipRoot): align this box's END with the scrollport's, which
     is the position the flow already settles at — the frame's bottom on the viewport's. So the
     snap target and the natural scroll end are the same place, and the two-state model costs
     the layout nothing. */
  scroll-snap-align: end;

  ${STACKED_MEDIA} {
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

   It is TWO labels in one strip, not one label that travels between two places. They read the
   same words but they are not the same thing: one is a cue on the readme's screen saying there
   is something below, the other titles the panels once they are there. As a single travelling
   element it had to be loud enough to matter at the end and therefore louder than a cue wants to
   be at the start, and it had to spend the whole roll crossing the screen to get from one job to
   the other. Parked separately, each can be sized for its own job and neither has to move.

   Both sit in the cue strip, which is the one thing showing below the prose at rest — so the
   first screen says there is a section here without the box itself peeking — and which lands
   directly above the panels once the section is up. Same slot, so nothing reflows between them;
   they simply hand over.

   The strip sits outside the mat, which begins where it ends: the labels stay on paper, and the
   ruled ground reads as the thing they are titling rather than as a band they sit inside. */
const SectionLabel = styled.h2`
  position: relative;
  height: var(--cue-h);
  font-family: ${p => p.theme.font.mono};
  text-transform: uppercase;
  margin: 0;

  ${STACKED_MEDIA} {
    height: auto;
    margin-bottom: 1.25rem;
  }
`;

/* Shared geometry: both labels fill the strip and centre in it vertically. Out of flow so the
   two can occupy the same slot and cross-fade without either reserving space from the other. */
const labelSlot = css`
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  white-space: nowrap;

  ${STACKED_MEDIA} {
    /* Back into flow, which is what gives the strip its height once --cue-h is off. */
    position: static;
  }
`;

/* The cue on the readme's screen: centred under the prose, and QUIET — a step down in size,
   weight and colour from the label that titles the panels. It is an affordance, not a heading,
   which is also why it is the aria-hidden one of the pair: the words are announced once, by the
   real heading below.

   Faded straight from --p on the same ramp as its own chevron, so the pair leaves together and
   early — by a fraction into the roll the box is visibly moving and the cue has done its job.
   No observer and no state, and nothing left on screen to collide with the section arriving. */
const RestCue = styled.span`
  ${labelSlot}
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.72rem;
  font-weight: 400;
  letter-spacing: 0.18em;
  color: ${p => p.theme.color.inkMuted};
  opacity: clamp(0, calc(1 - var(--p, 0) * 5), 1);
  pointer-events: none;

  /* Neither of these has a first screen for a cue to sit on — the page is plain flow and the
     panels are simply below the prose — and --p is never written under reduced motion, so the
     ramp above would leave this at full opacity beside the heading, the same words twice. */
  ${STACKED_MEDIA} {
    display: none;
  }
  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

/* The panels' own title: flush with the frame's left edge, in the chrome weight the cue steps
   down from. It arrives WITH the panels rather than with the section — same ramp, same delay as
   the first of them, so it reads as the head of the row rather than as part of the ground that
   slid in under it. Out with them too, on the exit's own faster timing (see PANEL_FALL_S).

   Left: 0 is the strip's content box, which is the section's — so this lands on the frame's left
   edge, the panels' own, rather than on the section's outer edge. */
const PanelsLabel = styled.span`
  ${labelSlot}
  left: 0;
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.22em;
  color: ${p => p.theme.color.ink};
  opacity: var(--arrive, 0);
  translate: 0 calc((1 - var(--arrive, 0)) * ${PANEL_RISE / 3}px);
  --label-s: ${PANEL_RISE_S};
  --label-delay: ${PANEL_RISE_DELAY}s;
  transition:
    opacity var(--label-s) linear var(--label-delay),
    translate var(--label-s) cubic-bezier(0.16, 1, 0.3, 1) var(--label-delay);

  ${Page}:not([data-arrived]) & {
    --label-s: ${PANEL_FALL_S};
    --label-delay: 0s;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The scroll affordance beside the cue: at rest the strip is the only thing under the prose, and
   the chevron says the box is further down. It rides the cue's own fade rather than carrying a
   second copy of that ramp — nested, the two would multiply. The inner bob draws the eye without
   a loud colour. */
const ScrollHint = styled.span`
  display: inline-flex;
  margin-left: 0.7rem;
  pointer-events: none;

  ${STACKED_MEDIA} {
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
     the largest rectangle the page can spare, and that is this one.

     It no longer derives that height itself. The section is a full screen and a flex column,
     so the frame simply takes what the label above it does not — the same remainder as before,
     but computed by the layout rather than by subtracting a list of constants that had to be
     kept in step with the band. */
  flex: 1 1 auto;
  min-height: 0;

  ${STACKED_MEDIA} {
    height: auto;
  }

  /* The band never appears here — the morph is off, so the page is plain flow, prose above
     box, and there is no fitted portrait to leave room for. With nothing to remain FROM, the
     frame goes back to being a shape. */
  @media (prefers-reduced-motion: reduce) {
    height: auto;
    aspect-ratio: 16 / 10;
  }

  /* The stacked cutover's OR-list distributed over the reduced-motion condition by hand — a
     comma list can't be AND-ed as one unit in a media query. */
  @media (prefers-reduced-motion: reduce) and (max-width: 1220px),
    (prefers-reduced-motion: reduce) and (hover: none),
    (prefers-reduced-motion: reduce) and (pointer: coarse) {
    aspect-ratio: auto;
  }

  /* Transparent. The ruling used to be painted here and stopped at this box's edges; it is the
     SECTION's now and runs the full screen (see ProjectsSection), which is also why the panels
     inside no longer hold a mat open to expose it. The section anchors the grid's origin to
     this corner, so the ruling still meets the panels on a whole cell. */
`;

const PanelRow = styled.div`
  display: flex;
  gap: var(--panel-gap);
  height: 100%;
  /* So a panel's plate can be sized against the FRAME rather than against its own box — which
     is what lets it hold still while the panel around it changes width (see PanelShot). */
  container-type: inline-size;
  /* No padding. There used to be a mat here — --img-margin all round, matching the portrait's
     poster border — and it existed to let the frame's own ruling show around the panels. The
     ruling is the section's now and runs the full screen, so the ground reads either side of
     the frame without the panels having to give up a border to expose it. */

  /* The accordion, and the hovered panel's width is now a MEASUREMENT rather than a ratio: it
     lands on PANEL_HOVER_W, the width of the wide shot's own pane in the opened detail, so
     hovering a windowed panel reveals exactly the run of the screenshot that survives the split
     and opening carries on past it (see PanelShot).

     Every width here is a BASIS, and that is the load-bearing part rather than a style. It was
     briefly grow-based with a fixed basis on the hovered panel, which bounced: flex-basis is not
     in Panel's transition list, so the basis jumped to its target while flex-grow was still
     easing 1 -> 0, and for that half second the panel held BOTH — measured at ~678px before it
     settled back to 432. Driving every panel off one animatable length means exactly one
     property moves and there is nothing to overshoot with.

     Both figures follow PROJECTS.length, so adding a panel needs no re-derivation — the thing
     the old grow ratio demanded every time. */
  --panel-w: calc(
    (100cqw - ${PROJECTS.length - 1} * var(--panel-gap)) / ${PROJECTS.length}
  );

  > * {
    flex: 0 0 var(--panel-w);
  }

  &:hover > * {
    --panel-w: calc(
      (100cqw - ${PROJECTS.length - 1} * var(--panel-gap) - ${PANEL_HOVER_W}) /
        ${PROJECTS.length - 1}
    );
  }
  & > *:hover {
    --panel-w: ${PANEL_HOVER_W};
  }

  ${STACKED_MEDIA} {
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
   same material and the magic-move has nothing to cross-fade. Fill ONLY — no photograph. Both
   places that carry one carry it as a separate layer above this (PanelShot, DetailSplit),
   because both need something a background cannot do: the panel tilts its picture, and the
   hero must not scale its own (see Hero). */
const panelSkin = css`
  background:
    linear-gradient(155deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.25)),
    ${p => p.theme.color.ink};
`;

/* A button, not a div: clicking opens the detail view, so it has to be reachable and
   operable from the keyboard. The panel carries no button chrome — the styles below
   reset it — but it keeps the semantics.

   NOT marked data-surface="inverted", despite being a dark island on a light page and so
   looking like PostBody's <pre>. Those precedents flip cleanly because their fill is their
   own; this one takes its fill from panelSkin, which paints --color-ink — a token that means
   the deep grey on paper and WHITE on the inverted surface. Flipping the attribute here turns
   the panel into a pale box. Anything wanting the deep-surface accent inside these panels has
   to reach it without moving the surface out from under the fill. */
const Panel = styled(motion.button)`
  appearance: none;
  border: 0;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;

  position: relative;
  /* No flex here on purpose. The width is PanelRow's now — it drives every panel off one
     animatable basis (see there) — and a declaration on this component would silently win:
     both rules are one class deep, and this one is defined later, so source order hands it the
     tie. That is exactly what happened, and the symptom was a row that ignored hover
     completely: every panel sat at its equal third and nothing moved. */
  /* Without this a flex item floors at its content's intrinsic width and the panels
     refuse to compress, so the hovered one has nothing to take. */
  min-width: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  /* The bottom pad carries the blurb's reserved band as well as its own (see BLURB_H). The
     blurb is out of flow, so this is what holds the space open for it — and what keeps the name
     and eyebrow at one height across the row, whatever each panel's copy wraps to. */
  padding: ${PANEL_PAD} ${PANEL_PAD} calc(${PANEL_PAD} + ${BLURB_H});
  border-radius: 2px;

  /* Beat 4: the panels rise behind the ground, staggered left to right (see --arrive on Page).

     Neither half of it uses the property you would reach for first, and for the same reason:
     this is a motion.button carrying a layoutId, and framer writes BOTH transform and opacity
     onto it inline (measured: style="transform: none; ...; opacity: 1"). An inline declaration
     beats any stylesheet, so a CSS transform or opacity here is simply ignored — and a CSS
     transform would additionally feed framer's layout projection a box that includes the rise.

     translate is a separate property framer never touches, and it composes with the transform
     framer does write. The fade rides filter for the same reason. The cost of that is an
     identity filter left on each panel at rest, which makes it its own stacking context —
     harmless here, since the panel's layers are already absolute children of it and the hero it
     flies into is a sibling overlay, not a descendant.

     The stagger comes from --i, written per panel in the row, so it follows PROJECTS rather than
     an nth-child ladder that would have to be kept in step with the count. */
  --rise-delay: calc(${PANEL_RISE_DELAY}s + var(--i, 0) * ${PANEL_RISE_STAGGER}s);
  --rise-s: ${PANEL_RISE_S};

  /* ...and both of those are the way IN. A transition reads its timing from the state it is
     heading TO, so this pair of overrides is the whole of what makes the exit its own move: the
     panels go FIRST on the way out and they go quickly, together, with the ground held back
     behind them (see PANEL_FALL_S). Nothing waits on the stagger, because going out it would
     only be four more frames before the page is allowed to roll. */
  ${Page}:not([data-arrived]) & {
    --rise-delay: 0s;
    --rise-s: ${PANEL_FALL_S};
  }

  translate: 0 calc((1 - var(--arrive, 0)) * ${PANEL_RISE}px);
  filter: opacity(var(--arrive, 0));
  transition:
    /* flex-BASIS, because that is the property the accordion now moves — see PanelRow. Left as
       flex-grow, the width changed instantly and only the (now static) grow eased. */
    flex-basis ${PANEL_S} cubic-bezier(0.16, 1, 0.3, 1),
    translate var(--rise-s) cubic-bezier(0.16, 1, 0.3, 1) var(--rise-delay),
    filter var(--rise-s) linear var(--rise-delay);

  /* Deep ink with a raking gradient, echoing the portrait column's frost. The picture, when
     there is one, is a layer above this (PanelShot) rather than part of it. */
  ${panelSkin}

  &:focus-visible {
    outline: 2px solid ${p => p.theme.accent.base};
    outline-offset: 3px;
  }

  ${STACKED_MEDIA} {
    /* flex-basis has to be released with the height: in a COLUMN flex container the basis is
       the main size, so the row's flex shorthand above zeroed these panels and the height never
       applied — they collapsed to a sliver of their own bottom-aligned text. */
    flex: 0 0 auto;
    /* Taller than the phone's 200px: at tablet widths a full-width 200px panel reads as a
       letterboxed strip. */
    height: 260px;
  }

  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 200px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }

  /* The scrim and the picture are both real children now (PanelVeil, PanelShot) rather than a
     ::before and a background. The picture has to be an element because it is TILTED and a
     background layer cannot be rotated; and once it is an element the scrim has to be one too,
     since a ::before paints beneath its element's children and would end up under the very
     thing it grades. As siblings, tree order puts them in the right order.

     This rule is what keeps the COPY above all three, and it is load-bearing rather than
     tidiness. Painting order puts positioned boxes above in-flow content regardless of tree
     order, so with the layers positioned and the text not, the text was painted over and the
     panels lost their names entirely. Positioning the text too puts all of them on the same
     footing, where being later in the tree is what decides. */
  > * {
    position: relative;
  }
`;

/* The screenshot, as a tilted plate. Oversized well past the panel on every side because it is
   rotated inside a box that clips: a plate merely as large as the panel would swing its corners
   inward and show four wedges of bare ink. The panel's own overflow: hidden does the cropping.

   COVER, and the crop is the point rather than a cost. The capture is landscape — the shape the
   site really is, which is what makes it read as a desktop page — and the panel is steeply
   portrait, so filling it means showing a vertical band of the page about a card and a half
   wide. Fitting the whole page in instead leaves it 27% of the panel's height with bare ink
   under it, and stretching the capture to portrait to avoid that makes the grid's cards
   enormous and stops it looking like a desktop site (see the Project interface). A band of a
   real page, on a tilt, was the better trade.

   The tilt is small on purpose — 4 degrees reads as a deliberate angle, where more starts to
   read as a device mock. It does not animate: the accordion is already moving flex-grow on
   every panel, and a transform here would be a second motion competing with it. */
const PanelShot = styled.div<{
  $image: string;
  $light?: boolean;
  $window?: boolean;
  $bleed?: boolean;
}>`
  position: absolute;
  /* Only just enough slack to hide the rotation, and the two axes are deliberately different.
     A box rotated by 4 degrees needs about H*sin4 of extra width and W*sin4 of extra height to
     keep its corners outside the panel — against a tall panel that is ~16% across but only ~3%
     down. Generous vertical slack is the expensive mistake: this box is portrait, so cover
     scales the landscape picture to match its HEIGHT, and every extra percent of height scales
     the page up. An earlier -22% top and bottom put it at 1.1x native, which showed a single
     card blown up past legibility instead of a piece of a page. */
  /* && so this beats Panel's "> * { position: relative }", which would otherwise drop all
     three layers into the flex flow and stack them as rows above the copy. */
  && {
    position: absolute;
  }
  inset: -3% -9%;
  background-image: url('${p => p.$image}');
  background-size: cover;
  /* TOP, not centre, and it only bites on the captures tall enough to overflow this box.
     A phone capture is far taller than the plate — cover matches its width and leaves the
     height spilling both ways — so centred it opened somewhere in the middle of the page,
     below the header and half into the hero. Anchored to the top it starts where the page
     does, which is the part that says what the product is.

     Inert for the desktop captures, and that is arithmetic rather than luck: at ~0.8 against
     this plate's ~0.57 they are the WIDER of the two, so cover matches their height exactly
     and there is no vertical overflow left for a position to move. */
  background-position: center top;
  background-repeat: no-repeat;
  transform: rotate(-4deg);

  /* A light capture, damped (see lightCapture on Project). On the PLATE rather than in the
     scrim above it, which matters on hover: the veil lifts to 0.45 to let the picture through,
     so a scrim-side fix would hand back the glare at exactly the moment the panel is meant to
     be read. Damping the source holds on both states.

     Brightness alone greys it out — the contrast and saturation come back up so it still reads
     as a screenshot of something rather than as a stain. */
  ${p =>
    p.$light &&
    css`
      filter: brightness(0.38) contrast(1.14) saturate(0.9);
    `}

  /* THE WINDOW. Everything above treats the plate as a picture fitted to its panel — cover
     against the panel's own box, so the crop changes whenever the panel does, which is what
     reads as a zoom every time the accordion moves.

     This inverts that. The plate is laid out against the ROW (PanelRow is an inline-size
     container), at exactly the size and position the wide shot takes in the opened detail:
     SHOT_COL across, flush left, cover, left-anchored. The panel's own overflow is then the
     only thing deciding how much of it you see. Nothing about the picture depends on the
     panel's width, so widening the panel REVEALS rather than rescales — and the pixels a
     hovered panel shows are the same pixels, at the same size, that the opened detail shows.

     The tilt goes with it, and has to: a plate at 4 degrees and a shot at 0 cannot be the same
     continuous picture. So does the overshoot, which only existed to hide that rotation.

     Only for a project carrying imageWide — the pane this is matching is that file's. A
     portrait phone capture at SHOT_COL across would be scaled past any use. */
  ${p =>
    p.$window &&
    css`
      && {
        inset: 0 auto 0 0;
        width: ${SHOT_COL};
      }
      transform: none;
      background-position: left center;
    `}

  /* The same window, onto a picture that fills the WHOLE frame when opened rather than a column
     of it (see MediaStage's bleed wash). So the plate is the row's full width at the row's full
     height, which is the box the detail covers against — same box, same cover, same crop, and
     the panel is again only deciding how much of it you see.

     Anchored RIGHT where the other window anchors left, and for the same reason: the anchor has
     to be an edge that does not move. A panel's left edge is only fixed for the FIRST panel —
     every other one slides when the accordion widens a neighbour. This project is the row's
     last, so its right edge is the row's right edge and holds through any hover. Move it and
     the anchor has to move with it; a middle panel has no fixed edge at all and would need its
     offset tracked. */
  ${p =>
    p.$bleed &&
    css`
      && {
        inset: 0 0 0 auto;
        width: 100cqw;
      }
      transform: none;
      background-position: center;
    `}
`;

/* The plugin's face, drawn as the icon a directory would list it under — the one place a plugin
   has a picture of itself. Sized by --tile alone so the same component serves the panel at
   thumbnail size and the detail at display size; every other dimension here is a percentage of
   it, which is also why the radius is a percentage rather than a calc: on a square box the two
   axes resolve to the same length.

   The material is the icon's own, not the page's, and deliberately so — it has to read as a
   thing that exists somewhere else. Dark slate lifting to violet from below, an inner rim of
   light along the top edge, and the glyph in white.

   The violet moved OUT. It used to bloom up the tile's own face, which worked against a flat
   dark panel and stopped working the day the panel got a violet sky behind it: same hue, so the
   glow read as the background coming through and the object lost its lower edge. Most of it is
   now a backlight — a wide violet cast BEHIND the box, where a shadow can only paint outside the
   border box and so cannot touch the face. The object separates from the sky by being lit from
   behind rather than by being brighter than it, which is also the more honest reading of an icon
   floating in front of a light source. What is left inside is a low ember at the foot, enough to
   say the two belong to the same object.

   Black stays underneath it. The cast is coloured light; the drop is weight, and a violet-only
   stack floats.

   Set `color`, not `fill`, on the glyph: the icon is a lucide component and takes currentColor,
   so the tile hands it down and nothing has to reach inside the SVG. */
const AppTile = styled.span`
  position: relative;
  display: grid;
  place-items: center;
  width: var(--tile);
  aspect-ratio: 1;
  border-radius: 23.5%;
  color: #fff;
  background:
    radial-gradient(118% 88% at 50% 122%, rgba(143, 92, 240, 0.62) 0%, rgba(143, 92, 240, 0) 58%),
    linear-gradient(180deg, #3e3e47 0%, #2a2a31 62%, #24242b 100%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.17),
    inset 0 0 0 1px rgba(255, 255, 255, 0.055),
    0 calc(var(--tile) * 0.16) calc(var(--tile) * 0.3) calc(var(--tile) * -0.06)
      rgba(143, 92, 240, 0.5),
    0 calc(var(--tile) * 0.05) calc(var(--tile) * 0.14) calc(var(--tile) * -0.03)
      rgba(143, 92, 240, 0.4),
    0 26px 52px -16px rgba(0, 0, 0, 0.75);

  svg {
    width: 42%;
    height: 42%;
  }
`;

/* The tile on a RESTING panel, where a capture would otherwise be. Centred in the picture area
   — the panel less the copy at its foot — rather than in the panel: the lower fifth is the
   copy's, and the shim that protects it is near-opaque down there, so a tile centred in the
   whole box would sit half inside its own scrim.

   PANEL_COPY_H is that foot, measured: rule to the panel's bottom edge, which is the copy block
   plus its padding. A constant because the copy is bottom-anchored flow and has no length this
   can read — and it is only ever this one project's copy, since the tile is what a project
   without a capture gets. It shifts by a line's height if the blurb ever reflows.

   A fixed size, not a share of the panel's width, because that width is what the accordion
   trades on hover — a proportional tile would breathe in and out every time a neighbour was
   pointed at.

   && to beat Panel's "> * { position: relative }", the same conflict PanelShot records. */
const PANEL_COPY_H = '134px';

const PanelTile = styled(AppTile)`
  && {
    position: absolute;
  }
  --tile: 116px;
  left: 50%;
  top: calc((100% - ${PANEL_COPY_H}) / 2);
  transform: translate(-50%, -50%);
`;

/* The scrim: hovering lifts it and the panel steps forward. On its own layer so it can fade
   without taking the panel's fill or the plate with it. */
const PanelVeil = styled.div`
  /* && — see PanelShot. */
  && {
    position: absolute;
  }
  inset: 0;
  background: linear-gradient(transparent 20%, rgba(8, 9, 12, 0.72));
  opacity: 1;
  transition: opacity ${PANEL_S} ease;

  ${Panel}:hover & {
    opacity: 0.45;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The reading shim, and a SEPARATE layer from the veil rather than a second gradient inside it.
   The plate behind is a screenshot of a working site — itself dense light text — and the panel's
   name and blurb sit over it, so they need cover that does NOT lift: the copy it protects is
   exactly what hover reveals. Inside the veil it could not do that, and not for a stacking
   reason: opacity applies to a whole subtree, pseudo-elements included, so the veil dropping to
   0.45 would have taken the shim with it however the gradients were arranged.

   Last of the three layers, so it is over both the plate and the veil, and steeply
   bottom-weighted: clear across the top where the plate does its work, near-opaque under the
   caption. */
const PanelShim = styled.div`
  /* && — see PanelShot. */
  && {
    position: absolute;
  }
  inset: 0;
  /* Heavier than the scrim it sits over, and it has to be: what is behind is not a photograph
     but game key art and white UI type, bright in unpredictable places. Measured against the
     old flat-ink panels this looks excessive; over a screenshot it is the difference between
     the name reading and the name disappearing into a card. */
  background: linear-gradient(
    to top,
    rgba(8, 9, 12, 0.97) 0%,
    rgba(8, 9, 12, 0.93) 20%,
    rgba(8, 9, 12, 0.6) 38%,
    rgba(8, 9, 12, 0.22) 54%,
    transparent 72%
  );
`;

/* The short accent rule above each eyebrow, as in the reference. It extends on hover —
   the same left-anchored reveal the rest of the page runs on. */
const PanelRule = styled.span`
  width: 24px;
  height: 2px;
  background: ${p => p.theme.accent.base};
  margin-bottom: 0.85rem;
  /* scaleX, not width: a width transition relayouts the panel on every frame, and this
     one runs while the accordion is already animating flex-grow on every panel at once.
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

/* State two of three: the blurb belongs to the hovered panel, not the resting one.
   It FADES rather than unhides — no max-height, no display flip. Either of those would
   relayout the panel on every frame, and this reveal runs while the accordion is already
   animating flex-grow on every panel at once (the same reason PanelRule chose scaleX over
   width). Holding its box at rest costs nothing: the column is bottom-aligned, so the
   reserved height simply sits as dark panel above the name. */
const PanelBlurb = styled.p`
  /* OUT OF FLOW, and that is the whole point of it rather than a positioning convenience.

     In flow it was invisible but still took its height, and that height is a function of the
     panel's WIDTH — so the accordion re-wrapped it on every hover and the name and eyebrow above
     it slid up or down as it did. The same thing showed at rest without any hover at all: the
     first panel's copy sets to two lines where the others set to one, so the three panels'
     names sat at three different heights.

     Parked at the bottom of the reserved band instead (see BLURB_H), the copy can wrap to
     whatever the width gives it and nothing above it moves.

     && to beat Panel's "> * { position: relative }" — the same conflict PanelShot records. */
  && {
    position: absolute;
    left: ${PANEL_PAD};
    right: ${PANEL_PAD};
    bottom: ${PANEL_PAD};
  }

  font-family: ${p => p.theme.font.body};
  font-weight: 300;
  font-size: 0.85rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.66);
  margin: 0;
  text-wrap: pretty;

  opacity: 0;
  transform: translateY(6px);
  transition:
    opacity ${PANEL_S} cubic-bezier(0.16, 1, 0.3, 1),
    transform ${PANEL_S} cubic-bezier(0.16, 1, 0.3, 1);

  /* focus-visible too: the panel is a button, so a keyboard user reaching it must get the
     same second state the mouse gets — otherwise they see only ever the name. */
  ${Panel}:hover &,
  ${Panel}:focus-visible & {
    opacity: 1;
    transform: none;
  }

  ${STACKED_MEDIA} {
    /* No hover to give below the cutover, where the row is a stacked column — a gated
       blurb there would leave every panel permanently in state one. */
    opacity: 1;
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
`;

/* The gap the expanded panel leaves in the row. Holds the slot open so the prose below
   doesn't jump while the hero is away. */
const PanelSlot = styled.div`
  flex: 1 1 0;
  min-width: 0;
  /* Must match Panel's padding exactly. With flex-basis: 0 the padding sits OUTSIDE the
     distributed free space, so a padded button ends up 48px (1.5rem x 2) wider than an
     unpadded stand-in and the row stops being equal shares — the surviving panels shift
     under the wipe, which is meant to uncover a frame that has not moved. */
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
/* The wipe's shape, shared by the PANELS (which do the wiping) and by Detail (whose hero has
   to wait for them to finish), so the two cannot drift apart.

   The losing columns used to be covered by opaque cards sliding over them. They clip themselves
   away instead. A card has to PAINT something, and whatever it painted was flat — which put a
   hole in the frame's ruling for the length of the wipe, since a sliding card cannot carry the
   grid (its background would slide with it, and its landing offset is not a whole number of
   cells). Clipping paints nothing, so what the wipe uncovers is the frame itself, grid and all. */
const WIPE_DUR = 0.42;
const WIPE_STAGGER = 0.08;
const EXPAND_LEAD = 0.12;

/* order — distance from the survivor (an adjacent column is 0), so the stagger fans out from
   the selection rather than marching left-to-right. Clicking the middle makes both neighbours
   order 0, and they close symmetrically.
   fromRight — which edge the column collapses TOWARD: one to the left of the survivor closes
   onto its own left, away from the selection, so the wipe radiates outward. */
const wipeOf = (i: number, index: number) => ({
  order: Math.abs(i - index) - 1,
  fromRight: i < index,
});

const OPEN_CLIP = 'inset(0% 0% 0% 0%)';

/* The clip the detail's shots are uncovered FROM: the clicked panel's own two edges, as shares
   of the picture column (see Projects, where they are measured). Vertically open from the start
   — the panel and the column are the same height, so only the width has anywhere to travel. */
/* The clicked panel's two edges, as shares of a box the reveal will open across. Both pairs
   are recorded at click time (see Panel's onClick): the column pair for the layers that live in
   the picture column, the frame pair for one that bleeds the full width. */
type PanelFrom = {
  left: number;
  right: number;
  frameLeft: number;
  frameRight: number;
  /* The clicked panel's app tile, where it has one: centre as shares of the frame, size in px.
     What lets the detail leave the mark exactly where the panel had it. */
  tile?: { x: number; y: number; size: number };
};

const revealClip = (from: { left: number; right: number }) =>
  `inset(0% ${(from.right * 100).toFixed(3)}% 0% ${(from.left * 100).toFixed(3)}%)`;
const wipeClip = (fromRight: boolean) =>
  fromRight ? 'inset(0% 100% 0% 0%)' : 'inset(0% 0% 0% 100%)';

/* Flush with the frame, because that is now exactly the rectangle the panels occupy. It used
   to be inset by the mat instead — PanelRow held --img-margin of padding, and the detail had
   to repeat it here so the frame's light edge stayed constant whether a panel was open or not.
   (It could not simply inherit it: an absolutely positioned box resolves its insets against the
   nearest positioned ancestor's PADDING box, which is the whole frame, so a sibling's padding
   never contained it.) With the mat gone the two agree at zero.

   Everything inside rides this for free — the bands are percentages of this box, and Hero's
   inset: 0 is the rectangle the panels actually occupy, which is also what the layoutId
   magic-move needs to land on. */
const Overlay = styled.div`
  position: absolute;
  inset: 0;
  z-index: 2;
  overflow: hidden;
  display: flex;
  flex-direction: column;
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

  /* The reading scrim, for the projects that have no photograph. One that does is covered
     by DetailSplit, which paints over this. */
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(transparent 35%, rgba(8, 9, 12, 0.74));
  }
`;

/* How far the boundary can be dragged. Neither pane is allowed to close: at the extremes one
   picture is a sliver, which is a legitimate thing to want to look past, but a pane at zero
   would leave a wedge of bare ink and read as broken rather than as collapsed. */
const SPLIT_MIN = 26;
const SPLIT_MAX = 86;
const clampSplit = (n: number) => Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, n));

/* The opened detail's screenshots — a SIBLING of the hero for exactly the reason the caption
   is one,
   and the reason matters more here than the comment above may suggest. Hero's own note says
   a large non-uniform scale would squash any text inside it, and that the dark box survives
   because "a gradient has no proportions to distort". A PHOTOGRAPH has proportions. Measured
   in flight, framer drives this move as scaleX 0.332 -> 1 against a flat scaleY of 1, so a
   background-image on the hero is compressed to a third of its width and unsquashes over the
   travel — the site's own UI smearing horizontally for a third of a second.

   So the picture never rides the transform: it is a plain absolutely-positioned layer that
   fades in once the hero has arrived. That the resting panel wears a DIFFERENT photograph
   (the home page, not the game page) makes the fade the natural hand-off point anyway.

   It carries NO reading ramp, unlike the resting panel's picture. Nothing is printed over
   these — the copy has a column of its own — so a ramp here would only black out the bottom
   of both screenshots for nothing. */
const DetailSplit = styled(motion.div)`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: ${SPLIT_SHOTS};
  overflow: hidden;

  ${STACKED_MEDIA} {
    /* No room for two columns below the cutover — the pictures take the top half and the
       copy takes the bottom, and the diagonal between the two shots survives unchanged. */
    width: auto;
    right: 0;
    bottom: 50%;
  }
`;

/* The two screenshots, side by side and separated by a DIAGONAL. Both are absolute rather
   than flex items because the cut is made by giving each its own clip-path along the same
   slope: the wide one keeps what is left of the edge, the tall one what is right. They meet
   on it exactly — no gap, no overlap — and SplitHandle's hairline is what marks the join.
   (A rotated divider element over two straight panes would have to be re-measured on every
   resize; two clips written from the same two points cannot drift.)

   The two panes are fitted DIFFERENTLY, and deliberately — see each.

   Both layers fill the WHOLE pane and are cropped to their side of the diagonal by clip-path.
   Neither is sized to the wedge it happens to be showing, and that is the difference between
   a wipe and a zoom: a layer sized to its visible box rescales its picture every time the
   boundary moves, which is what the tall pane used to do — measured across the drag, the
   interior page rendered anywhere from 810px tall down to 251px, shrinking as it narrowed
   rather than being uncovered. With the box constant, the scale is constant, and dragging
   only chooses how much of a stationary picture you can see.

   It also removes a latent version of the same bug on the wide pane. Its cover fit was
   height-driven and so happened to hold still, but only while its box stayed narrower than
   height x 1.6 — on a short, wide window it would have crossed that and started rescaling
   too. A constant box cannot cross it.

   Every horizontal figure below is driven off --shot-split, the one custom property the
   handle writes. That indirection is the point: dragging changes a variable rather than a
   styled-components interpolation, so the three elements keep the classes they mounted with
   instead of the library minting a new rule per pointermove. Note the percentage inside each
   clip-path resolves against the element's own box — which is the pane — so the same figure
   means the same column of pixels in both. */
/* The drag target's width, wider than the hairline it grabs: 2px is a line to look at, not
   one to catch with a pointer. */
const SPLIT_HIT = 28;
/* The hairline's thickness. It is the whole divider now — the two pictures meet on exactly
   the same edge, with no ink between them to read as a seam. */
const SPLIT_RULE = 2;

/* The diagonal, as the pair of edges the two layers share. Written once so they cannot drift:
   the wide pane keeps what is LEFT of it, the tall pane what is RIGHT, and because both
   polygons name the same two points there is no gap and no overlap at any position. */
const EDGE_TOP = 'var(--shot-split)';
const EDGE_BOT = `calc(var(--shot-split) - ${SHOT_SLANT}px)`;

const shotFill = css<{ $image: string }>`
  position: absolute;
  inset: 0;
  background-image: url('${p => p.$image}');
  background-repeat: no-repeat;
`;

/* COVER, where the tall one fits its width. It survives being cropped because it is a grid of
   cards — a partial view of it is still legibly the same page. The interior page would not
   survive the same treatment, hence the two panes fit differently.

   It takes imageWide, NOT the resting panel's picture — a landscape capture of the same page,
   cut for this pane's proportions. See the Project interface for why one file cannot serve both.

   Anchored LEFT, not centred. Centring spends the crop evenly on both edges, so the page lost
   its left margin and its first column of cards was cut down the middle. Left keeps the page's
   own leading edge intact and spends the whole crop on the right — which is also the edge the
   diagonal sweeps, so dragging right uncovers the page rather than re-centring it. */
const ShotWide = styled.div<{ $image: string }>`
  ${shotFill}
  background-size: cover;
  background-position: left center;
  clip-path: polygon(0 0, ${EDGE_TOP} 0, ${EDGE_BOT} 100%, 0 100%);
`;

/* Fits the pane's WIDTH and anchors RIGHT. Width-fitted because it is a long interior page
   and the point of it is to be legible.

   Right, because of what the sliver holds. This pane is narrowest exactly when the reader has
   dragged toward the front page, and whatever survives at the right-hand edge is all that is
   left of it — so the live rail lives there: the player count, the price, "LIVE - 2h ago",
   the freshness the whole project is about. Anchoring left would have spent the sliver on the
   article's left margin. Dragging back uncovers the prose.

   And it SCROLLS. The picture is the whole 6,700px article in one still — nothing is recorded
   here, and deliberately not: a video or animated WebP of a scroll stores a near-complete
   keyframe per frame, because scrolling content gives inter-frame prediction nothing to hold
   onto, and what is moving is 12px UI text, which is the first thing a codec smears. One still
   costs 199KB, renders every frame pixel-exact at any speed, and turns the scroll into a
   property animation the page can pause and reason about. Travel is the rendered height minus
   the pane, so a little over 2,000px in 14s.

   alternate, so it eases back up rather than snapping to the top — a jump-cut would read as a
   loading glitch on what is meant to be ambient. Paused while the hairline is being dragged:
   the horizontal gesture is the reader's, and the pane should hold still underneath it. */
const shotScroll = keyframes`
  from { background-position-y: 0%; }
  to { background-position-y: 100%; }
`;

const ShotTall = styled.div<{ $image: string }>`
  ${shotFill}
  background-size: 100% auto;
  /* Split from the shorthand: only Y is animated, and X has to stay pinned to the right. */
  background-position-x: right;
  background-position-y: 0%;
  clip-path: polygon(${EDGE_TOP} 0, 100% 0, 100% 100%, ${EDGE_BOT} 100%);
  animation: ${shotScroll} 14s ease-in-out infinite alternate;

  [data-shot-drag] & {
    animation-play-state: paused;
  }

  @media (prefers-reduced-motion: reduce) {
    animation: none;
  }
`;

/* The diagonal itself, as a control — and, since the two pictures now abut with nothing
   between them, the only thing that draws it. The element is a hit area far wider than the
   line it carries, a parallelogram on the same slope so the target sits under the line along
   its whole length rather than under a vertical average of it (the boundary travels
   SHOT_SLANT across on the way down, so a straight strip would miss it at both ends).

   touch-action: none because the gesture is horizontal and so is nothing else here — without
   it a touch drag is claimed by the page's own scrolling and the handle never sees a move. */
const SplitHandle = styled.div`
  position: absolute;
  top: 0;
  bottom: 0;
  left: calc(var(--shot-split) - ${SHOT_SLANT + SPLIT_HIT / 2}px);
  width: ${SHOT_SLANT + SPLIT_HIT}px;
  clip-path: polygon(
    ${SHOT_SLANT}px 0,
    ${SHOT_SLANT + SPLIT_HIT}px 0,
    ${SPLIT_HIT}px 100%,
    0 100%
  );
  cursor: ew-resize;
  touch-action: none;
  z-index: 1;

  /* The hairline. ALWAYS drawn, because with the gap closed the two pictures now abut on the
     same edge and there is nothing else marking the join — an invisible-until-hovered control
     over a seamless butt-joint is a control nobody finds. It carries both jobs at once: the
     divider between the screenshots, and the thing you can tell is draggable.

     Hover and focus lift it to full rather than summoning it, so the pointer still gets an
     answer. Drawn on the same slope, centred on the shared edge. */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: ${p => p.theme.accent.base};
    clip-path: polygon(
      ${SHOT_SLANT + SPLIT_HIT / 2 - SPLIT_RULE / 2}px 0,
      ${SHOT_SLANT + SPLIT_HIT / 2 + SPLIT_RULE / 2}px 0,
      ${SPLIT_HIT / 2 + SPLIT_RULE / 2}px 100%,
      ${SPLIT_HIT / 2 - SPLIT_RULE / 2}px 100%
    );
    opacity: 0.62;
    transition: opacity 0.22s ${'cubic-bezier(0.16, 1, 0.3, 1)'};
  }

  &:hover::after,
  &:focus-visible::after {
    opacity: 1;
  }

  &:focus-visible {
    outline: 2px solid ${p => p.theme.accent.base};
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      transition: none;
    }
  }
`;

/* The column the detail's media sits in — the same one the split takes, and shared by both of
   the things that are OBJECTS rather than pictures: the phone and the app tile. Neither fills
   the column the way a pair of screenshots does, so both want the same staging. */
const MediaStage = styled(motion.div)<{
  $backdrop?: string;
  $bleed?: boolean;
  /* Which side the OBJECT's column is on — the copy has the other. Only meaningful while
     bleeding, where the stage is the whole frame and the column is no longer its width. */
  $column?: 'left' | 'right';
}>`
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  /* The picture column, except where the backdrop is the WHOLE frame (see the bleed wash
     below) — there the picture takes everything and the column survives only as the padding
     that keeps the object out of the copy's half. */
  width: ${p => (p.$bleed ? '100%' : SPLIT_SHOTS)};
  ${p =>
    p.$bleed &&
    p.$column === 'left' &&
    css`
      padding-right: calc(100% - ${SPLIT_SHOTS});
      box-sizing: border-box;
    `}
  /* An object placed rather than centred ignores all of that — see StagedTile, which holds the
     mark at the point the panel had it. */
  display: flex;
  align-items: center;
  justify-content: center;
  container-type: size;

  /* Neither object fills this stage — a phone fitted to the height leaves ~500px of bare skin
     either side, and a tile leaves more. Without a picture, that emptiness is made to read as
     staging rather than as a gap by one soft pool of light under the thing: no edges, nothing to
     mistake for an object of its own.

     A project carrying a backdrop puts a scene there instead, and the scene BLEEDS — it is the
     whole frame, not the object's column, because a photograph cut off at 63% is a panel with a
     picture in it, while one that runs edge to edge is a room the object is standing in.

     Which leaves the copy nowhere dark to sit, so the wash has to make it a place. Hence a
     horizontal ramp rather than a pool: near-opaque at the copy's edge, opening out by the time
     it reaches the object, and settling at a flat mid-damp across the rest so the picture stays a
     picture and the thing on it keeps its contrast. One gradient, two jobs — a separate scrim
     behind the copy would be a second edge to line up.

     --bleed-dir is which edge that heavy end is at, and it follows the copy: 90deg ramps from
     the left, 270deg from the right. Held in variables for the phone-width case, where the
     argument stops applying — the copy drops BELOW the picture there (see DetailCaption), and a
     dark side edge is then just a dark side edge. The media query swaps in a flat damp.

     The stops hold near-opaque to 28% and are still heavy at the copy's inner edge (37%): the
     paragraph is the full width of that column, and a ramp that opened earlier left its last
     lines over floodlights. Past 44% the ramp is done arguing about text and only damping the
     picture, which is --bleed-far — the one stop that is a fact about the SOURCE rather than
     about the layout, and so is set per project (see the detail's two stages). */
  --bleed-dir: 90deg;
  --bleed-far: 0.4;
  --bleed-wash: linear-gradient(
    var(--bleed-dir),
    rgba(10, 10, 14, 0.94) 0%,
    rgba(10, 10, 14, 0.88) 28%,
    rgba(10, 10, 14, 0.56) 44%,
    rgba(10, 10, 14, var(--bleed-far)) 100%
  );
  ${p =>
    p.$column === 'left' &&
    css`
      --bleed-dir: 270deg;
    `}

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: ${p =>
      p.$backdrop
        ? css`
            var(--bleed-wash), url('${p.$backdrop}') center / cover no-repeat
          `
        : css`
            radial-gradient(55% 60% at 50% 50%, rgba(255, 255, 255, 0.07), transparent 70%)
          `};
    pointer-events: none;
  }

  ${STACKED_MEDIA} {
    /* Same halving the split takes below the cutover — pictures above, copy below. */
    width: auto;
    right: 0;
    bottom: 50%;
    padding-right: 0;
    --bleed-wash: linear-gradient(rgba(10, 10, 14, 0.36), rgba(10, 10, 14, 0.36));
  }
`;

/* The mark in the OPENED detail. It keeps the SIZE the panel gave it — no growing to display
   size, which is what made the mark and its own sky read as two different pictures — and it
   TRAVELS: from the point it occupies in the resting panel to the middle of the media column,
   at the rate the box widens. The panel's right edge is the frame's, so the growth is all
   leftward, and the mark rides it rather than being uncovered in a new place.

   The start is the measurement the click took (see PanelFrom), not a rule, because the panel
   under the pointer is a widened one — where the mark sits is a fact about that moment. The end
   is the centre of the media column, which is the RIGHT 63% here, the copy having taken the
   left (see DetailCaption).

   Vertically it does not move: the panel and the frame are the same height, so the place the
   mark already holds is the place it keeps. */
const TILE_X_END = 1 - parseFloat(SPLIT_SHOTS) / 100 / 2;

const StagedTile = motion(styled(AppTile)`
  && {
    position: absolute;
  }
  top: calc(var(--tile-y) * 100%);
  transform: translate(-50%, -50%);
`);

/* What the mark is standing on: the plugin's real numbers, under it, once the box has finished
   opening. A directory listing is the one place a plugin has a face AND a public record, and
   the tile without the record is only half of that.

   Placed against the tile's LANDING point rather than travelling with it — it arrives on the
   caption's beat, by which time the mark has stopped — so it needs the same three variables the
   tile does and one more, the gap under it. A SIBLING of the stage rather than a child, because
   the stage is aria-hidden decoration and this is the one thing in that half of the frame with
   something to say.

   Not rendered at all when the fetch gives nothing (see Detail): a portfolio claiming a number
   it could not verify this minute is worse than one that shows the picture alone. */
/* What /api/plugin-stats answers with — the useful half of a registry entry (see that file). */
interface PluginStatData {
  downloads: number;
  releases: number;
  version?: string;
}

const PluginStat = styled(motion.div)`
  position: absolute;
  z-index: 1;
  left: calc(var(--tile-x) * 100%);
  top: calc(var(--tile-y) * 100% + var(--tile) / 2 + 1.5rem);
  /* The translate PROPERTY, not a transform. This block arrives with a small y-lift, and
     framer drives that by writing transform — which replaces this rule wholesale, so a
     transform-based centring silently loses and the line sits half its own width to the right of
     the mark. translate is a separate property and composes with framer's transform instead. */
  translate: -50% 0;
  text-align: center;
  pointer-events: none;

  ${STACKED_MEDIA} {
    display: none;
  }
`;

/* Label and number on ONE line, in that order — the number alone was a figure with no noun, and
   the noun under it read as a second thought. Baselines aligned rather than boxes centred, so the
   two faces sit on the same line however their metrics differ. */
const StatRow = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 0.5rem;
`;

/* The noun, in the chrome idiom the eyebrows use. */
const StatLabel = styled.span`
  font-family: ${p => p.theme.font.mono};
  font-size: 0.66rem;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 1px 10px rgba(6, 6, 10, 0.75);
`;

/* The number itself, in the display face — the only weight in this half of the frame, and the
   thing the line exists for.

   Literal white with a shadow under it, not the page's ink: this sits on a PHOTOGRAPH, in the
   half of the frame the wash deliberately leaves bright (see MediaStage), and the panel's own
   light ink is tuned against a flat dark fill. The shadow is what carries it over a cloud —
   the same bargain the close button makes one corner away, with the picture doing more work. */
const StatCount = styled.span`
  font-family: ${p => p.theme.font.display};
  font-size: 1.45rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.1;
  color: #fff;
  text-shadow: 0 1px 14px rgba(6, 6, 10, 0.7);
`;

/* And the reading of it, in the chrome idiom the eyebrows use, so the pair reads as a caption
   on the mark rather than as a second heading. */
const StatMeta = styled.div`
  margin-top: 0.35rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.66rem;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.82);
  text-shadow: 0 1px 10px rgba(6, 6, 10, 0.75);
`;

/* The same numbers when the detail has no measured tile to hang PluginStat under — the
   stacked layout skips the tile measurement (see Panel's onClick), and the numbers are
   content, not staging, so they move into the caption as a plain row instead of vanishing
   with the choreography. Eyebrow idiom around a display-face count, on the caption's own
   flat dark ground — no photograph here, so no shadow. */
const CaptionStat = styled.div`
  margin-top: 1.1rem;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.66rem;
  font-weight: 400;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.72);

  strong {
    font-family: ${p => p.theme.font.display};
    font-size: 1.05rem;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #fff;
    margin-left: 0.35rem;
  }
`;

const PhoneFrame = styled.div`
  /* The one number. Capped so the device does not become the whole composition on a tall
     screen, and inset from the stage so it never touches the frame's edges. */
  --h: min(calc(100cqh - 3rem), 620px);
  --w: calc(var(--h) * ${393 / 852});
  position: relative;
  height: var(--h);
  width: var(--w);
  border-radius: calc(var(--h) * ${55 / 852});
  padding: calc(var(--h) * ${10 / 852});
  /* The rail: a raking metal gradient rather than a flat dark, so the body reads as a solid
     object under the same light as the panels. */
  background: linear-gradient(145deg, #55555c 0%, #1b1b1f 24%, #141417 62%, #45454c 100%);
  box-shadow:
    0 34px 70px -18px rgba(0, 0, 0, 0.72),
    0 0 0 1px rgba(255, 255, 255, 0.07);
`;

const PhoneScreen = styled.div`
  position: relative;
  height: 100%;
  width: 100%;
  overflow: hidden;
  /* The screen's corner is the body's less the bezel, which is what keeps the two concentric —
     a screen sharing the body's radius reads as a sticker on a slab. */
  border-radius: calc(var(--h) * ${45 / 852});
  background: #000;

  video,
  img {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const PhoneIsland = styled.span`
  position: absolute;
  z-index: 1;
  top: calc(var(--h) * ${11 / 852});
  left: 50%;
  transform: translateX(-50%);
  width: calc(var(--w) * ${125 / 393});
  height: calc(var(--h) * ${37 / 852});
  border-radius: 999px;
  background: #000;
`;

/* The detail copy, a SIBLING of the hero rather than a child — see Hero for why. With media
   beside it — the two-shot split, or the phone — it takes the narrow right-hand column and
   centres in it; with nothing at all (a project that supplies neither) there is no column to
   sit beside, so it keeps the old full-width perch at the frame's lower-left. */
const DetailCaption = styled(motion.div)<{ $aside: boolean; $left?: boolean }>`
  position: absolute;
  z-index: 1;
  ${p =>
    p.$aside
      ? css`
          /* Mirrored where the picture bleeds across the whole frame (see MediaStage): with no
             column left over, the copy takes the darkest end of the wash instead, which is the
             left one — the object it is captioning is centred on the frame, so the two ends are
             not interchangeable and the ramp decides which. Same width either way. */
          left: ${p.$left ? '0' : SPLIT_SHOTS};
          right: ${p.$left ? SPLIT_SHOTS : '0'};
          top: 0;
          bottom: 0;
          padding: ${PANEL_PAD};
          display: flex;
          flex-direction: column;
          justify-content: center;

          ${STACKED_MEDIA} {
            left: 0;
            right: 0;
            top: 50%;
            /* Centring is a desktop luxury. In half of a stacked-width frame the paragraph is
               taller than the box it sits in, and centred overflow spills BOTH ways — upward
               over the screenshots and downward past the frame, so the copy collided with the
               pictures and still lost its last line. Start it at the top and let it scroll. */
            justify-content: flex-start;
            overflow-y: auto;
            overscroll-behavior: contain;
          }
        `
      : css`
          left: ${PANEL_PAD};
          right: ${PANEL_PAD};
          bottom: ${PANEL_PAD};
          max-width: 620px;
        `}
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
  /* A step down from the clamp this carried when the copy was four lines. At that length the
     larger setting read as the caption's own voice; at the length it runs to now it filled the
     column and started to compete with the name above it. The leading opens as the size comes
     down — smaller type wants proportionally more of it, and the column is a fixed narrow
     measure, so this is where the copy stops reading as a block. */
  font-size: clamp(0.88rem, 1.15vw, 0.98rem);
  line-height: 1.65;
  color: rgba(255, 255, 255, 0.72);
  margin: 0;
  text-wrap: pretty;
`;

/* Where the project actually lives, in the detail only. NOT on the resting panel: that panel is
   a button, and an anchor inside a button is invalid and unreachable — the browser gives the
   click to whichever it resolves first and the keyboard gets a control it cannot use.

   It wears the chrome idiom the rest of the page's links do (mono, tracked, uppercased by the
   label rather than by CSS, so the URL keeps its own case), and it takes the panel's light ink
   like CloseButton for the same reason: it sits on the deep fill, where the page's own muted
   ink would disappear. */
const DetailLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 1.5rem;
  align-self: flex-start;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  color: rgba(255, 255, 255, 0.62);
  text-decoration: none;
  /* The rule under it is the hover, drawn rather than underlined so it can grow from the left
     like PanelRule and the readme's own terms do. */
  border-bottom: 1px solid rgba(255, 255, 255, 0.18);
  padding-bottom: 2px;
  transition:
    color ${PANEL_S} ease,
    border-color ${PANEL_S} ease;

  &:hover,
  &:focus-visible {
    color: #fff;
    border-bottom-color: ${p => p.theme.accent.base};
  }

  &:focus-visible {
    outline: 2px solid ${p => p.theme.accent.base};
    outline-offset: 4px;
  }

  svg {
    /* Optical, not metric: the arrow's ink sits high in its box, so matching the cap height
       leaves it floating above the baseline of the text beside it. */
    width: 0.85em;
    height: 0.85em;
    margin-bottom: 1px;
  }

  @media (prefers-reduced-motion: reduce) {
    transition: none;
  }
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

/* The link's visible text, from the URL itself (see `url` on Project). Host plus path, with the
   parts nobody reads dropped: the scheme, a leading www, and a trailing slash. Left long rather
   than truncated — the one address here that runs past the host is the plugin's, and its path is
   the half that says what it is. */
const linkLabel = (url: string) =>
  url.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');

const Detail: React.FC<{
  project: Project;
  index: number;
  reduced: boolean;
  from: PanelFrom | null;
  onClose: () => void;
}> = ({ project, index, reduced, from, onClose }) => {
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

  /* The plugin's public numbers, fetched when its detail opens — see functions/api/plugin-stats
     for why this cannot be read from the page. On open rather than on page load: it is one
     panel's worth of data behind a click, and the endpoint answers from cache anyway.

     Every failure path lands in the same place, which is null: a 404 (the SPA dev server has no
     /api and hands back index.html, so the parse throws), a 502 from upstream, an aborted
     unmount. The stat block simply does not render — a number this page could not verify is
     worse than no number. */
  const [stats, setStats] = useState<PluginStatData | null>(null);
  const wantsStats = !!project.pluginId;
  useEffect(() => {
    if (!wantsStats) return;
    const stop = new AbortController();
    fetch(`/api/plugin-stats?id=${encodeURIComponent(project.pluginId!)}`, {
      signal: stop.signal,
    })
      .then(r => (r.ok ? r.json() : null))
      .then((d: PluginStatData | null) => {
        if (typeof d?.downloads === 'number') setStats(d);
      })
      .catch(() => {});
    return () => stop.abort();
  }, [wantsStats, project.pluginId]);

  /* The wipe is the PANELS' own job now (see Projects) — Detail only has to know when it ends,
     so the hero does not start growing before the columns it grows over have gone. */
  const maxOrder = Math.max(
    0,
    ...PROJECTS.map((_, i) => i)
      .filter(i => i !== index)
      .map(i => wipeOf(i, index).order),
  );

  /* The click is a three-beat sequence, not one blended motion — the earlier version ran
     all three at once, so the growing hero swallowed the wipe before it finished and the
     wipe never read. Now: (1) the losers wipe away, (2) the survivor expands, (3) the
     caption fades in. The beats OVERLAP slightly rather than abut, so it reads as one
     connected gesture. */

  /* When the last column finishes clipping away — derived, because maxOrder differs by which
     panel was clicked (0 for the middle, 1 for an edge), so a fixed hero delay would give an
     uneven gap. Measuring from WIPE_END keeps the timing identical for every panel. */
  const WIPE_END = maxOrder * WIPE_STAGGER + WIPE_DUR;
  /* The expansion LEADS the wipe's end, overlapping the two beats. Safe despite the earlier
     "hero hides the wipe" problem: the survivor grows from its OWN column outward and only
     reaches the outer columns late in its travel, by which point they have long gone. */
  const EXPAND_DELAY = Math.max(0, WIPE_END - EXPAND_LEAD);
  const heroIn = { duration: 0.55, ease, delay: EXPAND_DELAY };
  /* After the hero has essentially finished growing. */
  const captionIn = { duration: 0.35, ease, delay: EXPAND_DELAY + 0.5 };
  /* The pictures rise WITH the last of the hero's growth, not after it. They used to wait
     +0.42 into a 0.55 flight and take 0.4s over it, which measured as the hero landing at
     752ms and the shots still at 27% opacity at 837 — a beat where the box was fully open and
     empty, and the pictures then arrived as a separate event on a box that had stopped moving.

     Started here the box is ~94% grown, so what is left to cover is ~70px of width at almost
     no opacity, and they finish just after it lands. Not earlier: this layer is at its FINAL
     size from the first frame — it is a sibling of the hero, not a child, so nothing scales it
     — and any opacity it carries while the hero is still small is picture hanging outside the
     box it is supposed to be inside.

     They still lead the caption, so the copy beside them arrives last. One hand-off, not two.
     See DetailSplit for why they are a separate layer rather than the hero's own background. */
  const photoIn = { duration: 0.36, ease, delay: EXPAND_DELAY + 0.22 };

  /* What the detail SHOWS, decided by what the project carries rather than by a mode on it.
     Three outcomes, in this order of preference.

     Both or neither for the split: it is a pair of screenshots played against each other, so
     one picture cannot stand in for it.

     Then the phone, on the same both-or-neither rule for its two encodes (see Project). It is
     second because a project with a desktop capture pair has a desktop story to tell; only one
     of the two can have the column, and nothing so far wants both.

     Then the tile, last because it is the least: a mark rather than a look at the thing
     working, and only the right answer where there is no thing to look at (see Project).

     A project with none of the three still gets its `image` on the resting panel; its detail
     opens as the flat hero, which is the case this started as. */
  const split = !!(project.imageWide && project.imageTall);
  const phone = !split && !!(project.videoWebm && project.videoMp4);
  const tile = !split && !phone && !!project.tile;
  /* A tile that also carries a picture: the mark is the subject, the picture is the frame it
     hangs in, so the picture takes the whole frame and the copy moves to the other side of the
     wash (see MediaStage and DetailCaption). A tile without one keeps the old staged column. */
  const bleed = tile && bleeds(project);

  /* Where the diagonal sits, as a percentage of the picture side. Held in state and spent as
     a CSS variable: the elements that read it never change class, so a drag costs a variable
     write and no restyling. Resets with the detail, which unmounts on close — the boundary is
     a way of looking at one project, not a setting. */
  const [shotSplit, setShotSplit] = useState(SHOT_WIDE);
  const drag = useRef<{ x: number; from: number; width: number } | null>(null);
  /* Only so the tall shot can stop scrolling under the gesture — see ShotTall. State rather
     than a ref because it has to reach the DOM as an attribute, and it costs nothing: the
     drag is already re-rendering this tree on every move to move the boundary. */
  const [dragging, setDragging] = useState(false);

  const onHandleDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const host = e.currentTarget.parentElement;
    if (!host) return;
    drag.current = {
      x: e.clientX,
      from: shotSplit,
      width: host.getBoundingClientRect().width,
    };
    setDragging(true);
    /* Capture, so the drag survives the pointer leaving a 28px-wide target — which it does
       immediately, because the handle moves only as fast as we re-render. */
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onHandleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d) return;
    setShotSplit(clampSplit(d.from + ((e.clientX - d.x) / d.width) * 100));
  };

  const onHandleUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setDragging(false);
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  /* A drag is not the only way to ask for this. Arrows nudge, shift coarsens — the same
     bargain every slider makes, and the reason the handle is focusable at all. */
  const onHandleKey = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 8 : 2;
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    e.preventDefault();
    setShotSplit(s => clampSplit(s + (e.key === 'ArrowLeft' ? -step : step)));
  };

  return (
    <Overlay role="group" aria-label={`${project.name} — details`}>
      <Hero
        /* No $image: the pictures are DetailSplit's job, because this element is the one
           framer scales. The flat skin is what makes the move safe. */
        /* Same id as the resting panel, which is unmounted for this index while the detail
           is open — one element in flight, so framer moves it rather than cross-fading two.
           The delay in heroIn is what holds it at panel size until the bands have swept. */
        layoutId={reduced ? undefined : `project-panel-${index}`}
        transition={reduced ? { duration: 0 } : heroIn}
      />

      {split && (
        <DetailSplit
          data-shot-drag={dragging || undefined}
          style={{ '--shot-split': `${shotSplit}%` } as React.CSSProperties}
          /* UNCOVERED, not faded up. The resting panel is already a window onto this exact
             picture at this exact size and position (see PanelShot's $window), so there is
             nothing to cross to: opening only has to widen the window. The clip starts on the
             panel's own two edges and opens to the full column, which is a paint operation and
             leaves the picture untouched — the same reason the losing panels clip themselves
             away rather than sliding.

             Timed to heroIn exactly, so the picture is uncovered at the rate the box behind it
             grows. It used to fade in on its own schedule after the hero had landed, which is
             what read as the frame opening dark and the screenshots arriving afterwards.

             Falls back to the old fade when `from` is missing — a detail opened by any route
             that did not come through a panel's click has no edges to start from. */
          initial={reduced || !from ? false : { clipPath: revealClip(from) }}
          animate={{
            clipPath: OPEN_CLIP,
            opacity: 1,
            transition: reduced ? { duration: 0 } : from ? heroIn : photoIn,
          }}
          exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
        >
          <ShotWide $image={project.imageWide!} />
          <ShotTall $image={project.imageTall!} />
          <SplitHandle
            role="separator"
            aria-orientation="vertical"
            aria-label="Balance of the two screenshots"
            aria-valuenow={Math.round(shotSplit)}
            aria-valuemin={SPLIT_MIN}
            aria-valuemax={SPLIT_MAX}
            tabIndex={0}
            onPointerDown={onHandleDown}
            onPointerMove={onHandleMove}
            onPointerUp={onHandleUp}
            onPointerCancel={onHandleUp}
            onKeyDown={onHandleKey}
          />
        </DetailSplit>
      )}

      {phone && (
        /* aria-hidden like the split beside it: the shots are background-image divs and are
           already invisible to a screen reader, and this is the same thing — the detail's
           readable content is the caption. A looping muted clip with no controls is decoration
           over the top of it, not a second account of the project. */
        <MediaStage
          aria-hidden
          $backdrop={project.backdrop}
          /* Only a stage with a scene in it bleeds; without one there is nothing to run to the
             frame's edges and the pool of light belongs in the column it lights. */
          $bleed={!!project.backdrop}
          /* The phone keeps the LEFT column; the copy has the right, so the wash ramps from
             there (see MediaStage). */
          $column="left"
          /* Lighter past the copy than the default: this source is a stadium at golden hour,
             most of whose interest — the crowd, the floodlights, the ball — is in the half the
             phone is not covering, and at 0.4 that half read as a dark field with a picture
             somewhere behind it. The phone can take it: it is a dark rail around a lit screen,
             so the brighter the room, the more it reads as a device IN the room. */
          style={{ '--bleed-far': 0.22 } as React.CSSProperties}
          /* Uncovered on the hero's own clock, exactly as the split beside it is (see
             DetailSplit for the full reasoning). It used to fade up on photoIn's later, shorter
             flight, which is what read as the frame opening as a dark box and the scene and the
             phone arriving afterwards as a second event. Clipped from the panel's edges instead,
             the stage is already there in the first frame — the box widening is what reveals it.

             The FRAME shares, not the column ones, because the stage is now the frame's width —
             see PanelFrom. Still the fade where `from` is missing: with no edges to open from
             there is no window to widen, and a hard cut would be worse than the old late fade. */
          initial={
            reduced
              ? false
              : from
              ? {
                  clipPath: revealClip(
                    project.backdrop
                      ? { left: from.frameLeft, right: from.frameRight }
                      : from,
                  ),
                  opacity: 1,
                }
              : { opacity: 0 }
          }
          animate={{
            clipPath: OPEN_CLIP,
            opacity: 1,
            transition: reduced ? { duration: 0 } : from ? heroIn : photoIn,
          }}
          exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
        >
          <PhoneFrame>
            <PhoneScreen>
              <PhoneIsland />
              {reduced ? (
                /* The poster on its own. Not the clip paused: an autoplaying loop is the thing
                   the preference is about, and a video element parked on its first frame with
                   no controls is just a heavier way to show the same picture. */
                <img src={project.image} alt="" />
              ) : (
                /* No preload hint: the detail mounts on click, so loading here IS on demand,
                   and autoplay overrides the hint anyway. The codec string is exact so a
                   browser that cannot decode AV1 rejects the webm without fetching it. */
                <video autoPlay loop muted playsInline poster={project.image}>
                  <source
                    src={project.videoWebm}
                    type="video/webm; codecs=av01.0.05M.08"
                  />
                  <source src={project.videoMp4} type="video/mp4" />
                </video>
              )}
            </PhoneScreen>
          </PhoneFrame>
        </MediaStage>
      )}

      {tile && (
        <MediaStage
          aria-hidden
          $backdrop={bleed ? project.image : undefined}
          $bleed={bleed}
          /* The mirror of the phone's: the mark has the right column, the copy the left, so the
             wash ramps from the left (MediaStage's default). */
          $column="right"
          /* Lighter past the copy than the default, to close a gap against the RESTING panel.
             Both of the panel's dark layers are bottom ramps and both are transparent by 72%,
             so the top of the plate carries no damp at all — hovered, it is the picture at full
             strength. The default 0.4 put the same pixels behind a flat 40% scrim the moment the
             box opened, so the reveal read as the scene getting darker. This is the closest the
             one available stop gets to that panel's brightness. */
          style={{ '--bleed-far': 0.2 } as React.CSSProperties}
          /* Uncovered on the hero's clock like everything else the detail stages (see
             DetailSplit), so the sky is already there as the box widens rather than fading up
             onto a dark rectangle afterwards. The clip is measured in THIS element's own
             percentages, which is why a bleeding stage takes the panel's FRAME shares rather
             than its column ones — see PanelFrom. */
          initial={
            reduced
              ? false
              : from
              ? { clipPath: revealClip(bleed ? { left: from.frameLeft, right: from.frameRight } : from), opacity: 1 }
              : { opacity: 0 }
          }
          animate={{
            clipPath: OPEN_CLIP,
            opacity: 1,
            transition: reduced ? { duration: 0 } : from ? heroIn : photoIn,
          }}
          exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
        >
          {from?.tile ? (
            /* Carried, not restaged — see StagedTile. On the hero's own timing, so the mark
               crosses the frame exactly as fast as the frame grows under it. */
            <StagedTile
              style={
                {
                  '--tile': `${from.tile.size}px`,
                  '--tile-y': from.tile.y,
                } as React.CSSProperties
              }
              initial={
                reduced ? false : { left: `${(from.tile.x * 100).toFixed(3)}%` }
              }
              animate={{
                left: `${(TILE_X_END * 100).toFixed(3)}%`,
                transition: reduced ? { duration: 0 } : heroIn,
              }}
            >
              <Bookmark strokeWidth={1.6} fill="currentColor" />
            </StagedTile>
          ) : (
            /* Nothing was measured — a detail opened by some route other than a panel's click.
               With no place to hold the mark in, it goes back to being staged: centred in the
               column at display size, because an icon shown at icon size in a space this large
               reads as a favicon someone forgot to replace. */
            <AppTile style={{ '--tile': 'min(268px, 46cqh)' } as React.CSSProperties}>
              <Bookmark strokeWidth={1.6} fill="currentColor" />
            </AppTile>
          )}
        </MediaStage>
      )}

      {/* The record under the mark, once both have landed — the caption's beat, so the frame
          finishes opening, the copy arrives, and the numbers arrive with it rather than as a
          fourth event. Only where the mark was measured: with no landing point there is nothing
          for it to sit under. */}
      {tile && stats && from?.tile && (
        <PluginStat
          style={
            {
              '--tile': `${from.tile.size}px`,
              '--tile-x': TILE_X_END,
              '--tile-y': from.tile.y,
            } as React.CSSProperties
          }
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0, transition: reduced ? { duration: 0 } : captionIn }}
          exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
        >
          <StatRow>
            <StatLabel>Downloads</StatLabel>
            <StatCount>{stats.downloads.toLocaleString()}</StatCount>
          </StatRow>
          <StatMeta>
            {stats.version && `v${stats.version}`}
            {stats.version && stats.releases > 0 && ' · '}
            {stats.releases > 0 && `${stats.releases} releases`}
          </StatMeta>
        </PluginStat>
      )}

      <DetailCaption
        $aside={split || phone || tile}
        $left={bleed}
        initial={reduced ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0, transition: reduced ? { duration: 0 } : captionIn }}
        exit={reduced ? undefined : { opacity: 0, transition: { duration: 0.12 } }}
      >
        <PanelEyebrow>
          {project.kind} / {project.year}
        </PanelEyebrow>
        <DetailName>{project.name}</DetailName>
        <DetailText>{project.detail ?? project.blurb}</DetailText>
        {/* Mirrors PluginStat's gate exactly, minus the tile: where the tile-anchored block
            renders, this must not, and vice versa — one copy of the numbers on screen. */}
        {stats && !(tile && from?.tile) && (
          <CaptionStat>
            Downloads<strong>{stats.downloads.toLocaleString()}</strong>
            {stats.version && <> · v{stats.version}</>}
            {stats.releases > 0 && <> · {stats.releases} releases</>}
          </CaptionStat>
        )}
        {project.url && (
          <DetailLink
            href={project.url}
            target="_blank"
            /* noreferrer as well as noopener: the opener hole is closed by default in current
               browsers, but the referrer leaks either way, and nothing here needs the
               destination to know where the visit came from. */
            rel="noopener noreferrer"
            /* The arrow says "this leaves the page" to the eye; the label says it to everyone
               else. On the anchor rather than in a visually-hidden span because that is one
               element and one string instead of a new component this file has no other use
               for — and it keeps the glyph purely decorative. */
            aria-label={`${linkLabel(project.url)} (opens in a new tab)`}
          >
            {linkLabel(project.url)}
            <ArrowUpRight aria-hidden strokeWidth={2} />
          </DetailLink>
        )}
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
  closerRef: React.RefObject<(() => boolean) | null>;
}> = ({ reduced, closerRef }) => {
  const [open, setOpen] = useState<number | null>(null);
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  /* The open/close choreography — losers wiping away sideways, the survivor flying to the
     hero and back — is staged for the horizontal accordion row. Below the stage cutover the
     panels are a stacked column, and the same moves read as slabs sweeping across full-width
     cards, so the stacked layout takes the reduced-motion path instead: the detail simply
     appears, the losers fade. Read once at mount like the landing's canHover — the layout's own
     JS gate (the click's tile measurement below) re-reads live either way. */
  const [stacked] = useState(
    () => typeof window !== 'undefined' && isStackedViewport(),
  );
  const staged = !reduced && !stacked;
  /* Where the clicked panel's window sat, as a share of the picture column it is about to
     become — the two edges the detail's shots open FROM (see Detail's reveal). Captured on the
     click, because by the time the detail mounts the panel is unmounted and the row has already
     been handed to the hero.

     State rather than a ref even though it is written once and read once: it is read DURING the
     render that opens the detail, and a ref read there is exactly what react-hooks/refs forbids.
     It costs nothing — it is set in the same handler as `open`, so React batches the two. */
  const [openFrom, setOpenFrom] = useState<PanelFrom | null>(
    null,
  );

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

  /* The page's exit chain has to be able to close this from outside — an open detail is an
     overlay above the whole frame, so nothing in --arrive reaches it and it would roll away
     still open (see DETAIL_LEAD). Reports whether there WAS anything to close, which is what
     tells the wheel handler how long a lead to take.

     Deliberately re-registered on every render rather than on a dependency list: what it closes
     over is `open`, and `close` is a new function each render anyway, so a list precise enough
     to be correct would run exactly as often as no list at all. */
  useEffect(() => {
    closerRef.current = () => {
      if (open === null) return false;
      close();
      return true;
    };
    return () => {
      closerRef.current = null;
    };
  });

  /* No reveal animation here any more: the roll-up IS the reveal. The section arrives by
     scrolling into frame under its own steam, and an opacity/lift tween on top of that would
     be a second entrance fighting the first. */
  return (
    <ProjectsSection>
      <SectionLabel>
        {/* The heading proper — first in the tree, and the only copy of these words a screen
            reader is given (see RestCue). */}
        <PanelsLabel>Selected side projects</PanelsLabel>
        <RestCue aria-hidden>
          Selected side projects
          <ScrollHint>
            <Bob
              animate={reduced ? undefined : { y: [0, 3, 0] }}
              transition={{ duration: 1.4, ease: 'easeInOut', repeat: Infinity }}
            >
              <ArrowDown size={13} strokeWidth={2} />
            </Bob>
          </ScrollHint>
        </RestCue>
      </SectionLabel>
      <RowFrame>
      <PanelRow ref={rowRef}>
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
              /* The rise's place in the stagger — see Panel. */
              style={{ '--i': i } as React.CSSProperties}
              layoutId={staged ? `project-panel-${i}` : undefined}
              /* A losing column clips itself away rather than being covered by an opaque card,
                 so what the wipe uncovers is the ruled ground the panels sit on — the section's
                 graph paper, showing through the transparent frame — instead of a flat
                 rectangle. Nothing here runs while the row is at rest: with `open` null every
                 panel animates to OPEN_CLIP, which is the value it already has.

                 Stacked column: no wipe — the sideways clip was drawn for the horizontal row
                 (see `staged`) — the losers just fade under the detail. */
              animate={
                staged
                  ? {
                      clipPath:
                        open === null ? OPEN_CLIP : wipeClip(wipeOf(i, open).fromRight),
                      transition:
                        open === null
                          ? { duration: 0.34, ease }
                          : {
                              duration: WIPE_DUR,
                              ease,
                              delay: wipeOf(i, open).order * WIPE_STAGGER,
                            },
                    }
                  : {
                      opacity: open === null ? 1 : 0,
                      transition: { duration: reduced ? 0 : 0.25, ease },
                    }
              }
              /* The flight HOME, and only that: opening is the Hero's own transition (see
                 heroIn), because opening is the element over there arriving. This is the panel
                 the hero flies back INTO, so closing is timed here.

                 0.4 rather than the 0.6 it opened on, and the asymmetry is the point — a close
                 is not an open reversed. Measured at 0.6, the hero was still 315px wide (against
                 the panel's 291) a third of a second in, which on the scroll-up path meant the
                 panels behind it started dropping while it was still visibly in flight. At 0.4
                 the same curve puts it home in ~230ms, and the exit chain can follow it. */
              transition={{ duration: 0.4, ease }}
              onClick={() => {
                const row = rowRef.current?.getBoundingClientRect();
                const el = triggers.current[i]?.getBoundingClientRect();
                if (row && el) {
                  const shots = row.width * (parseFloat(SPLIT_SHOTS) / 100);
                  const left = (el.left - row.left) / shots;
                  /* The same edges twice, because the layers that open from them do not share a
                     box: the split and the staged column are the picture column's width, a
                     bleeding stage is the frame's. Measured against each rather than scaled from
                     one to the other — the column shares are CLAMPED (the last panel starts
                     beyond the column entirely, at left > 1), and scaling a clamped pair gives a
                     window with no width, which opens as nothing at all. */
                  const frameLeft = (el.left - row.left) / row.width;
                  /* And where the mark is, if this panel carries one: the detail keeps it at
                     the size and place it already has rather than restaging it (see Detail).
                     MEASURED rather than recomputed from the panel's index, because the panel
                     under the pointer is the widened one — the accordion has moved both the
                     panel and the mark inside it, and only the DOM knows by how much. */
                  /* Desktop only, on the layout's own breakpoint: below it the detail stacks —
                     picture above, copy below (see DetailCaption) — and a mark placed at a
                     point measured in a side-by-side frame lands nowhere in particular. The
                     stacked detail keeps the staged tile instead. */
                  const t = !isStackedViewport()
                    ? triggers.current[i]
                        ?.querySelector('[data-tile]')
                        ?.getBoundingClientRect()
                    : undefined;
                  setOpenFrom({
                    left: Math.max(0, left),
                    right: Math.max(0, 1 - left - el.width / shots),
                    frameLeft: Math.max(0, frameLeft),
                    frameRight: Math.max(0, 1 - frameLeft - el.width / row.width),
                    tile: t
                      ? {
                          x: (t.left + t.width / 2 - row.left) / row.width,
                          y: (t.top + t.height / 2 - row.top) / row.height,
                          size: t.width,
                        }
                      : undefined,
                  });
                } else setOpenFrom(null);
                setOpen(i);
              }}
              aria-expanded={false}
              /* clip-path is a PAINT operation. A clipped panel is invisible and drops out of
                 hit-testing, so the mouse cannot reach it — but it keeps its place in the tab
                 order, and Tab would land on a button that is not there. Every panel still
                 rendered while the detail is open is a clipped loser (the survivor's slot is a
                 PanelSlot), so the condition is simply "is the detail open".

                 The old covering bands had exactly the same hole; the clip only makes it
                 easier to assume otherwise, because the panel genuinely is not painted. */
              inert={open !== null}
            >
              {/* Three layers under the copy, in this order: the tilted plate, the scrim that
                  lifts on hover, and the shim that does not. See PanelShim. */}
              {/* The wide capture when there is one, so the resting panel is a window onto the
                  same picture the opened detail shows (see PanelShot's $window). Falls back to
                  the portrait `image` and its fitted crop for everything else. */}
              {(p.imageWide || p.image) && (
                <PanelShot
                  $image={(p.imageWide ?? p.image)!}
                  $light={p.lightCapture}
                  $window={!!p.imageWide}
                  $bleed={bleeds(p)}
                  aria-hidden
                />
              )}
              {/* No longer only where there is no picture: the plugin now carries a sky as well
                  as a mark, and the mark belongs ON it — the two together are what the detail
                  opens onto. */}
              {p.tile && (
                /* Tagged so the click can measure it — the detail stages the mark at exactly
                   the size and place the panel had it (see Detail's tile branch). */
                <PanelTile data-tile aria-hidden>
                  <Bookmark strokeWidth={1.6} fill="currentColor" />
                </PanelTile>
              )}
              <PanelVeil aria-hidden />
              {p.image && <PanelShim aria-hidden />}
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
              from={openFrom}
              index={open}
              /* The stacked column rides the reduced-motion path: the detail's flight,
                 reveal clips and beat delays are all staged against the horizontal row. */
              reduced={reduced || stacked}
              onClose={close}
            />
          )}
        </AnimatePresence>
      </RowFrame>
    </ProjectsSection>
  );
};

const About: React.FC = () => {
  const reduced = useReducedMotion();
  const pageRef = useRef<HTMLDivElement>(null);
  /* The readme column, measured by AsciiPortrait to build a grid with its exact geometry. */
  const columnRef = useRef<HTMLDivElement>(null);
  /* The handoff between this file's two scroll writers, and it exists because they briefly
     disagree. The wheel handler flags the column out BEFORE anything scrolls (see RAIL_LEAD);
     the scroll listener derives the same flag from --p and would clear it again over the glide's
     first few pixels, where p is past 0 but not yet past WIDEN_AT. Measured: the column reached
     94% of its exit, snapped two-thirds of the way back, then left again. This is raised while
     the wheel handler is leading and dropped the moment --p crosses WIDEN_AT and the listener
     can speak for itself. */
  const leading = useRef(false);
  /* Its mirror, for the return: the wheel handler clears the section BEFORE anything scrolls
     (see ARRIVE_LEAD), and the listener — still reading a --p up at ~0.96 — would put it
     straight back. Raised while the wheel handler is leading out, dropped as soon as --p has
     fallen under ARRIVE_AT and the listener agrees. */
  const leaving = useRef(false);
  /* Projects' own close, registered from inside it so the exit chain can shut an open detail
     before anything else moves (see DETAIL_LEAD). */
  const closerRef = useRef<(() => boolean) | null>(null);

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
      /* Also not a custom property, and for the third distinct reason: pointer-events does not
         interpolate either, and this one is not cosmetic. Past the crossfade the prose is fully
         transparent but still hit-testable, and the stage it lives on now paints ABOVE the
         projects section — so without this it is an invisible sheet over the panels. */
      page.toggleAttribute('data-swapped', p >= SWAP_END);
      /* The last two beats, which are transitions rather than scrubs and so cannot be a custom
         property either (see ARRIVE_AT): the ground slides in and the panels rise.

         Two thresholds, far apart, so the beats play at the END of the way down and at the END
         of the way back — never over the roll itself (see ARRIVE_OFF). Everything between the
         two holds whatever it already was, which is what makes it a latch rather than a flip.

         The wheel path does not wait for the lower one: it clears the section up front and holds
         the glide while it goes (see ARRIVE_LEAD), which is why the set is suppressed while that
         is running. The threshold still owns every other way back — scrollbar, keyboard — where
         nothing has led and the exit has to happen somewhere. */
      if (p >= ARRIVE_AT) {
        if (!leaving.current) page.toggleAttribute('data-arrived', true);
      } else {
        leaving.current = false;
        if (p <= ARRIVE_OFF) page.toggleAttribute('data-arrived', false);
      }
      /* The other one that cannot be a custom property — not because it will not interpolate,
         but because it must not: the rail's exit is a two-state flip with its own transitions,
         never a scrub (see --rail-out). Held rather than cleared while the wheel handler is
         leading, so the two writers do not fight over the glide's opening pixels (see leading). */
      if (p >= WIDEN_AT) {
        leading.current = false;
        page.toggleAttribute('data-wide', true);
      } else if (!leading.current) {
        page.toggleAttribute('data-wide', false);
      }
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
    let glide = 0;
    /* Whether a lead is running — scheduled, not yet fired. The reversal guards need to know
       "has this gesture moved the page yet", and only the one at the TOP can ask that of the
       geometry: 0 is exactly 0, but the bottom is not max. Snapping settles the section's end on
       the scrollport's, which measures 23px short of the document's own end (581.5 against 605),
       so no tolerance small enough to mean "hasn't moved" is large enough to match it. */
    let pending = false;
    /* The held clear of data-arrived, when a detail had to be shut before the rest of the exit
       could start. Tracked so a reversal can call it off like the glide. */
    let exit = 0;

    const onWheel = (e: WheelEvent) => {
      if (!enabled || e.ctrlKey || e.deltaY === 0) return;
      const max = root.scrollHeight - root.clientHeight;
      const target = e.deltaY > 0 ? max : 0;
      /* A reversal DURING the lead, and it has to be caught before the parked check below: the
         page has not moved yet, so that check would see us at the top, hand the event back to
         the browser, and let the held glide fire anyway — the reader wheels up and the page
         goes down. Call the glide off and put the column back instead. */
      if (heading === max && target === 0 && root.scrollTop < 1) {
        window.clearTimeout(glide);
        heading = null;
        leading.current = false;
        pageRef.current?.toggleAttribute('data-wide', false);
        e.preventDefault();
        return;
      }
      /* The same reversal on the other side: wheeled up, the section started clearing out, and
         the reader changed their mind before the glide fired. Put it back.

         Asked of the LEAD rather than of the scroll position (see pending), and getting that
         wrong does not cost a missed animation: the flag stays cleared, the muzzle below stays
         up, and the section sits at the bottom of the screen permanently empty. */
      if (heading === 0 && target === max && pending) {
        window.clearTimeout(glide);
        window.clearTimeout(exit);
        pending = false;
        heading = null;
        leaving.current = false;
        pageRef.current?.toggleAttribute('data-arrived', true);
        e.preventDefault();
        return;
      }
      /* Already parked there: let the event through, so an over-scroll at either end behaves
         natively rather than being silently swallowed. */
      if (Math.abs(root.scrollTop - target) < 1) return;
      e.preventDefault();
      if (heading === target) return;
      heading = target;

      /* Any downward intent hands the section back to the scroll listener, wherever the page
         happens to be. The guard above only catches a reversal during the LEAD; reverse once the
         glide is already rolling and the page turns around without --p ever passing under
         ARRIVE_AT, which is the only other thing that lifts the muzzle. Without this the section
         would roll back up empty. */
      if (target === max) leaving.current = false;

      /* The sequence (see RAIL_LEAD). Going DOWN, the column's exit is flagged here — on the
         gesture, before anything has scrolled — and the glide is held back while it runs, so the
         portrait closes out and only then does the frame roll up.

         Flagged from the wheel rather than left to the scroll listener because the listener
         cannot do it: it reads --p, and during the lead nothing has scrolled, so --p is still 0.
         The two writers agree — this one only ever sets the flag, and only on the way down; the
         listener owns every other path (scrollbar, keyboard) and owns clearing it.

         The column needs nothing going UP: the listener releases that flag only once --p falls
         back under WIDEN_AT, which is the END of the return glide, so the frame rolls down first
         and the portrait comes back last. The same order, reversed, for free.

         The SECTION is the other way round, and it does not come for free. It is the last thing
         to arrive, so it has to be the first to leave — and left to a threshold its exit lands in
         the middle of the roll, crossing both the roll and the frame's own left edge coming back
         (see ARRIVE_LEAD). So the up gesture leads too: the ground and the panels are flagged out
         here, and the glide is held while they clear.

         One lead or the other, never both: a gesture is either going down (the column leads) or
         coming up (the section does). */
      const page = pageRef.current;
      const leads = target === max && !!page && !page.hasAttribute('data-wide');
      const leavesFirst = target === 0 && !!page && page.hasAttribute('data-arrived');
      /* An open detail is shut here, at the head of the chain, and what it costs is added to
         everything behind it (see DETAIL_LEAD). Called only on the way up: closing the detail
         on a DOWN gesture would be the page throwing away what the reader just opened. */
      const shut = leavesFirst && closerRef.current?.() === true;
      const detail = shut ? DETAIL_LEAD : 0;
      const lead = leads ? RAIL_LEAD : leavesFirst ? ARRIVE_LEAD + detail : 0;
      if (leads) {
        leading.current = true;
        page.toggleAttribute('data-wide', true);
      }
      if (leavesFirst) {
        leaving.current = true;
        const strike = () => page.toggleAttribute('data-arrived', false);
        window.clearTimeout(exit);
        if (detail) exit = window.setTimeout(strike, detail);
        else strike();
      }

      window.clearTimeout(glide);
      const start = () => {
        pending = false;
        window.scrollTo({ top: target, behavior: 'smooth' });
      };
      if (lead) {
        pending = true;
        glide = window.setTimeout(start, lead);
      } else start();

      window.clearTimeout(clear);
      clear = window.setTimeout(() => {
        heading = null;
      }, 700 + lead);
    };

    /* Not passive: the whole point is to replace the browser's own scroll with one glide. */
    window.addEventListener('wheel', onWheel, { passive: false });
    window.addEventListener('resize', refresh);
    return () => {
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', refresh);
      window.clearTimeout(clear);
      window.clearTimeout(glide);
      window.clearTimeout(exit);
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
    // jsdom implements neither the font-loading API nor canvas 2d, so an unguarded call
    // throws on mount under test — the stencil simply keeps its Anton-approximating
    // defaults there, which is all a render test could observe anyway. This page has no
    // test today; /lab, which runs the same measurement, does and caught it.
    if (!document.fonts?.load) return;
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
        {/* The window's aberration (see Peek). Channel misregistration, the image form of the
            header's text-shadow split: R goes up and left, G+B go down and right, and `screen`
            puts them back together — so the interior, where both copies overlap, is the
            untouched picture, and only the edges carry a red or cyan sliver.

            Under the header's ±1.2px, and sub-pixel on both axes. The header splits 11px type,
            where the fringe has to clear the glyph's own stem to register at all; here it runs
            along a 100×216px window's edges, which are long, straight and unbroken, so the
            same offset reads as a printing fault rather than a lens. The split is also
            diagonal where the header's is horizontal — a vertical offset on type just fattens
            the glyph, but this window has real horizontal edges (the frame's top and bottom,
            the picture's own tonal bands) that a purely horizontal split leaves clean.

            color-interpolation-filters="sRGB" is required: SVG filters default to linearRGB,
            which would relight the photograph on its way through a filter meant only to
            displace it. Its own <svg> rather than the Masthead one below, so the filter does
            not live inside a subtree that goes display: none at the stacked cutover. */}
        <svg width="0" height="0" focusable="false" aria-hidden>
          <defs>
            <filter id="readme-aberration" colorInterpolationFilters="sRGB">
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="1 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="r"
              />
              <feColorMatrix
                in="SourceGraphic"
                type="matrix"
                values="0 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                result="gb"
              />
              <feOffset in="r" dx="-0.8" dy="-0.6" result="rOff" />
              <feOffset in="gb" dx="0.8" dy="0.6" result="gbOff" />
              <feBlend in="rOff" in2="gbOff" mode="screen" />
            </filter>
          </defs>
        </svg>
        {/* Opens once frame and image have landed. WIDTH grows from the left edge, which `left`
            holds still and the background is anchored to, so the window wipes ACROSS a picture
            that never moves — the same axis the links below it arrive on. */}
        <Peek
          aria-hidden
          initial={reduced ? false : { width: 0, opacity: 0 }}
          animate={{ width: PEEK_W, opacity: 1 }}
          transition={{ duration: 0.6, ease, delay: 0.6, opacity: { duration: 0.1, delay: 0.6 } }}
        />
        <MobileTitle aria-hidden>readme</MobileTitle>
        {/* Last of the column to arrive, after the window it hangs off. */}
        <ContactRail
          aria-label="Contact"
          variants={railVariants}
          initial={reduced ? false : 'hidden'}
          animate="shown"
        >
          {CONTACT_LINKS.map(({ label, href }) => (
            <motion.a
              key={label}
              variants={linkVariants}
              href={href}
              /* The address opens a mail client, not a page — a new tab for it is a blank one
                 left behind. */
              target={href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noreferrer"
            >
              {label}
            </motion.a>
          ))}
        </ContactRail>
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
          <Projects reduced={!!reduced} closerRef={closerRef} />
        </Content>
      </Page>
    </PageTransition>
  );
};

export default About;
