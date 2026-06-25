import styled, { keyframes } from 'styled-components';

// transitions.dev "shimmer text" (15), retuned for the dark indigo pages:
// a soft gold highlight band sweeps across muted loading copy. Pure CSS —
// the ::before layer duplicates the text via attr(data-text) and clips a
// moving gradient onto the same glyphs.
const shimmer = keyframes`
  0%   { background-position: 100% 0; }
  100% { background-position: 0% 0; }
`;

const Shimmer = styled.span`
  position: relative;
  display: inline-block;
  color: rgba(255, 255, 255, 0.42);

  &::before {
    content: attr(data-text);
    position: absolute;
    inset: 0;
    pointer-events: none;
    background-image: linear-gradient(
      90deg,
      transparent 0%,
      transparent 40%,
      #f8c058 50%,
      transparent 60%,
      transparent 100%
    );
    background-size: 400% 100%;
    background-repeat: no-repeat;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    -webkit-text-fill-color: transparent;
    animation: ${shimmer} 2000ms linear infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::before {
      animation: none;
    }
  }
`;

interface Props {
  children: string;
  className?: string;
}

const ShimmerText: React.FC<Props> = ({ children, className }) => (
  <Shimmer data-text={children} className={className}>
    {children}
  </Shimmer>
);

export default ShimmerText;
