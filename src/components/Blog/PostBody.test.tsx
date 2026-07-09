import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../test/renderWithTheme';
import { PostBody } from './PostBody';

describe('PostBody', () => {
  it('renders gfm markdown (heading, table, strikethrough)', () => {
    const md = `# Title\n\n| a | b |\n|---|---|\n| 1 | 2 |\n\n~~gone~~`;
    const { container } = render(<PostBody markdown={md} />);

    expect(screen.getByRole('heading', { name: 'Title' })).toBeInTheDocument();
    expect(container.querySelector('table')).toBeInTheDocument();
    expect(container.querySelector('del')).toBeInTheDocument();
  });

  it('neutralizes javascript: links', () => {
    const { container } = render(<PostBody markdown={'[x](javascript:alert(1))'} />);
    const href = container.querySelector('a')?.getAttribute('href') ?? '';
    expect(href).not.toContain('javascript:');
  });

  it('does not render raw HTML script tags as elements', () => {
    const { container } = render(<PostBody markdown={'<script>alert(1)</script>\n\nhi'} />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('renders a video URL as <video> and an image URL as <img>', () => {
    const { container } = render(
      <PostBody markdown={'![clip](https://x/clip.mp4)\n\n![pic](https://x/pic.png)'} />,
    );
    expect(container.querySelector('video')).toBeInTheDocument();
    expect(container.querySelector('img')).toBeInTheDocument();
  });

  it('highlights code blocks with hljs classes surviving sanitize', () => {
    const { container } = render(<PostBody markdown={'```js\nconst x = 1;\n```'} />);
    expect(container.querySelector('.hljs')).toBeTruthy();
  });

  /**
   * A code block is a dark island whatever the page sits on. Flipping the surface on <pre>
   * re-resolves --accent inside it, so .hljs-title stays yellow instead of the light
   * surface's dark olive on a near-black ground.
   */
  it('renders code blocks on the inverted surface', () => {
    const { container } = render(<PostBody markdown={'```js\nconst x = 1;\n```'} />);
    expect(container.querySelector('pre')).toHaveAttribute('data-surface', 'inverted');
  });

  it('leaves inline code on the page surface', () => {
    const { container } = render(<PostBody markdown={'some `inline` code'} />);
    expect(container.querySelector('pre')).toBeNull();
    expect(container.querySelector('code')).toBeInTheDocument();
    expect(container.querySelector('[data-surface]')).toBeNull();
  });
});
