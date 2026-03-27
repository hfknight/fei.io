import { useState } from 'react';
import styled from 'styled-components';
import VideoBackground from './VideoBackground';
import LoadingScreen from './LoadingScreen';
import NavBar from './NavBar';
import GlassPanel from './GlassPanel';

const Page = styled.div`
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <Page>
      <VideoBackground onCanPlay={() => setIsLoading(false)} />
      <NavBar />
      <GlassPanel />
      <LoadingScreen isVisible={isLoading} />
    </Page>
  );
};

export default LandingPage;
