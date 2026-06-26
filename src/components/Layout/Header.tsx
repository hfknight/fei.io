import styled from 'styled-components';
import { motion, useReducedMotion } from 'framer-motion';
import { Link, useLocation } from 'react-router-dom';

const ease = [0.16, 1, 0.3, 1] as [number, number, number, number];

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
  gap: 2rem;

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
  opacity: ${p => p.$active ? 1 : 0.75};
  text-decoration: none;
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.72rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  transition: opacity 0.3s ease;
  outline: none;

  &:hover,
  &:focus-visible {
    opacity: 1;
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
