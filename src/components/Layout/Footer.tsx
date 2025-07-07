import React from 'react';
import styled from 'styled-components';
import { Github, Linkedin, Mail } from 'lucide-react';
import { Container } from '../../styles/GlobalStyles';

const FooterWrapper = styled.footer`
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: ${props => props.theme.spacing.md} 0;
`;

const FooterContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.lg};
  text-align: center;

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    flex-direction: row;
    justify-content: space-between;
    text-align: left;
  }
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.md};
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1px solid #78716c;
  color: #78716c;
  transition: all 0.2s ease;

  &:hover {
    background-color: transparent;
    border-color: #fdd75e;
    color: #fdd75e;
    transform: translateY(-2px);
  }
`;

const Copyright = styled.p`
  color: ${props => props.theme.colors.textLight};
  font-size: ${props => props.theme.fontSizes.sm};
`;

const Footer: React.FC = () => {
  return (
    <FooterWrapper>
      <Container>
        <FooterContent>
          <Copyright>
            © {new Date().getFullYear()} Fei. All rights reserved.
          </Copyright>
          <SocialLinks>
            <SocialLink className="social_link" href="https://github.com/yourusername" target="_blank" rel="noopener noreferrer">
              <Github size={20} />
            </SocialLink>
            <SocialLink className="social_link" href="https://linkedin.com/in/fei.hu" target="_blank" rel="noopener noreferrer">
              <Linkedin size={20} />
            </SocialLink>
            <SocialLink className="social_link" href="mailto:fei.hu@fei.io">
              <Mail size={20} />
            </SocialLink>
          </SocialLinks>
        </FooterContent>
      </Container>
    </FooterWrapper>
  );
};

export default Footer;