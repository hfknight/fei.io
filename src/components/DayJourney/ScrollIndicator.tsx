import { motion } from "framer-motion";
import { styled, keyframes } from "styled-components";

const breathe = keyframes`
  0%, 100% { opacity: 0.25; }
  50%       { opacity: 0.9; }
`;

const Container = styled(motion.div)`
  position: absolute;
  top: 100vh;
  left: 50%;
  margin-top: -72px;
  transform: translate(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  z-index: 10;
  pointer-events: none;
`;

const PulseLine = styled.div`
  width: 2px;
  height: 36px;
  background: linear-gradient(to bottom, transparent, #f8c058);
  border-radius: 1px;
  animation: ${breathe} 2s ease-in-out infinite;
`;

const Arrow = styled.span`
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.7rem;
  letter-spacing: 0.1em;
  color: rgba(255, 255, 255, 0.5);
  line-height: 1;
`;

const ScrollIndicator: React.FC = () => (
  <Container
    initial={{ x: '-50%', opacity: 0 }}
    animate={{
      x: '-50%',
      y: [0, 8, 0],
      opacity: 1,
    }}
    transition={{
      y: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
      opacity: { delay: 3, duration: 0.8 },
    }}
  >
    <PulseLine />
    <Arrow>↓</Arrow>
  </Container>
);

export default ScrollIndicator;
