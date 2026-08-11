import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import styled, { css } from 'styled-components';
import { landingHasRevealed } from './Landing/introState';
import { HOME_CURTAIN_IN } from './HomeCurtains';
import { groundFor, inkFor } from '../styles/surface';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
/** Seconds the exit curtain takes to sweep across the old page. */
const CURTAIN_DURATION = 0.75;
/**
 * Seconds until the curtain fully covers the viewport — the moment it is safe to swap the
 * surface underneath without anyone seeing it.
 *
 * The box is 170% of the viewport along its axis and travels a full 170% of it, so cover
 * begins once the eased progress has consumed 100 of those 170 (0.588). Under CURTAIN_EASE
 * that lands at ~0.53 of the duration; rounded up for margin. Both axes are built to the
 * same 170/100 proportion precisely so this one number keeps serving both — Layout schedules
 * its surface flip on it.
 */
export const CURTAIN_COVER = 0.45;
/* Ease-in-out, not the house ease-out-expo: expo front-loads so hard the seam crosses
   the stage in the first fifth and then crawls through the fade tail. A curtain is a
   travelling object — it should gather speed, sweep through the middle, and decelerate
   into the hand-off. */
const CURTAIN_EASE = [0.65, 0, 0.35, 1] as [number, number, number, number];

/* The page-change wipe for every destination EXCEPT home (see the exit variants below
   for the two home cases): slides over the exiting page until it covers the viewport. Its
   colour is the DESTINATION's, so when the new page mounts (content not yet entered, just
   its background) it is pixel-identical to the curtain and the hand-off is invisible. No
   slide-out needed.

   It resolves that colour ITSELF, from the destination path, rather than reading whatever
   <html> currently says. data-surface is a plain attribute selector, so the curtain simply
   declares its own — the same trick PostBody's <pre> and PhotoEssay's Overlay use — and
   every token inside resolves to the destination. `--curtain-ground` carries the
   destination's actual background on top of that, because a route's ground is not always
   its surface's (lab entries sit on --n-11, not the deep indigo).

   This is what lets Layout STOP flipping <html> eagerly. It used to have to, so the
   curtain would be the right colour; the cost was that the outgoing page — still fully
   visible for the first ~0.45s of the sweep — was re-inked mid-exit. On /lab that showed
   as a hovered link jumping from the light surface's olive-bronze accent to the dark
   surface's bright yellow before the curtain ever reached it.

   The sweep must be readable over a background of its own colour, so the box overruns the
   viewport by 70% of it and carries its edge treatment with it: a hairline seam on the
   leading edge (the spottable front), backed by an ink shade that eases smoothly to pure
   surface across that overrun. At full cover the shaded part has slid past the viewport's
   far edge, keeping the swap seamless. This is a transform, not a clip-path reveal,
   deliberately: a clip exposes STATIC paint, so the shading would sit at a fixed spot
   instead of riding the moving edge. The transform is safe here — the curtain is a leaf
   with no descendants whose backgrounds could re-anchor.

   Stop positions are PERCENTAGES of the box, not viewport units, so one recipe serves both
   axes: a gradient line always runs the box's own length along the direction it travels,
   and 20/42/70 of 170 are the same fractions either way. */
const curtainSkin = css`
  position: fixed;
  /* Below the Header/Footer (z 10): the wipe covers page content, not the chrome. */
  z-index: 9;
  pointer-events: none;
  /* Multi-stop so the shade decays like a curve, not one linear band. The ink token
     resolves against the curtain's OWN data-surface (set from the destination), and the
     ground comes in as a custom property so a route whose background differs from its
     surface still hands off cleanly. --curtain-angle points the gradient at the leading
     edge, which is the only thing that differs between the two axes. */
  background: linear-gradient(
    var(--curtain-angle),
    color-mix(in srgb, var(--curtain-ink, ${p => p.theme.color.ink})12%, var(--curtain-ground, ${p => p.theme.color.surface})) 0,
    color-mix(in srgb, var(--curtain-ink, ${p => p.theme.color.ink})8%, var(--curtain-ground, ${p => p.theme.color.surface})) 11.76%,
    color-mix(in srgb, var(--curtain-ink, ${p => p.theme.color.ink})4%, var(--curtain-ground, ${p => p.theme.color.surface})) 24.71%,
    var(--curtain-ground, ${p => p.theme.color.surface}) 41.18%
  );

  &::before,
  &::after {
    content: '';
    position: absolute;
  }

  /* The leading edge wears the landing seam's treatment — a 1px white hairline fading
     out at both ends over a soft blurred bloom, same recipe as HomeCurtains' seam. */
  &::before {
    filter: blur(3px);
    background: linear-gradient(
      var(--seam-angle),
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 30%,
      rgba(255, 255, 255, 0.3) 70%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  &::after {
    background: linear-gradient(
      var(--seam-angle),
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.55) 30%,
      rgba(255, 255, 255, 0.55) 70%,
      rgba(255, 255, 255, 0) 100%
    );
  }
`;

