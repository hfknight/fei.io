import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminEditor from './AdminEditor';
import * as adminApi from '../../lib/adminApi';
import type { BlogPost } from '../../types';

vi.mock('../../lib/adminApi');

const made: BlogPost = {
  id: '1',
  slug: 'my-title',
  title: 'My Title',
  coverImageUrl: null,
  template: 'standard',
  publishedAt: null,
  body: 'content',
  status: 'draft',
  createdAt: 1,
  updatedAt: 1,
};

function renderCreate() {
  return render(
    <MemoryRouter initialEntries={['/writing/admin/new']}>
      <Routes>
        <Route path="/writing/admin/new" element={<AdminEditor />} />
        <Route path="/writing/admin" element={<div>LIST</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => vi.resetAllMocks());

describe('AdminEditor', () => {
  it('renders the selected template (title + body) live in the preview', async () => {
    renderCreate();

    await userEvent.type(screen.getByLabelText('Title'), 'My Headline');
    await userEvent.type(screen.getByLabelText('Body'), 'body copy here');

    // The template's title heading appears in the preview — proves the template
    // wraps the body, not just the raw markdown.
    expect(await screen.findByRole('heading', { name: 'My Headline' })).toBeInTheDocument();
    // Body shows in both the textarea and the rendered preview.
    expect(screen.getAllByText('body copy here').length).toBeGreaterThanOrEqual(2);
  });

  it('creates a post with the entered fields', async () => {
    vi.mocked(adminApi.createPost).mockResolvedValue(made);
    renderCreate();

    await userEvent.type(screen.getByLabelText('Title'), 'My Title');
    await userEvent.type(screen.getByLabelText('Body'), 'content');
    await userEvent.selectOptions(screen.getByLabelText('Status'), 'published');
    await userEvent.click(screen.getByRole('button', { name: /save/i }));

    await waitFor(() =>
      expect(adminApi.createPost).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'My Title',
          body: 'content',
          status: 'published',
          template: 'standard',
          coverImageUrl: null,
        }),
      ),
    );
    expect(await screen.findByText('LIST')).toBeInTheDocument();
  });

  it('uploads media and inserts it into the body', async () => {
    vi.mocked(adminApi.uploadFile).mockResolvedValue('https://media/x.png');
    renderCreate();

    const file = new File(['x'], 'x.png', { type: 'image/png' });
    await userEvent.upload(screen.getByLabelText('Insert media'), file);

    await waitFor(() => expect(adminApi.uploadFile).toHaveBeenCalledWith(file));
    await waitFor(() =>
      expect((screen.getByLabelText('Body') as HTMLTextAreaElement).value).toContain(
        '![](https://media/x.png)',
      ),
    );
  });
});
