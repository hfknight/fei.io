import styled, { keyframes } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const shimmerSweep = keyframes`
  0% {
    transform: translateX(-88px) rotate(-20deg);
    animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }
  25% {
    transform: translateX(124px) rotate(-20deg);
    animation-timing-function: linear;
  }
  100% {
    transform: translateX(124px) rotate(-20deg);
  }
`;

const LogoShimmerWrap = styled.div`
  position: relative;
  width: 88px;
  height: 88px;
  overflow: hidden;
  mask-image: url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 450 450' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M450 225C450 349.264 349.264 450 225 450C100.736 450 0 349.264 0 225C0 100.736 100.736 0 225 0C349.264 0 450 100.736 450 225ZM225 420C332.696 420 420 332.696 420 225C420 203.544 416.535 182.897 410.133 164L410 164L304 164L278.692 229H360L348 259H267.188L205.809 419.068C212.122 419.684 218.524 420 225 420ZM174.962 413.52C91.5114 391.429 30 315.398 30 225C30 174.086 49.5128 127.729 81.4681 93H196.22L109 319H141L240 62H117.927C148.661 41.7709 185.456 30 225 30C299.425 30 364.112 71.6947 396.976 133H283L246.027 229H194L182 259H234.473L174.962 413.52Z' fill='black'/%3E%3C/svg%3E");
  mask-size: 88px 88px;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 450 450' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath fill-rule='evenodd' clip-rule='evenodd' d='M450 225C450 349.264 349.264 450 225 450C100.736 450 0 349.264 0 225C0 100.736 100.736 0 225 0C349.264 0 450 100.736 450 225ZM225 420C332.696 420 420 332.696 420 225C420 203.544 416.535 182.897 410.133 164L410 164L304 164L278.692 229H360L348 259H267.188L205.809 419.068C212.122 419.684 218.524 420 225 420ZM174.962 413.52C91.5114 391.429 30 315.398 30 225C30 174.086 49.5128 127.729 81.4681 93H196.22L109 319H141L240 62H117.927C148.661 41.7709 185.456 30 225 30C299.425 30 364.112 71.6947 396.976 133H283L246.027 229H194L182 259H234.473L174.962 413.52Z' fill='black'/%3E%3C/svg%3E");
  -webkit-mask-size: 88px 88px;
`;

const ShimmerBeam = styled.div<{ $reduced: boolean }>`
  position: absolute;
  top: -10px;
  left: 0;
  width: 56px;
  height: 108px;
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
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  width: 88px;
  height: 88px;
  transition: filter 0.4s ease;
  cursor: default;

  path, circle, rect, polygon {
    fill: url(#twilightGradient);
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
        <linearGradient id="twilightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde8b0" />
          <stop offset="50%" stopColor="#f8c058" />
          <stop offset="100%" stopColor="#f59868" />
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
