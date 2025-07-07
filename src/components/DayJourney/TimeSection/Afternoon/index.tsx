import {
  SectionContent,
  SectionSubtitle,
  SectionTitle
} from '../../../../styles/TimeSection';
import type { TimeSectionContent } from '../../../../types';
import CloudAnimation from './Clouds';

const AfternoonSection: React.FC<TimeSectionContent> = ({
  title,
  subtitle
}) => {
  return (
    <>
    <CloudAnimation />
      <SectionContent className="section-content afternoon-content">
        <SectionTitle className="afternoon-title">{title}</SectionTitle>
        <SectionSubtitle>{subtitle}</SectionSubtitle>
      </SectionContent>
    </>
  );
};

export default AfternoonSection;
