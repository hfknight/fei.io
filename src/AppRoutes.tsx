import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import About from './pages/About';
import Day from './pages/Day';
import LandingPage from './components/Landing';
import LoadingScreen from './components/Landing/LoadingScreen';
import Connect from './pages/Connect';
import Work from './pages/Work';

// Lazy-loaded so the markdown/highlighter bundle stays off the landing page and
// other routes — it only loads when a /writing route is visited.
const Writing = lazy(() => import('./pages/Writing'));
const WritingPost = lazy(() => import('./pages/WritingPost'));
const AdminPosts = lazy(() => import('./pages/admin/AdminPosts'));
const AdminEditor = lazy(() => import('./pages/admin/AdminEditor'));

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Suspense key={location.pathname} fallback={null}>
        <Routes location={location}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/readme" element={<About />} />
          <Route path="/changelog" element={<Day />} />
          <Route path="/work" element={<Work />} />
          <Route path="/writing" element={<Writing />} />
          <Route path="/writing/admin" element={<AdminPosts />} />
          <Route path="/writing/admin/new" element={<AdminEditor />} />
          <Route path="/writing/admin/:id" element={<AdminEditor />} />
          <Route path="/writing/:slug" element={<WritingPost />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/loading" element={<LoadingScreen isVisible={true} />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

export default AppRoutes;
