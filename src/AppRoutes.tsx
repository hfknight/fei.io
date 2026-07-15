import { lazy, Suspense } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import About from './pages/About';
import HomeCurtains from './components/HomeCurtains';
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

// Lazy so each bespoke entry page stays off the landing bundle.
const Lab = lazy(() => import('./pages/Lab'));
const LabEntryRoute = lazy(() => import('./pages/lab/LabEntryRoute'));

const AppRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <>
    {/* Outside AnimatePresence: the return-to-home curtains must outlive the exiting
        page to slide back out over the freshly mounted landing. */}
    <HomeCurtains />
    {/* custom feeds the DESTINATION path to exiting pages' variant functions —
        PageTransition picks its exit (sweep, hold, or bare) by where the user is
        going. A plain useLocation() inside the exiting tree can't do this: its exit
        variants are captured before the re-render lands. */}
    <AnimatePresence mode="wait" custom={location.pathname}>
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
          <Route path="/lab" element={<Lab />} />
          <Route path="/lab/:slug" element={<LabEntryRoute />} />
          <Route path="/connect" element={<Connect />} />
          <Route path="/loading" element={<LoadingScreen isVisible={true} />} />
        </Routes>
      </Suspense>
    </AnimatePresence>
    </>
  );
};

export default AppRoutes;
