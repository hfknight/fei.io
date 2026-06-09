import styled, { keyframes } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/fei-flame.svg?react';

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
  mask-image: url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 227 272' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M76.0004 141.5C65.7361 145.447 53.1351 139.029 48.489 128C44.7253 119.066 52.489 103.5 52.489 103.5C52.489 103.5 59.0006 87 86.0006 79C113.001 71 128.157 58.2763 132.489 43C137.821 24.1978 113.001 0 113.001 0C113.001 0 116.17 9.71728 110.489 16.5C100.616 28.288 77.9773 21.5 48.489 43C15.2333 67.2467 0.135827 96.7508 0.000705005 135C-0.133817 173.079 19.0006 204.5 42.0006 223C65.0006 241.5 80.5005 243.5 80.5005 243.5C80.5005 243.5 61.2036 229.502 57.5004 216C54.5492 205.24 55.154 199.21 59.5004 190C63.8468 180.79 84.4441 173.759 93.5004 162.5C102.557 151.241 93.5004 125.5 93.5004 125.5C93.5004 125.5 84.5097 138.228 76.0004 141.5Z' fill='black'/%3E%3Cpath d='M150.228 130C160.493 126.053 173.094 132.471 177.74 143.5C181.503 152.434 173.74 168 173.74 168C173.74 168 167.228 184.5 140.228 192.5C113.228 200.5 98.0722 213.224 93.7397 228.5C88.4073 247.302 113.228 271.5 113.228 271.5C113.228 271.5 110.059 261.783 115.74 255C125.612 243.212 148.251 250 177.74 228.5C210.995 204.253 226.093 174.749 226.228 136.5C226.363 98.4206 207.228 67 184.228 48.5C161.228 30 145.728 28 145.728 28C145.728 28 165.025 41.9982 168.728 55.5C171.68 66.2599 171.075 72.2905 166.728 81.5C162.382 90.7095 141.785 97.7408 132.728 109C123.672 120.259 132.728 146 132.728 146C132.728 146 141.719 133.272 150.228 130Z' fill='black'/%3E%3C/svg%3E");
  mask-size: 88px 88px;
  -webkit-mask-image: url("data:image/svg+xml,%3Csvg width='88' height='88' viewBox='0 0 227 272' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M76.0004 141.5C65.7361 145.447 53.1351 139.029 48.489 128C44.7253 119.066 52.489 103.5 52.489 103.5C52.489 103.5 59.0006 87 86.0006 79C113.001 71 128.157 58.2763 132.489 43C137.821 24.1978 113.001 0 113.001 0C113.001 0 116.17 9.71728 110.489 16.5C100.616 28.288 77.9773 21.5 48.489 43C15.2333 67.2467 0.135827 96.7508 0.000705005 135C-0.133817 173.079 19.0006 204.5 42.0006 223C65.0006 241.5 80.5005 243.5 80.5005 243.5C80.5005 243.5 61.2036 229.502 57.5004 216C54.5492 205.24 55.154 199.21 59.5004 190C63.8468 180.79 84.4441 173.759 93.5004 162.5C102.557 151.241 93.5004 125.5 93.5004 125.5C93.5004 125.5 84.5097 138.228 76.0004 141.5Z' fill='black'/%3E%3Cpath d='M150.228 130C160.493 126.053 173.094 132.471 177.74 143.5C181.503 152.434 173.74 168 173.74 168C173.74 168 167.228 184.5 140.228 192.5C113.228 200.5 98.0722 213.224 93.7397 228.5C88.4073 247.302 113.228 271.5 113.228 271.5C113.228 271.5 110.059 261.783 115.74 255C125.612 243.212 148.251 250 177.74 228.5C210.995 204.253 226.093 174.749 226.228 136.5C226.363 98.4206 207.228 67 184.228 48.5C161.228 30 145.728 28 145.728 28C145.728 28 165.025 41.9982 168.728 55.5C171.68 66.2599 171.075 72.2905 166.728 81.5C162.382 90.7095 141.785 97.7408 132.728 109C123.672 120.259 132.728 146 132.728 146C132.728 146 141.719 133.272 150.228 130Z' fill='black'/%3E%3C/svg%3E");
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
  filter: drop-shadow(0 6px 8px rgba(15, 12, 35, 0.38));
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  width: 88px;
  height: 88px;
  transition: filter 0.4s ease;
  cursor: default;

  path:nth-of-type(1) {
    fill: url(#flameLeft);
  }

  path:nth-of-type(2) {
    fill: url(#flameRight);
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
