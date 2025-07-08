import React from 'react';
import styled from 'styled-components';
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

// ============ Section Data ============

// const _timeSections: TimeSectionData[] = [
//   {
//     id: 'dawn',
//     title: (
//       <>
//         Hi, I'm <span>Fei</span>
//       </>
//     ),
//     subtitle: (
//       <>
//         Web Developer based in Texas, US.
//         <br />
//         creating aesthetical and intuitive user interfaces that blend thoughtful
//         design with robust engineering.
//       </>
//     ),
//     gradient: 'linear-gradient(180deg, #1a1a3e 0%, #ff9a9e 50%, #fecfef 100%)'
//   },
//   {
//     id: 'morning',
//     title: 'This is the way',
//     subtitle:
//       "Well over a decade in the game, I've built enough professional websites (20-ish, if you're counting!) plus complex commercial SaaS systems with business logic that'd make your head spin. Think of me as the digital architect who keeps things sparkling clean with quality code and always, always delivers on time.",
//     gradient: 'linear-gradient(180deg, #fecfef 0%, #FFE4B5 50%, #87CEEB 100%)'
//   },
//   {
//     id: 'afternoon',
//     title: 'Leveling Up',
//     subtitle:
//       "My coding journey started with the classics - HTML, CSS, JavaScript, and Java - back when we coded uphill both ways in the snow. Then came the great React revolution, I joined the rebellion and mastering React and TypeScript to build the modern, scalable applications that define today's web - staying ahead of the curve keeps me engaged.",
//     gradient: 'linear-gradient(180deg, #87CEEB 0%, #4682B4 50%, #FF8C69 100%)'
//   },
//   {
//     id: 'evening',
//     title: 'The Good Vibes',
//     subtitle:
//       "Thriving between lead developer and lone wolf roles whenever the project needs me, clear communication and positive attitude is my superpower. Whether I'm coordinating clients, architecting solutions, or mentoring junior developers to level up their skills, I adapt seamlessly to get the job done.",
//     gradient:
//       'linear-gradient(180deg, #FF8C69 0%, #ff6b6b 50%, #f9124f 60%, #0f3460 100%)'
//   },
//   {
//     id: 'midnight',
//     title: 'Thank You',
//     subtitle: "If you've made it this far, thank you for spending a bit of your time with my story. Big thanks to my family, my incredible wife, and our adorable crew, Ollie and Jojo — you make everything worth it.",
//     gradient: 'linear-gradient(180deg, #0f3460 0%, #1a1a3e 50%, #000000 100%)'
//   }
// ];

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
    <>
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
    </>
  );
};

export default OneDayInLife;
