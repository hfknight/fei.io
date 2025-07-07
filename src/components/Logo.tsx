import { keyframes, styled } from 'styled-components';
import { motion } from 'framer-motion';
import LogoFilledSvg from '../assets/logo-filled.svg?react';
import LogoOutlinedSvg from '../assets/logo-outlined.svg?react';
import { useState } from 'react';

const waveAnimation = keyframes`
  0% { top: 110%; transform: rotate(0deg); }
  100% { top: 0; transform: rotate(720deg); }
`;

const LogoContainer = styled(motion.div)<{ $duration: number,  $hideWave: boolean }>`
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 50%;
  opacity: 0.8;

  &:after {
    /* background-color: #3f68c5; */
    /* background: radial-gradient(circle at center, #F7B801 0%, #D4AF37 70%, #3f68c5 100%); */
    background: conic-gradient(from 0deg, #F7B801, #ff9a9e, #fecfef, #F7B801);
    content: '';
    display: ${(props) => props.$hideWave ? 'none' : 'block'};
    position: absolute;
    top: 0%;
    height: 200%;
    width: 200%;
    border-radius: 38%;
    left: -50%;
    transform: rotate(360deg);
    transition: all 5s ease;
    animation: ${waveAnimation} ${(props) => props.$duration}s linear 1;
    z-index: 0;
  }
`;

const LogoOutlined = styled(LogoOutlinedSvg)<{ $color?: string }>`
  position: relative;
  width: 100%;
  height: 100%;
  z-index: 1;
  color: ${(props) => props.$color || '#fff'};
  // rotate: -6deg;
  /* All SVG elements inherit the color */
  path,
  circle,
  rect,
  polygon {
    fill: currentColor;
  }
`;

const LogoFilled = styled(LogoFilledSvg)<{ $color?: string }>`
  position: relative;
  width: 100%;
  height: 100%;
  transform: rotateY(180deg);
  z-index: 1;
  color: ${(props) => props.$color || '#fff'};

  path,
  circle,
  rect,
  polygon {
    fill: currentColor;
  }
`;

interface Props {
  duration: number;
  shouldFlip?: boolean;
  flipDelay?: number;
}

const StyledLogo: React.FC<Props> = ({
  duration,
  shouldFlip = false,
  flipDelay = 2000
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFilled, setShowFilled] = useState(false);
  const [hideWave, setHideWave] = useState(false);

  const handleFlip = () => {
    if (!shouldFlip) return;

    setTimeout(() => {
      setIsFlipped(true);

      // Switch to filled SVG at 90 degrees (halfway through flip)
      setTimeout(() => {
        setShowFilled(true);
      }, 250); // 250ms = half of 500ms flip duration

      // Hide wave animation after flip completes
      setTimeout(() => {
        setHideWave(true);
      }, 250); // 500ms = full flip duration

    }, flipDelay);
  };

  return (
    <LogoContainer
      className="logo-container"
      $duration={duration}
      $hideWave={hideWave}
      animate={isFlipped ? { rotateY: 180 } : { rotateY: 0 }}
      transition={{ duration: 0.5, ease: 'easeInOut' }}
      onViewportEnter={handleFlip}
      viewport={{ once: true }}
    >
      {showFilled ? (
        <LogoFilled className='logo logo-filled' $color="#fdd75e" />
      ) : (
        <LogoOutlined className='logo logo-outlined' />
      )}
    </LogoContainer>
  );
};

export default StyledLogo;
