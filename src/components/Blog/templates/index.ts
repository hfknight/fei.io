import type { FC } from 'react';
import type { PostTemplate } from '../../../types';
import type { TemplateProps } from './types';
import StandardArticle from './StandardArticle';
import PhotoEssay from './PhotoEssay';
import VideoForward from './VideoForward';

export type { TemplateProps } from './types';

const registry: Record<PostTemplate, FC<TemplateProps>> = {
  standard: StandardArticle,
  'photo-essay': PhotoEssay,
  'video-forward': VideoForward,
};

// Returns the layout component for a template value, falling back to standard.
export function getTemplate(template: string): FC<TemplateProps> {
  return registry[template as PostTemplate] ?? StandardArticle;
}
