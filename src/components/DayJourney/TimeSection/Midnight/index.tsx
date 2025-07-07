import { styled } from 'styled-components';
import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../../types';
import { motion, useInView } from 'framer-motion';
import { useMemo, useRef } from 'react';
import SamoyedConstellation from './Constellation/Samoyed';
import TabbyCatConstellation from './Constellation/TabbyCat';

const StarsContainer = styled(motion.div)`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 70%;
  overflow: hidden;
  pointer-events: none;
`;

const Star = styled(motion.div)<{ $size: 'small' | 'medium' | 'large' }>`
  position: absolute;
  background: white;
  border-radius: 50%;
  width: ${props => {
    switch (props.$size) {
      case 'small': return '2px';
      case 'medium': return '3px';
      case 'large': return '4px';
      default: return '2px';
    }
  }};
  height: ${props => {
    switch (props.$size) {
      case 'small': return '2px';
      case 'medium': return '3px';
      case 'large': return '4px';
      default: return '2px';
    }
  }};
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
`;

const Meteor = styled(motion.div)`
  position: absolute;
  width: 3px;
  height: 3px;
  background: white;
  border-radius: 50%;
  box-shadow: 0 0 6px rgba(255, 255, 255, 0.8);
`;

const MidnightSection: React.FC<TimeSectionContent> = ({ title, subtitle }) => {
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, {
    amount: 0.2, // Trigger when 20% is visible
    margin: "100px 0px" // Start animating 100px before entering viewport
  });

  // Generate random stars
  const stars = useMemo(() => Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: 20 + Math.random() * 80,
    size: ['small', 'medium', 'large'][Math.floor(Math.random() * 3)] as 'small' | 'medium' | 'large',
    delay: Math.random() * 5,
    duration: 2 + Math.random() * 3,
  })), []);

  // Generate meteors that appear periodically
  const meteors = Array.from({ length: 5 }, (_, i) => ({
    id: i,
    startX: 50 + Math.random() * 50, // Start from 50-100% (right side)
    startY: Math.random() * 30,
    delay: 1 + i * 8, // Meteors appear at 5s, 13s, 21s intervals
  }));

  const starBlinkVariants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      opacity: [0.3, 1, 0.3],
      scale: [0.8, 1.2, 0.8],
    }
  };

  const meteorVariants = {
    hidden: {
      x: 0,
      y: 0,
      opacity: 0,
    },
    visible: {
      x: [0, -400],
      y: [0, 300],
      opacity: [0, 1, 1, 0],
    }
  };

  return (
    <>
      <StarsContainer
        ref={containerRef}
        className="stars-container"
        initial={{ opacity: 0 }}
        animate={{ opacity: isInView ? 1 : 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Only render and animate stars when in view */}
        {isInView &&
          stars.map((star) => (
            <Star
              key={star.id}
              $size={star.size}
              style={{
                left: `${star.x}%`,
                top: `${star.y}%`
              }}
              variants={starBlinkVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              transition={{
                duration: star.duration,
                repeat: isInView ? Infinity : 0,
                repeatType: 'reverse',
                delay: star.delay,
                ease: 'easeInOut'
              }}
            />
          ))}

        {/* Only render and animate meteors when in view */}
        {isInView &&
          meteors.map((meteor) => (
            <Meteor
              key={`meteor-${meteor.id}`}
              style={{
                left: `${meteor.startX}%`,
                top: `${meteor.startY}%`
              }}
              variants={meteorVariants}
              initial="hidden"
              animate={isInView ? 'visible' : 'hidden'}
              transition={{
                duration: 2,
                delay: meteor.delay,
                repeat: isInView ? Infinity : 0,
                repeatDelay: 3,
                ease: 'easeIn'
              }}
            />
          ))}
      </StarsContainer>
      <SamoyedConstellation isVisible={isInView} />
      <TabbyCatConstellation isVisible={isInView} />
      <SectionContent className="section-content midnight-content">
        <SectionTitle>{title}</SectionTitle>
        <SectionSubtitle>{subtitle}</SectionSubtitle>
      </SectionContent>
    </>
  );
};

export default MidnightSection;