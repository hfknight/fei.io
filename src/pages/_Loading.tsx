import { styled } from 'styled-components';
import Logo from '../components/Logo';
import { motion, type Variants } from 'framer-motion';

const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100vw;
  height: 100vh;
  background: linear-gradient(180deg, #1a1a3e 0%, #ff9a9e 100%);
`;

const LogoContainer = styled(motion.div)`
  width: min(35vmin, 150px);
  height: min(35vmin, 150px);
  overflow: hidden;
  opacity: 0.85;

  @media (max-width: 768px) {
    width: min(50vw, 200px);
    height: min(50vw, 200px);
  }

  @media (min-width: 1024px) {
    width: min(40vmin, 200px);
    height: min(40vmin, 200px);
  }
`;

const LoadingScreen: React.FC = () => {
  const logoVariants: Variants = {
    hidden: {},
    visible: {
      rotateY: [0, 360, 0],
      transition: {
        rotateY: {
          duration: 3,
          repeat: Infinity,
          ease: 'easeInOut'
        }
      }
    }
  };

  return (
    <LoadingContainer>
      <LogoContainer
        initial="hidden"
        whileInView="visible"
        variants={logoVariants}
        viewport={{ once: false }}
      >
        <Logo duration={0} />
      </LogoContainer>
    </LoadingContainer>
  );
};

export default LoadingScreen;
