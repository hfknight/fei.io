import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import About from './pages/About';
import Day from './pages/Day';
import LandingPage from './components/Landing';
import LoadingScreen from './components/Landing/LoadingScreen';
import Contact from './pages/Contact';
import Work from './pages/Work';

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/readme" element={<About />} />
        <Route path="/changelog" element={<Day />} />
        <Route path="/work" element={<Work />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/loading" element={<LoadingScreen isVisible={true} />} />
      </Routes>
    </AnimatePresence>
  );
};

export default AppRoutes;
