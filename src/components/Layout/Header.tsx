import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

// Nav-pill glass intensity, 0–1. Port of the design source's `pillHover` prop: every
// value in PILL is a linear function of this one dial, so they thicken in proportion.
// 0 is the source's own default (a bare rim); 1 is a heavy frosted slab.
const PILL_HOVER = 0.2;

// Port of the source's applyPill(), including its rounding.
const PILL = {
  top: (0.08 + 0.34 * PILL_HOVER).toFixed(3),
  bot: (0.02 + 0.11 * PILL_HOVER).toFixed(3),
  blur: (3 + 13 * PILL_HOVER).toFixed(1),
  hi: (0.22 + 0.42 * PILL_HOVER).toFixed(3),
  rim: (0.06 + 0.18 * PILL_HOVER).toFixed(3),
  shadow: (0.06 + 0.2 * PILL_HOVER).toFixed(3),
};

const Bar = styled.header`
  position: fixed;
  top: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 2rem;
  height: 60px;
  background: transparent;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    left: 0;
    height: auto;
    min-height: 60px;
    align-items: flex-start;
    padding: 0.6rem 1.25rem;
  }
`;

const NavLinks = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 0.5rem;

  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 0.55rem 1.1rem;
    max-width: 100%;
  }
`;

const NavItem = styled.li``;

const NavLink = styled(Link)<{ $active?: boolean }>`
  position: relative;
  color: #fff;
  opacity: ${p => p.$active ? 1 : 0.72};
  text-decoration: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 8px 15px;
  border-radius: 7px;
  transition:
    opacity 0.35s ease,
    background 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 0.4s cubic-bezier(0.22, 1, 0.36, 1),
    backdrop-filter 0.4s cubic-bezier(0.22, 1, 0.36, 1);
  outline: none;

  /* Glass is driven by PILL_HOVER above, mirroring the source's applyPill(). Do not
     substitute the var() fallbacks from the source's stylesheet — its script overwrites
     them on mount, so those fallbacks are never rendered (they sit near pillHover 0.65).
     The -1px inset below has no variable in the source and stays fixed. */
  &:hover,
  &:focus-visible {
    /* outranks the global light-mode a:hover in index.css, which would tint the label amber */
    color: #fff;
    opacity: 1;
    background: linear-gradient(
      140deg,
      rgba(255, 255, 255, ${PILL.top}),
      rgba(255, 255, 255, ${PILL.bot})
    );
    -webkit-backdrop-filter: blur(${PILL.blur}px) saturate(205%);
    backdrop-filter: blur(${PILL.blur}px) saturate(205%);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, ${PILL.hi}),
      inset 0 -1px 2px rgba(255, 255, 255, 0.14),
      inset 0 0 0 1px rgba(255, 255, 255, ${PILL.rim}),
      0 6px 20px rgba(0, 0, 0, ${PILL.shadow});
  }
`;

// transitions.dev "tabs sliding" (16), adapted to the router-driven nav:
// a single active-route underline that slides between links via framer's
// shared-layout animation instead of a per-link width tween.
const Underline = styled(motion.span)`
  position: absolute;
  left: 0;
  right: 0;
  bottom: -3px;
  height: 1px;
  background: rgba(255, 255, 255, 0.6);
`;

const ActiveUnderline: React.FC<{ show: boolean }> = ({ show }) => {
  const reduced = useReducedMotion();
  if (!show) return null;
  return (
    <Underline
      layoutId="nav-underline"
      transition={{ duration: reduced ? 0 : 0.3, ease }}
    />
  );
};

const Header: React.FC = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  const isReadme = pathname === '/readme';
  const isChangelog = pathname === '/changelog';
  const isLab = pathname === '/lab' || pathname.startsWith('/lab/');
  const isWork = pathname === '/work';
  const isWriting = pathname === '/writing' || pathname.startsWith('/writing/');
  const isConnect = pathname === '/connect';

  return (
    <Bar>
      <NavLinks>
        <NavItem style={isHome ? { visibility: 'hidden', pointerEvents: 'none' } : undefined}>
          <NavLink to="/" $active={false}>Home</NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/readme" $active={isReadme}>Readme<ActiveUnderline show={isReadme} /></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/changelog" $active={isChangelog}>Changelog<ActiveUnderline show={isChangelog} /></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/lab" $active={isLab}>Lab<ActiveUnderline show={isLab} /></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/work" $active={isWork}>Work<ActiveUnderline show={isWork} /></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/writing" $active={isWriting}>Writing<ActiveUnderline show={isWriting} /></NavLink>
        </NavItem>
        <NavItem>
          <NavLink to="/connect" $active={isConnect}>Connect<ActiveUnderline show={isConnect} /></NavLink>
        </NavItem>
      </NavLinks>
    </Bar>
  );
};

export default Header;
