import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import About from './pages/About';
import Day from './pages/Day';
import LandingPage from './components/Landing';
import LoadingScreen from './components/Landing/LoadingScreen';
import Connect from './pages/Connect';
import Work from './pages/Work';
import Writing from './pages/Writing';
import WritingPost from './pages/WritingPost';

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/readme" element={<About />} />
        <Route path="/changelog" element={<Day />} />
        <Route path="/work" element={<Work />} />
        <Route path="/writing" element={<Writing />} />
        <Route path="/writing/:slug" element={<WritingPost />} />
        <Route path="/connect" element={<Connect />} />
        <Route path="/loading" element={<LoadingScreen isVisible={true} />} />
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
