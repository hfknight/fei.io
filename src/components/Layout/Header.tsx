import styled, { css } from 'styled-components';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { House } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Glass is driven by GLASS_K in tokens.ts, mirroring the design source's applyPill().
 * The tint follows the surface, so this reads as white over video and as ink on paper.
 *
 * One consumer now: a link on the LANDING wears it transiently on hover. The active link
 * used to wear it at rest on every dark route; that is the ink ring's job everywhere but
 * the landing (see below), so the nav keeps one character across the whole site.
 */
const glassPill = css`
  /* The gradient is stacked twice: the reference frost is denser than GLASS_K's thin pill,
     and doubling the layer compounds the alpha (top 0.148 → 0.274) without minting a new
     tint outside the token family. Both copies follow the surface as before. */
  background:
    linear-gradient(140deg, ${p => p.theme.glass.top}, ${p => p.theme.glass.bot}),
    linear-gradient(140deg, ${p => p.theme.glass.top}, ${p => p.theme.glass.bot});
  /* Frost-grade blur, not the pill's 5.6px — this is the thicker material the nav track
     already shares with the landing's inactive half. */
  -webkit-backdrop-filter: blur(var(--frost-blur)) saturate(205%);
  backdrop-filter: blur(var(--frost-blur)) saturate(205%);
  /* Bottom-up: crisp rim; top catch-light; a deeper inner sheen along the lower edge; a soft
     cast shadow displaced down (negative spread keeps it from pooling into a blob on paper);
     and the bloom — light escaping under the glass. hi/sheen are always white (reflected
     light), so the bloom pools brightly over the dark video and fades out on light paper. */
  box-shadow:
    inset 0 1px 0 ${p => p.theme.glass.hi},
    inset 0 -2px 6px ${p => p.theme.glass.sheen},
    inset 0 0 0 1px ${p => p.theme.glass.rim},
    0 2px 3px -1px ${p => p.theme.glass.shadow},
    0 8px 18px -6px ${p => p.theme.glass.shadow},
    0 10px 18px -8px ${p => p.theme.glass.hi};

`;

/**
 * The hover affordance everywhere EXCEPT the landing: a single ink ring instead of the
 * glass above. It began as a light-surface fallback — on paper the glass recipe
 * degenerates, since the ink fill composites to a flat grey slab, the white speculars
 * vanish on a near-white ground, and the backdrop blur has nothing behind it but flat
 * paper. It now applies on the interior dark pages too, so the chrome reads the same
 * everywhere the site has a page under it. 40% chrome ink, not the glass rim's 0.096
 * alpha: a ring that is the whole pill has to carry on its own. `chrome.ink` follows the
 * surface, so this is a dark ring on paper and a light one on the deep pages.
 *
 * The landing keeps the glass, and should: there the chrome floats over video with no page
 * behind it, which is the one place the backdrop blur has something to work with.
 */
const inkRing = css`
  background: none;
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
  box-shadow: inset 0 0 0 1px color-mix(in srgb, ${p => p.theme.chrome.ink} 40%, transparent);
`;

const Bar = styled.header`
  position: fixed;
  top: env(safe-area-inset-top);
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 ${p => p.theme.space[3]};
  height: ${p => p.theme.barHeight};
  background: transparent;

  /* The bar kept height:auto and a flex-start alignment only to accommodate a wrapping
     nav. One row means it can stay the same fixed bar it is on desktop. */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    left: 0;
    padding: 0 0.75rem;
  }
`;

/** The track's inset: the gap between its rim and the pill that slides inside it. */
const TRACK_PAD = '0.25rem';
const TRACK_PAD_SM = '0.15rem';

const NavLinks = styled.ul`
  list-style: none;
  margin: 0;
  display: inline-flex;
  /* A small gap sets the hover/active pills apart so adjacent ones never touch. */
  gap: 0.35rem;
  /* The nav paints nothing itself; this inset only keeps the end links' hover pills from
     sitting flush against the bar's edge. */
  padding: ${TRACK_PAD};

  /* One row, always. A wrapping nav sends the shared-layout pill diagonally across
     unrelated links on any route change that crosses a row, and the CSS technique this
     pattern comes from — translateX plus width — cannot express a row change at all. The gap
     tightens on mobile, where the six links are already close to the viewport width. */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-wrap: nowrap;
    gap: 0.15rem;
    padding: ${TRACK_PAD_SM};
  }
`;

const NavItem = styled.li`
  display: flex;
`;

// The pill is positioned and the label is not, so without this the pill would paint over
// the text. Raising the label is cheaper than lowering the pill out of the stacking flow.
// Declared before NavLink so the active-state rule below can target it by class.
const Label = styled.span`
  position: relative;
  z-index: 1;
`;

