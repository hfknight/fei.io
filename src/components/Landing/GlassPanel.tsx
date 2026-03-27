import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const shimmer = keyframes`
  0% { background-position: -400% center; }
  100% { background-position: 400% center; }
`;

const Block = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const Rule = styled(motion.div)`
  width: 320px;
  height: 1px;
  background: linear-gradient(
    90deg,
    #7ab4f5 0%,
    #c9a0f8 30%,
    #e8d0ff 50%,
    #c9a0f8 70%,
    #f57ab5 100%
  );
  background-size: 300% auto;
  transform-origin: center;
  animation: ${shimmer} 6s linear infinite;
  animation-delay: 2.5s;
`;

const Logo = styled(motion.div)`
  padding: 32px 0;
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  width: 165px;
  height: 165px;
  transition: filter 0.4s ease;
  cursor: default;

  path, circle, rect, polygon {
    fill: url(#twilightGradient);
  }

  &:hover {
    filter: drop-shadow(0 0 16px rgba(176, 122, 245, 0.55))
            drop-shadow(0 0 6px rgba(122, 180, 245, 0.4));
  }
`;

const TaglineWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 32px;
  text-align: center;
`;

const TaglinePrimary = styled(motion.p)`
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 2.5rem;
  font-weight: 400;
  font-style: italic;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.01em;
  line-height: 1.2;
`;

const TaglineSecondary = styled(motion.p)`
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.55);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  max-width: 380px;
  line-height: 1.9;
`;

const ruleAnim = {
  hidden: { scaleX: 0, opacity: 0 },
  visible: (delay: number) => ({
    scaleX: 1,
    opacity: 1,
    transition: {
      scaleX: { duration: 0.7, delay, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
      opacity: { duration: 0.3, delay },
    },
  }),
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.9,
      delay,
      ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number],
    },
  }),
};

const GlassPanel: React.FC = () => (
  <Block>
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="twilightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7ab4f5" />
          <stop offset="50%" stopColor="#b07af5" />
          <stop offset="100%" stopColor="#f57ab5" />
        </linearGradient>
      </defs>
    </svg>

    <Rule variants={ruleAnim} initial="hidden" animate="visible" custom={0.2} />

    <Logo variants={fadeUp} initial="hidden" animate="visible" custom={0.6}>
      <LogoIcon />
    </Logo>

    <Rule variants={ruleAnim} initial="hidden" animate="visible" custom={1.0} />

    <TaglineWrap>
      <TaglinePrimary variants={fadeUp} initial="hidden" animate="visible" custom={1.3}>
        Web Developer based in Texas, US.
      </TaglinePrimary>
      <TaglineSecondary variants={fadeUp} initial="hidden" animate="visible" custom={1.6}>
        creating aesthetic and intuitive interfaces that blend<br />thoughtful design with robust engineering
      </TaglineSecondary>
    </TaglineWrap>
  </Block>
);

export default GlassPanel;
