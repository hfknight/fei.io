import React, { useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useReducedMotion } from 'framer-motion';
import Header from './Header';
import Footer from './Footer';
import { HOME_CURTAIN_IN } from '../HomeCurtains';
import { CURTAIN_COVER } from '../PageTransition';
import { landingHasRevealed } from '../Landing/introState';
import { surfaceFor, groundFor } from '../../styles/surface';

interface LayoutProps {
  children: React.ReactNode;
}

/**
 * Route → surface and route → ground now live in `src/styles/surface.ts`, because
 * PageTransition's curtain needs the same answers to paint the destination itself.
 */

/**
 * The Footer is home-only chrome. Interior pages compose their own full-height layouts and
 * the fixed copyright bar overlaps or crowds them (e.g. `/readme`'s pinned two-column
 * composition), so it lives only on the landing, where it sits over the video hero.
 */
const FOOTER_PATH = '/';

/**
 * The surface attribute lives on <html>, not on the page. Header and Footer are
 * siblings of the page content, so a surface set on a page element would never reach
 * the chrome — which is the thing that needs it.
 */
const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();
  const surface = surfaceFor(pathname);
  const ground = groundFor(pathname);

  // useLayoutEffect, not useEffect: the attribute must exist before paint or a route
  // change would flash light chrome over a dark page.
  //
  // The flip waits until whatever is covering the viewport has actually covered it.
  // It used to be immediate, because the curtain read its colour from <html> and so the
  // page had to flip under it. The curtain now resolves the destination itself, which
  // frees this to wait — and waiting is the point: for the first ~0.45s of the sweep the
  // OUTGOING page is still fully visible, and flipping under it re-inked it live. The
  // visible symptom was a hovered link on /lab racing from the light surface's
  // olive-bronze accent to the dark surface's bright yellow before the curtain arrived.
  //
  // Three timings, one rule — swap under cover:
  //   - return to home (landing revealed, the gate HomeCurtains plays on) → HOME_CURTAIN_IN
  //   - any other route change → CURTAIN_COVER
  //   - first paint of the session, or reduced motion → immediately, since no curtain runs
  const first = useRef(true);
  useLayoutEffect(() => {
    const flip = () => {
      document.documentElement.dataset.surface = surface;
      // The ground the body paints while nothing is mounted. Lazy routes leave a real gap
      // — Suspense falls back to null — and this is what shows during it.
      document.documentElement.style.setProperty('--page-ground', ground);
    };
    if (first.current || reduced) {
      first.current = false;
      flip();
      return;
    }
    const delay =
      pathname === '/' && landingHasRevealed() ? HOME_CURTAIN_IN : CURTAIN_COVER;
    const id = window.setTimeout(flip, delay * 1000);
    return () => clearTimeout(id);
  }, [surface, ground, pathname, reduced]);

  return (
    <>
      <Header />
      <div className="layout-content">{children}</div>
      {pathname === FOOTER_PATH && <Footer />}
    </>
  );
};

export default Layout;
