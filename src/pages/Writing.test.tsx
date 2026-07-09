import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test/renderWithTheme';
import { MemoryRouter } from 'react-router-dom';
import Writing from './Writing';
import * as blogApi from '../lib/blogApi';
import type { BlogPostSummary } from '../types';

vi.mock('../lib/blogApi');

const summary = (over: Partial<BlogPostSummary>): BlogPostSummary => ({
  id: '1',
  slug: 'hello',
  title: 'Hello',
  coverImageUrl: null,
  template: 'standard',
  publishedAt: 1700000000000,
  ...over,
});

beforeEach(() => vi.resetAllMocks());

describe('Writing index', () => {
  it('lists published posts as links to their slugs', async () => {
    vi.mocked(blogApi.fetchPublishedPosts).mockResolvedValue([
      summary({ id: '1', slug: 'a', title: 'First' }),
      summary({ id: '2', slug: 'b', title: 'Second' }),
    ]);

    render(
      <MemoryRouter>
        <Writing />
      </MemoryRouter>,
    );

    expect(await screen.findByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /First/ })).toHaveAttribute('href', '/writing/a');
  });

  it('shows an empty state when there are no posts', async () => {
    vi.mocked(blogApi.fetchPublishedPosts).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <Writing />
      </MemoryRouter>,
    );

    expect(await screen.findByText('No posts yet.')).toBeInTheDocument();
  });

  it('shows an error state when the request fails', async () => {
    vi.mocked(blogApi.fetchPublishedPosts).mockRejectedValue(new Error('boom'));

    render(
      <MemoryRouter>
        <Writing />
      </MemoryRouter>,
    );

    expect(await screen.findByText(/Couldn/)).toBeInTheDocument();
  });
});
