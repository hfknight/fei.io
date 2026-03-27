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
  width: min(35vmin, 120px);
  height: min(35vmin, 120px);
  animation: ${pulse} 2s ease-in-out infinite;
`;

const Logo = styled(LogoOutlinedSvg)`
  width: 100%;
  height: 100%;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
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
          <Logo />
        </LogoWrap>
      </Screen>
    )}
  </AnimatePresence>
);

export default LoadingScreen;
