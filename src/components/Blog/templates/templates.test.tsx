import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../test/renderWithTheme';
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

  /**
   * The title and date are shared between the cover overlay and the no-cover header. Over a
   * photo they sit on a dark scrim, so the overlay flips the surface and the same ink tokens
   * resolve to white. Without the attribute they would render dark-on-dark.
   */
  it('photo-essay flips the cover overlay to the inverted surface', () => {
    const { container } = render(
      <PhotoEssay title="P" coverImageUrl="https://example.com/c.jpg" publishedAt={1700000000000}>
        <p>b</p>
      </PhotoEssay>,
    );
    const overlay = container.querySelector('[data-surface="inverted"]');
    expect(overlay).toBeInTheDocument();
    expect(overlay).toContainElement(screen.getByRole('heading', { name: 'P' }));
  });

  it('photo-essay does not flip the surface when there is no cover', () => {
    const { container } = render(
      <PhotoEssay title="P" coverImageUrl={null} publishedAt={1700000000000}>
        <p>b</p>
      </PhotoEssay>,
    );
    expect(container.querySelector('[data-surface]')).toBeNull();
  });
});