const NavLink = styled(Link)<{ $active?: boolean; $landing?: boolean }>`
  position: relative;
  /* An inline <a> paints its vertical padding but contributes none of it to layout height, so
     the track collapsed onto a line box and the pill sat 2px from the rim instead of the 4.8px
     the inset asks for. A flex box makes the padding structural. */
  display: inline-flex;
  align-items: center;
  color: ${p => p.theme.chrome.ink};
  opacity: ${p => p.$active ? 1 : 0.72};
  text-decoration: none;
  font-family: ${p => p.theme.font.mono};
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  /* Tighter than the space scale's 8/15px. The links abut now, so each one's horizontal
     padding is half the visual gutter between two labels — 11px of padding reads as the 22px
     of air the old 15px + 3.2px gap gave, at two thirds the width. */
  padding: 0.375rem 0.7rem;
  border-radius: ${p => p.theme.radius.pill};
  transition:
    opacity 0.35s ease,
    background 0.4s ${p => p.theme.ease.glass},
    box-shadow 0.4s ${p => p.theme.ease.glass},
    backdrop-filter 0.4s ${p => p.theme.ease.glass};
  outline: none;

  /* The active link may already carry a mark, so hovering it must not paint a second one.
     The landing wears the glass; every page under it wears the ring. */
  &:hover,
  &:focus-visible {
    opacity: 1;
    ${p => !p.$active && (p.$landing ? glassPill : inkRing)}
  }

  /* Current and hover part ways on every page but the landing: hover wears the ink ring,
     and the CURRENT link instead RGB-splits its label — the same chromatic aberration the
     landing's lenses cast, red fringing one way, cyan the other. The split rides text-shadow
     so the core glyph stays full-contrast ink; sub-pixel offsets keep it a shimmer, not a
     misprint. This used to be paper-only, with the deep pages keeping a glass pill for the
     current link; it is now the one treatment across every route with a page behind it, so
     the nav does not change character as you move between /readme and a lab entry. The
     landing marks nothing current, so it never reaches this. */
  ${p => p.$active && css`
    & ${Label} {
      text-shadow:
        -1.2px 0 0 oklch(0.62 0.24 25 / 0.55),
        1.2px 0 0 oklch(0.7 0.13 230 / 0.55);
    }
  `}

  /* Six labels are 31 characters; at the desktop metrics they need ~446px and the nav used
     to wrap. Tightening the tracking and the horizontal padding fits them on one row down
     to a 320px viewport, without shrinking the type below the footer's size. */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: 0.66rem;
    letter-spacing: 0;
    padding: 0.375rem 0.3rem;
  }
`;

// transitions.dev "tabs sliding" (16), adapted to the router-driven nav: one box that
// slides between links via framer's shared-layout animation, rather than each link tweening
// its own. It now paints NOTHING on every route — the current link is marked by its label's
// chromatic aberration, and the ring is a hover-only affordance. It used to wear the glass
// on dark surfaces; that was the last place the nav changed character between pages. The
// invisible box still slides between links, so the layout animation is a no-op, not a
// glitch, and the mechanism stays here if the pill is ever wanted back.
const Pill = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: ${p => p.theme.radius.pill};
  pointer-events: none;
`;


/**
 * Home carries a glyph rather than a word, so its box is squarer than a label's — the same
 * vertical padding, less horizontal. The icon inherits `currentColor`, which means it follows
 * `--chrome-ink` across surfaces exactly as the labels do.
 *
 * An icon-only link has no text to name it, so the name lives on the anchor as `aria-label`
 * and the glyph is hidden from the accessibility tree.
 */
const IconLink = styled(NavLink)`
  padding-left: 0.55rem;
  padding-right: 0.55rem;

  svg {
    display: block;
  }
`;

const ActivePill: React.FC<{ show: boolean }> = ({ show }) => {
  const reduced = useReducedMotion();
  if (!show) return null;
  return (
    <Pill
      data-nav-pill
      layoutId="nav-pill"
      transition={{ duration: reduced ? 0 : 0.3, ease }}
    />
  );
};

const Header: React.FC = () => {
  const { pathname } = useLocation();
  const reduced = useReducedMotion();

  // The landing is the one route with no page behind the chrome — just video — so it keeps
  // the glass hover. Everywhere else wears the ring, so the nav reads the same from /readme
  // through to a lab entry.
  const isLanding = pathname === '/';
  const isReadme = pathname === '/readme';
  const isLab = pathname === '/lab' || pathname.startsWith('/lab/');
  const isWriting = pathname === '/writing' || pathname.startsWith('/writing/');

  return (
    <Bar>
      {/* A stable hook for routes that float the nav over arbitrary media and need to give
          it a ground of its own (see /lab/cursor-tracked-video). Nothing styles it here. */}
      <NavLinks data-nav-track>
        {/* Home is a way back, not a destination — never the pill, never marked current, and
            not rendered on the landing at all, where it would be a live link to the page under
            it. Leftmost item in a right-aligned bar, so its exit shifts nothing; a short fade
            covers the pop, since the bar rides ABOVE the curtain sweep (z 10 over 9). Off the
            landing it also keeps the icon out of the header copies the lens clones into its
            refraction worlds. */}
        <AnimatePresence initial={false}>
          {!isLanding && (
            <NavItem
              as={motion.li}
              key="home"
              initial={{ opacity: 0, scale: 0.6 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={{ duration: reduced ? 0 : 0.25, ease }}
            >
              <IconLink to="/" $active={false} $landing={false} aria-label="Home">
                <Label><House size={15} strokeWidth={1.75} aria-hidden="true" /></Label>
              </IconLink>
            </NavItem>
          )}
        </AnimatePresence>
        {/* aria-current is the accessible half of the pill: the pill draws where you are,
            this announces it. Without it the active route is conveyed by colour alone. */}
        <NavItem>
          <NavLink to="/readme" $active={isReadme} $landing={isLanding} aria-current={isReadme ? 'page' : undefined}><ActivePill show={isReadme} /><Label>Readme</Label></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/lab" $active={isLab} $landing={isLanding} aria-current={isLab ? 'page' : undefined}><ActivePill show={isLab} /><Label>Lab</Label></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/writing" $active={isWriting} $landing={isLanding} aria-current={isWriting ? 'page' : undefined}><ActivePill show={isWriting} /><Label>Writing</Label></NavLink>
        </NavItem>
      </NavLinks>
    </Bar>
  );
};

export default Header;
