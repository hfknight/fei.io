import { motion} from "framer-motion";
import { styled } from "styled-components";

const CloudContainer = styled(motion.div)`
  position: absolute;
  z-index: 0;
  width: 100%;
  height: 60%;
  top: 10%; // 16%
  left: 0;
  /* overflow: hidden; // comment out to fix the cutoff top of larget cloud */
  pointer-events: none;

  /* CSS custom properties for responsive scaling */
  --scale-multiplier: 1;

  @media (max-width: 1024px) {
    --scale-multiplier: 0.7;
  }

  @media (max-width: 768px) {
    --scale-multiplier: 0.7;

    .cloud-large {
      display: none;
    }
  }

`;

const Cloud = styled(motion.div)<{ $size: 'small' | 'medium' | 'large'; $top: string; $left: string; $baseScale: number }>`
  border-radius: 10px;
  position: absolute;
  margin: 0;
  top: ${props => props.$top};
  left: ${props => props.$left};
  width: 54px;
  height: 5px;
  background: #f7e7eb;

/* Use CSS calc() to combine base scale with responsive multiplier */
  --responsive-scale: calc(${props => props.$baseScale} * var(--scale-multiplier));

  div {
    box-shadow: inset -2px -3px 0 0 #f7e7eb;
    position: absolute;
    border-radius: 50%;
    width: 12px;
    height: 12px;
    left: -3px;
    bottom: 0;
    background: #fafbf0;
    z-index: 10;

    &:first-child {
      & + div {
        transform: scale(1.6, 1.6);
        margin: 0 0 4px 14px;
        z-index: 9;

        & + div {
          transform: scale(2.4, 2.3);
          margin: 0 0 9px 32px;
          z-index: 8;

          & + div {
            transform: scale(1.3, 1.3);
            margin: 0 0 2px 48px;
            z-index: 7;
          }
        }
      }
    }
  }
`;

const Airplane = styled(motion.div)`
  position: absolute;
  width: 200px;
  height: 200px;
`;

const CloudAnimation: React.FC = () => {
  const clouds = [
    { id: 1, size: 'large' as const, top: '30%', left: '42%', delay: 0.5 },
    { id: 2, size: 'medium' as const, top: '45%', left: '74%', delay: 0.8 },
    { id: 3, size: 'medium' as const, top: '50%', left: '24%', delay: 0.8 },
    { id: 4, size: 'small' as const, top: '35%', left: '8%', delay: 1.2 },
    { id: 5, size: 'small' as const, top: '30%', left: '66%', delay: 1 },
    { id: 6, size: 'small' as const, top: '38%', left: '88%', delay: 1.1 },
  ];

  // Function to calculate horizontal exit direction
  const calculateHorizontalExit = (leftPercent: string, size: 'small' | 'medium' | 'large') => {
    const left = parseFloat(leftPercent);

    // Calculate distances to left and right edges
    const distanceToLeft = left;
    const distanceToRight = 100 - left;

    let translateX = 0;

    if (distanceToLeft < distanceToRight) {
      // Slide to left edge
      translateX = -left - 20; // Extra 20% to ensure it's completely off-screen
    } else {
      // Slide to right edge
      translateX = distanceToRight + 20;
    }

    translateX = translateX * (size === 'small' ? 2 : size === 'medium' ? 4 : 8);
    return translateX;
  };

  return (
    <CloudContainer
      initial={{ opacity: 1 }}
      whileInView={{ opacity: 1 }}
      viewport={{
        once: true,
        amount: 0.3
      }}
    >
      {/* Airplane animation */}
      <Airplane
        initial={{
          x: "20vw",
          y: "40vh",
          scale: 1,
          opacity: 0
        }}
        whileInView={{
          x: "80vw",
          y: "2vh",
          scale: 0.5,
          opacity: [0, 1, 1, 0]
        }}
        viewport={{
          once: true,
          amount: 0.5
        }}
        transition={{
          duration: 3,
          ease: "linear",
          delay: 0.5
        }}
      ><img src="/airplane.svg" alt="airplane" /></Airplane>
      {clouds.map((cloud) => {
        const translateX = calculateHorizontalExit(cloud.left, cloud.size);
        const baseScale =
          cloud.size === 'small' ? 2 : cloud.size === 'medium' ? 4 : 8;

        return (
          <Cloud
            key={cloud.id}
            className={`cloud cloud-${cloud.size}`}
            $size={cloud.size}
            $top={cloud.top}
            $left={cloud.left}
            $baseScale={baseScale}
            initial={{
              x: 0,
              opacity: 1,
              scale: "var(--responsive-scale)"
            }}
            whileInView={{
              x: `${translateX}%`,
              opacity: 0.6,
              // scale: cloudScale
            }}
            viewport={{
              once: false,
              amount: 0.3
            }}
            transition={{
              delay: cloud.delay,
              duration: 2,
              ease: "easeOut"
            }}
          >
            <div></div><div></div><div></div><div></div>
          </Cloud>
        );
      })}
    </CloudContainer>
  );
};

export default CloudAnimation;