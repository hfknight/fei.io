import type {
  ConstellationLine,
  ConstellationProps,
  ConstellationStarPoint
} from '../../../../../types';
import Constellation from '.';

const TabbyCatConstellation: React.FC<ConstellationProps> = ({
  isVisible
}) => {
  // Samoyed head constellation points
  const samoyedStars: ConstellationStarPoint[] = [
    // Head outline
    { id: 'head-left-bottom', x: 104, y: 180, isMain: false },
    { id: 'head-left', x: 40, y: 120, isMain: false },
    { id: 'head-top-left', x: 30, y: 10, isMain: true },
    { id: 'head-top-middle', x: 114, y: 48, isMain: false },
    { id: 'head-top-right', x: 200, y: 26, isMain: true },
    { id: 'head-right', x: 178, y: 88, isMain: true },
    { id: 'head-right-2', x: 180, y: 128, isMain: false },
    { id: 'head-mid-bottom', x: 140, y: 172, isMain: true },

    // Eyes
    { id: 'eye-left-1', x: 69, y: 110, isMain: false },
    { id: 'eye-left-2', x: 60, y: 84, isMain: false },
    { id: 'eye-left-4', x: 92, y: 98, isMain: false },
    { id: 'eye-right-1', x: 140, y: 102, isMain: false },
    { id: 'eye-right-3', x: 164, y: 84, isMain: false },
    { id: 'eye-right-4', x: 160, y: 110, isMain: false },

    // Snout area
    { id: 'snout-left', x: 100, y: 134, isMain: false },
    { id: 'snout-right', x: 140, y: 130, isMain: false },
    { id: 'nose', x: 124, y: 155, isMain: false }
  ];

  // Constellation connections for head only
  const connections: ConstellationLine[] = [
    // Head outline
    { from: 'head-left-bottom', to: 'head-left' },
    { from: 'head-left', to: 'head-top-left' },
    { from: 'head-top-left', to: 'head-top-middle' },
    { from: 'head-top-middle', to: 'head-top-right' },
    { from: 'head-top-right', to: 'head-right' },
    { from: 'head-right', to: 'head-right-2' },
    { from: 'head-right-2', to: 'head-mid-bottom' },
    { from: 'head-mid-bottom', to: 'head-left-bottom' },

    // Eyes
    { from: 'eye-left-1', to: 'eye-left-2' },
    { from: 'eye-left-2', to: 'eye-left-4' },
    { from: 'eye-left-4', to: 'eye-left-1' },
    { from: 'eye-right-1', to: 'eye-right-3' },
    { from: 'eye-right-3', to: 'eye-right-4' },
    { from: 'eye-right-4', to: 'eye-right-1' },

    // Snout
    { from: 'nose', to: 'snout-left' },
    { from: 'snout-left', to: 'snout-right' },
    { from: 'snout-right', to: 'nose' }
  ];

  return (
    <Constellation
      isVisible={isVisible}
      imgSrc="/jojo_headshot.webp"
      imgAltText="Samoyed"
      stars={samoyedStars}
      connectionLines={connections}
      top="24%"
      left="60%"
      angle={15}
      scale={0.9}
      delay={2}
    />
  );
};

export default TabbyCatConstellation;
