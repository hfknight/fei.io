import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import styled from 'styled-components';
import { landingHasRevealed } from './Landing/introState';

/** Seconds the two halves take to meet in the middle — PageTransition holds the exiting
    page exactly this long, so the swap to the landing happens under full cover. */
export const HOME_CURTAIN_IN = 0.5;
const HOLD = 0.12;
const OUT = 0.6;
/* Same travelling-object ease as PageTransition's sweep. */
const EASE = [0.65, 0, 0.35, 1] as [number, number, number, number];

const Half = styled(motion.div)`
  position: fixed;
  top: 0;
  bottom: 0;
  width: 50vw;
  /* Below the Header/Footer (z 10), like PageTransition's curtain. */
  z-index: 9;
  pointer-events: none;
`;

/* The halves mirror SplitStage's gradients verbatim (the landing palette is
   deliberately outside the token system): when the curtains part they hand off into
   the stage's own matching halves, echoing the loader's curtain reveal. */
const LeftHalf = styled(Half)`
  left: 0;
  background: linear-gradient(120deg, #e9eaeb 0%, #d4d6d8 100%);

  /* Leading edge: reads as the landing's centre seam while the halves are met. */
  &::after {
    content: '';
    position: absolute;
    top: 0;
    bottom: 0;
    right: 0;
    width: 1px;
    background: rgba(255, 255, 255, 0.28);
  }
`;

const RightHalf = styled(Half)`
  left: 50vw;
  background: linear-gradient(120deg, #54565b 0%, #33343a 100%);
`;

/* The return-to-home transition: two curtains slide in from the sides, meet in the
   middle, then part again — a nod to the landing loader's curtain reveal. Mounted
   OUTSIDE AnimatePresence (the exiting page unmounts mid-sequence, so the slide-out
   could not live on it). Only plays when the landing has already revealed this page
   load; before that, the landing's own Loader is the transition and PageTransition
   exits bare. */
const HomeCurtains: React.FC = () => {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'idle' | 'in' | 'out'>('idle');
  /* State adjusted during render (the React-sanctioned derive-from-props pattern):
     a navigation ONTO "/" from elsewhere starts the sequence. */
  const [prevPath, setPrevPath] = useState(pathname);
  if (pathname !== prevPath) {
    setPrevPath(pathname);
    if (pathname === '/' && landingHasRevealed() && !reduced) {
      setPhase('in');
    }
  }

  if (phase === 'idle') return null;

  const closing = phase === 'in';
  const transition = closing
    ? { duration: HOME_CURTAIN_IN, ease: EASE }
    : { duration: OUT, ease: EASE, delay: HOLD };

  return (
    <>
      <LeftHalf
        initial={{ x: '-100%' }}
        animate={{ x: closing ? '0%' : '-100%' }}
        transition={transition}
        onAnimationComplete={() => setPhase(closing ? 'out' : 'idle')}
      />
      <RightHalf
        initial={{ x: '100%' }}
        animate={{ x: closing ? '0%' : '100%' }}
        transition={transition}
      />
    </>
  );
};

export default HomeCurtains;
