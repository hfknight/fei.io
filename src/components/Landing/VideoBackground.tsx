import styled from 'styled-components';

const Wrapper = styled.div`
  position: fixed;
  inset: 0;
  z-index: 0;
`;

const Video = styled.video`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const Overlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
`;

interface Props {
  onCanPlay: () => void;
}

const VideoBackground: React.FC<Props> = ({ onCanPlay }) => (
  <Wrapper aria-hidden="true">
    <Video autoPlay loop muted playsInline onCanPlay={onCanPlay}>
      <source src="/intro.webm" type="video/webm" />
      <source src="/intro.mp4"  type="video/mp4"  />
    </Video>
    <Overlay />
  </Wrapper>
);

export default VideoBackground;
