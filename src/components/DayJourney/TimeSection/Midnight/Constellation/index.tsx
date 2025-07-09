import { styled } from 'styled-components';
import { motion, type Variants } from 'framer-motion';
import type { ConstellationLine, ConstellationStarPoint } from '../../../../../types';

interface ConstellationProps {
  isVisible: boolean;
  imgSrc: string;
  stars: ConstellationStarPoint[];
  connectionLines: ConstellationLine[]
  delay?: number;
  scale?: number;
  top?: { sm: string; lg: string };
  left?: { sm: string; lg: string };
  angle?: number;
  imgAltText?: string;
}

const ConstellationContainer = styled(motion.div)<{
  $top?: { sm: string; lg: string };
  $left?: { sm: string; lg: string };
  $angle?: number;
  $scale?: number;
}>`
  position: absolute;
  top: ${(props) => props.$top?.lg || '20%'};
  left: ${(props) => props.$left?.lg || '50%'};
  width: 225px;
  rotate: ${(props) => (props.$angle || 0)}deg;
  scale: ${(props) => (props.$scale || 1)};
  transform-origin: center;

  @media (max-width: 768px) {
    top: ${(props) => props.$top?.sm || '10%'};
    left: ${(props) => props.$left?.sm || '50%'};
    scale: ${(props) => (props.$scale || 1) * 0.75};
  }
`;

const ConstellationStar = styled(motion.div)<{
  $isMain?: boolean;
  $scale?: number;
}>`
  position: absolute;
  background: white;
  border-radius: 50%;
  width: ${(props) => (props.$isMain ? 6 : 4)}px;
  height: ${(props) => (props.$isMain ? 6 : 4)}px;
  opacity: 0.6;
  box-shadow: 0 0 ${(props) => (props.$isMain ? 12 : 8)}px
    rgba(255, 255, 255, 0.9);
`;

const ConstellationLine = styled(motion.div)<{ $scale?: number }>`
  position: absolute;
  height: ${(props) => props.$scale || 1}px;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.6),
    rgba(255, 255, 255, 0.2)
  );
  /* background-color: rgba(255, 255, 255, 0.6); */
  transform-origin: left center;
`;

const PetImage = styled(motion.img)<{ $scale?: number }>`
  width: 100%;
  height: auto;
  border-radius: 50%;
  /* opacity: 0.4; */
  filter: brightness(1.2) contrast(1.1);
  /* box-shadow: 0 0 20px rgba(255, 255, 255, 0.3); */

  /* Gradient mask to fade bottom into transparency */
  mask: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 40%,
    rgba(0, 0, 0, 0.8) 60%,
    rgba(0, 0, 0, 0.4) 80%,
    rgba(0, 0, 0, 0) 100%
  );
  -webkit-mask: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 1) 40%,
    rgba(0, 0, 0, 0.8) 60%,
    rgba(0, 0, 0, 0.4) 80%,
    rgba(0, 0, 0, 0) 100%
  );
`;

const Constellation: React.FC<ConstellationProps> = ({
  isVisible,
  imgSrc,
  imgAltText,
  stars,
  connectionLines,
  delay = 0,
  scale = 1,
  top,
  left,
  angle = 0
}) => {
  const calculateDistance = (star1: ConstellationStarPoint, star2: ConstellationStarPoint): number => {
    return Math.sqrt(
      Math.pow(star2.x - star1.x, 2) + Math.pow(star2.y - star1.y, 2)
    );
  };

  const calculateAngle = (star1: ConstellationStarPoint, star2: ConstellationStarPoint): number => {
    return (Math.atan2(star2.y - star1.y, star2.x - star1.x) * 180) / Math.PI;
  };

  const constellationVariants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity: 1,
    }
  };

  const constellationStarVariants = {
    hidden: {
      opacity: 0,
      // scale: 0
    },
    visible: {
      opacity: [0.5, 0.9, 0.7, 0.5],
      // scale: [0.8, 1.1, 0.8]
    }
  };

  const lineVariants = {
    hidden: {
      opacity: 0
    },
    visible: {
      opacity: 0.6,
    }
  };

  const imageVariants: Variants = {
    hidden: {
      opacity: 0,
    },
    visible: {
      opacity:[0, 0.3, 0.1]
    }
  };

  return (
    <ConstellationContainer
      className="constellation-container"
      $top={top}
      $left={left}
      $angle={angle}
      $scale={scale}
      variants={constellationVariants}
      initial="hidden"
      animate={isVisible ? 'visible' : 'hidden'}
      transition={{
        duration: 1,
        delay: 0,
        when: 'beforeChildren',
        staggerChildren: 0.1
      }}
    >
        <PetImage
          src={imgSrc}
          alt={imgAltText}
          $scale={scale}
          variants={imageVariants}
          initial="hidden"
          animate={isVisible ? "visible" : "hidden"}
          transition={{
            duration: 6,
            delay,
            repeat: Infinity,
            repeatType: 'reverse',
            ease: 'easeInOut'
          }}
        />
      {/* Constellation lines */}
      {connectionLines.map((connection, index) => {
        const fromStar = stars.find((s) => s.id === connection.from);
        const toStar = stars.find((s) => s.id === connection.to);

        if (!fromStar || !toStar) return null;

        const distance = calculateDistance(fromStar, toStar);
        const angle = calculateAngle(fromStar, toStar);

        return (
          <ConstellationLine
            className="star-connection-line"
            key={`line-${index}`}
            $scale={scale}
            style={{
              left: `${fromStar.x + 2}px`,
              top: `${fromStar.y + 2}px`,
              width: `${distance}px`,
              transform: `rotate(${angle}deg)`
            }}
            variants={lineVariants}
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            transition={{
              duration: 0.8
            }}
          />
        );
      })}

      {/* Constellation stars */}
      {stars.map((star) => (
        <ConstellationStar
          key={star.id}
          $isMain={star.isMain}
          $scale={scale}
          style={{
            left: `${star.x}px`,
            top: `${star.y}px`
          }}
          variants={constellationStarVariants}
          initial="hidden"
          animate={isVisible ? 'visible' : 'hidden'}
          transition={{
            duration: 2,
            repeat: isVisible ? Infinity : 0,
            repeatType: 'reverse',
            delay: Math.random() * 6,
            ease: 'easeInOut'
          }}
        />
      ))}
    </ConstellationContainer>
  );
};

export default Constellation;
