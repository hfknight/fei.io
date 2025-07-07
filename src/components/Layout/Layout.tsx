import React from 'react';
import styled from 'styled-components';
// import Header from './Header';
import Footer from './Footer';

const LayoutWrapper = styled.div`
  position: relative;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
`;

const Main = styled.main`
  flex: 1;
`;

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <LayoutWrapper>
      <Main>{children}</Main>
      <Footer />
    </LayoutWrapper>
  );
};

export default Layout;