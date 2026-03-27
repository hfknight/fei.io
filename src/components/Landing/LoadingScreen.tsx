import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const pulse = keyframes`
  0%, 100% { opacity: 0.7; }
  50% { opacity: 1; }
`;

const Screen = styled(motion.div)`
  position: fixed;
  inset: 0;
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #0d1b2a 0%, #1a1025 100%);
`;

const LogoWrap = styled(motion.div)`
  width: 165px;
  height: 165px;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Logo = styled(LogoOutlinedSvg)`
  width: 100%;
  height: 100%;
  path, circle, rect, polygon {
    fill: url(#twilightGradient);
  }
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
        <LogoWrap
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.8 } }}
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
          <Logo />
        </LogoWrap>
      </Screen>
    )}
  </AnimatePresence>
);

export default LoadingScreen;