/* Right to left — the wipe for every destination that has no axis of its own (see
   axisFor). Leading edge: its left. */
const CurtainX = styled(motion.div)`
  ${curtainSkin}
  --curtain-angle: 90deg;
  --seam-angle: 180deg;
  top: 0;
  bottom: 0;
  left: 0;
  width: 170vw;

  &::before {
    top: 0;
    bottom: 0;
    left: -2px;
    width: 5px;
  }

  &::after {
    top: 0;
    bottom: 0;
    left: 0;
    width: 1px;
  }
`;

/* Left to right — the writing pages', so entering that territory reads as one gesture:
   the curtain arrives from the left, the side the index anchors with its wordmark and
   hero. CurtainX mirrored: leading edge is its RIGHT, so the shade gradient points left
   (270deg) and the seam pseudos pin to the right edge. Parked at x:-100% of its own
   170vw box — entirely off the left edge. */
const CurtainXL = styled(motion.div)`
  ${curtainSkin}
  --curtain-angle: 270deg;
  --seam-angle: 180deg;
  top: 0;
  bottom: 0;
  left: 0;
  width: 170vw;

  &::before {
    top: 0;
    bottom: 0;
    right: -2px;
    width: 5px;
  }

  &::after {
    top: 0;
    bottom: 0;
    right: 0;
    width: 1px;
  }
`;

/* Top to bottom — /lab's, because /lab answers it with a column rising from the bottom and
   the two read as one gesture falling and returning. Leading edge: its bottom, so the
   gradient runs 0deg (bottom-up) and the seam lies across the box's width. */
const CurtainY = styled(motion.div)`
  ${curtainSkin}
  --curtain-angle: 0deg;
  --seam-angle: 90deg;
  left: 0;
  right: 0;
  top: 0;
  height: 170dvh;

  &::before {
    left: 0;
    right: 0;
    bottom: -2px;
    height: 5px;
  }

  &::after {
    left: 0;
    right: 0;
    bottom: 0;
    height: 1px;
  }
`;

/**
 * One exit variant for both curtains, resolved from the destination.
 *
 * Home is never swept — it brings its own cover (the Loader on a first visit, HomeCurtains
 * on a return). Everything else is swept by exactly one curtain, chosen by axisFor: /lab
 * falls from the top, because its own entrance is the right column rising from the bottom
 * and a horizontal wipe across that reads as two transitions for one navigation; the
 * writing pages arrive from the left; every other route keeps the right-to-left sweep.
 * The curtains that are not travelling hold their parked value for 0s, which framer
 * treats as staying put.
 *
 * The colours go on both regardless: they are free to set, and setting them unconditionally
 * keeps the parked curtain correct if the axis rule ever changes.
 */
/* Which curtain a destination sends: home none, /lab its falling Y, the writing pages
   (index, posts, and admin alike — one territory, one gesture) the from-left XL,
   everything else the default from-right X. */
const axisFor = (dest: string): 'x' | 'xl' | 'y' | null => {
  if (dest === '/') return null;
  if (dest === '/lab') return 'y';
  if (dest === '/writing' || dest.startsWith('/writing/')) return 'xl';
  return 'x';
};

