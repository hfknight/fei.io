import { useState, useEffect } from 'react';
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

  useEffect(() => {
    console.log(
      '%c Fei Hu ',
      'background: linear-gradient(90deg, #b8d8f8, #d4b8f8, #f8b8d8); color: #1a1025; font-size: 16px; font-weight: 700; padding: 4px 10px; border-radius: 4px;'
    );
    console.log(
      '%c Web Developer · Texas, US ',
      'color: #d4b8f8; font-size: 11px; letter-spacing: 0.1em;'
    );
    console.log(
      '%c Hey curious mind — enjoy the view. ',
      'color: #b8d8f8; font-style: italic; font-size: 11px;'
    );
  }, []);

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
