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

const ripple = keyframes`
  0%   { transform: scale(0.85); opacity: 0.45; }
  100% { transform: scale(2.8);  opacity: 0; }
`;

const dotBlink = keyframes`
  0%, 100% { opacity: 0.2; }
  50% { opacity: 1; }
`;

const Screen = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 36px;
  background: linear-gradient(180deg, #0d1b2a 0%, #1a0f28 55%, #2d1018 100%);
  overflow: hidden;
`;

const LogoContainer = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Ring = styled.div<{ $delay: number }>`
  position: absolute;
  width: 165px;
  height: 165px;
  border-radius: 50%;
  border: 1px solid rgba(248, 192, 88, 0.4);
  pointer-events: none;
  animation: ${ripple} 3.6s ease-out infinite;
  animation-delay: ${p => p.$delay}s;
`;

const Glow = styled.div`
  position: absolute;
  width: 280px;
  height: 280px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(248, 192, 88, 0.55) 0%, transparent 70%);
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

        <LogoContainer>
          <Ring $delay={0} />
          <Ring $delay={1.2} />
          <Ring $delay={2.4} />
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
