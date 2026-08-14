import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import { render } from '../../test/renderWithTheme';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminPosts from './AdminPosts';
import * as adminApi from '../../lib/adminApi';
import type { BlogPost } from '../../types';

vi.mock('../../lib/adminApi');

const post = (over: Partial<BlogPost>): BlogPost => ({
  id: '1',
  slug: 'a',
  title: 'A',
  coverImageUrl: null,
  template: 'standard',
  publishedAt: null,
  body: '',
  status: 'draft',
  createdAt: 1,
  updatedAt: 1,
  ...over,
});

beforeEach(() => vi.resetAllMocks());

describe('AdminPosts', () => {
  it('lists both draft and published posts', async () => {
    vi.mocked(adminApi.listAllPosts).mockResolvedValue([
      post({ id: '1', title: 'Draft One', status: 'draft' }),
      post({ id: '2', title: 'Live One', status: 'published', publishedAt: 1700000000000 }),
    ]);

    render(
      <MemoryRouter>
        <AdminPosts />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Draft One')).toBeInTheDocument();
    expect(screen.getByText('Live One')).toBeInTheDocument();
    expect(screen.getByText('draft')).toBeInTheDocument();
    expect(screen.getByText('published')).toBeInTheDocument();
  });

  it('links to the new-post editor', async () => {
    vi.mocked(adminApi.listAllPosts).mockResolvedValue([]);

    render(
      <MemoryRouter>
        <AdminPosts />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('link', { name: /new post/i })).toHaveAttribute(
      'href',
      '/writing/admin/new',
    );
  });

  it('deletes a post after confirmation', async () => {
    vi.mocked(adminApi.listAllPosts).mockResolvedValue([post({ id: '7', title: 'Doomed' })]);
    vi.mocked(adminApi.deletePost).mockResolvedValue();
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(
      <MemoryRouter>
        <AdminPosts />
      </MemoryRouter>,
    );

    await screen.findByText('Doomed');
    await userEvent.click(screen.getByRole('button', { name: /delete/i }));

    await waitFor(() => expect(adminApi.deletePost).toHaveBeenCalledWith('7'));
    await waitFor(() => expect(screen.queryByText('Doomed')).toBeNull());
  });
});
