import styled from 'styled-components';
import { Link } from 'react-router-dom';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const Bar = styled.nav`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  height: 60px;
  background: transparent;
`;

const LogoLink = styled(Link)`
  display: flex;
  align-items: center;
  text-decoration: none;
`;

const LogoIcon = styled(LogoOutlinedSvg)`
  height: 32px;
  width: auto;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
  }
`;

const NavLinks = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  gap: 2rem;
`;

const NavItem = styled.li``;

const NavLink = styled(Link)`
  position: relative;
  color: #fff;
  opacity: 0.75;
  text-decoration: none;
  font-family: 'Inter', sans-serif;
  font-size: 0.9rem;
  transition: opacity 0.3s ease;

  &::after {
    content: '';
    position: absolute;
    bottom: -3px;
    left: 0;
    width: 0;
    height: 1px;
    background: linear-gradient(90deg, #b8d8f8, #d4b8f8, #f8b8d8);
    transition: width 0.35s cubic-bezier(0.25, 0.1, 0.25, 1);
  }

  &:hover {
    opacity: 1;
  }

  &:hover::after {
    width: 100%;
  }
`;

const NavBar: React.FC = () => (
  <Bar>
    <LogoLink to="/">
      <LogoIcon />
    </LogoLink>
    <NavLinks>
      <NavItem>
        <NavLink to="/journey">Journey</NavLink>
      </NavItem>
    </NavLinks>
  </Bar>
);

export default NavBar;
