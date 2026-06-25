import type { PostTemplate } from '../../types';

export const TEMPLATE_OPTIONS: { value: PostTemplate; label: string }[] = [
  { value: 'standard', label: 'Standard article' },
  { value: 'photo-essay', label: 'Photo essay' },
  { value: 'video-forward', label: 'Video forward' },
];
