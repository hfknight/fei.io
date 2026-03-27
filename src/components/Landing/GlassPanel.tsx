import styled from 'styled-components';
import LogoOutlinedSvg from '../../assets/logo-outlined.svg?react';

const Panel = styled.div`
  position: relative;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 48px;
  border-radius: 16px;
  backdrop-filter: blur(12px);
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  max-width: 480px;
  text-align: center;
`;

const Logo = styled(LogoOutlinedSvg)`
  width: 120px;
  height: 120px;
  color: #fff;
  path, circle, rect, polygon {
    fill: currentColor;
  }
`;

const Gap = styled.div`
  height: 32px;
`;

const Tagline = styled.p`
  margin: 0;
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  line-height: 1.6;
  color: rgba(255, 255, 255, 0.85);
`;

const GlassPanel: React.FC = () => (
  <Panel>
    <Logo />
    <Gap />
    <Tagline>
      Web Developer based in Texas, US.<br />
      creating aesthetic and intuitive user interfaces that blend thoughtful
      design with robust engineering.
    </Tagline>
  </Panel>
);

export default GlassPanel;
