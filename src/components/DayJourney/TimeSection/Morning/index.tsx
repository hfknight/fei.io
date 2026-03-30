import { keyframes, styled } from 'styled-components';
import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../../types';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

const bokehAnimation = keyframes`
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  15% {
    opacity: 0.3;
    transform: translate(-50%, calc(-50% - 8px)) scale(1.0);
  }
  30% {
    opacity: 0.6;
    transform: translate(-50%, calc(-50% + 15px)) scale(1.1);
  }
  50% {
    opacity: 1;
    transform: translate(-50%, calc(-50% - 5px)) scale(1.2);
  }
  70% {
    opacity: 0.8;
    transform: translate(-50%, calc(-50% + 12px)) scale(1.0);
  }
  85% {
    opacity: 0.4;
    transform: translate(-50%, calc(-50% - 10px)) scale(1.05);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
`;

const BokehContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
`;

const WarmLightWash = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: radial-gradient(ellipse at 18% 8%, rgba(255, 210, 100, 0.28) 0%, transparent 55%);
  pointer-events: none;
`;

// Bokeh effect
const BokehPoint = styled.div<{
  $size: number;
  $x: number;
  $y: number;
  $delay: number;
  $opacity: number;
  $duration: number;
}>`
  position: absolute;
  width: ${(props) => props.$size}px;
  height: ${(props) => props.$size}px;
  left: ${(props) => props.$x}%;
  top: ${(props) => props.$y}%;
  border-radius: 50%;
  background: rgba(255, 255, 255, ${(props) => props.$opacity});
  animation: ${bokehAnimation} ${(props) => props.$duration}s ease-in-out
    infinite;
  animation-delay: ${(props) => props.$delay}s;
  filter: blur(1px);
`;

const MorningContentContainer = styled.div`
  height: 100vh;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
`;

const MorningSection: React.FC<TimeSectionContent> = ({
  title,
  subtitle
}) => {
  // Generate random bokeh points in middle-right area
  const generateRandomBokeh = () => {
    const bokehCount = 6; // Reduced amount
    const points = [];

    for (let i = 0; i < bokehCount; i++) {
      points.push({
        size: 15 + Math.random() * 35,
        x: 60 + Math.random() * 35,
        y: 40 + Math.random() * 40,
        delay: Math.random() * 5, // Random delay 0-5s
        opacity: 0.2 + Math.random() * 0.4,
        duration: 6 + Math.random() * 4 // Random duration 6-10s
      });
    }
    return points;
  };

  const bokehPoints = useMemo(() => generateRandomBokeh(), []);

  return (
    <>
      <WarmLightWash
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      />
      {/* bokeh atmosphere points */}
      <BokehContainer
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{
          amount: 0.5
        }}
      >
        {bokehPoints.map((bokeh, index) => (
          <BokehPoint
            key={`bokeh-${index}`}
            $size={bokeh.size}
            $x={bokeh.x}
            $y={bokeh.y}
            $delay={bokeh.delay}
            $opacity={bokeh.opacity}
            $duration={bokeh.duration}
          />
        ))}
      </BokehContainer>
      <MorningContentContainer>
        <SectionContent className="section-content morning-content">
          <motion.div
            initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionTitle className="morning-title">{title}</SectionTitle>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 40, filter: 'blur(8px)' }}
            whileInView={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            viewport={{ once: true, amount: 0.5 }}
            transition={{ duration: 0.9, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <SectionSubtitle>{subtitle}</SectionSubtitle>
          </motion.div>
        </SectionContent>
      </MorningContentContainer>
    </>
  );
};

export default MorningSection;
