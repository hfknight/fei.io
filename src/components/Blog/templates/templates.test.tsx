import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { getTemplate } from './index';
import StandardArticle from './StandardArticle';
import PhotoEssay from './PhotoEssay';
import VideoForward from './VideoForward';

describe('template registry', () => {
  it('maps known template values', () => {
    expect(getTemplate('standard')).toBe(StandardArticle);
    expect(getTemplate('photo-essay')).toBe(PhotoEssay);
    expect(getTemplate('video-forward')).toBe(VideoForward);
  });

  it('falls back to standard for an unknown template', () => {
    expect(getTemplate('nope')).toBe(StandardArticle);
  });
});

describe('templates', () => {
  it.each([StandardArticle, PhotoEssay, VideoForward])(
    'renders the title and body',
    (Template) => {
      render(
        <Template title="My Post" coverImageUrl={null} publishedAt={1700000000000}>
          <p>body text</p>
        </Template>,
      );
      expect(screen.getByRole('heading', { name: 'My Post' })).toBeInTheDocument();
      expect(screen.getByText('body text')).toBeInTheDocument();
    },
  );

  it('video-forward renders a <video> for a video cover', () => {
    const { container } = render(
      <VideoForward title="V" coverImageUrl="https://example.com/c.mp4" publishedAt={null}>
        <p>b</p>
      </VideoForward>,
    );
    expect(container.querySelector('video')).toBeInTheDocument();
  });
});
