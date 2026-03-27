import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

const glowPulse = keyframes`
  0%, 100% { opacity: 0.18; transform: scale(1); }
  50% { opacity: 0.38; transform: scale(1.08); }
`;

const twinkle = keyframes`
  0%, 100% { opacity: 0.08; }
  50% { opacity: 0.55; }
`;

const dotBlink = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;

const STARS = [
  { x:  5, y: 15, s: 1.5, d: 0.0, dur: 3.2 },
  { x: 18, y: 72, s: 1.0, d: 0.7, dur: 2.8 },
  { x: 32, y: 28, s: 2.0, d: 1.4, dur: 4.1 },
  { x: 45, y: 88, s: 1.5, d: 0.3, dur: 3.6 },
  { x: 58, y: 10, s: 1.0, d: 1.8, dur: 2.5 },
  { x: 72, y: 55, s: 2.0, d: 0.9, dur: 3.9 },
  { x: 85, y: 32, s: 1.5, d: 2.1, dur: 4.3 },
  { x: 92, y: 78, s: 1.0, d: 0.5, dur: 3.0 },
  { x: 12, y: 90, s: 1.5, d: 1.2, dur: 2.7 },
  { x: 28, y: 48, s: 1.0, d: 2.5, dur: 4.8 },
  { x: 65, y: 82, s: 2.0, d: 0.2, dur: 3.3 },
  { x: 78, y: 18, s: 1.0, d: 1.6, dur: 2.9 },
  { x: 40, y: 65, s: 1.5, d: 3.0, dur: 4.0 },
  { x: 88, y: 48, s: 1.0, d: 0.8, dur: 3.5 },
  { x: 22, y: 35, s: 2.0, d: 2.3, dur: 4.5 },
  { x: 55, y: 22, s: 1.0, d: 1.1, dur: 3.1 },
  { x:  8, y: 58, s: 1.5, d: 2.8, dur: 2.6 },
  { x: 70, y: 40, s: 1.0, d: 0.4, dur: 4.2 },
  { x: 95, y: 15, s: 1.5, d: 1.9, dur: 3.7 },
  { x: 48, y: 95, s: 1.0, d: 3.2, dur: 2.4 },
];

const Screen = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36px;
  background: linear-gradient(180deg, #0d1b2a 0%, #1a1025 100%);
  overflow: hidden;
`;

const Star = styled.div<{ $x: number; $y: number; $s: number; $d: number; $dur: number }>`
  position: absolute;
  left: ${p => p.$x}%;
  top: ${p => p.$y}%;
  width: ${p => p.$s}px;
  height: ${p => p.$s}px;
  border-radius: 50%;
  background: #fff;
  pointer-events: none;
  animation: ${twinkle} ${p => p.$dur}s ease-in-out infinite;
  animation-delay: ${p => p.$d}s;
`;

const LogoContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Glow = styled.div`
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(248, 192, 88, 0.6) 0%, transparent 70%);
  filter: blur(36px);
  pointer-events: none;
  animation: ${glowPulse} 2s ease-in-out infinite;
`;

const LogoWrap = styled(motion.div)`
  position: relative;
  width: 165px;
  height: 165px;
  z-index: 1;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Logo = styled(LogoOutlinedSvg)`
  width: 100%;
  height: 100%;
  path, circle, rect, polygon {
    fill: url(#twilightGradient);
  }
`;

const LoadingLabel = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 3px;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.22em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.3);
`;

const Dot = styled.span<{ $delay: number }>`
  animation: ${dotBlink} 1.2s ease-in-out infinite;
  animation-delay: ${p => p.$delay}s;
`;

interface Props {
  isVisible: boolean;
}

const LoadingScreen: React.FC<Props> = ({ isVisible }) => (
  <AnimatePresence>
    {isVisible && (
      <Screen
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.6 } }}
      >
        <svg width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            <linearGradient id="twilightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde8b0" />
              <stop offset="50%" stopColor="#f8c058" />
              <stop offset="100%" stopColor="#f59868" />
            </linearGradient>
          </defs>
        </svg>

        {STARS.map((star, i) => (
          <Star key={i} $x={star.x} $y={star.y} $s={star.s} $d={star.d} $dur={star.dur} />
        ))}

        <LogoContainer>
          <Glow />
          <LogoWrap
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, transition: { duration: 0.8 } }}
          >
            <Logo />
          </LogoWrap>
        </LogoContainer>

        <LoadingLabel
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0, transition: { duration: 0.6, delay: 1.0 } }}
        >
          loading
          <Dot $delay={0}>.</Dot>
          <Dot $delay={0.2}>.</Dot>
          <Dot $delay={0.4}>.</Dot>
        </LoadingLabel>
      </Screen>
    )}
  </AnimatePresence>
);

export default LoadingScreen;
