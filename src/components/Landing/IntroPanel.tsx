import styled, { keyframes } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/fei-feather.svg?react';

const shimmerSweep = keyframes`
  0% {
    transform: translateX(-44px) rotate(-20deg);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  25% {
    transform: translateX(60px) rotate(-20deg);
    animation-timing-function: linear;
  }
  100% {
    transform: translateX(60px) rotate(-20deg);
  }
`;

const FEATHER_MASK =
  "data:image/svg+xml,%3Csvg width='33' height='92' viewBox='0 0 140 390' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M60 195.588V322.076L0 278.791V151.996L60 195.588ZM60 170.867L0 127.274V69.291C0 34.0263 26.0771 4.8523 60 0V170.867Z' fill='black'/%3E%3Cpath d='M140 278.791L80 322.076V267.188L140 223.596V278.791ZM140 198.874L80 242.468V195.188L140 151.596V198.874ZM80 0C113.923 4.8523 140 34.0263 140 69.291V126.874L80 170.468V0Z' fill='black'/%3E%3Cpath d='M80 343.291L80 333.291L60 333.291L60 343.291L70 343.291L80 343.291ZM60 379.291C60 384.814 64.4772 389.291 70 389.291C75.5228 389.291 80 384.814 80 379.291L70 379.291L60 379.291ZM70 343.291L60 343.291L60 379.291L70 379.291L80 379.291L80 343.291L70 343.291Z' fill='black'/%3E%3C/svg%3E";

const LogoShimmerWrap = styled.div`
  position: relative;
  width: 33px;
  height: 92px;
  overflow: hidden;
  mask-image: url("${FEATHER_MASK}");
  mask-size: 33px 92px;
  -webkit-mask-image: url("${FEATHER_MASK}");
  -webkit-mask-size: 33px 92px;
`;

const ShimmerBeam = styled.div<{ $reduced: boolean }>`
  position: absolute;
  top: -14px;
  left: 0;
  width: 22px;
  height: 120px;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 240, 200, 0.25) 25%,
    rgba(255, 248, 220, 0.9) 50%,
    rgba(255, 240, 200, 0.25) 75%,
    transparent 100%
  );
  transform-origin: top left;
  pointer-events: none;
  animation: ${shimmerSweep} 8s linear 1.5s infinite both;

  ${({ $reduced }) => $reduced && 'display: none;'}

  @media (prefers-reduced-motion: reduce) {
    display: none;
  }
`;

const Block = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

const ContentColumn = styled.div`
  display: inline-flex;
  flex-direction: column;
  align-items: stretch;
`;

const Rule = styled(motion.div)`
  width: 100%;
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
  transform-origin: center;
`;

const IdentityRow = styled.div`
  display: flex;
  align-items: center;
  padding: 32px 0;
`;

const Logo = styled(motion.div)`
  padding-right: 0;
  filter: drop-shadow(0 6px 8px rgba(15, 12, 35, 0.38));
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  width: 33px;
  height: 92px;
  transition: filter 0.4s ease;
  cursor: default;

  path:nth-of-type(1) {
    fill: url(#flameRight);
  }

  path:nth-of-type(2) {
    fill: url(#flameLeft);
  }

  path:nth-of-type(3) {
    fill: url(#flameLeft);
  }

  &:hover {
    filter: drop-shadow(0 0 16px rgba(248, 192, 88, 0.45))
            drop-shadow(0 0 6px rgba(253, 232, 176, 0.3));
  }
`;

const VerticalDivider = styled(motion.div)`
  width: 1px;
  height: 88px;
  background: linear-gradient(to bottom, transparent, rgba(255, 255, 255, 0.22) 50%, transparent);
  margin: 0 24px;
  transform-origin: center;
`;

const TextSide = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const TaglineWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding-top: 16px;
  text-align: center;
`;

const TaglineName = styled(motion.p)`
  margin: 0;
  font-family: 'Cormorant Garamond', Georgia, serif;
  font-size: clamp(1.8rem, 5.5vw, 2.6rem);
  font-weight: 400;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: -0.02em;
  line-height: 1.1;
`;

const TaglineTitle = styled(motion.p)`
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.78rem;
  font-weight: 500;
  color: rgba(255, 255, 255, 0.60);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  line-height: 1.4;
`;

const ArrowAccent = styled.span`
  color: #f8c058;
  letter-spacing: 0;
`;

const TaglinePrimary = styled(motion.p)`
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: clamp(1.6rem, 5vw, 2.5rem);
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
  color: rgba(255, 255, 255, 0.68);
  letter-spacing: 0.18em;
  text-transform: uppercase;
  max-width: 380px;
  line-height: 1.9;
  text-wrap: balance;
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

const dividerAnim = {
  hidden: { scaleY: 0, opacity: 0 },
  visible: {
    scaleY: 1,
    opacity: 1,
    transition: {
      scaleY: { duration: 0.5, delay: 0.75, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
      opacity: { duration: 0.3, delay: 0.75 },
    },
  },
};

const IntroPanel: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const fade = reducedMotion
    ? { hidden: { opacity: 0 }, visible: () => ({ opacity: 1, transition: { duration: 0 } }) }
    : fadeUp;

  const rule = reducedMotion
    ? { hidden: { opacity: 0 }, visible: () => ({ opacity: 1, transition: { duration: 0 } }) }
    : ruleAnim;

  const divider = reducedMotion
    ? { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { duration: 0 } } }
    : dividerAnim;

  return (
  <Block>
    <svg width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <linearGradient id="flameLeft" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde9a8" />
          <stop offset="100%" stopColor="#f4c12e" />
        </linearGradient>
        <linearGradient id="flameRight" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffc061" />
          <stop offset="100%" stopColor="#f0851f" />
        </linearGradient>
      </defs>
    </svg>

    <ContentColumn>
      <Rule variants={rule} initial="hidden" animate="visible" custom={0.2} />

      <IdentityRow>
        <Logo variants={fade} initial="hidden" animate="visible" custom={0.4}>
          <LogoShimmerWrap>
            <LogoIcon />
            <ShimmerBeam $reduced={reducedMotion ?? false} />
          </LogoShimmerWrap>
        </Logo>
        <VerticalDivider variants={divider} initial="hidden" animate="visible" />
        <TextSide>
          <TaglineName variants={fade} initial="hidden" animate="visible" custom={0.85}>
            Fei Hu
          </TaglineName>
          <TaglineTitle variants={fade} initial="hidden" animate="visible" custom={1.05}>
            Frontend Engineer <ArrowAccent>→</ArrowAccent> AI Product Engineer
          </TaglineTitle>
        </TextSide>
      </IdentityRow>

      <Rule variants={rule} initial="hidden" animate="visible" custom={1.0} />

      <TaglineWrap>
        <TaglinePrimary variants={fade} initial="hidden" animate="visible" custom={1.3}>
          Craft. Code. Intelligence.
        </TaglinePrimary>
        <TaglineSecondary variants={fade} initial="hidden" animate="visible" custom={1.6}>
          Where every pixel has intent and every line has soul.
        </TaglineSecondary>
      </TaglineWrap>
    </ContentColumn>
  </Block>
  );
};

export default IntroPanel;
