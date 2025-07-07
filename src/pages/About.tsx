import React from 'react';
import styled from 'styled-components';
import { Container, Section } from '../styles/GlobalStyles';

const AboutContent = styled.div`
  max-width: 800px;
  margin: 0 auto;
`;

const Title = styled.h1`
  font-size: ${props => props.theme.fontSizes['3xl']};
  margin-bottom: ${props => props.theme.spacing.xl};
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const Paragraph = styled.p`
  margin-bottom: ${props => props.theme.spacing.lg};
  color: ${props => props.theme.colors.textLight};
  line-height: 1.7;
  font-size: ${props => props.theme.fontSizes.base};
`;

const SkillsSection = styled.div`
  margin-top: ${props => props.theme.spacing['2xl']};
`;

const SkillsTitle = styled.h2`
  font-size: ${props => props.theme.fontSizes['2xl']};
  margin-bottom: ${props => props.theme.spacing.lg};
  text-align: center;
  color: ${props => props.theme.colors.text};
`;

const SkillsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: ${props => props.theme.spacing.lg};
`;

const SkillCard = styled.div`
  background: ${props => props.theme.colors.surface};
  padding: ${props => props.theme.spacing.lg};
  border-radius: 0.5rem;
  border: 1px solid ${props => props.theme.colors.border};
  text-align: center;
`;

const SkillName = styled.h3`
  font-size: ${props => props.theme.fontSizes.lg};
  color: ${props => props.theme.colors.primary};
  margin-bottom: ${props => props.theme.spacing.sm};
`;

const About: React.FC = () => {
  const skills = [
    'React & TypeScript',
    'Styled Components',
    'Node.js & Express',
    'MongoDB & PostgreSQL',
    'Git & GitHub',
    'REST APIs'
  ];

  return (
    <Section>
      <Container>
        <AboutContent>
          <Title>About Me</Title>
          <Paragraph>
            Welcome to my portfolio! I'm a passionate React developer with expertise in 
            TypeScript, modern web technologies, and creating exceptional user experiences.
          </Paragraph>
          <Paragraph>
            I love building scalable applications, learning new technologies, and 
            contributing to open source projects. My focus is on writing clean, 
            maintainable code while delivering pixel-perfect designs.
          </Paragraph>

          <SkillsSection>
            <SkillsTitle>Technical Skills</SkillsTitle>
            <SkillsGrid>
              {skills.map((skill, index) => (
                <SkillCard key={index}>
                  <SkillName>{skill}</SkillName>
                </SkillCard>
              ))}
            </SkillsGrid>
          </SkillsSection>
        </AboutContent>
      </Container>
    </Section>
  );
};

export default About;