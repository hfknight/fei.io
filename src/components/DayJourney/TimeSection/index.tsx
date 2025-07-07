import { SectionContainer } from '../../../styles/TimeSection';
import type { TimeSectionProps } from '../../../types';
import AfternoonSection from './Afternoon';
import DawnSection from './Dawn';
import EveningSection from './Evening';
import MidnightSection from './Midnight';
import MorningSection from './Morning';

const TimeSection: React.FC<TimeSectionProps> = ({
  section,
  scrollProgress,
  isLast
}) => {
  const renderSectionContent = (section: TimeSectionProps['section']) => {
    const { id, title, subtitle } = section;
    switch (id) {
      case 'dawn':
        return (
          <DawnSection
            id={id}
            title={title}
            subtitle={subtitle}
            scrollProgress={scrollProgress}
          />
        );
      case 'morning':
        return (
          <MorningSection
            id={id}
            title={title}
            subtitle={subtitle}
            scrollProgress={scrollProgress}
          />
        );
      case 'afternoon':
        return (
          <AfternoonSection
            id={id}
            title={title}
            subtitle={subtitle}
            scrollProgress={scrollProgress}
          />
        );
      case 'evening':
        return (
          <EveningSection
            id={id}
            title={title}
            subtitle={subtitle}
            scrollProgress={scrollProgress}
          />
        );
      case 'midnight':
        return (
          <MidnightSection
            id={id}
            title={title}
            subtitle={subtitle}
            scrollProgress={scrollProgress}
          />
        );
    }

    return null;
  };

  return (
    <SectionContainer
      key={section.id}
      id={section.id}
      $isLast={isLast}
      $gradient={section.gradient}
    >
      {renderSectionContent(section)}
    </SectionContainer>
  );
};

export default TimeSection;
