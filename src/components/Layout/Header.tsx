import styled from 'styled-components';
import { Link, useLocation } from 'react-router-dom';

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
`;

const NavLinks = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 2rem;
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

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: ${p => p.$active ? '100%' : '0'};
    height: 1px;
    background: rgba(255, 255, 255, 0.6);
    transition: width 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
  }

  &:hover,
  &:focus-visible {
    opacity: 1;
  }

  &:hover::after,
  &:focus-visible::after {
    width: 100%;
  }
`;

const Header: React.FC = () => {
  const { pathname } = useLocation();
  const isHome = pathname === '/';

  return (
    <Bar>
      <NavLinks>
        {!isHome && (
          <NavItem><NavLink to="/" $active={isHome}>Home</NavLink></NavItem>
        )}
        <NavItem><NavLink to="/readme" $active={pathname === '/readme'}>Readme</NavLink></NavItem>
        <NavItem><NavLink to="/changelog" $active={pathname === '/changelog'}>Changelog</NavLink></NavItem>
        <NavItem><NavLink to="/work" $active={pathname === '/work'}>Work</NavLink></NavItem>
        <NavItem><NavLink to="/connect" $active={pathname === '/connect'}>Connect</NavLink></NavItem>
      </NavLinks>
    </Bar>
  );
};

export default Header;