const sweep = (dest: string, axis: 'x' | 'xl' | 'y') => {
  const travels = axisFor(dest) === axis;
  /* Written out per axis rather than as a computed key: a [axis] key widens the object to a
     string index signature, which framer's Target type will not accept.

     XL's travel is -100% → 0% of its own 170vw box: it spends the same 100-of-170 before
     cover as the other two, so CURTAIN_COVER keeps serving all three. */
  const offset = axis === 'y'
    ? { y: travels ? '0%' : '-100%' }
    : axis === 'xl'
      ? { x: travels ? '0%' : '-100%' }
      : { x: travels ? '-70vw' : '100vw' };
  return {
    ...offset,
    '--curtain-ground': groundFor(dest),
    '--curtain-ink': inkFor(dest),
    transition: travels
      ? {
          duration: CURTAIN_DURATION,
          ease: CURTAIN_EASE,
          '--curtain-ground': { duration: 0 },
          '--curtain-ink': { duration: 0 },
        }
      : { duration: 0 },
  };
};

interface Props {
  children: React.ReactNode;
}

/* Deliberately no transform on the wrappers: several pages build on
   background-attachment: fixed, and a live ancestor transform re-anchors those
   backgrounds to their elements (the imagery samples the wrong region, then snaps when
   the transform clears). Enter is an opacity fade; the choreography — e.g. /readme's
   column sliding in from the left — belongs to each page, sequenced naturally after the
   curtain by AnimatePresence's mode="wait".

   Exits are destination-aware: AnimatePresence's `custom` (wired in AppRoutes) feeds
   the destination path to the exit variant functions. Non-home destinations get the
   Curtain sweep; home gets no sweep, because home brings its own cover — the Loader on
   a first visit, HomeCurtains (plus Layout's deferred surface flip) on a return. */
const PageTransition: React.FC<Props> = ({ children }) => {
  const reduced = useReducedMotion();

  if (reduced) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { duration: 0 } }}
        exit={{ opacity: 0, transition: { duration: 0 } }}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <motion.div initial="initial" animate="enter" exit="exit" style={{ width: '100%' }}>
      <motion.div
        variants={{
          initial: { opacity: 0 },
          enter: { opacity: 1, transition: { duration: 0.3, ease: EASE } },
          /* `dest` is AnimatePresence's custom — the destination path. Exits to home
             don't sweep (see the Curtain below). Landing already revealed →
             HomeCurtains is closing over this page, so hold it until fully covered:
             0.999 because the change must be real for framer to spend the duration on
             it (same-value keyframes complete instantly), yet imperceptible. Not
             revealed yet → exit immediately, the landing's own Loader overlay is the
             transition. */
          exit: (dest: string) =>
            dest === '/' && landingHasRevealed()
              ? { opacity: 0.999, transition: { duration: HOME_CURTAIN_IN } }
              : { opacity: 1 },
        }}
      >
        {children}
      </motion.div>
      {/* All three curtains are always mounted; only one ever travels. The destination reaches an
          exiting tree solely through AnimatePresence's `custom`, which feeds variant
          FUNCTIONS — it cannot pick which component renders — so the choice is made inside
          the variants and the other curtain simply holds its parked position for 0s. Parked
          means fully off screen, so the idle one costs nothing but a node. */}
      <CurtainX
        variants={{
          initial: { x: '100vw' },
          enter: { x: '100vw' },
          /* The destination's colours ride in on the same variant that moves the curtain
             — `custom` is the only channel that carries the destination into an exiting
             tree, so there is nowhere else to put them. Both snap (duration 0): they are
             colour strings, not values to interpolate, and the curtain is still off
             screen when they land. */
          exit: (dest: string) => sweep(dest, 'x'),
        }}
      />
      <CurtainXL
        variants={{
          initial: { x: '-100%' },
          enter: { x: '-100%' },
          exit: (dest: string) => sweep(dest, 'xl'),
        }}
      />
      <CurtainY
        variants={{
          /* -100% of a box 170dvh tall: entirely above the viewport, bottom edge on its
             top edge. It travels that whole 170 to y: 0, covering once 100 of it is spent
             — the same 100-of-170 the X curtain spends, which is what keeps one
             CURTAIN_COVER honest for both. */
          initial: { y: '-100%' },
          enter: { y: '-100%' },
          exit: (dest: string) => sweep(dest, 'y'),
        }}
      />
    </motion.div>
  );
};

export default PageTransition;
