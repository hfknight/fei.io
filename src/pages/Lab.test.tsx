import { describe, it, expect, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../test/renderWithTheme';
import { MemoryRouter } from 'react-router-dom';
import { lazy } from 'react';
import type { LabEntry } from '../types';
import Lab from './Lab';
import { labEntriesByDate } from '../data/labEntries';

vi.mock('../data/labEntries');

const stubComponent = (): LabEntry['Component'] =>
  lazy(async () => ({ default: () => null }));

const entry = (over: Partial<LabEntry>): LabEntry => ({
  slug: 'x',
  title: 'X',
  kind: 'experiment',
  date: '2026-01-01',
  Component: stubComponent(),
  ...over,
});

beforeEach(() => vi.resetAllMocks());

describe('Lab index', () => {
  it('lists entries as links with a "year · kind" meta line', () => {
    vi.mocked(labEntriesByDate).mockReturnValue([
      entry({ slug: 'sample-entry', title: 'Sample Entry', kind: 'case-study', date: '2026-06-26' }),
    ]);

    render(
      <MemoryRouter>
        <Lab />
      </MemoryRouter>,
    );

    expect(screen.getByText('Sample Entry')).toBeInTheDocument();
    expect(screen.getByText('2026 · Case study')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Sample Entry/ })).toHaveAttribute(
      'href',
      '/lab/sample-entry',
    );
  });

  it('shows an empty state when there are no entries', () => {
    vi.mocked(labEntriesByDate).mockReturnValue([]);

    render(
      <MemoryRouter>
        <Lab />
      </MemoryRouter>,
    );

    expect(screen.getByText('No entries yet.')).toBeInTheDocument();
  });
});
