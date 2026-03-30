import { motion } from 'framer-motion';
import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../../types';
import CloudAnimation from './Clouds';

const AfternoonSection: React.FC<TimeSectionContent> = ({
  title,
  subtitle
}) => {
  return (
    <>
      <CloudAnimation />
      <SectionContent className="section-content afternoon-content">
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionTitle className="afternoon-title">{title}</SectionTitle>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.92, y: 20 }}
          whileInView={{ opacity: 1, scale: 1, y: 0 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 1, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
        >
          <SectionSubtitle>{subtitle}</SectionSubtitle>
        </motion.div>
      </SectionContent>
    </>
  );
};

export default AfternoonSection;
