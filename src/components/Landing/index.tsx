import { useRef, useEffect } from 'react';
import SplitStage from './SplitStage';
import Lockup from './Lockup';
import PetCaption from './PetCaption';
import { createLandingEngine } from './landingEngine';

const Landing: React.FC = () => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const engine = createLandingEngine(ref.current, { reducedMotion: false, canHover, playIntro: true });
    return () => engine.destroy();
  }, []);
  return (
    <div ref={ref}>
      <SplitStage />
      <Lockup />
      <PetCaption pet="j" />
      <PetCaption pet="o" />
    </div>
  );
};
export default Landing;
