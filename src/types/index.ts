export interface JsonSection {
  id: string;
  title: {
    text: string;
    highlight?: string;
  };
  subtitle?: string;
  gradient: string;
}

export interface JsonData {
  sections: JsonSection[];
}

export interface TimeSectionContent {
  id: string;
  title: string | React.ReactNode;
  subtitle?: string | React.ReactNode;
  scrollProgress: number;
}

export interface TimeSection extends Omit<TimeSectionContent, 'scrollProgress'> {
  gradient: string;
}

export interface TimeSectionProps {
  section: TimeSection;
  index: number;
  isLast: boolean;
  scrollProgress: number;
  onScrollNext: () => void;
}

export interface ConstellationProps {
  isVisible: boolean;
}

export interface ConstellationStarPoint {
  id: string;
  x: number;
  y: number;
  isMain: boolean;
}

export interface ConstellationLine {
  from: string;
  to: string;
}
