import { useRef, useEffect, useState } from 'react';
import { useReducedMotion } from 'framer-motion';
import SplitStage from './SplitStage';
import Lockup from './Lockup';
import PetCaption from './PetCaption';
import Loader from './Loader';
import Lenses from './Lenses';
import TravelPath from './TravelPath';
import MoodClock from './MoodClock';
import { createLandingEngine } from './landingEngine';
// The loader intro plays once per fresh page load — the flag lives in introState so the
// route-transition layer can read it too. It latches on `onRevealed` — the engine's
// reveal-complete signal — NOT synchronously in the effect: React 19 StrictMode
// double-mounts effects in dev, and the first mount is torn down (aborting the clip
// download) before the reveal fires, so only the real, visible mount sets it.
import { landingHasRevealed, markLandingRevealed } from './introState';

const Landing: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  const reducedMotion = !!useReducedMotion();
  // Touch / no-fine-hover devices get the quick static reveal, not the full loader
  // (which gates on a ~7 MB download). Read once — capabilities don't change per render.
  const [canHover] = useState(
    () => window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  );
  // Captured on the mount so it stays stable for this mount's lifetime; a later SPA
  // re-navigation mounts fresh and re-reads landingHasRevealed (now true) → skips.
  const [playIntro] = useState(
    () => !landingHasRevealed() && !reducedMotion && canHover,
  );
  // Same gate the engine uses internally (`!reducedMotion && canHover`) — the draggable
  // lenses need a fine-hover pointer and motion allowed, so reduced-motion/touch
  // visitors never pay for the filter host or the per-frame world-canvas paint.
  const interactive = !reducedMotion && canHover;

  useEffect(() => {
    if (!ref.current) return;
    const engine = createLandingEngine(ref.current, {
      reducedMotion,
      canHover,
      playIntro,
      onRevealed: markLandingRevealed,
    });
    return () => engine.destroy();
  }, [reducedMotion, canHover, playIntro]);

  return (
    <div ref={ref}>
      {/* position:fixed, so DOM order here is cosmetic — rendered first to overlay.
          Only mounted for the full intro; the static path reveals the hero directly. */}
      {playIntro && <Loader />}
      <SplitStage />
      <Lockup interactive={interactive} />
      <PetCaption pet="j" />
      <PetCaption pet="o" />
      {/* Invisible on the page; lensEngine reveals these only inside the refracted lens clones.
          Gated with the lenses — no lens, nothing to reveal, so don't ship them. */}
      {interactive && <TravelPath />}
      {interactive && <MoodClock />}
      {interactive && <Lenses />}
    </div>
  );
};
export default Landing;
