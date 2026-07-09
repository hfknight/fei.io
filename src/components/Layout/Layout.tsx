import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Routes that have been migrated to the light theme. Empty for now: every page still
 * hardcodes a dark background, so everything is bridged to `inverted`. Each page's
 * migration spec adds its path here.
 *
 * The landing is never added — its chrome sits over video, not paper.
 */
const LIGHT_ROUTES = new Set<string>();

/**
 * The surface attribute lives on <html>, not on the page. Header and Footer are
 * siblings of the page content, so a surface set on a page element would never reach
 * the chrome — which is the thing that needs it.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const surface = LIGHT_ROUTES.has(pathname) ? 'default' : 'inverted';

  // useLayoutEffect, not useEffect: the attribute must exist before paint or a route
  // change would flash light chrome over a dark page.
  useLayoutEffect(() => {
    document.documentElement.dataset.surface = surface;
  }, [surface]);

  return (
    <>
      <Header />
      <div className="layout-content">{children}</div>
      <Footer />
    </>
  );
};

export default Layout;
