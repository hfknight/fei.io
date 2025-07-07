import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import styled from 'styled-components';
import { Menu, X } from 'lucide-react';
import { Container } from '../../styles/GlobalStyles';

const HeaderWrapper = styled.header`
  background-color: ${(props) => props.theme.colors.background};
  border-bottom: 1px solid ${(props) => props.theme.colors.border};
  position: sticky;
  top: 0;
  z-index: 100;
  backdrop-filter: blur(10px);
  background-color: rgba(255, 255, 255, 0.95);
`;

const HeaderContent = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: ${(props) => props.theme.spacing.md} 0;
`;

const Logo = styled(Link)`
  font-size: ${(props) => props.theme.fontSizes.xl};
  font-weight: 700;
  color: ${(props) => props.theme.colors.primary};

  &:hover {
    opacity: 0.8;
  }
`;

const Nav = styled.nav<{ isOpen: boolean }>`
  @media (max-width: ${(props) => props.theme.breakpoints.md}) {
    position: fixed;
    top: 0;
    right: 0;
    height: 100vh;
    width: 250px;
    background-color: ${(props) => props.theme.colors.background};
    box-shadow: ${(props) => props.theme.shadows.lg};
    transform: translateX(${(props) => (props.isOpen ? '0' : '100%')});
    transition: transform 0.3s ease;
    padding: ${(props) => props.theme.spacing['2xl']};
    z-index: 1000;
  }
`;

const NavList = styled.ul`
  display: flex;
  list-style: none;
  gap: ${(props) => props.theme.spacing.xl};

  @media (max-width: ${(props) => props.theme.breakpoints.md}) {
    flex-direction: column;
    gap: ${(props) => props.theme.spacing.lg};
    margin-top: ${(props) => props.theme.spacing['2xl']};
  }
`;

const NavItem = styled.li``;

const NavLink = styled(Link)<{ isActive: boolean }>`
  font-weight: 500;
  color: ${(props) =>
    props.isActive ? props.theme.colors.primary : props.theme.colors.text};
  transition: color 0.2s ease;

  &:hover {
    color: ${(props) => props.theme.colors.primary};
  }
`;

const MenuButton = styled.button`
  display: none;
  background: none;
  border: none;
  padding: ${(props) => props.theme.spacing.sm};
  color: ${(props) => props.theme.colors.text};
  z-index: 1001;
  position: relative;

  @media (max-width: ${(props) => props.theme.breakpoints.md}) {
    display: block;
  }
`;

const Overlay = styled.div<{ isOpen: boolean }>`
  display: ${(props) => (props.isOpen ? 'block' : 'none')};
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;

  @media (min-width: ${(props) => props.theme.breakpoints.md}) {
    display: none;
  }
`;

const Header: React.FC = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/projects', label: 'Projects' },
    { path: '/contact', label: 'Contact' }
  ];

  const closeMenu = () => setIsMenuOpen(false);

  return (
    <HeaderWrapper>
      <Container>
        <HeaderContent>
          <Logo to="/" onClick={closeMenu}>
            Fei
          </Logo>

          <Nav isOpen={isMenuOpen}>
            <NavList>
              {navItems.map((item) => (
                <NavItem key={item.path}>
                  <NavLink
                    to={item.path}
                    isActive={location.pathname === item.path}
                    onClick={closeMenu}
                  >
                    {item.label}
                  </NavLink>
                </NavItem>
              ))}
            </NavList>
          </Nav>

          <MenuButton onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </MenuButton>
        </HeaderContent>
      </Container>

      <Overlay isOpen={isMenuOpen} onClick={closeMenu} />
    </HeaderWrapper>
  );
};

export default Header;
