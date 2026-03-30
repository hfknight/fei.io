import styled from 'styled-components';

const Bar = styled.footer`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding: 0 2rem;
  height: 48px;
  background: transparent;
  pointer-events: none;
`;

const Copyright = styled.span`
  color: rgba(255, 255, 255, 0.45);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 0.65rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  pointer-events: auto;
`;

const Footer: React.FC = () => (
  <Bar>
    <Copyright>Copyright {new Date().getFullYear()} Fei Hu</Copyright>
  </Bar>
);

export default Footer;
