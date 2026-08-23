import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test/renderWithTheme';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import NotFound from './NotFound';

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lab" element={<div>LAB</div>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </MemoryRouter>,
  );

describe('NotFound', () => {
  it('names the missed path so a mistyped address is visible', () => {
    renderAt('/connect');
    expect(screen.getByText('This page does not exist.')).toBeInTheDocument();
    expect(screen.getByText('/connect')).toBeInTheDocument();
  });

  it('offers a single way back, since the Header already carries the sections', () => {
    renderAt('/nope');
    const hrefs = screen.getAllByRole('link').map(a => a.getAttribute('href'));
    expect(hrefs).toEqual(['/']);
  });

  it('does not claim a path a real route owns', () => {
    renderAt('/lab');
    expect(screen.getByText('LAB')).toBeInTheDocument();
    expect(screen.queryByText('This page does not exist.')).not.toBeInTheDocument();
  });
});
