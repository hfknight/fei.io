import { motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import styled from 'styled-components';
import { landingHasRevealed } from './Landing/introState';
import { HOME_CURTAIN_IN } from './HomeCurtains';

const EASE = [0.16, 1, 0.3, 1] as [number, number, number, number];
/** Seconds the exit curtain takes to sweep across the old page. */
const CURTAIN_DURATION = 0.75;
/* Ease-in-out, not the house ease-out-expo: expo front-loads so hard the seam crosses
   the stage in the first fifth and then crawls through the fade tail. A curtain is a
   travelling object — it should gather speed, sweep through the middle, and decelerate
   into the hand-off. */
const CURTAIN_EASE = [0.65, 0, 0.35, 1] as [number, number, number, number];

/* The page-change wipe: sweeps in from the right over the exiting page until it covers
   the viewport. Its colour is the DESTINATION surface — Layout flips data-surface on
   <html> the moment the location changes, while the old page is still exiting — so when
   the new page mounts (content not yet entered, just its background), it is
   pixel-identical to the curtain and the hand-off is invisible. No slide-out needed.

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
  /* Multi-stop so the shade decays like a curve, not one linear band. */
  background: linear-gradient(
    90deg,
    color-mix(in srgb, ${p => p.theme.color.ink} 12%, ${p => p.theme.color.surface}) 0,
    color-mix(in srgb, ${p => p.theme.color.ink} 8%, ${p => p.theme.color.surface}) 20vw,
    color-mix(in srgb, ${p => p.theme.color.ink} 4%, ${p => p.theme.color.surface}) 42vw,
    ${p => p.theme.color.surface} 70vw
  );

  &::before {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    width: 2px;
    background: color-mix(in srgb, ${p => p.theme.color.ink} 40%, transparent);
  }
`;

interface Props {
  children: React.ReactNode;
}

/* Deliberately no transform on the wrappers: several pages build on
   background-attachment: fixed, and a live ancestor transform re-anchors those
   backgrounds to their elements (the imagery samples the wrong region, then snaps when
   the transform clears). Enter is an opacity fade; the choreography — e.g. /readme's
   column rising from the bottom — belongs to each page, sequenced naturally after the
   curtain by AnimatePresence's mode="wait". */
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
          exit: (dest: string) =>
            dest === '/'
              ? { x: '100vw' }
              : {
                  x: '-70vw',
                  transition: { duration: CURTAIN_DURATION, ease: CURTAIN_EASE },
                },
        }}
      />
    </motion.div>
  );
};

export default PageTransition;
