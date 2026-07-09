import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Routes migrated to the light theme. The landing is never added — its chrome sits over
 * video, not paper. `/changelog` is retired and keeps its own neon palette.
 *
 * Post slugs live in D1 and are fetched at runtime, so `/writing/:slug` cannot be
 * enumerated here — hence the prefix. Lab entries are bespoke and stay dark.
 */
const LIGHT_EXACT = new Set(['/readme', '/work', '/connect', '/lab', '/writing']);
const LIGHT_PREFIXES = ['/writing/'];

/**
 * Consulted first, and the ordering is load-bearing: `/writing/admin` is itself matched by
 * the `/writing/` prefix, so without this it would resolve to light.
 */
const DARK_PREFIXES = ['/writing/admin', '/lab/'];

/**
 * Falls through to `inverted`, never to `default`. An unmigrated page still hardcodes
 * #12102a, so a route that matches nothing must land on dark or it paints dark ink on a
 * dark ground.
 */
const surfaceFor = (pathname: string): 'default' | 'inverted' => {
  if (DARK_PREFIXES.some(prefix => pathname.startsWith(prefix))) return 'inverted';
  if (LIGHT_EXACT.has(pathname)) return 'default';
  if (LIGHT_PREFIXES.some(prefix => pathname.startsWith(prefix))) return 'default';
  return 'inverted';
};

/**
 * The surface attribute lives on <html>, not on the page. Header and Footer are
 * siblings of the page content, so a surface set on a page element would never reach
 * the chrome — which is the thing that needs it.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const surface = surfaceFor(pathname);

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
