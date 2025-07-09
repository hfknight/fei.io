import type {
  ConstellationLine,
  ConstellationProps,
  ConstellationStarPoint
} from '../../../../../types';
import Constellation from '.';

const SamoyedConstellation: React.FC<ConstellationProps> = ({
  isVisible
}) => {
  // Samoyed head constellation points
  const samoyedStars: ConstellationStarPoint[] = [
    // Head outline
    { id: 'head-left-bottom', x: 24, y: 170, isMain: true },
    { id: 'head-left', x: 44, y: 50, isMain: false },
    { id: 'head-top-left', x: 70, y: 1, isMain: true },
    { id: 'head-top-middle', x: 114, y: 46, isMain: false },
    { id: 'head-top-right', x: 160, y: 6, isMain: true },
    { id: 'head-right', x: 188, y: 94, isMain: true },
    { id: 'head-right-bottom', x: 201, y: 166, isMain: true },

    // Eyes
    { id: 'eye-left-1', x: 72, y: 112, isMain: false },
    { id: 'eye-left-2', x: 84, y: 106, isMain: false },
    { id: 'eye-left-3', x: 92, y: 118, isMain: false },
    { id: 'eye-right-1', x: 126, y: 116, isMain: false },
    { id: 'eye-right-2', x: 134, y: 104, isMain: false },
    { id: 'eye-right-3', x: 148, y: 112, isMain: false },

    // Snout area
    { id: 'snout-left', x: 90, y: 144, isMain: false },
    { id: 'snout-right', x: 123, y: 150, isMain: false },
    { id: 'nose', x: 104, y: 165, isMain: false }
  ];

  // Constellation connections for head only
  const connections: ConstellationLine[] = [
    // Head outline
    { from: 'head-left-bottom', to: 'head-left' },
    { from: 'head-left', to: 'head-top-left' },
    { from: 'head-top-left', to: 'head-top-middle' },
    { from: 'head-top-middle', to: 'head-top-right' },
    { from: 'head-top-right', to: 'head-right' },
    { from: 'head-right', to: 'head-right-bottom' },

    // Eyes
    { from: 'eye-left-1', to: 'eye-left-2' },
    { from: 'eye-left-2', to: 'eye-left-3' },
    { from: 'eye-right-1', to: 'eye-right-2' },
    { from: 'eye-right-2', to: 'eye-right-3' },

    // Snout
    { from: 'nose', to: 'snout-left' },
    { from: 'snout-left', to: 'snout-right' },
    { from: 'snout-right', to: 'nose' }
  ];

  return (
    <Constellation
      isVisible={isVisible}
      imgSrc="/ollie_headshot.webp"
      imgAltText="Samoyed"
      stars={samoyedStars}
      connectionLines={connections}
      top={{ sm: '4%', lg: '15%' }}
      left={{ sm: '0%', lg: '24%' }}
      angle={-20}
      scale={1.3}
      delay={0.6}
    />
  );
};

export default SamoyedConstellation;
