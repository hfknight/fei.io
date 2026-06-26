import { describe, it, expect, vi } from 'vitest';
import { Suspense, lazy } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LabEntryRoute from './LabEntryRoute';
import { findLabEntry } from '../../data/labEntries';

vi.mock('../../data/labEntries');

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/lab/:slug" element={<LabEntryRoute />} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );

describe('LabEntryRoute', () => {
  it('resolves a known slug through the registry and renders its page', async () => {
    vi.mocked(findLabEntry).mockReturnValue({
      slug: 'sample-entry',
      title: 'Sample Entry',
      kind: 'experiment',
      date: '2026-06-26',
      Component: lazy(async () => ({ default: () => <h1>Sample bespoke page</h1> })),
    });

    renderAt('/lab/sample-entry');
    expect(await screen.findByText('Sample bespoke page')).toBeInTheDocument();
    expect(vi.mocked(findLabEntry)).toHaveBeenCalledWith('sample-entry');
  });

  it('renders a not-found block with a link back to /lab for an unknown slug', () => {
    vi.mocked(findLabEntry).mockReturnValue(undefined);
    renderAt('/lab/does-not-exist');
    expect(screen.getByText('Entry not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lab/i })).toHaveAttribute('href', '/lab');
  });
});
