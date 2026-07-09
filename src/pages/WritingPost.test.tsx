import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test/renderWithTheme';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import WritingPost from './WritingPost';
import * as blogApi from '../lib/blogApi';
import type { BlogPost } from '../types';

vi.mock('../lib/blogApi');

const post = (over: Partial<BlogPost> = {}): BlogPost => ({
  id: '1',
  slug: 'hello',
  title: 'Hello Post',
  coverImageUrl: null,
  template: 'standard',
  publishedAt: 1700000000000,
  body: '# Heading\n\nbody copy',
  status: 'published',
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/writing/${slug}`]}>
      <Routes>
        <Route path="/writing/:slug" element={<WritingPost />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.resetAllMocks());

describe('WritingPost', () => {
  it('renders the post body inside its template', async () => {
    vi.mocked(blogApi.fetchPost).mockResolvedValue(post());

    renderAt('hello');

    expect(await screen.findByRole('heading', { name: 'Hello Post' })).toBeInTheDocument();
    expect(screen.getByText('body copy')).toBeInTheDocument();
  });

  it('shows a not-found state for a missing or draft slug', async () => {
    vi.mocked(blogApi.fetchPost).mockResolvedValue(null);

    renderAt('nope');

    expect(await screen.findByText('Post not found.')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    vi.mocked(blogApi.fetchPost).mockRejectedValue(new Error('x'));

    renderAt('hello');

    expect(await screen.findByText('Something went wrong.')).toBeInTheDocument();
  });
});
