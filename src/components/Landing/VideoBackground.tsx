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
  <Wrapper>
    <Video
      src="/intro.mp4"
      autoPlay
      loop
      muted
      playsInline
      onCanPlay={onCanPlay}
    />
    <Overlay />
  </Wrapper>
);

export default VideoBackground;
