import styled, { css } from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';
import { House } from 'lucide-react';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

/**
 * Glass is driven by GLASS_K in tokens.ts, mirroring the design source's applyPill().
 * The tint follows the surface, so this reads as white over video and as ink on paper.
 *
 * One recipe, two consumers: a link wears it transiently on hover, and the active link
 * wears it at rest. Keeping them in one block is what stops the two from drifting.
 */
const glassPill = css`
  background: linear-gradient(140deg, ${p => p.theme.glass.top}, ${p => p.theme.glass.bot});
  -webkit-backdrop-filter: blur(${p => p.theme.glass.blur}) saturate(205%);
  backdrop-filter: blur(${p => p.theme.glass.blur}) saturate(205%);
  /* The cast shadow is short. The 6px/20px it used to throw belonged to a slab floating well
     above the page, and on paper it pooled into a dark blob under the active link. */
  box-shadow:
    inset 0 1px 0 ${p => p.theme.glass.hi},
    inset 0 -1px 2px ${p => p.theme.glass.sheen},
    inset 0 0 0 1px ${p => p.theme.glass.rim},
    0 2px 6px ${p => p.theme.glass.shadow};
`;

const Bar = styled.header`
  position: fixed;
  top: 0;
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

const NavLink = styled(Link)<{ $active?: boolean }>`
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

  /* The active link already carries the pill, so hovering it must not paint a second one. */
  &:hover,
  &:focus-visible {
    opacity: 1;
    ${p => !p.$active && glassPill}
  }

  /* Six labels are 31 characters; at the desktop metrics they need ~446px and the nav used
     to wrap. Tightening the tracking and the horizontal padding fits them on one row down
     to a 320px viewport, without shrinking the type below the footer's size. */
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    font-size: 0.66rem;
    letter-spacing: 0;
    padding: 0.375rem 0.3rem;
  }
`;

// transitions.dev "tabs sliding" (16), adapted to the router-driven nav: one pill that
// slides between links via framer's shared-layout animation, rather than each link
// tweening its own. The pill is the same glass the links wear on hover — the active
// route simply keeps it.
const Pill = styled(motion.span)`
  position: absolute;
  inset: 0;
  border-radius: ${p => p.theme.radius.pill};
  pointer-events: none;
  ${glassPill}
`;

// The pill is positioned and the label is not, so without this the pill would paint over
// the text. Raising the label is cheaper than lowering the pill out of the stacking flow.
const Label = styled.span`
  position: relative;
  z-index: 1;
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

  const isReadme = pathname === '/readme';
  const isLab = pathname === '/lab' || pathname.startsWith('/lab/');
  const isWork = pathname === '/work';
  const isWriting = pathname === '/writing' || pathname.startsWith('/writing/');

  return (
    <Bar>
      <NavLinks>
        {/* Home renders on every route, the landing included, but never wears the pill and is
            never marked current — it is a way back, not a destination. So on the landing no
            link is active, which also keeps the pill out of the three header copies the lens
            clones into its refraction worlds. */}
        <NavItem>
          <IconLink to="/" $active={false} aria-label="Home">
            <Label><House size={15} strokeWidth={1.75} aria-hidden="true" /></Label>
          </IconLink>
        </NavItem>
        {/* aria-current is the accessible half of the pill: the pill draws where you are,
            this announces it. Without it the active route is conveyed by colour alone. */}
        <NavItem>
          <NavLink to="/readme" $active={isReadme} aria-current={isReadme ? 'page' : undefined}><ActivePill show={isReadme} /><Label>Readme</Label></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/lab" $active={isLab} aria-current={isLab ? 'page' : undefined}><ActivePill show={isLab} /><Label>Lab</Label></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/work" $active={isWork} aria-current={isWork ? 'page' : undefined}><ActivePill show={isWork} /><Label>Work</Label></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/writing" $active={isWriting} aria-current={isWriting ? 'page' : undefined}><ActivePill show={isWriting} /><Label>Writing</Label></NavLink>
        </NavItem>
      </NavLinks>
    </Bar>
  );
};

export default Header;
