import { styled } from 'styled-components';
import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../../types';
import SunAnimation from './Sun';
import { motion, type Variants } from 'framer-motion';
import Logo from '../../../Logo';

const IntroContainer = styled(motion.div)`
  max-width: 90vw;
  display: flex;
  justify-content: center;
  align-items: center;
  flex-direction: row;

  @media (max-width: 768px) {
    flex-direction: column;
    text-align: center;
  }

  @media (min-width: 1024px) {
    max-width: 60vw;
  }
`;

const LogoCol = styled(motion.div)`
  position: relative;
  flex-shrink: 0;
  border-radius: 50%;
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

const TextCol = styled(motion.div)`
  position: relative;
  overflow: hidden;
  flex: 1;

  --text-max-width: calc(60vw - min(40vmin, 200px));

  .text-wrapper {
    padding-inline-start: 4rem;
    width: var(--text-max-width);
    /* max-width: 100%; */
  }
  h1 {
    text-align: left;
    /* font-size: clamp(1.5rem, 4vw, 3rem); */
    /* margin-bottom: clamp(0.5rem, 2vw, 1rem); */
  }
  p {
    text-align: left;
    /* font-size: clamp(0.875rem, 2.5vw, 1.125rem); */
    /* line-height: 1.6; */
  }

  @media (max-width: 768px) {
    --text-max-width: 100%;

    .text-wrapper {
      padding-inline-start: 0;
      padding-block-start: 2em;
    }
    h1,
    p {
      text-align: center;
    }
  }

  @media (min-width: 769px) and (max-width: 1024px) {
    --text-max-width: calc(90vw - min(35vmin, 150px));

    .text-wrapper {
      padding-inline-start: 2rem;
    }
  }
`;

const DawnSection: React.FC<TimeSectionContent> = ({
  title,
  subtitle,
  scrollProgress
}) => {
  const getResponsiveDelay = () => {
    if (typeof window !== 'undefined') {
      if (window.innerWidth <= 768) {
        return { maxHeight: 2, maxWidth: 0 }; // mobile
      }
    }
    return { maxHeight: 0, maxWidth: 2 }; // desktop
  };

  const { maxHeight: heightDelay, maxWidth: widthDelay } = getResponsiveDelay();

  // Responsive logo animation
  const logoVariants: Variants = {
    hidden: { y: 30 },
    visible: {
      y: 0,
      rotateY: [0, 0, 360, 360],
      transition: {
        y: { duration: 0.6, ease: 'easeOut' },
        rotateY: {
          duration: 2.5,
          times: [0, 0.8, 1, 1],
          ease: 'easeInOut'
        }
      }
    }
  };

  // Animation variants for staggered text reveal
  const textColVariants: Variants = {
    hidden: { maxHeight: 0, maxWidth: 0, opacity: 0 },
    visible: {
      maxHeight: '100%',
      maxWidth: 'var(--text-max-width)',
      opacity: 1,
      transition: {
        maxHeight: {
          delay: heightDelay
        },
        maxWidth: {
          duration: 1,
          delay: widthDelay,
          ease: [0.16, 1, 0.3, 1],
          staggerChildren: 0.3,
          delayChildren: 2.2
        }
      }
    }
  };

  return (
    <>
      <SunAnimation scrollProgress={scrollProgress} />
      <SectionContent className="section-content dawn-content">
        <IntroContainer className="intro-container">
          <LogoCol
            className="logo"
            initial="hidden"
            whileInView="visible"
            variants={logoVariants}
            viewport={{ once: true }}
          >
            <Logo duration={2} shouldFlip={true} flipDelay={2000} />
          </LogoCol>
          <TextCol
            className="text"
            initial="hidden"
            whileInView="visible"
            variants={textColVariants}
            viewport={{ once: true }}
          >
            <div className="text-wrapper">
              <SectionTitle>{title}</SectionTitle>
              <SectionSubtitle>{subtitle}</SectionSubtitle>
            </div>
          </TextCol>
        </IntroContainer>
      </SectionContent>
    </>
  );
};

export default DawnSection;
