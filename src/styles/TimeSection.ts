import { motion } from 'framer-motion';
import { styled } from 'styled-components';

export const SectionContainer = styled(motion.section)<{ $isLast: boolean; $gradient: string }>`
  width: 100%;
  height: ${(props) => props.$isLast ? '100dvh' : '150dvh'};
  margin-block-end: ${(props) => props.$isLast ? 0 : '-1px'};
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: ${(props) => props.$gradient};
  position: relative;
  scroll-snap-align: start;
  scroll-snap-stop: always;
  &#dawn {
    align-items: flex-start;
  }
`;

export const SectionContent = styled(motion.div)`
  text-align: center;
  color: white;
  z-index: 2;
  max-width: 90vw;

  &.dawn-content {
    display: flex;
    flex-direction: column;
    /* position: absolute; */
    height: 100dvh;
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
  /* &.morning-content {
    p {
      color: var(--day-text-morning-secondary);
    }
  } */
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
  /* letter-spacing: 2px; */

  /* &.morning-title {
    font-family: var(--day-font-starwars);
    letter-spacing: 0;
    text-shadow: 2px 6px 12px var(--day-text-morning-primary);
  } */

  /* &.afternoon-title {
    font-family: var(--day-font-retro);
    font-size: clamp(1rem, 8vw, 3rem);
    letter-spacing: -2px;
  } */

  @media (max-width: 768px) {
    /* font-size: 2.5rem; */
  }
`;

export const SectionSubtitle = styled.p.attrs({
  className: 'section-subtitle'
})`
  /* font-family: var(--font-secondary); */
  /* font-size: 1.5rem; */
  font-size: clamp(1.25rem, 2.5vw, 1.5rem);
  font-weight: 200;
  opacity: 0.9;
  text-align: left;
  /* text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.3); */

  @media (max-width: 768px) {
    font-size: 1.2rem;
  }
`;
