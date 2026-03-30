import { styled, keyframes } from 'styled-components';
import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../types';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';

const waveAnimation = keyframes`
  0% {
    --wave-offset: 0%;
  }
  25% {
    --wave-offset: 1.5%;
  }
  50% {
    --wave-offset: 2%;
  }
  75% {
    --wave-offset: 1.5%;
  }
  100% {
    --wave-offset: 0%;
  }
`;

const neonFlicker = keyframes`
  0%, 19%, 21%, 23%, 25%, 54%, 56%, 100% {
    text-shadow:
      0 0 5px #00ffff,
      0 0 10px #00ffff,
      0 0 20px #00ffff,
      0 0 40px #00ffff,
      0 0 80px #00ffff,
      0 0 120px #00ffff;
    /* border-color: rgba(0, 255, 255, 0.6); */
  }

  20%, 24%, 55% {
    text-shadow: none;
    /* border-color: rgba(0, 255, 255, 0.1); */
  }
`;

const SunsetContainer = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 100%;

  & > div {
    display: flex;
    height: 100%;
    justify-content: center;
    align-items: center;
  }
`;

const Sun = styled(motion.div)`
  display: grid;
  grid-template: 1fr / 1fr;
  inline-size: min(40vmin, 400px);
  aspect-ratio: 1;
  border-radius: 50%;
  font-size: 0;

  --bg: #f9124f;
  --wave-offset: 0%;

  filter: drop-shadow(0 0 min(20px, 5vmin) var(--bg));
  background: radial-gradient(
    circle at center,
    var(--bg) 0,
    var(--bg) 53%,
    transparent 60%
  );

  animation: ${waveAnimation} 3s ease-in-out infinite;

  &::after {
    content: '';
    grid-area: 1 / 1;
    background: linear-gradient(#fcc22f, #f945e5);
    border-radius: inherit;

    --mask: linear-gradient(
        to top,
        #000 calc(1.5% + var(--wave-offset) * 1.0),
        #0000 calc(2% + var(--wave-offset) * 0.9),
        #0000 calc(5% + var(--wave-offset) * 1.1),
        #000 calc(5.5% + var(--wave-offset) * 0.8),
        #000 calc(7.5% + var(--wave-offset) * 1.2),
        #0000 calc(8% + var(--wave-offset) * 0.7),
        #0000 calc(10.6% + var(--wave-offset) * 1.0),
        #000 calc(11.1% + var(--wave-offset) * 0.9),
        #000 calc(13.6% + var(--wave-offset) * 1.3),
        #0000 calc(14.1% + var(--wave-offset) * 0.6),
        #0000 calc(16.3% + var(--wave-offset) * 1.1),
        #000 calc(16.8% + var(--wave-offset) * 0.8),
        #000 calc(19.8% + var(--wave-offset) * 1.4),
        #0000 calc(20.3% + var(--wave-offset) * 0.7),
        #0000 calc(22.1% + var(--wave-offset) * 1.0),
        #000 calc(22.6% + var(--wave-offset) * 0.9),
        #000 calc(26.1% + var(--wave-offset) * 1.2),
        #0000 calc(26.6% + var(--wave-offset) * 0.8),
        #0000 calc(28% + var(--wave-offset) * 1.5),
        #000 calc(28.5% + var(--wave-offset) * 0.6),
        #000 calc(32.5% + var(--wave-offset) * 1.1),
        #0000 calc(33% + var(--wave-offset) * 0.9),
        #0000 calc(34% + var(--wave-offset) * 1.3),
        #000 calc(34.5% + var(--wave-offset) * 0.7),
        #000 calc(39% + var(--wave-offset) * 1.0),
        #0000 calc(39.5% + var(--wave-offset) * 1.1),
        #0000 calc(40.1% + var(--wave-offset) * 0.8),
        #000 calc(40.6% + var(--wave-offset) * 1.2),
        #000 calc(46.6% + var(--wave-offset) * 0.9),
        #0000 calc(47.1% + var(--wave-offset) * 1.4),
        #0000 calc(47.5% + var(--wave-offset) * 0.6),
        #000 calc(48% + var(--wave-offset) * 1.0),
        /* #000 calc(53.5% + var(--wave-offset) * 0.8),
        #0000 calc(54% + var(--wave-offset) * 1.1),
        #0000 calc(54.2% + var(--wave-offset) * 0.9), */
        #000 0
      )
      no-repeat;

    -webkit-mask: var(--mask);
    mask: var(--mask);
  }
`;

const RetroAnimeSectionTitle = styled(SectionTitle)`
  border-radius: 2rem;
  display: inline-block;
  padding: 2rem 0;
  color: #ffffff;
  font-family: var(--day-font-neon);
  font-weight: 500;
  /* text-transform: uppercase; */
  /* letter-spacing: 0.15em; */
  font-size: clamp(3rem, 10vw, 6rem);

  /* box-shadow: 0 0 5px #00ffff,
              0 0 10px #00ffff,
              0 0 20px #00ffff,
              0 0 40px #00ffff,
              0 0 80px #00ffff,
              inset 0 0 4rem #00ffff; */

  text-shadow:
    /* Matching glow intensity and spread */
    0 0 5px #00ffff,
    0 0 10px #00ffff,
    0 0 20px #00ffff,
    0 0 40px #00ffff,
    0 0 80px #00ffff,
    0 0 120px #00ffff;

    animation: ${neonFlicker} 1.5s infinite linear;
  /* box-shadow: 0 0 .2rem #fff,
              0 0 .2rem #fff,
              0 0 1rem #bc13fe,
              0 0 0.2rem #bc13fe,
              0 0 2.8rem #bc13fe,
              inset 0 0 1rem #bc13fe;

  text-shadow:
    0 0 7px #fff,
    0 0 10px #fff,
    0 0 21px #fff,
    0 0 42px #bc13fe,
    0 0 82px #bc13fe,
    0 0 92px #bc13fe,
    0 0 102px #bc13fe,
    0 0 151px #bc13fe */
`;

const EveningSection: React.FC<TimeSectionContent> = ({ title, subtitle }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { amount: 0.3 });
  const reduced = useReducedMotion();

  return (
    <>
      <SunsetContainer className="sunset-container">
        <div><Sun /></div>
      </SunsetContainer>
      <SectionContent ref={ref} className="section-content evening-content">
        <RetroAnimeSectionTitle
          className="evening-title"
          data-text={title}
          style={{ animationPlayState: isInView ? 'running' : 'paused' }}
        >
          {title}
        </RetroAnimeSectionTitle>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={reduced
            ? { duration: 0.2 }
            : { duration: 0.9, delay: 0.45, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }
          }
        >
          <SectionSubtitle>{subtitle}</SectionSubtitle>
        </motion.div>
      </SectionContent>
    </>
  );
};

export default EveningSection;