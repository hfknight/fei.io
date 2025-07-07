// src/components/Features/FeaturesSection.tsx
import React from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { Zap, Palette, Code, GraduationCap } from 'lucide-react';

// Content container for readable content sections
const ContentContainer = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 ${props => props.theme.spacing.md};

  @media (min-width: ${props => props.theme.breakpoints.md}) {
    padding: 0 ${props => props.theme.spacing.xl};
  }
`;

// Full width features section
const FeaturesWrapper = styled.section`
  width: 100vw;
  padding: ${props => props.theme.spacing['3xl']} 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(251, 191, 36, 0.04) 0%, transparent 60%),
    radial-gradient(circle at 80% 80%, rgba(252, 211, 77, 0.06) 0%, transparent 50%),
    linear-gradient(180deg, 
      ${props => props.theme.colors.background} 0%,
      ${props => props.theme.colors.surface} 100%);
  margin-left: calc(-50vw + 50%);
  margin-right: calc(-50vw + 50%);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      radial-gradient(ellipse at 30% 40%, rgba(251, 191, 36, 0.03) 0%, transparent 70%),
      radial-gradient(ellipse at 70% 60%, rgba(252, 211, 77, 0.02) 0%, transparent 80%);
    pointer-events: none;
    animation: gentleWarmGlow 12s ease-in-out infinite;
  }

  @keyframes gentleWarmGlow {
    0%, 100% {
      opacity: 1;
      transform: translateY(0);
    }
    50% {
      opacity: 0.7;
      transform: translateY(-2px);
    }
  }
`;

const FeaturesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: ${props => props.theme.spacing.xl};
  margin-top: ${props => props.theme.spacing['2xl']};
  position: relative;
  z-index: 1;

  @media (min-width: ${props => props.theme.breakpoints.lg}) {
    grid-template-columns: repeat(4, 1fr);
    gap: ${props => props.theme.spacing.lg};
  }

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
    gap: ${props => props.theme.spacing.lg};
  }

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    grid-template-columns: 1fr;
    gap: ${props => props.theme.spacing.xl};
  }
`;

const FeatureCard = styled(motion.div)`
  text-align: center;
  padding: ${props => props.theme.spacing['2xl']};
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(16px);
  border-radius: 1.5rem;
  border: 1px solid rgba(251, 191, 36, 0.15);
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 
    0 4px 20px rgba(251, 191, 36, 0.1),
    0 1px 3px rgba(0, 0, 0, 0.05);

  &:hover {
    transform: translateY(-8px) scale(1.02);
    box-shadow: 
      0 20px 40px rgba(251, 191, 36, 0.2),
      0 8px 16px rgba(0, 0, 0, 0.1);
    border-color: rgba(251, 191, 36, 0.3);
    background: rgba(255, 255, 255, 0.95);
  }
`;

const FeatureIcon = styled.div`
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, ${props => props.theme.colors.primary}, ${props => props.theme.colors.accent});
  border-radius: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto ${props => props.theme.spacing.lg};
  color: white;
  box-shadow: 0 8px 32px 0 ${props => props.theme.colors.primary}25;
`;

const FeatureTitle = styled.h3`
  font-size: ${props => props.theme.fontSizes.xl};
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.md};
`;

const FeatureDescription = styled.p`
  color: ${props => props.theme.colors.textLight};
  line-height: 1.6;
`;

const SectionTitle = styled.h2`
  font-size: clamp(2rem, 4vw, 3rem);
  text-align: center;
  color: ${props => props.theme.colors.text};
  margin-bottom: ${props => props.theme.spacing.lg};
  position: relative;
  z-index: 1;
`;

interface Feature {
  icon: React.ComponentType<{ size?: number }>;
  title: string;
  description: string;
}

const FeaturesSection: React.FC = () => {
  const features: Feature[] = [
    {
      icon: Zap,
      title: "Fast Development",
      description: "Building modern, performant applications with the latest React and TypeScript technologies."
    },
    {
      icon: Palette,
      title: "Beautiful Design",
      description: "Creating pixel-perfect, responsive designs that provide exceptional user experiences."
    },
    {
      icon: Code,
      title: "Clean Code",
      description: "Writing maintainable, scalable code following industry best practices and modern patterns."
    },
    {
      icon: GraduationCap,
      title: "Non-stop Learner",
      description: "Constantly exploring new technologies and staying ahead of the curve. Currently diving deep into AI, machine learning, and emerging web technologies."
    }
  ];

  return (
    <FeaturesWrapper>
      <ContentContainer>
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
        >
          <SectionTitle>What I Do</SectionTitle>
        </motion.div>

        <FeaturesGrid>
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <FeatureCard
                key={index}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ y: -4 }}
              >
                <FeatureIcon>
                  <IconComponent size={28} />
                </FeatureIcon>
                <FeatureTitle>{feature.title}</FeatureTitle>
                <FeatureDescription>{feature.description}</FeatureDescription>
              </FeatureCard>
            );
          })}
        </FeaturesGrid>
      </ContentContainer>
    </FeaturesWrapper>
  );
};

export default FeaturesSection;