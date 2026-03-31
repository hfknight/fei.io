import styled, { createGlobalStyle } from 'styled-components';

export const GlobalStyles = createGlobalStyle`
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }

  html {
    font-size: 16px;
    scroll-behavior: smooth;
    overflow-x: hidden;
  }

  body {
    font-family: ${props => props.theme.fonts.primary};
    font-size: ${props => props.theme.fontSizes.base};
    line-height: 1.6;
    color: ${props => props.theme.colors.text};
    background-color: ${props => props.theme.colors.background};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  a {
    color: inherit;
    text-decoration: none;
  }

  button {
    font-family: inherit;
    cursor: pointer;
  }

  img {
    max-width: 100%;
    height: auto;
  }

  h1, h2, h3, h4, h5, h6 {
    font-weight: 600;
    line-height: 1.2;
  }
`;

// Common styled components
export const Container = styled.div`
  /* max-width: 1200px; */
  margin: 0 auto;
  padding: 0 ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    padding: 0 ${props => props.theme.spacing.xl};
  }
`;

export const Section = styled.section`
  padding: ${props => props.theme.spacing['3xl']} 0;

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    padding: ${props => props.theme.spacing['3xl']} 0;
  }
`;

export const Button = styled.button<{
  variant?: 'primary' | 'secondary' | 'outline';
}>`
  display: inline-flex;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  padding: ${props => props.theme.spacing.sm} ${props => props.theme.spacing.lg};
  border-radius: 0.5rem;
  font-weight: 500;
  font-size: ${props => props.theme.fontSizes.sm};
  transition: all 0.2s ease;
  border: 2px solid transparent;
  text-decoration: none;

  ${props => {
    switch (props.variant) {
      case 'secondary':
        return `
          background-color: ${props.theme.colors.surface};
          color: ${props.theme.colors.text};
          border-color: ${props.theme.colors.border};

          &:hover {
            background-color: ${props.theme.colors.border};
          }
        `;
      case 'outline':
        return `
          background-color: transparent;
          color: ${props.theme.colors.primary};
          border-color: ${props.theme.colors.primary};

          &:hover {
            background-color: ${props.theme.colors.primary};
            color: white;
          }
        `;
      default:
        return `
          background-color: ${props.theme.colors.primary};
          color: white;

          &:hover {
            background-color: ${props.theme.colors.primaryHover};
          }
        `;
    }
  }}

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  &:focus {
    outline: none;
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary}33;
  }
`;