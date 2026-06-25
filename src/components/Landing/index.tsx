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

// Remembers the loader already played, so navigating back to Home within the
// SPA skips it. Module scope persists across route changes but resets on a
// full page reload — a genuine fresh visit replays the intro.
let hasShownLoading = false;

const LandingPage: React.FC = () => {
  const [showLoader] = useState(!hasShownLoading);
  const [isLoading, setIsLoading] = useState(!hasShownLoading);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    if (!isLoading || !videoReady) return;
    const timer = setTimeout(() => {
      setIsLoading(false);
      hasShownLoading = true;
    }, MIN_LOADING_MS);
    return () => clearTimeout(timer);
  }, [isLoading, videoReady]);

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
      {showLoader && <LoadingScreen isVisible={isLoading} />}
    </Page>
  );
};

export default LandingPage;
