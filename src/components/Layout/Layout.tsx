import React, { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import { HOME_CURTAIN_IN } from '../HomeCurtains';
import { landingHasRevealed } from '../Landing/introState';

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
const LIGHT_EXACT = new Set(['/readme', '/lab', '/writing']);
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
  const reduced = useReducedMotion();
  const surface = surfaceFor(pathname);

  // useLayoutEffect, not useEffect: the attribute must exist before paint or a route
  // change would flash light chrome over a dark page.
  //
  // The immediate flip is load-bearing for PageTransition's sweep — the curtain is
  // painted in the destination surface, so the exiting page must flip under it for the
  // hand-off to be invisible. The one exception is a RETURN to home (landing already
  // revealed — the same gate HomeCurtains plays on): the old page is deliberately held
  // on screen, uncovered, while the curtains travel, and an instant flip would show as
  // a full-page dark flash. Deferred until the curtains meet, the surface swaps under
  // full cover. First visits keep the immediate flip — the Loader covers them.
  useLayoutEffect(() => {
    const flip = () => {
      document.documentElement.dataset.surface = surface;
    };
    if (pathname === '/' && landingHasRevealed() && !reduced) {
      const id = window.setTimeout(flip, HOME_CURTAIN_IN * 1000);
      return () => clearTimeout(id);
    }
    flip();
  }, [surface, pathname, reduced]);

  return (
    <>
      <Header />
      <div className="layout-content">{children}</div>
      <Footer />
    </>
  );
};

export default Layout;
