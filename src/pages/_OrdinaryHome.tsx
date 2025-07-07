// src/pages/Home.tsx
import React from 'react';
import styled from 'styled-components';
// import { motion } from 'framer-motion';
// import ParticleBackground from '../components/ParticleBackground/ParticleBackground';
import HeroSection from '../components/Hero/HeroSection';
import FeaturesSection from '../components/Features/FeaturesSection';

const HomePage = styled.div`
  min-width: 100vw;
  width: 100%;
`;

const Home: React.FC = () => {
  return (
    <HomePage>
      <HeroSection />
      <FeaturesSection />
    </HomePage>
  );
};

export default Home;