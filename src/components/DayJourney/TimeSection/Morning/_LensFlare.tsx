import React from 'react';
import styled, { keyframes } from 'styled-components';
import { motion } from 'framer-motion';

const flareAppear = keyframes`
  0% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.8);
  }
  20% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  80% {
    opacity: 1;
    transform: translate(-50%, -50%) scale(1);
  }
  100% {
    opacity: 0;
    transform: translate(-50%, -50%) scale(0.9);
  }
`;

const LensFlareContainer = styled(motion.div)<{ $isVisible: boolean }>`
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 10;
  display: ${(props) => (props.$isVisible ? 'block' : 'none')};
`;

// Smooth hexagonal flare with gradient edges
const HexagonFlare = styled.div.attrs<{
  $size: number;
  $x: number;
  $y: number;
  $delay: number;
  $opacity: number;
  $color?: string;
}>((props) => ({
  style: {
    width: `${props.$size}px`,
    height: `${props.$size}px`,
    left: `${props.$x}%`,
    top: `${props.$y}%`,
    animationDelay: `${props.$delay}s`,
    '--flare-opacity': props.$opacity,
    '--flare-color': props.$color || 'rgba(255, 255, 255, 1)',
  },
}))<{
  $size: number;
  $x: number;
  $y: number;
  $delay: number;
  $opacity: number;
  $color?: string;
}>`
  position: absolute;
  animation: ${flareAppear} 6.5s ease-in-out 1;
  filter: blur(0.5px);

  &::before {
    content: '';
    position: absolute;
    width: 100%;
    height: 100%;
    background: radial-gradient(
      circle at center,
      color-mix(in srgb, var(--flare-color), transparent calc(100% - var(--flare-opacity) * 100%)) 0%,
      color-mix(in srgb, var(--flare-color), transparent calc(100% - var(--flare-opacity) * 70%)) 30%,
      color-mix(in srgb, var(--flare-color), transparent calc(100% - var(--flare-opacity) * 30%)) 60%,
      transparent 90%
    );
    clip-path: polygon(
      30% 0%,
      70% 0%,
      100% 30%,
      100% 70%,
      70% 100%,
      30% 100%,
      0% 70%,
      0% 30%
    );
  }

  &::after {
    content: '';
    position: absolute;
    width: 120%;
    height: 120%;
    top: -10%;
    left: -10%;
    background: radial-gradient(
      circle at center,
      transparent 30%,
      color-mix(in srgb, var(--flare-color), transparent calc(100% - var(--flare-opacity) * 20%)) 50%,
      transparent 70%
    );
    filter: blur(3px);
  }
`;

interface LensFlareProps {
  scrollProgress: number;
}

const LensFlare: React.FC<LensFlareProps> = ({ scrollProgress }) => {
  // Lens flare appears when sun is mostly out of view (around 70-80% progress)
  // and fades out before the end of morning section
  const isVisible = scrollProgress >= 0.75 && scrollProgress < 0.86;

  // Calculate opacity based on scroll progress
  // Full opacity from 0.7 to 1.2, then fade out from 1.2 to 1.5
  let containerOpacity = 0;

  if (scrollProgress > 0.75) {
    containerOpacity = Math.max(0, 1 - (scrollProgress - 0.75) / 0.3);
  }

  // Main diagonal line - standard white with softer falloff
  const mainLine = [
    { size: 20, x: 24.5, y: 9, delay: 0.1, opacity: 0.8 },
    { size: 30, x: 25.5, y: 15, delay: 0.2, opacity: 0.75 },
    { size: 40, x: 27.5, y: 22, delay: 0.3, opacity: 0.7 },
    { size: 50, x: 29, y: 28, delay: 0.4, opacity: 0.65 },
    { size: 60, x: 31, y: 36, delay: 0.5, opacity: 0.6 },
    { size: 80, x: 32, y: 40, delay: 0.6, opacity: 0.55 }
  ];

  // Secondary diagonal line - slightly offset, smaller sizes
  const secondaryLine = [
    {
      size: 15,
      x: 27,
      y: 7,
      delay: 0.05,
      opacity: 0.6,
      color: 'rgba(255, 245, 220, 1)'
    },
    {
      size: 25,
      x: 30,
      y: 12,
      delay: 0.15,
      opacity: 0.55,
      color: 'rgba(255, 245, 220, 1)'
    },
    {
      size: 35,
      x: 33,
      y: 18,
      delay: 0.25,
      opacity: 0.5,
      color: 'rgba(255, 245, 220, 1)'
    },
    {
      size: 45,
      x: 37,
      y: 25,
      delay: 0.35,
      opacity: 0.45,
      color: 'rgba(255, 245, 220, 1)'
    },
    {
      size: 55,
      x: 40,
      y: 32,
      delay: 0.45,
      opacity: 0.4,
      color: 'rgba(255, 245, 220, 1)'
    },
    {
      size: 65,
      x: 43,
      y: 37,
      delay: 0.55,
      opacity: 0.35,
      color: 'rgba(255, 245, 220, 1)'
    }
  ];

  return (
    <LensFlareContainer
      $isVisible={isVisible}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ amount: 0.3 }}
      style={{ opacity: containerOpacity }}
      className="lens-flare-container"
    >
      {/* Main diagonal line */}
      {mainLine.map((hex, index) => (
        <HexagonFlare
          key={`main-${index}`}
          $size={hex.size}
          $x={hex.x}
          $y={hex.y}
          $delay={hex.delay}
          $opacity={hex.opacity * containerOpacity}
        />
      ))}

      {/* Secondary diagonal line */}
      {secondaryLine.map((hex, index) => (
        <HexagonFlare
          key={`secondary-${index}`}
          $size={hex.size}
          $x={hex.x}
          $y={hex.y}
          $delay={hex.delay}
          $opacity={hex.opacity * containerOpacity}
          $color={hex.color}
        />
      ))}
    </LensFlareContainer>
  );
};

export default LensFlare;
