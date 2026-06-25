import type { ReactNode } from 'react';

export interface TemplateProps {
  title: string;
  coverImageUrl: string | null;
  publishedAt: number | null;
  children: ReactNode; // the rendered <PostBody />
  // When true, avoid viewport-width breakouts (e.g. photo-essay's full-bleed
  // cover) so the template fits inside a constrained preview container.
  contained?: boolean;
}

const VIDEO_RE = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

export function isVideoUrl(url: string): boolean {
  return VIDEO_RE.test(url);
}

export function formatDate(epochMs: number | null): string {
  if (!epochMs) return '';
  return new Date(epochMs).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}
