import { styled } from 'styled-components';
import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../../types';
import SunAnimation from './Sun';
import { motion, useReducedMotion } from 'framer-motion';

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

const DawnSection: React.FC<TimeSectionContent> = ({
  title,
  subtitle,
  scrollProgress
}) => {
  const reduced = useReducedMotion();

  const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

  const titleVariants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 28, filter: 'blur(14px)' },
    visible: reduced
      ? { opacity: 1, transition: { duration: 0.3 } }
      : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.4, ease } },
  };

  const subtitleVariants = {
    hidden: reduced ? { opacity: 0 } : { opacity: 0, y: 18, filter: 'blur(8px)' },
    visible: reduced
      ? { opacity: 1, transition: { duration: 0.3 } }
      : { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 1.2, delay: 0.65, ease } },
  };

  return (
    <>
      <SunAnimation scrollProgress={scrollProgress} />
      <SectionContent className="section-content dawn-content">
        <IntroContainer className="intro-container">
          <div className="text-wrapper">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={titleVariants}
            >
              <SectionTitle>{title}</SectionTitle>
            </motion.div>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.4 }}
              variants={subtitleVariants}
            >
              <SectionSubtitle>{subtitle}</SectionSubtitle>
            </motion.div>
          </div>
        </IntroContainer>
      </SectionContent>
    </>
  );
};

export default DawnSection;
