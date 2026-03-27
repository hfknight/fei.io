import styled from 'styled-components';
import { motion } from 'framer-motion';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const Block = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
`;

const Rule = styled(motion.div)`
  width: 280px;
  height: 1px;
  background: rgba(255, 255, 255, 0.3);
`;

const Logo = styled(motion.div)`
  padding: 28px 0;
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  width: 130px;
  height: 130px;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
  }
`;

const TaglineWrap = styled(motion.div)`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  padding-top: 28px;
  text-align: center;
`;

const TaglinePrimary = styled.p`
  margin: 0;
  font-family: 'Playfair Display', Georgia, serif;
  font-size: 1.15rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.95);
  letter-spacing: 0.01em;
`;

const TaglineSecondary = styled.p`
  margin: 0;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.6);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  max-width: 360px;
  line-height: 1.7;
`;

const fadeUp = {
  hidden: { opacity: 0, y: 12 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay, ease: [0.25, 0.1, 0.25, 1] as [number, number, number, number] },
  }),
};

const GlassPanel: React.FC = () => (
  <Block>
    <Rule
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={0.2}
    />
    <Logo
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={0.5}
    >
      <LogoIcon />
    </Logo>
    <Rule
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={0.8}
    />
    <TaglineWrap
      variants={fadeUp}
      initial="hidden"
      animate="visible"
      custom={1.1}
    >
      <TaglinePrimary>Web Developer based in Texas, US.</TaglinePrimary>
      <TaglineSecondary>
        creating aesthetic and intuitive interfaces that blend thoughtful design with robust engineering
      </TaglineSecondary>
    </TaglineWrap>
  </Block>
);

export default GlassPanel;
