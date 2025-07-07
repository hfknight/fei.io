// src/components/Hero/HeroSection.tsx
import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ChevronDown, Github, Linkedin, Mail } from 'lucide-react';
// import { Button } from '../../styles/GlobalStyles';
import ParticleBackground from '../ParticleBackground/ParticleBackground';

// Full width container (no max-width restriction)
const FullWidthContainer = styled.div`
  width: 100%;
  padding: 0 ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    padding: 0 ${props => props.theme.spacing.xl};
  }

  @media (min-width: ${props => props.theme.breakpoints.lg}) {
    padding: 0 ${props => props.theme.spacing['2xl']};
  }
`;

// Full screen hero section
const HeroWrapper = styled.section`
  width: 100vw;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: 
    radial-gradient(circle at 25% 25%, rgba(251, 191, 36, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 75% 75%, rgba(252, 211, 77, 0.08) 0%, transparent 60%),
    linear-gradient(135deg,
      ${props => props.theme.colors.background} 0%,
      ${props => props.theme.colors.surface} 100%);
  padding: ${props => props.theme.spacing.xl} 0;
  position: relative;
  overflow: hidden;
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(ellipse at 30% 20%, rgba(251, 191, 36, 0.06) 0%, transparent 70%),
      radial-gradient(ellipse at 70% 80%, rgba(252, 211, 77, 0.04) 0%, transparent 60%);
    pointer-events: none;
    z-index: 0;
    animation: elegantGlow 8s ease-in-out infinite;
  }

  @keyframes elegantGlow {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.8;
      transform: scale(1.02);
    }
  }
`;

const HeroContainer = styled(FullWidthContainer)`
  position: relative;
  z-index: 2;
  text-align: center;
  max-width: 1000px;
  margin: 0 auto;
`;

const HeroContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.xl};
`;

const HeroTitle = styled.h1`
  font-size: clamp(2.5rem, 5vw, 4.5rem);
  font-weight: 800;
  color: ${props => props.theme.colors.text};
  line-height: 1.1;
  margin-bottom: ${props => props.theme.spacing.md};

  span {
    background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.accent});
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
`;

const HeroSubtitle = styled.p`
  font-size: clamp(1.125rem, 2.5vw, 1.5rem);
  color: ${props => props.theme.colors.textLight};
  max-width: 700px;
  line-height: 1.6;
  margin-bottom: ${props => props.theme.spacing.lg};
`;

const HeroDescription = styled.p`
  font-size: clamp(1rem, 2vw, 1.125rem);
  color: ${props => props.theme.colors.textLight};
  max-width: 600px;
  line-height: 1.7;
  margin-bottom: ${props => props.theme.spacing['2xl']};
`;

const SocialLinks = styled.div`
  display: flex;
  gap: ${props => props.theme.spacing.lg};
  justify-content: center;
  margin-top: ${props => props.theme.spacing.xl};
`;

const SocialLink = styled.a`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(251, 191, 36, 0.2);
  color: ${props => props.theme.colors.text};
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 4px 20px rgba(251, 191, 36, 0.1);

  &:hover {
    background: ${props => props.theme.colors.primary};
    border-color: ${props => props.theme.colors.primary};
    color: white;
    transform: translateY(-4px) scale(1.05);
    box-shadow: 0 12px 40px rgba(251, 191, 36, 0.3);
  }
`;

const ScrollIndicator = styled(motion.div)`
  position: absolute;
  bottom: ${props => props.theme.spacing.xl};
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${props => props.theme.spacing.sm};
  color: ${props => props.theme.colors.textLight};
  font-size: ${props => props.theme.fontSizes.sm};
  z-index: 2;

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    display: none;
  }
`;

const ScrollArrow = styled(motion.div)`
  color: ${props => props.theme.colors.textLight};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const HeroSection: React.FC = () => {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      setIsScrolled(scrollTop > 100); // Hide after scrolling 100px
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <HeroWrapper>
      <ParticleBackground />
      <HeroContainer>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        >
          <HeroContent>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <HeroTitle>
                Hi, I'm <span>Fei</span>
              </HeroTitle>
              <HeroSubtitle>
                Web Developer, UI/UX Enthusiast, and more
              </HeroSubtitle>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              <HeroDescription>
                I create modern, responsive web applications with clean code and exceptional user experiences.
              </HeroDescription>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.8 }}
            >
              <SocialLinks>
                <SocialLink href="https://github.com/hfknight" target="_blank" rel="noopener noreferrer">
                  <Github size={20} />
                </SocialLink>
                <SocialLink href="https://linkedin.com/in/feihu" target="_blank" rel="noopener noreferrer">
                  <Linkedin size={20} />
                </SocialLink>
                <SocialLink href="mailto:fei.hu@fei.io">
                  <Mail size={20} />
                </SocialLink>
              </SocialLinks>
            </motion.div>
          </HeroContent>
        </motion.div>
      </HeroContainer>

      <ScrollIndicator
        initial={{ opacity: 0 }}
        animate={{ opacity: isScrolled ? 0 : 1 }}
        transition={{ duration: 0.3 }}
        style={{ display: isScrolled ? 'none' : 'flex' }}
      >
        <span>Scroll to explore</span>
        <ScrollArrow
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronDown size={24} />
        </ScrollArrow>
      </ScrollIndicator>
    </HeroWrapper>
  );
};

export default HeroSection;