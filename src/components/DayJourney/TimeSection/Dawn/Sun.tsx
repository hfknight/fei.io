
import React, { useRef } from 'react';
import styled from 'styled-components';
import { motion, useInView } from 'framer-motion';

const SunContainer = styled(motion.div).attrs({ className: 'sun-container'})`
  position: fixed;
  bottom: 0;
  left: 0;
  z-index: 5;
  pointer-events: none;
`;

const Sun = styled(motion.div).attrs({className: 'sun'})`
  width: 200px;
  height: 200px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  /* background: radial-gradient(circle at 50% 50%, #fff5b0, #ffeb3b, #ff9800); */
  background: #fff5b0;
  border-radius: 50%;
  box-shadow:
    0 0 80px 20px rgba(255, 235, 59, 0.5),
    0 0 120px 40px rgba(255, 152, 0, 0.3),
    0 0 160px 60px rgba(255, 87, 34, 0.1);
  position: relative;

  &::before {
    content: '';
    position: absolute;
    top: -10px;
    left: -10px;
    right: -10px;
    bottom: -10px;
    background: radial-gradient(circle, rgba(255, 235, 59, 0.3), transparent 70%);
    border-radius: 50%;
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { transform: scale(1); opacity: 0.6; }
    50% { transform: scale(1.1); opacity: 0.8; }
  }
`;

const CutieImage = styled.div`
  width: 60%;
  height: 60%;
  background-image: radial-gradient(circle at center, transparent 0, #fff5b0 80%), url("/angela_headshot_sun.webp");
  background-size: 100% 100%;
  background-position: center;
  background-repeat: no-repeat;
  opacity: 0.6;
  animation: pulse 4s ease-in-out infinite;

  @keyframes pulse {
    0%, 100% { opacity: 0; }
    50% { opacity: 1; }
  }
`;

const SunRays = styled(motion.div).attrs<{$rotation: number}>(({ $rotation }) => ({
  className: 'sun-ray',
  style: {
    transform: `translate(-50%, -50%) rotate(${$rotation + 90}deg)`,
  }
}))<{$rotation: number}>`
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
`;

interface HexagonProps {
  $distance: number; // Distance from sun center along the ray
  $scaleRatio: number;
  $size?: number;
  $opacity?: number;
}

const HexagonElement = styled.div.attrs<HexagonProps>(({ $distance, $opacity, $scaleRatio, $size }) =>({
  style: {
    width: `${$size || 20}px`,
    height: `${$size || 20}px`,
    backgroundColor:  '#fff',
    opacity: $opacity,
    transform: `translate(${0 - $distance * $scaleRatio * 0.7}px, -50%) scale(${$scaleRatio})`,
  }
}))<HexagonProps>`
  position: absolute;
  top: 50%;
  left: 50%;
  clip-path: polygon(25% 6.7%, 75% 6.7%, 100% 50%, 75% 93.3%, 25% 93.3%, 0 50%);
`;

const Hexagon: React.FC<HexagonProps> = ({ $scaleRatio, $distance, $size = 20, $opacity = 1 }) => {
  return (
    <HexagonElement
      $scaleRatio={$scaleRatio}
      $distance={$distance}
      $size={$size}
      $opacity={$opacity}
    />
  );
};

interface SunAnimationProps {
  scrollProgress: number;
}

const SunAnimation: React.FC<SunAnimationProps> = ({ scrollProgress }) => {
  const sunRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(sunRef, {
    // margin: "-100px",  // Negative margin means it triggers when sun is 100px inside viewport
    // amount: 0.1        // Trigger when 10% of sun is visible
  });
  const windowWidth = typeof window !== 'undefined' ? window.innerWidth : 1920;
  const windowHeight = typeof window !== 'undefined' ? window.innerHeight : 1080;

  // Single continuous curved path from bottom-right to top-left and out
  const t = scrollProgress;

  // Cubic bezier for smoother, steeper curve
  const startX = windowWidth - 100; // Start from right side
  const startY = 100; // Start below viewport

  // Two control points for cubic bezier
  const control1X = windowWidth * 0.8; // First control point
  const control1Y = -windowHeight * 0.2; // Lower for steeper initial rise
  const control2X = windowWidth * 0.2; // Second control point
  const control2Y = -windowHeight * 0.9; // High for steep curve

  const endX = -200; // End past left edge
  const endY = -windowHeight - 300; // End above viewport

  // Cubic bezier formula: B(t) = (1-t)³P0 + 3(1-t)²tP1 + 3(1-t)t²P2 + t³P3
  const x = Math.pow(1 - t, 3) * startX +
            3 * Math.pow(1 - t, 2) * t * control1X +
            3 * (1 - t) * Math.pow(t, 2) * control2X +
            Math.pow(t, 3) * endX;

  const y = Math.pow(1 - t, 3) * startY +
            3 * Math.pow(1 - t, 2) * t * control1Y +
            3 * (1 - t) * Math.pow(t, 2) * control2Y +
            Math.pow(t, 3) * endY;

  // Smooth opacity animation
  let sunOpacity;
  if (scrollProgress <= 0.15) {
    // Quick fade in
    sunOpacity = scrollProgress / 0.15;
  } else if (scrollProgress <= 0.7) {
    // Full visibility during most of journey
    sunOpacity = 1;
  } else {
    // Fade out in final portion
    sunOpacity = 1 - ((scrollProgress - 0.7) / 0.3);
  }

  // Smooth scale animation
  const sunScale = 0.3 + (scrollProgress * 0.6); // Scale from 0.5 to 1.2

  /** Sun Ray */
  // Calculate angle to point towards center of viewport
  const centerX = windowWidth / 2;
  const centerY = windowHeight * 1;

  // Calculate the actual sun position (including scale offset)
  const sunCenterX = x + 100; // Add half of sun width (200px / 2)
  const sunCenterY = windowHeight - y + 100; // Convert from bottom-origin to top-origin and add half height

  // Calculate angle from sun to viewport center
  // const angleToCenter = Math.atan2(centerY - sunCenterY, centerX - sunCenterX) * (180 / Math.PI);
  const angleToCenter = Math.atan2(centerX - sunCenterX, centerY - sunCenterY) * (180 / Math.PI);
  const hexaganScaleRatio = 1 + 1/ Math.log10(Math.abs(-angleToCenter));

  // Hide rays when sun is in view, show when it's not
  const raysOpacity = isInView ? 0 : 1;

  return (
    <SunContainer
      ref={sunRef}
      style={{
        transform: `translate(${x}px, ${y}px) scale(${sunScale})`,
        opacity: sunOpacity,
      }}
    >
      <SunRays $rotation={angleToCenter} style={{ opacity: raysOpacity }}>
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={200} $size={16} $opacity={0.3} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={230} $size={18} $opacity={0.4} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={320} $size={32} $opacity={0.5} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={360} $size={36} $opacity={0.6} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={500} $size={40} $opacity={0.7} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={600} $size={60} $opacity={0.8} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={750} $size={90} $opacity={0.9} />
        <Hexagon $scaleRatio={hexaganScaleRatio} $distance={800} $size={80} $opacity={0.6} />
      </SunRays>
      <Sun><CutieImage /></Sun>
    </SunContainer>
  );
};

export default SunAnimation;