import { motion } from 'framer-motion';
import { styled } from 'styled-components';

export const SectionContainer = styled(motion.section)<{ $isLast: boolean; $gradient: string }>`
  width: 100%;
  height: ${(props) => props.$isLast ? '100vh' : '150vh'};
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${(props) => props.$gradient};
  position: relative;
  scroll-snap-align: start;
  scroll-snap-stop: always;

  /* &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-image:
      radial-gradient(circle at 20% 30%, rgba(255,255,255,0.15) 0.4px, transparent 0.4px),
      radial-gradient(circle at 80% 70%, rgba(0,0,0,0.12) 0.3px, transparent 0.3px),
      radial-gradient(circle at 60% 20%, rgba(255,255,255,0.08) 0.2px, transparent 0.2px),
      radial-gradient(circle at 30% 80%, rgba(0,0,0,0.06) 0.25px, transparent 0.25px),
      radial-gradient(circle at 90% 40%, rgba(255,255,255,0.1) 0.35px, transparent 0.35px),
      radial-gradient(circle at 10% 60%, rgba(0,0,0,0.08) 0.15px, transparent 0.15px);
    background-size: 2px 2px, 1.8px 1.8px, 1.2px 1.2px, 1.5px 1.5px, 2.2px 2.2px, 1px 1px;
    background-position: 0 0, 1px 1px, 0.6px 0.6px, 0.75px 0.75px, 1.1px 1.1px, 0.5px 0.5px;
    opacity: 1;
    mix-blend-mode: overlay;
    pointer-events: none;
  } */
`;

export const SectionContent = styled(motion.div)`
  text-align: center;
  color: white;
  z-index: 2;
  max-width: 90vw;

  &.dawn-content {
    display: flex;
    flex-direction: column;
    position: absolute;
    height: 100vh;
    top: 0;
    align-items: center;
    justify-content: center;
    h1.section-title {
      font-size: 3.5rem;
      span {
        font-size: 4rem;
        background: linear-gradient(135deg, #fbbf24, #f9dc7f);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
        text-shadow: none;
      }
    }
  }
  &.morning-content {
    p {
      color: var(--day-text-morning-secondary);
    }
  }
  &.afternoon-content {
    margin-block-start: -8%;
  }
  &.evening-content {
    margin-block-start: -46%;
  }
  @media (max-width: 768px) {
    max-width: calc(100vw - 4rem);
    &.afternoon-content {
      margin-block-start: -20vh;
    }
    &.evening-content {
      margin-block-start: -70vh;
    }
  }
  @media (min-width: 1024px) {
    max-width: 60vw;
  }
`;

export const SectionTitle = styled.h1.attrs({ className: 'section-title' })`
  font-family: var(--day-font-primary);
  font-size: clamp(2rem, 8vw, 4rem);;
  font-weight: 300;
  margin-bottom: 1rem;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
  letter-spacing: 2px;

  &.morning-title {
    font-family: var(--day-font-starwars);
    letter-spacing: 0;
    text-shadow: 2px 6px 12px var(--day-text-morning-primary);
  }

  &.afternoon-title {
    font-family: var(--day-font-retro);
    font-size: clamp(1rem, 8vw, 3rem);
    letter-spacing: -2px;
  }

  @media (max-width: 768px) {
    /* font-size: 2.5rem; */
  }
`;

export const SectionSubtitle = styled.p.attrs({
  className: 'section-subtitle'
})`
  font-family: var(--font-secondary);
  font-size: 1.5rem;
  font-weight: 200;
  opacity: 0.9;
  text-align: left;
  /* text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3); */

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;
