import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
