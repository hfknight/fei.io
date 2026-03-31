import { useState, useEffect } from 'react';
import styled from 'styled-components';
import VideoBackground from './VideoBackground';
import LoadingScreen from './LoadingScreen';
import IntroPanel from './IntroPanel';

const Page = styled.div`
  position: relative;
  width: 100%;
  height: 100dvh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const MIN_LOADING_MS = 3000;

const LandingPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!videoReady) return;
    const timer = setTimeout(() => setIsLoading(false), MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, [videoReady]);

  useEffect(() => {
    console.log(
      '%c Fei Hu ',
      'background: linear-gradient(90deg, #b8d8f8, #d4b8f8, #f8b8d8); color: #1a1025; font-size: 16px; font-weight: 700; padding: 4px 10px; border-radius: 4px;'
    );
    console.log(
      '%c Frontend Engineer · AI Product Engineer ',
      'color: #d4b8f8; font-size: 11px; letter-spacing: 0.1em;'
    );
    console.log(
      '%c Hey curious mind — enjoy the view. ',
      'color: #b8d8f8; font-style: italic; font-size: 11px;'
    );
  }, []);

  return (
    <Page>
      <VideoBackground onCanPlay={() => setVideoReady(true)} />
      <IntroPanel />
      <LoadingScreen isVisible={isLoading} />
    </Page>
  );
};

export default LandingPage;
