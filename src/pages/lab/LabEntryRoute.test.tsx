import { describe, it, expect } from 'vitest';
import { Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import LabEntryRoute from './LabEntryRoute';

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
  it('renders the bespoke page for a known slug (registry → route → page)', async () => {
    renderAt('/lab/building-the-lab');
    expect(await screen.findByText('Building the Lab')).toBeInTheDocument();
  });

  it('renders a not-found block with a link back to /lab for an unknown slug', () => {
    renderAt('/lab/does-not-exist');
    expect(screen.getByText('Entry not found.')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /lab/i })).toHaveAttribute('href', '/lab');
  });
});
