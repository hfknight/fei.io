import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import styled from 'styled-components';
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
 * The box is 170vw wide and travels x: 100vw → -70vw, so it covers the viewport for the
 * whole range x ∈ [-70vw, 0]: cover begins the instant its leading edge reaches x = 0,
 * i.e. once the eased progress has consumed 100 of its 170vw of travel (0.588). Under
 * CURTAIN_EASE that lands at ~0.53 of the duration; rounded up for margin.
 */
export const CURTAIN_COVER = 0.45;
/* Ease-in-out, not the house ease-out-expo: expo front-loads so hard the seam crosses
   the stage in the first fifth and then crawls through the fade tail. A curtain is a
   travelling object — it should gather speed, sweep through the middle, and decelerate
   into the hand-off. */
const CURTAIN_EASE = [0.65, 0, 0.35, 1] as [number, number, number, number];

/* The page-change wipe for every destination EXCEPT home (see the exit variants below
   for the two home cases): sweeps in from the right over the exiting page until it
   covers the viewport. Its colour is the DESTINATION's, so when the new page mounts
   (content not yet entered, just its background) it is pixel-identical to the curtain and
   the hand-off is invisible. No slide-out needed.

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

   The sweep must be readable over a background of its own colour, so the box is 70vw
   wider than the viewport and carries its edge treatment with it: a hairline seam on the
   leading edge (the spottable front), backed by an ink shade that eases smoothly to pure
   surface across 70vw. At full cover the shaded part has slid past the viewport's left
   edge, keeping the swap seamless. This is a transform, not a clip-path reveal,
   deliberately: a clip exposes STATIC paint, so the shading would sit at a fixed spot
   instead of riding the moving edge. The transform is safe here — the curtain is a leaf
   with no descendants whose backgrounds could re-anchor. */
const Curtain = styled(motion.div)`
  position: fixed;
  top: 0;
  bottom: 0;
  left: 0;
  width: 170vw;
  /* Below the Header/Footer (z 10): the wipe covers page content, not the chrome. */
  z-index: 9;
  pointer-events: none;
  /* Multi-stop so the shade decays like a curve, not one linear band. The ink token
     resolves against the curtain's OWN data-surface (set from the destination), and the
     ground comes in as a custom property so a route whose background differs from its
     surface still hands off cleanly. */
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--curtain-ink, ${p => p.theme.color.ink})12%, var(--curtain-ground, ${p => p.theme.color.surface})) 0,
    color-mix(in srgb, var(--curtain-ink, ${p => p.theme.color.ink})8%, var(--curtain-ground, ${p => p.theme.color.surface})) 20vw,
    color-mix(in srgb, var(--curtain-ink, ${p => p.theme.color.ink})4%, var(--curtain-ground, ${p => p.theme.color.surface})) 42vw,
    var(--curtain-ground, ${p => p.theme.color.surface}) 70vw
  );

  /* The leading edge wears the landing seam's treatment — a 1px white hairline fading
     out at both ends over a soft blurred bloom, same recipe as HomeCurtains' seam. */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: -2px;
    width: 5px;
    filter: blur(3px);
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.3) 30%,
      rgba(255, 255, 255, 0.3) 70%,
      rgba(255, 255, 255, 0) 100%
    );
  }

  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 1px;
    background: linear-gradient(
      180deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.55) 30%,
      rgba(255, 255, 255, 0.55) 70%,
      rgba(255, 255, 255, 0) 100%
    );
  }
`;

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
      <Curtain
        variants={{
          initial: { x: '100vw' },
          enter: { x: '100vw' },
          /* The destination's colours ride in on the same variant that moves the curtain
             — `custom` is the only channel that carries the destination into an exiting
             tree, so there is nowhere else to put them. Both snap (duration 0): they are
             colour strings, not values to interpolate, and the curtain is still off
             screen at x: 100vw when they land. */
          exit: (dest: string) => {
            const home = dest === '/';
            return {
              x: home ? '100vw' : '-70vw',
              '--curtain-ground': groundFor(dest),
              '--curtain-ink': inkFor(dest),
              transition: home
                ? { duration: 0 }
                : {
                    duration: CURTAIN_DURATION,
                    ease: CURTAIN_EASE,
                    '--curtain-ground': { duration: 0 },
                    '--curtain-ink': { duration: 0 },
                  },
            };
          },
        }}
      />
    </motion.div>
  );
};

export default PageTransition;
