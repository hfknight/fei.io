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

// --- Blog ---

export type PostTemplate = 'standard' | 'photo-essay' | 'video-forward';
export type PostStatus = 'draft' | 'published';

export interface BlogPostSummary {
  id: string;
  slug: string;
  title: string;
  coverImageUrl: string | null;
  template: PostTemplate;
  publishedAt: number | null;
}

export interface BlogPost extends BlogPostSummary {
  body: string;
  status: PostStatus;
  createdAt: number;
  updatedAt: number;
}

// --- Lab ---

export type LabKind = 'learning' | 'case-study' | 'experiment';

// Each Lab entry is a bespoke, hand-coded page (no shared template). The registry
// in src/data/labEntries.ts is the single source of truth for both the index list
// and route resolution. `Component` is typed lazy so entry pages are guaranteed to
// stay off the landing bundle.
export interface LabEntry {
  slug: string;
  title: string;
  kind: LabKind;
  date: string; // ISO 8601 (YYYY-MM-DD)
  Component: React.LazyExoticComponent<React.ComponentType>;
}
