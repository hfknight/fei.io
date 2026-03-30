import React from 'react';
import styled from 'styled-components';
import PageTransition from '../components/PageTransition';
import TimeSection from '../components/DayJourney/TimeSection';
import type { JsonData, TimeSection as TimeSectionData } from '../types';
// import NavigationDots from '../components/DayJourney/NavigationDots';
import ScrollIndicator from '../components/DayJourney/ScrollIndicator';
import { transformJsonToTimeSections } from '../utils';

// ============ Styled Components ============

const PageContainer = styled.div`
  width: 100vw;
  /* height: 750vh; */
  height: auto;
  overflow-x: hidden;
  scroll-behavior: smooth;
  scroll-snap-type: y mandatory;
`;

// ============ Main Component ============

const OneDayInLife: React.FC = () => {
  const [timeSections, setTimeSections] = React.useState<TimeSectionData[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [activeSection, setActiveSection] = React.useState(0);
  const [scrollProgress, setScrollProgress] = React.useState(0);
  const [showScrollIndicator, setShowScrollIndicator] = React.useState(true);

  React.useEffect(() => {
    const loadData = async () => {
      try {
        const response = await fetch('/data/portfolio.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const jsonData: JsonData = await response.json();
        const transformedData = transformJsonToTimeSections(jsonData);
        setTimeSections(transformedData);
      } catch (err) {
        console.error('Error loading time sections:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const scrollToSection = (index: number) => {
    const sectionHeight = window.innerHeight * 1.5; // 150% of viewport
    let targetPosition = 0;

    switch (index) {
      case 1:
        targetPosition = index * sectionHeight + 250;
        break;
      case 3:
        targetPosition = index * sectionHeight + 100;
        break;
      default:
        targetPosition = index * sectionHeight;
        break;
    }
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    setActiveSection(index);
  };

  const scrollToNext = () => {
    const nextIndex = (activeSection + 1) % timeSections.length;
    scrollToSection(nextIndex);
  };

  React.useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      const windowHeight = window.innerHeight;
      const sectionHeight = windowHeight * 1.5; // 150% of viewport
      const currentSection = Math.floor(scrollPosition / sectionHeight);
      setActiveSection(Math.min(currentSection, timeSections.length - 1));

      // Calculate scroll progress for sun animation
      // Maps 0-1.5 sections (dawn + half of morning) to 0-1 progress
      // const sunAnimationProgress = Math.min(Math.max(scrollPosition / (sectionHeight * 1.5), 0), 1);
      const progress = Math.max(scrollPosition / (sectionHeight * 1.5), 0);
      setScrollProgress(progress);

      if (scrollPosition > 50) {
        setShowScrollIndicator(false);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [timeSections.length]);

  if (loading) {
    return null;
  }

  return (
    <PageTransition>
      {/* <NavigationDots
        sections={timeSections}
        activeSection={activeSection}
        onDotClick={scrollToSection}
      /> */}
      {showScrollIndicator && <ScrollIndicator />}

      <PageContainer>
        {timeSections.map((section, index) => (
          <TimeSection
            key={section.id}
            section={section}
            index={index}
            isLast={index === timeSections.length - 1}
            scrollProgress={scrollProgress}
            onScrollNext={scrollToNext}
          />
        ))}
      </PageContainer>
    </PageTransition>
  );
};

export default OneDayInLife;
